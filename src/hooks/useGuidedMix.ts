import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { computeMixPlan, type MixPlan } from '../audio/mixPlanner';
import { formatTime } from '../utils/formatTime';
import type { AnalysisResult } from '../types/track';
import type { DeckId } from '../types/session';

export type GuidedMixStep =
  | 'inactive'
  | 'sync-first'
  | 'ready'
  | 'listening'
  | 'prep-crossfader'
  | 'start-b'
  | 'blend'
  | 'mixing'
  | 'complete';

interface StepInfo {
  title: string;
  body: string;
  actionPrompt: string;
  highlightTarget: 'play-a' | 'play-b' | 'crossfader' | 'beat-sync' | null;
  countdown: number | null;
  urgency: 'normal' | 'soon' | 'now';
}

interface UseGuidedMixInput {
  bothLoaded: boolean;
  deckAPlaying: boolean;
  deckBPlaying: boolean;
  crossfader: number;
  currentTimeA: number;
  currentTimeB: number;
  analysisA: AnalysisResult | null;
  analysisB: AnalysisResult | null;
  isBeatSynced: boolean;
  mainDeck: DeckId;
  incomingDeck: DeckId;
  dismissedTips: string[];
  onDismissTip: (tipId: string) => void;
  disabled?: boolean;
}

interface UseGuidedMixReturn {
  currentStep: GuidedMixStep;
  stepInfo: StepInfo | null;
  isActive: boolean;
  dismiss: () => void;
  stepNumber: number;
  totalSteps: number;
  mixPlan: MixPlan | null;
  deckBCountdown: { seconds: number; label: string } | null;
  crossfaderTarget: number | null;
}

const COMPLETED_KEY = 'guided-first-mix-completed';
const DISMISSED_KEY = 'guided-first-mix-dismissed';

// Hysteresis thresholds to prevent flickering at boundaries
const THRESHOLDS = {
  crossfaderASide:     { forward: 0.15, backward: 0.10 },
  crossfaderCenter:    { forward: 0.35, backward: 0.25 },
  crossfaderBSide:     { forward: 0.85, backward: 0.80 },
  approachTime:        { forward: 15,   backward: 20 },
};

interface ResolveConditions {
  bothLoaded: boolean;
  isCompleted: boolean;
  isDismissed: boolean;
  bpmsClose: boolean;
  isBeatSynced: boolean;
  mainDeckPlaying: boolean;
  incomingDeckPlaying: boolean;
  // normalizedCrossfader: 0 = all main, 1 = all incoming
  normalizedCrossfader: number;
  currentTimeMain: number;
  mixPointMain: number | null;
}

const STEP_ORDER: GuidedMixStep[] = [
  'inactive', 'sync-first', 'ready', 'listening',
  'prep-crossfader', 'start-b', 'blend', 'mixing', 'complete',
];

function stepIndex(step: GuidedMixStep): number {
  return STEP_ORDER.indexOf(step);
}

/**
 * Pure function that determines the correct step based on current conditions.
 * Uses hysteresis: wider thresholds for backward transitions to prevent flickering.
 * normalizedCrossfader: 0 = all main deck, 1 = all incoming deck
 */
