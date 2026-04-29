import type { Track, AnalysisResult } from '../types/track';

export interface TrackRecommendation {
  description: string;
  bpmRange: [number, number];
  energyLevel: 'low' | 'medium' | 'high';
  tips: string[];
}

export function getNextTrackRecommendation(analysis: AnalysisResult): TrackRecommendation {
  const { bpm, segments } = analysis;

  // Compute average energy of the track
  const avgEnergy = analysis.energyCurve.length > 0
    ? analysis.energyCurve.reduce((a, b) => a + b, 0) / analysis.energyCurve.length
    : 0.5;

  const energyLevel: 'low' | 'medium' | 'high' =
    avgEnergy > 0.6 ? 'high' : avgEnergy > 0.35 ? 'medium' : 'low';

  // BPM range: +/- 3% for easy beatmatching
  const bpmLow = Math.round(bpm * 0.97);
  const bpmHigh = Math.round(bpm * 1.03);

  const hasCleanOutro = segments.some(s => s.type === 'outro' && (s.endTime - s.startTime) > 8);
  const hasCleanIntro = segments.some(s => s.type === 'intro' && (s.endTime - s.startTime) > 8);

  const tips: string[] = [];

  if (energyLevel === 'high') {
    tips.push('Look for a track with similar high energy to maintain the vibe');
    tips.push('Or pick something slightly lower energy for a smooth cooldown');
  } else if (energyLevel === 'low') {
    tips.push('Great time to build energy — look for a track with a strong buildup');
  } else {
    tips.push('You have flexibility here — match the energy or shift it up/down');
  }

  if (hasCleanOutro) {
    tips.push('This track has a clean outro — perfect for a long, smooth blend');
  } else {
    tips.push('Short outro — consider using a quick cut or echo-out transition');
  }

  const description = `Look for a track around ${bpmLow}–${bpmHigh} BPM with ${energyLevel} energy${
    hasCleanIntro ? ' and a clean intro for easy mixing' : ''
  }.`;

  return { description, bpmRange: [bpmLow, bpmHigh], energyLevel, tips };
}

export function getTransitionSuggestions(analysis: AnalysisResult): {
  mixPoint: number;
  style: string;
  description: string;
}[] {
  const suggestions: { mixPoint: number; style: string; description: string }[] = [];
  const { segments } = analysis;

  // Find the outro
  const outro = segments.find(s => s.type === 'outro');
  if (outro) {
    const outroDuration = outro.endTime - outro.startTime;
    if (outroDuration > 16) {
      suggestions.push({
        mixPoint: outro.startTime,
        style: 'Long blend (intro-over-outro)',
        description: `Start your next track here. The ${Math.round(outroDuration)}s outro gives you plenty of time for a smooth blend.`,
      });
    } else if (outroDuration > 8) {
      suggestions.push({
        mixPoint: outro.startTime,
        style: 'EQ swap',
        description: `Swap the bass EQ here — bring in the next track's bass while cutting this one.`,
      });
    } else {
      suggestions.push({
        mixPoint: outro.startTime,
        style: 'Quick cut / Echo out',
        description: `Short outro — use an echo effect or a clean cut to transition.`,
      });
    }
  }

  // Find the last chorus for an energy-based transition point
  const choruses = segments.filter(s => s.type === 'chorus');
  if (choruses.length > 0) {
    const lastChorus = choruses[choruses.length - 1];
    const mixStart = Math.max(0, lastChorus.endTime - 16);
    suggestions.push({
      mixPoint: mixStart,
      style: 'Volume fade during chorus end',
      description: `Start fading in the next track 16 bars before the chorus ends for a dramatic transition.`,
    });
  }

  // Find breakdowns as potential mix-in points
  const breakdowns = segments.filter(s => s.type === 'breakdown');
  if (breakdowns.length > 0) {
    const lastBreakdown = breakdowns[breakdowns.length - 1];
    suggestions.push({
      mixPoint: lastBreakdown.startTime,
      style: 'Mix during breakdown',
      description: `The breakdown is quieter — a great spot to sneak in the next track underneath.`,
    });
  }

  return suggestions;
}

export function findCompatibleTracks(
  targetBpm: number,
  library: { track: Track; analysis: AnalysisResult }[],
  excludeIds: string[]
): { track: Track; analysis: AnalysisResult; bpmDiff: number }[] {
  return library
    .filter(item => !excludeIds.includes(item.track.id))
    .map(item => ({
      ...item,
      bpmDiff: Math.abs(item.analysis.bpm - targetBpm),
    }))
    .filter(item => item.bpmDiff <= 5)
    .sort((a, b) => a.bpmDiff - b.bpmDiff)
    .slice(0, 3);
}
