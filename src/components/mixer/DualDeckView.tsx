import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { WaveformDeck } from '../waveform/WaveformDeck';
import { MixerControls } from './MixerControls';
import { DeckLoadButton } from './DeckLoadButton';
import { DeckDropZone } from './DeckDropZone';
import { MixingTipsPanel } from './MixingTipsPanel';
import { MixDirectionBar } from './MixDirectionBar';
import { BpmMismatchWarning } from './BpmMismatchWarning';
import { BeatSyncButton } from './BeatSyncButton';
import { GuidedMixCard } from '../learning/GuidedMixCard';
import { MixFeedbackCard } from '../learning/MixFeedbackCard';
import { useDeckVolume } from '../../hooks/useDeckVolume';
import { useMixingTips } from '../../hooks/useMixingTips';
import { useBeatSync } from '../../hooks/useBeatSync';
import { useGuidedMix } from '../../hooks/useGuidedMix';
import { useMixFeedback } from '../../hooks/useMixFeedback';
import type { Track, AnalysisResult } from '../../types/track';
import type { DeckId } from '../../types/session';

export interface DeckData {
  track: Track;
  blob: Blob;
  analysis: AnalysisResult | null;
}

interface DualDeckViewProps {
  deckA: DeckData | null;
  deckB: DeckData | null;
  library: { track: Track; analysis: AnalysisResult }[];
  initialPositionA?: number;
  initialPositionB?: number;
  initialCrossfader?: number;
  onPositionChange?: (deck: DeckId, position: number) => void;
  onLoadToDeck: (deck: DeckId) => void;
  onLoadTrackToDeck: (trackId: string, deck: DeckId) => void;
  onUploadFileToDeck: (file: File, deck: DeckId) => void;
  onDismissTip?: (tipId: string) => void;
  dismissedTips?: string[];
  onCrossfaderChange?: (position: number) => void;
  onVolumeChange?: (deck: DeckId, volume: number) => void;
  tutorialEnabled?: boolean;
}