function resolveStep(prev: GuidedMixStep, c: ResolveConditions): GuidedMixStep {
  // Guard: inactive conditions
  if (!c.bothLoaded || c.isCompleted || c.isDismissed) return 'inactive';

  // If BPMs are far apart and not synced, need sync first
  if (!c.bpmsClose && !c.isBeatSynced) return 'sync-first';

  // Main deck not playing → ready
  if (!c.mainDeckPlaying) return 'ready';

  // Main deck is playing — check if approaching mix point
  if (c.mixPointMain != null) {
    const isMovingBackward = stepIndex(prev) > stepIndex('listening');
    const buffer = isMovingBackward ? THRESHOLDS.approachTime.backward : THRESHOLDS.approachTime.forward;
    const approachTime = c.mixPointMain - buffer;

    if (c.currentTimeMain < approachTime && c.currentTimeMain > 0) {
      return 'listening';
    }
  } else {
    return 'listening';
  }

  // Past approach time — check incoming deck and crossfader
  if (!c.incomingDeckPlaying) {
    const isMovingBackward = stepIndex(prev) > stepIndex('prep-crossfader');
    const threshold = isMovingBackward ? THRESHOLDS.crossfaderASide.backward : THRESHOLDS.crossfaderASide.forward;

    if (c.normalizedCrossfader >= threshold) {
      return 'prep-crossfader';
    }
    return 'start-b';
  }

  // Both decks playing — check crossfader position for blend progress
  const isFromMixing = stepIndex(prev) >= stepIndex('mixing');
  const centerThreshold = isFromMixing ? THRESHOLDS.crossfaderCenter.backward : THRESHOLDS.crossfaderCenter.forward;

  if (c.normalizedCrossfader < centerThreshold) {
    return 'blend';
  }

  const isFromComplete = prev === 'complete';
  const bSideThreshold = isFromComplete ? THRESHOLDS.crossfaderBSide.backward : THRESHOLDS.crossfaderBSide.forward;

  if (c.normalizedCrossfader <= bSideThreshold) {
    return 'mixing';
  }

  return 'complete';
}

