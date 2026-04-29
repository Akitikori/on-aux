import type { StructureSegment } from '../types/track';
import {
  computeMultiBandEnergy,
  computeNoveltyFunction,
  findNoveltyPeaks,
} from './spectral';

const SEGMENT_LABELS: Record<StructureSegment['type'], string> = {
  intro: 'Intro',
  buildup: 'Build-up',
  chorus: 'Drop / Chorus',
  breakdown: 'Breakdown',
  outro: 'Outro',
};

/**
 * Detect song structure using multi-band spectral analysis, novelty detection,
 * and beat-grid alignment.
 *
 * @param buffer - The decoded AudioBuffer
 * @param bpm - Detected BPM for beat-grid alignment
 * @returns Array of structural segments
 */
export function detectStructure(
  buffer: AudioBuffer,
  bpm: number
): StructureSegment[] {
  const duration = buffer.duration;
  if (duration < 10) return [];

  const frameMs = 200; // 200ms frames
  const hopMs = frameMs / 2; // 100ms hop

  // Step 1: Compute multi-band energy
  const bands = computeMultiBandEnergy(buffer, frameMs);
  const numFrames = bands.total.length;
  const timePerFrame = (hopMs / 1000);

  // Step 2: Compute novelty function and find peaks
  const novelty = computeNoveltyFunction(bands, 10);

  // Minimum separation between peaks: ~8 bars (or at least 5 seconds)
  const barDuration = (60 / bpm) * 4; // seconds per bar
  const phraseFrames = Math.max(
    Math.floor(8 * barDuration / timePerFrame), // 8 bars
    Math.floor(5 / timePerFrame) // minimum 5 seconds
  );

  const peaks = findNoveltyPeaks(novelty, phraseFrames, 0.2);

  // Step 3: Create sections from peaks
  // Add start and end boundaries
  const boundaries = [0, ...peaks, numFrames - 1];

  // Snap boundaries to beat grid (nearest bar)
  const snappedBoundaries = boundaries.map((frameIdx) => {
    const time = frameIdx * timePerFrame;
    return snapToBarGrid(time, bpm, duration);
  });

  // Remove duplicate boundaries after snapping
  const uniqueBoundaries = [snappedBoundaries[0]];
  for (let i = 1; i < snappedBoundaries.length; i++) {
    const last = uniqueBoundaries[uniqueBoundaries.length - 1];
    if (snappedBoundaries[i] - last > barDuration * 2) {
      uniqueBoundaries.push(snappedBoundaries[i]);
    }
  }
  // Ensure we end at the track duration
  if (uniqueBoundaries[uniqueBoundaries.length - 1] < duration - 1) {
    uniqueBoundaries.push(duration);
  }

  // Step 4: Classify each section
  const segments: StructureSegment[] = [];

  for (let i = 0; i < uniqueBoundaries.length - 1; i++) {
    const startTime = uniqueBoundaries[i];
    const endTime = uniqueBoundaries[i + 1];
    const sectionDuration = endTime - startTime;

    if (sectionDuration < 1) continue;

    // Get average band energies for this section
    const startFrame = Math.floor(startTime / timePerFrame);
    const endFrame = Math.min(Math.floor(endTime / timePerFrame), numFrames - 1);

    const avgLow = avgRange(bands.low, startFrame, endFrame);
    const avgMid = avgRange(bands.mid, startFrame, endFrame);
    const avgHigh = avgRange(bands.high, startFrame, endFrame);
    const avgTotal = avgRange(bands.total, startFrame, endFrame);

    // Get previous section's energy for comparison
    const prevLow = i > 0
      ? avgRange(bands.low, Math.floor(uniqueBoundaries[i - 1] / timePerFrame), startFrame)
      : 0;

    // Normalized position (0-1)
    const position = startTime / duration;
    const isFirst = i === 0;
    const isLast = i === uniqueBoundaries.length - 2;

    // Check if energy is rising toward the next section
    let isRising = false;
    if (i < uniqueBoundaries.length - 2) {
      const nextStartFrame = endFrame;
      const nextEndFrame = Math.min(
        Math.floor(uniqueBoundaries[i + 2] / timePerFrame),
        numFrames - 1
      );
      const nextTotal = avgRange(bands.total, nextStartFrame, nextEndFrame);
      isRising = nextTotal > avgTotal * 1.3;
    }

    const type = classifySection({
      avgLow,
      avgMid,
      avgHigh,
      avgTotal,
      prevLow,
      position,
      isFirst,
      isLast,
      isRising,
      duration: sectionDuration,
    });

    segments.push({
      type,
      startTime,
      endTime,
      avgEnergy: avgTotal,
      label: SEGMENT_LABELS[type],
    });
  }

  // Post-process: merge very short segments (< 2 bars) into neighbors
  return mergeShortSegments(segments, barDuration * 2);
}

/**
 * Legacy detectStructure signature for backwards compatibility.
 * Used when AudioBuffer is not available (only energy curve).
 */
