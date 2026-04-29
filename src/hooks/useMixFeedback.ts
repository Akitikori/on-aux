import { useState, useEffect, useRef, useCallback } from 'react';
import type { MixPlan } from '../audio/mixPlanner';

export interface MixFeedbackResult {
  rating: 'seamless' | 'solid' | 'keep-practicing';
  score: number;
  timingTip: string | null;
  smoothnessTip: string | null;
  syncTip: string | null;
}

interface UseMixFeedbackInput {
  step: string;
  normalizedCrossfader: number;
  currentTimeMain: number;
  isBeatSynced: boolean;
  mixPlan: MixPlan | null;
  mainBpm: number | null;
}

export function useMixFeedback({
  step,
  normalizedCrossfader,
  currentTimeMain,
  isBeatSynced,
  mixPlan,
  mainBpm,
}: UseMixFeedbackInput) {
  const [feedback, setFeedback] = useState<MixFeedbackResult | null>(null);

  const blendStartedAtRef = useRef<number | null>(null);
  const blendStartMusicTimeRef = useRef<number | null>(null);
  const syncedAtBlendRef = useRef(false);
  const crossfaderHistoryRef = useRef<{ t: number; v: number }[]>([]);
  const samplingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackComputedRef = useRef(false);

  // Use refs for latest values inside the setInterval closure
  const stepRef = useRef(step);
  stepRef.current = step;
  const normalizedCrossfaderRef = useRef(normalizedCrossfader);
  normalizedCrossfaderRef.current = normalizedCrossfader;

  // Detect blend start: when normalizedCrossfader first moves > 0.05 during blend step
  useEffect(() => {
    if (step === 'blend' && blendStartedAtRef.current === null && normalizedCrossfader > 0.05) {
      blendStartedAtRef.current = Date.now();
      blendStartMusicTimeRef.current = currentTimeMain;
      syncedAtBlendRef.current = isBeatSynced;
      crossfaderHistoryRef.current = [{ t: Date.now(), v: normalizedCrossfader }];
    }
  }, [step, normalizedCrossfader, currentTimeMain, isBeatSynced]);

  // Sample crossfader history every 500ms during blend/mixing
  useEffect(() => {
    const isActive = step === 'blend' || step === 'mixing';
    if (isActive && samplingIntervalRef.current === null) {
      samplingIntervalRef.current = setInterval(() => {
        if (stepRef.current === 'blend' || stepRef.current === 'mixing') {
          crossfaderHistoryRef.current.push({ t: Date.now(), v: normalizedCrossfaderRef.current });
        }
      }, 500);
    } else if (!isActive && samplingIntervalRef.current !== null) {
      clearInterval(samplingIntervalRef.current);
      samplingIntervalRef.current = null;
    }

    return () => {
      if (samplingIntervalRef.current !== null) {
        clearInterval(samplingIntervalRef.current);
        samplingIntervalRef.current = null;
      }
    };
  }, [step]);

  // Compute and set feedback when step reaches 'complete'
  useEffect(() => {
    if (step !== 'complete' || feedbackComputedRef.current) return;
    if (blendStartedAtRef.current === null || blendStartMusicTimeRef.current === null) return;

    feedbackComputedRef.current = true;
    setFeedback(computeFeedback({
      blendStartedAt: blendStartedAtRef.current,
      blendStartMusicTime: blendStartMusicTimeRef.current,
      syncedAtBlend: syncedAtBlendRef.current,
      crossfaderHistory: crossfaderHistoryRef.current,
      mixPlan,
      mainBpm,
    }));
  }, [step, mixPlan, mainBpm]);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
    feedbackComputedRef.current = false;
    blendStartedAtRef.current = null;
    blendStartMusicTimeRef.current = null;
    syncedAtBlendRef.current = false;
    crossfaderHistoryRef.current = [];
  }, []);

  return { feedback, clearFeedback };
}

function computeFeedback({
  blendStartedAt,
  blendStartMusicTime,
  syncedAtBlend,
  crossfaderHistory,
  mixPlan,
  mainBpm,
}: {
  blendStartedAt: number;
  blendStartMusicTime: number;
  syncedAtBlend: boolean;
  crossfaderHistory: { t: number; v: number }[];
  mixPlan: MixPlan | null;
  mainBpm: number | null;
}): MixFeedbackResult {
  const bpm = mainBpm ?? 120;
  const barDuration = (60 / bpm) * 4;

  // --- Timing score (0–40) ---
  let timingScore = 10;
  let timingTip: string | null = null;

  if (mixPlan?.mixPointA != null) {
    const delta = blendStartMusicTime - mixPlan.mixPointA;
    const barsOff = Math.abs(delta) / barDuration;

    if (barsOff <= 2) {
      timingScore = 40;
    } else if (barsOff <= 4) {
      timingScore = 25;
    } else {
      timingScore = 10;
      const direction = delta < 0 ? 'early' : 'late';
      const barsRounded = Math.round(barsOff);
      timingTip = `You started the fade ${barsRounded} bar${barsRounded !== 1 ? 's' : ''} ${direction} — try aiming for ${formatTimeFeedback(mixPlan.mixPointA)}`;
    }
  } else {
    timingScore = 30;
  }

  // --- Smoothness score (0–40) ---
  let smoothnessScore = 20;
  let smoothnessTip: string | null = null;

  if (crossfaderHistory.length >= 3) {
    const speeds: number[] = [];
    for (let i = 1; i < crossfaderHistory.length; i++) {
      const dt = (crossfaderHistory[i].t - crossfaderHistory[i - 1].t) / 1000;
      if (dt > 0) {
        speeds.push(Math.abs(crossfaderHistory[i].v - crossfaderHistory[i - 1].v) / dt);
      }
    }

    if (speeds.length > 0) {
      const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      const variance = speeds.reduce((a, b) => a + (b - avg) ** 2, 0) / speeds.length;
      const normalizedVariance = variance / (avg + 0.001);

      if (normalizedVariance < 0.5) {
        smoothnessScore = 40;
      } else if (normalizedVariance < 1.5) {
        smoothnessScore = 25;
      } else {
        smoothnessScore = 10;
        // Find when crossfader crossed 0.85 for actual duration
        const endEntry = crossfaderHistory.find(h => h.v >= 0.85);
        const actualMs = endEntry
          ? endEntry.t - blendStartedAt
          : (crossfaderHistory.at(-1)?.t ?? blendStartedAt) - blendStartedAt;
        const actualSecs = Math.round(actualMs / 1000);
        const targetSecs = Math.round(mixPlan?.blendDuration ?? 16);
        smoothnessTip = `Your crossfade took ${actualSecs}s — try a ${targetSecs}s slow, steady slide for a smoother blend`;
      }
    }
  }

  // --- Sync score (0–20) ---
  const syncScore = syncedAtBlend ? 20 : 0;
  const syncTip = !syncedAtBlend
    ? `Beat sync wasn't active during the blend — try pressing Sync before starting the incoming deck`
    : null;

  const score = timingScore + smoothnessScore + syncScore;
  const rating = score >= 75 ? 'seamless' : score >= 50 ? 'solid' : 'keep-practicing';

  return { rating, score, timingTip, smoothnessTip, syncTip };
}

function formatTimeFeedback(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