export function DualDeckView({
  deckA,
  deckB,
  library,
  initialPositionA = 0,
  initialPositionB = 0,
  initialCrossfader = 0.5,
  onPositionChange,
  onLoadToDeck,
  onLoadTrackToDeck,
  onUploadFileToDeck,
  onDismissTip,
  dismissedTips = [],
  onCrossfaderChange,
  onVolumeChange,
  tutorialEnabled = true,
}: DualDeckViewProps) {
  const volume = useDeckVolume(initialCrossfader);
  const [deckAPlaying, setDeckAPlaying] = useState(false);
  const [deckBPlaying, setDeckBPlaying] = useState(false);
  const [currentTimeA, setCurrentTimeA] = useState(0);
  const [currentTimeB, setCurrentTimeB] = useState(0);
  const [mixDirection, setMixDirection] = useState<'A→B' | 'B→A'>('A→B');

  // Practice reset state
  const [seekCommandA, setSeekCommandA] = useState<{ time: number; id: number } | undefined>();
  const [seekCommandB, setSeekCommandB] = useState<{ time: number; id: number } | undefined>();
  const [practiceResetBanner, setPracticeResetBanner] = useState<string | null>(null);

  const mainDeck = mixDirection === 'A→B' ? 'A' as const : 'B' as const;
  const incomingDeck = mixDirection === 'A→B' ? 'B' as const : 'A' as const;

  const bothLoaded = deckA !== null && deckB !== null;
  const bothPlaying = deckAPlaying && deckBPlaying;

  const currentTimeMain = mainDeck === 'A' ? currentTimeA : currentTimeB;
  const mainBpm = mainDeck === 'A' ? deckA?.analysis?.bpm : deckB?.analysis?.bpm;

  // Beat Sync
  const beatSync = useBeatSync({
    deckABpm: deckA?.analysis?.bpm ?? null,
    deckBBpm: deckB?.analysis?.bpm ?? null,
    deckAConfidence: deckA?.analysis?.bpmConfidence ?? null,
    deckBConfidence: deckB?.analysis?.bpmConfidence ?? null,
    mainDeck,
  });

  // Guided Mix (disabled when tutorial mode is off)
  const guidedMix = useGuidedMix({
    bothLoaded,
    deckAPlaying,
    deckBPlaying,
    crossfader: volume.crossfader,
    currentTimeA,
    currentTimeB,
    analysisA: deckA?.analysis ?? null,
    analysisB: deckB?.analysis ?? null,
    isBeatSynced: beatSync.isSynced,
    mainDeck,
    incomingDeck,
    dismissedTips,
    onDismissTip: onDismissTip ?? (() => {}),
    disabled: !tutorialEnabled,
  });

  // Normalized crossfader: 0 = all main, 1 = all incoming
  const normalizedCrossfader = mainDeck === 'A' ? volume.crossfader : 1 - volume.crossfader;

  // Mix Feedback
  const mixFeedback = useMixFeedback({
    step: guidedMix.currentStep,
    normalizedCrossfader,
    currentTimeMain,
    isBeatSynced: beatSync.isSynced,
    mixPlan: guidedMix.mixPlan,
    mainBpm: mainBpm ?? null,
  });

  // Mixing Tips (suppressed when guided mix is active)
  const { activeTip } = useMixingTips({
    deckAAnalysis: deckA?.analysis ?? null,
    deckBAnalysis: deckB?.analysis ?? null,
    bothPlaying,
    bothLoaded,
    dismissedTips,
    guidedMixActive: guidedMix.isActive,
  });

  const handleCrossfaderChange = useCallback((value: number) => {
    volume.setCrossfader(value);
    onCrossfaderChange?.(value);
  }, [volume, onCrossfaderChange]);

  const handleDeckAVolumeChange = useCallback((value: number) => {
    volume.setDeckAVolume(value);
    onVolumeChange?.('A', value);
  }, [volume, onVolumeChange]);

  const handleDeckBVolumeChange = useCallback((value: number) => {
    volume.setDeckBVolume(value);
    onVolumeChange?.('B', value);
  }, [volume, onVolumeChange]);

  const handlePositionChangeA = useCallback((pos: number) => {
    setCurrentTimeA(pos);
    onPositionChange?.('A', pos);
  }, [onPositionChange]);

  const loadedTrackIds = [
    deckA?.track.id,
    deckB?.track.id,
  ].filter(Boolean) as string[];

  // Determine which elements to highlight based on guided mix step
  const highlightTarget = tutorialEnabled ? (guidedMix.stepInfo?.highlightTarget ?? null) : null;
  const highlightPlayA = highlightTarget === 'play-a';
  const highlightPlayB = highlightTarget === 'play-b';
  const highlightCrossfader = highlightTarget === 'crossfader';
  const highlightBeatSync = highlightTarget === 'beat-sync';

  // Determine synced BPM display for each deck
  const deckASynced = beatSync.isSynced && beatSync.adjustedDeck === 'A';
  const deckBSynced = beatSync.isSynced && beatSync.adjustedDeck === 'B';

  // Beat-quantized play: compute phase offset so the incoming deck's bar grid aligns with the main deck's.
  const mainBpmVal = mainDeck === 'A' ? deckA?.analysis?.bpm : deckB?.analysis?.bpm;
  const deckBPhaseOffset = useMemo(() => {
    if (!mainBpmVal) return undefined;
    const effectiveBpm = beatSync.isSynced && beatSync.targetBpm ? beatSync.targetBpm : mainBpmVal;
    const barDuration = (60 / effectiveBpm) * 4;
    return currentTimeMain % barDuration;
  }, [mainBpmVal, beatSync.isSynced, beatSync.targetBpm, currentTimeMain]);

  // ─── Practice Reset ───────────────────────────────────────────────────────

  const rafRef = useRef<number | null>(null);
  const seekIdRef = useRef(0);
  const lastResetTimeRef = useRef(0);
  // Prev-value refs for signal detection
  const prevIncomingPlayingRef = useRef(false);
  const prevCurrentTimeIncomingRef = useRef(0);
  const prevNormalizedCFRef = useRef(normalizedCrossfader);
  const prevCFChangeTimeRef = useRef(0);
  const prevBothPlayingRef = useRef(false);

  // Capture stable setters for use in RAF closure
  const setCrossfaderRef = useRef(volume.setCrossfader);
  setCrossfaderRef.current = volume.setCrossfader;
  const onCrossfaderChangeRef = useRef(onCrossfaderChange);
  onCrossfaderChangeRef.current = onCrossfaderChange;

  const triggerPracticeReset = useCallback(() => {
    const now = Date.now();
    if (now - lastResetTimeRef.current < 3000) return; // 3s cooldown
    lastResetTimeRef.current = now;

    // Cue incoming deck 8 beats before the blend drop point
    const incomingBpm = (incomingDeck === 'A' ? deckA?.analysis?.bpm : deckB?.analysis?.bpm) ?? 120;
    const beatDuration = 60 / incomingBpm;
    const startDeckBAt = guidedMix.mixPlan?.startDeckBAt ?? 0;
    const cuePoint = Math.max(0, startDeckBAt - 8 * beatDuration);

    seekIdRef.current += 1;
    const seekId = seekIdRef.current;
    if (incomingDeck === 'A') {
      setSeekCommandA({ time: cuePoint, id: seekId });
    } else {
      setSeekCommandB({ time: cuePoint, id: seekId });
    }

    // Animate crossfader back to main side over 600ms
    const target = mainDeck === 'A' ? 0 : 1;
    const startVal = volume.crossfader;
    const startTime = performance.now();
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    function step(now: number) {
      const t = Math.min((now - startTime) / 600, 1);
      const eased = 1 - (1 - t) ** 3;
      const val = startVal + (target - startVal) * eased;
      setCrossfaderRef.current(val);
      onCrossfaderChangeRef.current?.(val);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }
    rafRef.current = requestAnimationFrame(step);

    // Show transient banner for 3 seconds
    setPracticeResetBanner('Resetting for another attempt — get ready!');
    setTimeout(() => setPracticeResetBanner(null), 3000);
  }, [incomingDeck, mainDeck, deckA, deckB, guidedMix.mixPlan, volume.crossfader]);

  // Store latest triggerPracticeReset in ref to avoid stale closure in detection effect
  const triggerPracticeResetRef = useRef(triggerPracticeReset);
  triggerPracticeResetRef.current = triggerPracticeReset;

  const currentTimeIncoming = incomingDeck === 'A' ? currentTimeA : currentTimeB;
  const incomingDeckPlaying = incomingDeck === 'A' ? deckAPlaying : deckBPlaying;

  // Practice reset detection — fires on relevant signal changes
  useEffect(() => {
    const activeStep = guidedMix.currentStep;
    const isActivePhase = activeStep === 'blend' || activeStep === 'mixing' || activeStep === 'complete';

    if (isActivePhase) {
      // Signal 1: incoming deck paused mid-mix
      if (prevIncomingPlayingRef.current && !incomingDeckPlaying && normalizedCrossfader > 0.35) {
        triggerPracticeResetRef.current();
      }

      // Signal 2: large backward seek on incoming deck
      const timeDelta = currentTimeIncoming - prevCurrentTimeIncomingRef.current;
      if (timeDelta < -1.5) {
        triggerPracticeResetRef.current();
      }

      // Signal 3: crossfader rapidly pulled back toward main
      const cfDelta = normalizedCrossfader - prevNormalizedCFRef.current;
      const cfTime = Date.now() - prevCFChangeTimeRef.current;
      if (incomingDeckPlaying && cfDelta < -0.25 && cfTime < 1000) {
        triggerPracticeResetRef.current();
      }

      // Signal 4: both decks paused simultaneously during blend/mixing
      if ((activeStep === 'blend' || activeStep === 'mixing') &&
          prevBothPlayingRef.current && !deckAPlaying && !deckBPlaying) {
        triggerPracticeResetRef.current();
      }
    }

    // Update prev value refs
    prevIncomingPlayingRef.current = incomingDeckPlaying;
    prevCurrentTimeIncomingRef.current = currentTimeIncoming;
    if (Math.abs(normalizedCrossfader - prevNormalizedCFRef.current) > 0.01) {
      prevNormalizedCFRef.current = normalizedCrossfader;
      prevCFChangeTimeRef.current = Date.now();
    }
    prevBothPlayingRef.current = deckAPlaying && deckBPlaying;
  }, [incomingDeckPlaying, currentTimeIncoming, normalizedCrossfader, deckAPlaying, deckBPlaying, guidedMix.currentStep]);

  // Handle "Try Again": clear feedback + trigger reset
  const handleTryAgain = useCallback(() => {
    mixFeedback.clearFeedback();
    triggerPracticeReset();
  }, [mixFeedback, triggerPracticeReset]);

  return (
    <div className="space-y-3">
      {/* Practice Reset Banner */}
      {practiceResetBanner && (
        <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-yellow-500/15 border border-yellow-400/30 animate-in fade-in slide-in-from-top-2 duration-300">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-yellow-400 shrink-0">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          <span className="text-xs font-medium text-yellow-400">{practiceResetBanner}</span>
        </div>
      )}

      {/* Mix Feedback Card (takes precedence over GuidedMixCard) */}
      {mixFeedback.feedback ? (
        <MixFeedbackCard
          feedback={mixFeedback.feedback}
          onTryAgain={handleTryAgain}
          onDismiss={mixFeedback.clearFeedback}
        />
      ) : (
        /* Guided Mix Card */
        guidedMix.isActive && guidedMix.stepInfo && (
          <GuidedMixCard
            stepInfo={guidedMix.stepInfo}
            stepNumber={guidedMix.stepNumber}
            totalSteps={guidedMix.totalSteps}
            onDismiss={guidedMix.dismiss}
          />
        )
      )}

      {/* Mix direction indicator — shown when both decks are loaded */}
      {bothLoaded && (
        <MixDirectionBar
          mainDeck={mainDeck}
          incomingDeck={incomingDeck}
          onFlip={() => setMixDirection(d => d === 'A→B' ? 'B→A' : 'A→B')}
          deckAName={deckA?.track.name}
          deckBName={deckB?.track.name}
          tutorialEnabled={tutorialEnabled}
        />
      )}

      {/* Deck row: side-by-side */}
      <div className="grid grid-cols-2 gap-3">
        <DeckDropZone deck="A" onDropTrack={(id) => onLoadTrackToDeck(id, 'A')}>
          {deckA ? (
            <WaveformDeck
              track={deckA.track}
              blob={deckA.blob}
              analysis={deckA.analysis}
              initialPosition={initialPositionA}
              onPositionChange={handlePositionChangeA}
              onDismissTip={onDismissTip}
              dismissedTips={dismissedTips}
              showLearning={false}
              volume={volume.effectiveA}
              deckLabel="A"
              compact={true}
              onPlayStateChange={setDeckAPlaying}
              playbackRate={beatSync.syncedRateA}
              highlightPlay={highlightPlayA}
              isSynced={deckASynced}
              adjustedBpm={deckASynced ? beatSync.adjustedBpm : null}
              quantizePlay={guidedMix.isActive && incomingDeck === 'A'}
              quantizeBpm={deckA.analysis?.bpm}
              phaseOffsetTime={incomingDeck === 'A' ? deckBPhaseOffset : undefined}
              countdownOverlay={incomingDeck === 'A' ? guidedMix.deckBCountdown : null}
              seekCommand={seekCommandA}
            />
          ) : (
            <DeckLoadButton
              deckLabel="A"
              onLoad={() => onLoadToDeck('A')}
              onUploadFile={(f) => onUploadFileToDeck(f, 'A')}
            />
          )}
        </DeckDropZone>

        <DeckDropZone deck="B" onDropTrack={(id) => onLoadTrackToDeck(id, 'B')}>
          {deckB ? (
            <WaveformDeck
              track={deckB.track}
              blob={deckB.blob}
              analysis={deckB.analysis}
              initialPosition={initialPositionB}
              onPositionChange={(pos) => { setCurrentTimeB(pos); onPositionChange?.('B', pos); }}
              onDismissTip={onDismissTip}
              dismissedTips={dismissedTips}
              showLearning={false}
              volume={volume.effectiveB}
              deckLabel="B"
              compact={true}
              onPlayStateChange={setDeckBPlaying}
              playbackRate={beatSync.syncedRateB}
              highlightPlay={highlightPlayB}
              isSynced={deckBSynced}
              adjustedBpm={deckBSynced ? beatSync.adjustedBpm : null}
              quantizePlay={guidedMix.isActive && incomingDeck === 'B'}
              quantizeBpm={deckB.analysis?.bpm}
              phaseOffsetTime={incomingDeck === 'B' ? deckBPhaseOffset : undefined}
              countdownOverlay={incomingDeck === 'B' ? guidedMix.deckBCountdown : null}
              seekCommand={seekCommandB}
            />
          ) : (
            <DeckLoadButton
              deckLabel="B"
              onLoad={() => onLoadToDeck('B')}
              onUploadFile={(f) => onUploadFileToDeck(f, 'B')}
            />
          )}
        </DeckDropZone>
      </div>

      {/* Beat Sync Button */}
      {bothLoaded && (
        <div className="flex justify-center">
          <BeatSyncButton
            isSynced={beatSync.isSynced}
            canSync={beatSync.canSync}
            onToggle={beatSync.toggleSync}
            isHighlighted={highlightBeatSync}
            bpmGapWarning={beatSync.bpmGapWarning}
            bpmDiff={
              deckA?.analysis && deckB?.analysis
                ? Math.abs(deckA.analysis.bpm - deckB.analysis.bpm)
                : undefined
            }
          />
        </div>
      )}

      {/* Mixer controls: full width below decks */}
      {(deckA || deckB) && (
        <MixerControls
          deckAVolume={volume.deckAVolume}
          deckBVolume={volume.deckBVolume}
          crossfader={volume.crossfader}
          onDeckAVolumeChange={handleDeckAVolumeChange}
          onDeckBVolumeChange={handleDeckBVolumeChange}
          onCrossfaderChange={handleCrossfaderChange}
          highlightCrossfader={highlightCrossfader}
          crossfaderTarget={tutorialEnabled ? guidedMix.crossfaderTarget : null}
        />
      )}

      {/* BPM Mismatch Warning */}
      {bothLoaded && deckA!.analysis && deckB!.analysis && (
        <BpmMismatchWarning
          deckAAnalysis={deckA!.analysis}
          deckBAnalysis={deckB!.analysis}
          library={library}
          loadedTrackIds={loadedTrackIds}
          onLoadToDeck={onLoadTrackToDeck}
          isBeatSynced={beatSync.isSynced}
        />
      )}

      {/* Mixing Tips */}
      {bothLoaded && (
        <MixingTipsPanel
          tip={activeTip}
          onDismiss={(tipId) => onDismissTip?.(tipId)}
        />
      )}
    </div>
  );
}
