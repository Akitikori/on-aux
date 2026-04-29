import type { AnalysisResult } from '../types/track';
import { formatTime } from '../utils/formatTime';

export interface MixPlan {
  /** Time in Track A to start the transition */
  mixPointA: number;
  /** When to press play on Deck B (in Track A's timeline) */
  startDeckBAt: number;
  /** How long the overlap/blend lasts */
  blendDuration: number;
  /** Transition style based on outro/intro analysis */
  transitionStyle: 'long-blend' | 'eq-swap' | 'quick-cut';
  /** Track A's outro segment info */
  outroA: { start: number; end: number; duration: number } | null;
  /** Track B's intro segment info */
  introB: { start: number; end: number; duration: number } | null;
  /** Human-readable description of the planned transition */
  description: string;
}

/**
 * Compute an optimal mix plan between two tracks based on their structural analysis.
 * Finds the best exit point in Track A and calculates when to start Track B
 * so the intro overlaps the outro for a smooth blend.
 */
export function computeMixPlan(
  analysisA: AnalysisResult,
  analysisB: AnalysisResult
): MixPlan {
  const segmentsA = analysisA.segments;
  const segmentsB = analysisB.segments;

  // Find Track A's best exit point
  const outroA = segmentsA.find(s => s.type === 'outro');
  const lastBreakdownA = [...segmentsA].reverse().find(s => s.type === 'breakdown');
  const lastChorusA = [...segmentsA].reverse().find(s => s.type === 'chorus');

  // Find Track B's intro
  const introB = segmentsB.find(s => s.type === 'intro');

  // Determine mix point on Track A
  let mixPointA: number;
  let outroInfo: MixPlan['outroA'] = null;

  if (outroA) {
    // Prefer the outro start as the mix point
    mixPointA = outroA.startTime;
    outroInfo = {
      start: outroA.startTime,
      end: outroA.endTime,
      duration: outroA.endTime - outroA.startTime,
    };
  } else if (lastBreakdownA && lastBreakdownA.startTime > analysisA.energyCurve.length * 0.1 * 0.5) {
    // Use last breakdown as mix point
    mixPointA = lastBreakdownA.startTime;
  } else if (lastChorusA) {
    // Mix toward end of last chorus
    mixPointA = Math.max(0, lastChorusA.endTime - 16);
  } else {
    // Fallback: last 25% of the track
    const trackDuration = segmentsA.length > 0
      ? segmentsA[segmentsA.length - 1].endTime
      : 0;
    mixPointA = trackDuration * 0.75;
  }

  // Determine Track B intro info
  let introInfo: MixPlan['introB'] = null;
  let introDuration = 8; // default blend time

  if (introB) {
    introDuration = introB.endTime - introB.startTime;
    introInfo = {
      start: introB.startTime,
      end: introB.endTime,
      duration: introDuration,
    };
  }

  // Calculate blend duration
  const outroDuration = outroInfo?.duration ?? 15;
  const blendDuration = Math.min(outroDuration, introDuration, 30);

  // When to start Deck B: enough time for B's intro to overlap A's exit
  const startDeckBAt = Math.max(0, mixPointA - (introDuration > blendDuration ? blendDuration : 0));

  // Determine transition style
  let transitionStyle: MixPlan['transitionStyle'];
  if (blendDuration > 16) {
    transitionStyle = 'long-blend';
  } else if (blendDuration > 8) {
    transitionStyle = 'eq-swap';
  } else {
    transitionStyle = 'quick-cut';
  }

  // Build description
  const description = buildDescription(
    mixPointA,
    blendDuration,
    transitionStyle,
    outroInfo,
    introInfo
  );

  return {
    mixPointA,
    startDeckBAt,
    blendDuration,
    transitionStyle,
    outroA: outroInfo,
    introB: introInfo,
    description,
  };
}

function buildDescription(
  mixPointA: number,
  blendDuration: number,
  style: MixPlan['transitionStyle'],
  outroA: MixPlan['outroA'],
  introB: MixPlan['introB']
): string {
  const parts: string[] = [];

  if (outroA) {
    parts.push(`Track A's outro starts at ${formatTime(outroA.start)} (${Math.round(outroA.duration)}s long).`);
  } else {
    parts.push(`Best transition point at ${formatTime(mixPointA)}.`);
  }

  if (introB) {
    parts.push(`Track B has a ${Math.round(introB.duration)}s intro that'll blend over A's exit.`);
  }

  if (style === 'long-blend') {
    parts.push(`This gives you a smooth ${Math.round(blendDuration)}s blend — plenty of time to crossfade.`);
  } else if (style === 'eq-swap') {
    parts.push(`You have about ${Math.round(blendDuration)}s for the blend — a quick crossfade works well here.`);
  } else {
    parts.push(`Short overlap — use a quick crossfade or cut.`);
  }

  return parts.join(' ');
}