export function detectStructureFromEnergy(
  energyCurve: number[],
  duration: number
): StructureSegment[] {
  if (energyCurve.length === 0) return [];

  const timePerFrame = duration / energyCurve.length;
  const sorted = [...energyCurve].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const highThreshold = median * 1.3;
  const lowThreshold = median * 0.7;

  const levels: ('low' | 'mid' | 'high')[] = energyCurve.map(e => {
    if (e >= highThreshold) return 'high';
    if (e <= lowThreshold) return 'low';
    return 'mid';
  });

  const regions: { level: 'low' | 'mid' | 'high'; start: number; end: number; avgEnergy: number }[] = [];
  let currentLevel = levels[0];
  let regionStart = 0;
  let energySum = energyCurve[0];
  let count = 1;

  for (let i = 1; i < levels.length; i++) {
    if (levels[i] !== currentLevel) {
      regions.push({
        level: currentLevel,
        start: regionStart * timePerFrame,
        end: i * timePerFrame,
        avgEnergy: energySum / count,
      });
      currentLevel = levels[i];
      regionStart = i;
      energySum = energyCurve[i];
      count = 1;
    } else {
      energySum += energyCurve[i];
      count++;
    }
  }
  regions.push({ level: currentLevel, start: regionStart * timePerFrame, end: duration, avgEnergy: energySum / count });

  const merged: typeof regions = [];
  for (const region of regions) {
    if (merged.length > 0 && (region.end - region.start) < 3) {
      merged[merged.length - 1].end = region.end;
    } else {
      merged.push({ ...region });
    }
  }

  const segments: StructureSegment[] = [];
  for (let i = 0; i < merged.length; i++) {
    const region = merged[i];
    const position = region.start / duration;
    const isFirst = i === 0;
    const isLast = i === merged.length - 1;

    let type: StructureSegment['type'];
    if (isFirst && region.level !== 'high') type = 'intro';
    else if (isLast && region.level !== 'high') type = 'outro';
    else if (region.level === 'high') type = 'chorus';
    else if (region.level === 'mid' && !isFirst && merged[i - 1]?.level === 'low') type = 'buildup';
    else if (region.level === 'low' && position > 0.15 && position < 0.85) type = 'breakdown';
    else if (position < 0.2) type = 'intro';
    else if (position > 0.8) type = 'outro';
    else type = 'buildup';

    segments.push({ type, startTime: region.start, endTime: region.end, avgEnergy: region.avgEnergy, label: SEGMENT_LABELS[type] });
  }

  return segments;
}

// --- Helpers ---

interface SectionFeatures {
  avgLow: number;
  avgMid: number;
  avgHigh: number;
  avgTotal: number;
  prevLow: number;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  isRising: boolean;
  duration: number;
}

function classifySection(f: SectionFeatures): StructureSegment['type'] {
  // Intro: first section OR low energy in first 20% of track
  if (f.isFirst && f.avgTotal < 0.5) return 'intro';
  if (f.position < 0.15 && f.avgLow < 0.3 && f.avgTotal < 0.4) return 'intro';

  // Outro: last section OR low energy in last 15% of track
  if (f.isLast && f.avgTotal < 0.5) return 'outro';
  if (f.position > 0.8 && f.avgTotal < 0.45 && !f.isRising) return 'outro';

  // Chorus/Drop: high bass + high overall energy
  if (f.avgLow > 0.5 && f.avgTotal > 0.55) return 'chorus';

  // Breakdown: bass drops significantly from previous section
  if (f.prevLow > 0 && f.avgLow < f.prevLow * 0.5 && f.position > 0.15 && f.position < 0.85) {
    return 'breakdown';
  }

  // Breakdown: low bass, mid-range present (vocals/pads over stripped drums)
  if (f.avgLow < 0.25 && f.avgMid > 0.3 && f.position > 0.15 && f.position < 0.85) {
    return 'breakdown';
  }

  // Buildup: energy rising toward next section
  if (f.isRising && f.avgTotal < 0.5) return 'buildup';

  // Buildup: moderate energy, not at extremes
  if (f.avgTotal > 0.3 && f.avgTotal < 0.55 && f.position < 0.8) return 'buildup';

  // Default fallback
  if (f.position < 0.2) return 'intro';
  if (f.position > 0.8) return 'outro';
  return 'buildup';
}

export function snapToBarGrid(time: number, bpm: number, duration: number): number {
  const barDuration = (60 / bpm) * 4;
  const snapped = Math.round(time / barDuration) * barDuration;
  return Math.max(0, Math.min(snapped, duration));
}

function avgRange(arr: number[], start: number, end: number): number {
  if (start >= end || start >= arr.length) return 0;
  const actualEnd = Math.min(end, arr.length);
  let sum = 0;
  for (let i = start; i < actualEnd; i++) {
    sum += arr[i];
  }
  return sum / (actualEnd - start);
}

function mergeShortSegments(
  segments: StructureSegment[],
  minDuration: number
): StructureSegment[] {
  if (segments.length <= 1) return segments;

  const result: StructureSegment[] = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const prev = result[result.length - 1];

    if (seg.endTime - seg.startTime < minDuration) {
      // Merge into previous
      prev.endTime = seg.endTime;
      prev.avgEnergy = (prev.avgEnergy + seg.avgEnergy) / 2;
    } else {
      result.push({ ...seg });
    }
  }

  return result;
}