export function useGuidedMix({
  bothLoaded,
  deckAPlaying,
  deckBPlaying,
  crossfader,
  currentTimeA,
  currentTimeB,
  analysisA,
  analysisB,
  isBeatSynced,
  mainDeck,
  incomingDeck,
  dismissedTips,
  onDismissTip,
  disabled = false,
}: UseGuidedMixInput): UseGuidedMixReturn {
  const [step, setStep] = useState<GuidedMixStep>('inactive');
  const stepRef = useRef(step);
  stepRef.current = step;

  // Derive main/incoming analysis and times
  const analysisMain = mainDeck === 'A' ? analysisA : analysisB;
  const analysisIncoming = mainDeck === 'A' ? analysisB : analysisA;
  const currentTimeMain = mainDeck === 'A' ? currentTimeA : currentTimeB;
  const mainDeckPlaying = mainDeck === 'A' ? deckAPlaying : deckBPlaying;
  const incomingDeckPlaying = mainDeck === 'A' ? deckBPlaying : deckAPlaying;

  // Normalize crossfader: 0 = all main, 1 = all incoming
  // When main is A: crossfader 0=A,1=B — already normalized
  // When main is B: crossfader 0=A,1=B — needs to flip: 0=B=main, so 1-crossfader
  const normalizedCrossfader = mainDeck === 'A' ? crossfader : 1 - crossfader;

  // Compute mix plan using main→incoming order
  const mixPlan = useMemo(() => {
    if (analysisMain && analysisIncoming) {
      return computeMixPlan(analysisMain, analysisIncoming);
    }
    return null;
  }, [analysisMain, analysisIncoming]);

  // Check if guide should be active
  const isCompleted = dismissedTips.includes(COMPLETED_KEY);
  const isDismissed = dismissedTips.includes(DISMISSED_KEY);
  const bpmsClose = analysisA && analysisB
    ? Math.abs(analysisA.bpm - analysisB.bpm) <= 10
    : false;

  // Single reactive effect that resolves the correct step
  useEffect(() => {
    if (disabled) {
      if (stepRef.current !== 'inactive') setStep('inactive');
      return;
    }
    const newStep = resolveStep(stepRef.current, {
      bothLoaded,
      isCompleted,
      isDismissed,
      bpmsClose,
      isBeatSynced,
      mainDeckPlaying,
      incomingDeckPlaying,
      normalizedCrossfader,
      currentTimeMain,
      mixPointMain: mixPlan?.mixPointA ?? null,
    });

    if (newStep !== stepRef.current) {
      setStep(newStep);
    }
  }, [disabled, bothLoaded, isCompleted, isDismissed, bpmsClose, isBeatSynced,
      mainDeckPlaying, incomingDeckPlaying, normalizedCrossfader, currentTimeMain, mixPlan]);

  // Mark complete when reaching complete step
  useEffect(() => {
    if (step === 'complete') {
      onDismissTip(COMPLETED_KEY);
    }
  }, [step, onDismissTip]);

  const dismiss = useCallback(() => {
    setStep('inactive');
    onDismissTip(DISMISSED_KEY);
  }, [onDismissTip]);

  const isActive = step !== 'inactive' && step !== 'complete';

  // Highlight targets mapped to actual deck IDs
  const mainPlayTarget: StepInfo['highlightTarget'] = mainDeck === 'A' ? 'play-a' : 'play-b';
  const incomingPlayTarget: StepInfo['highlightTarget'] = incomingDeck === 'A' ? 'play-a' : 'play-b';

  // Generate step info with countdown and urgency
  const stepInfo = useMemo((): StepInfo | null => {
    if (step === 'inactive') return null;

    const M = mainDeck;
    const I = incomingDeck;

    switch (step) {
      case 'sync-first':
        return {
          title: 'Match the Tempos',
          body: 'These tracks have different BPMs. Press Sync to match their speeds so they play at the same tempo.',
          actionPrompt: 'Press the Sync button',
          highlightTarget: 'beat-sync',
          countdown: null,
          urgency: 'normal',
        };

      case 'ready':
        return {
          title: 'Ready to Mix!',
          body: mixPlan
            ? `We've analyzed both tracks and found the perfect transition point. ${mixPlan.description}`
            : `Both tracks are loaded. Let's walk through your first transition!`,
          actionPrompt: `Press Play on Deck ${M} to start`,
          highlightTarget: mainPlayTarget,
          countdown: null,
          urgency: 'normal',
        };

      case 'listening': {
        const mixTime = mixPlan?.mixPointA ?? 0;
        const timeUntil = Math.max(0, mixTime - currentTimeMain);
        const countdown = timeUntil <= 10 ? Math.ceil(timeUntil) : null;
        const urgency: StepInfo['urgency'] = timeUntil <= 3 ? 'now' : timeUntil <= 10 ? 'soon' : 'normal';

        return {
          title: `Listening to Deck ${M}`,
          body: mixPlan
            ? `The transition point is at ${formatTime(mixTime)}. ${
                timeUntil > 20
                  ? `That's about ${Math.round(timeUntil)}s away. Keep listening...`
                  : timeUntil > 5
                    ? `Coming up in ${Math.round(timeUntil)}s! Get ready...`
                    : 'Almost there!'
              }`
            : 'Let it play for a bit. Listen to the rhythm and energy.',
          actionPrompt: timeUntil > 15 ? 'Keep listening...' : 'Get ready!',
          highlightTarget: null,
          countdown,
          urgency,
        };
      }

      case 'prep-crossfader': {
        const mainSide = M === 'A' ? 'left (A side)' : 'right (B side)';
        return {
          title: 'Prepare the Crossfader',
          body: `The transition point is coming up! Move the crossfader all the way to the ${M} side — this ensures you only hear Deck ${M} when you start Deck ${I}.`,
          actionPrompt: `Slide the crossfader to the ${mainSide}`,
          highlightTarget: 'crossfader',
          countdown: null,
          urgency: 'soon',
        };
      }

      case 'start-b': {
        const introNote = mixPlan?.introB
          ? ` It has a ${Math.round(mixPlan.introB.duration)}s intro that'll blend over Deck ${M}'s exit.`
          : '';
        return {
          title: `Start Deck ${I}!`,
          body: `Press Play on Deck ${I} now!${introNote} You won't hear it yet because the crossfader is on Deck ${M}'s side.`,
          actionPrompt: `Press Play on Deck ${I}`,
          highlightTarget: incomingPlayTarget,
          countdown: null,
          urgency: 'now',
        };
      }

      case 'blend': {
        const blendTime = mixPlan?.blendDuration ?? 15;
        return {
          title: 'Begin the Blend',
          body: `Both tracks are running! Now slowly slide the crossfader toward the center over about ${Math.round(blendTime)} seconds. You'll start hearing Deck ${I} come in underneath Deck ${M}.`,
          actionPrompt: 'Slowly move the crossfader to the center',
          highlightTarget: 'crossfader',
          countdown: null,
          urgency: 'normal',
        };
      }

      case 'mixing':
        return {
          title: "You're Mixing!",
          body: `You're doing it! Both tracks are playing together — this is what DJs call "in the mix." When you're ready, keep sliding the crossfader toward Deck ${I} to complete the transition.`,
          actionPrompt: `Slide the crossfader to the ${I} side to finish`,
          highlightTarget: 'crossfader',
          countdown: null,
          urgency: 'normal',
        };

      case 'complete':
        return {
          title: 'Transition Complete!',
          body: `You just completed your first DJ transition! Deck ${I} is now the main track. You can keep practicing by loading new tracks and mixing between them.`,
          actionPrompt: '',
          highlightTarget: null,
          countdown: null,
          urgency: 'normal',
        };

      default:
        return null;
    }
  }, [step, mixPlan, currentTimeMain, mainDeck, incomingDeck, mainPlayTarget, incomingPlayTarget]);

  const stepNumber = getStepNumber(step);
  const totalSteps = 7;

  // Crossfader target — expressed as actual slider value (0=A, 1=B)
  // When main is A: 0=main side, 1=incoming side — targets are direct
  // When main is B: 0=incoming side, 1=main side — targets are flipped
  const crossfaderTarget = useMemo((): number | null => {
    const mainSide = mainDeck === 'A' ? 0.0 : 1.0;
    const incomingSide = mainDeck === 'A' ? 1.0 : 0.0;
    switch (step) {
      case 'prep-crossfader': return mainSide;
      case 'start-b': return mainSide;
      case 'blend': return 0.5;
      case 'mixing': return mainDeck === 'A' ? 0.75 : 0.25;
      case 'complete': return incomingSide;
      default: return null;
    }
  }, [step, mainDeck]);

  // Countdown overlay for incoming deck waveform — phase-aligned to main deck's beat grid.
  const deckBCountdown = useMemo((): UseGuidedMixReturn['deckBCountdown'] => {
    if (step !== 'prep-crossfader' && step !== 'start-b' && step !== 'listening') return null;
    if (!mixPlan?.startDeckBAt) return null;

    const bpm = analysisMain?.bpm ?? 120;
    const beatDuration = 60 / bpm;

    const currentBeatIndex = Math.floor(currentTimeMain / beatDuration);
    const targetBeatIndex = Math.floor(mixPlan.startDeckBAt / beatDuration);
    const beatsRemaining = targetBeatIndex - currentBeatIndex;

    if (step === 'listening') {
      if (beatsRemaining <= 8 && beatsRemaining > 4) {
        return { seconds: beatsRemaining, label: 'Get ready...' };
      }
      if (beatsRemaining <= 4 && beatsRemaining > 0) {
        return { seconds: beatsRemaining, label: `Press play in ${beatsRemaining}...` };
      }
      return null;
    }

    if (beatsRemaining > 8) {
      return { seconds: beatsRemaining, label: 'Get ready...' };
    }
    if (beatsRemaining > 0) {
      return { seconds: beatsRemaining, label: `Press play in ${beatsRemaining}...` };
    }
    return { seconds: 0, label: 'PLAY NOW!' };
  }, [step, mixPlan, currentTimeMain, analysisMain]);

  return {
    currentStep: step,
    stepInfo,
    isActive,
    dismiss,
    stepNumber,
    totalSteps,
    mixPlan,
    deckBCountdown,
    crossfaderTarget,
  };
}

function getStepNumber(step: GuidedMixStep): number {
  switch (step) {
    case 'sync-first': return 1;
    case 'ready': return 1;
    case 'listening': return 2;
    case 'prep-crossfader': return 3;
    case 'start-b': return 4;
    case 'blend': return 5;
    case 'mixing': return 6;
    case 'complete': return 7;
    default: return 0;
  }
}
