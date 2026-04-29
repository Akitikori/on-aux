import { useState, useEffect } from 'react';
import type { AnalysisResult } from '../types/track';
import type { LearningTip } from '../types/tips';

const mixingTipCatalog: (LearningTip & { condition: string })[] = [
  {
    id: 'mix-first-time',
    title: 'Your First Mix!',
    body: 'You have two tracks loaded! Try pressing play on both decks, then use the crossfader to blend between them. Slide it slowly from one side to the other.',
    condition: 'first-mix',
  },
  {
    id: 'mix-volume-tip',
    title: 'Volume vs Crossfader',
    body: 'The volume sliders control each deck independently. The crossfader blends between them. Start with volumes at max and use only the crossfader.',
    condition: 'first-mix',
  },
  {
    id: 'mix-bpm-mismatch',
    title: 'BPM Mismatch',
    body: 'These tracks have very different tempos. Mixing will sound off-beat. Try tracks within 5-10 BPM of each other for smoother blends.',
    condition: 'bpm-mismatch',
  },
  {
    id: 'mix-both-playing',
    title: 'Both Decks Playing',
    body: 'Listen carefully! If both tracks clash, try fading one out. Use the crossfader or lower one deck\'s volume to find the sweet spot.',
    condition: 'both-playing',
  },
  {
    id: 'mix-energy-clash',
    title: 'Energy Levels Clashing',
    body: 'Both tracks are in high-energy sections. Try mixing during a breakdown or outro where the energy is lower for smoother transitions.',
    condition: 'energy-clash',
  },
];

interface MixingTipsInput {
  deckAAnalysis: AnalysisResult | null;
  deckBAnalysis: AnalysisResult | null;
  bothPlaying: boolean;
  bothLoaded: boolean;
  dismissedTips: string[];
  guidedMixActive?: boolean;
}

export function useMixingTips({
  deckAAnalysis,
  deckBAnalysis,
  bothPlaying,
  bothLoaded,
  dismissedTips,
  guidedMixActive,
}: MixingTipsInput) {
  const [activeTip, setActiveTip] = useState<LearningTip | null>(null);

  useEffect(() => {
    // Suppress mixing tips when guided mix is active
    if (!bothLoaded || guidedMixActive) {
      setActiveTip(null);
      return;
    }

    const bpmDiff = deckAAnalysis && deckBAnalysis
      ? Math.abs(deckAAnalysis.bpm - deckBAnalysis.bpm)
      : 0;

    // Determine active conditions
    const conditions = new Set<string>();
    conditions.add('first-mix');
    if (bpmDiff > 10) conditions.add('bpm-mismatch');
    if (bothPlaying) conditions.add('both-playing');

    // Find first non-dismissed tip matching a condition
    const tip = mixingTipCatalog.find(
      t => conditions.has(t.condition) && !dismissedTips.includes(t.id)
    );

    setActiveTip(tip ?? null);
  }, [deckAAnalysis, deckBAnalysis, bothPlaying, bothLoaded, dismissedTips]);

  return { activeTip };
}
