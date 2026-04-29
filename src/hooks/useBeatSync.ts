import { useState, useCallback, useMemo } from 'react';
import type { DeckId } from '../types/session';

interface UseBeatSyncInput {
  deckABpm: number | null;
  deckBBpm: number | null;
  deckAConfidence: number | null;
  deckBConfidence: number | null;
  /** The currently-playing main deck — its tempo is locked; the other deck adjusts */
  mainDeck?: DeckId;
}

interface UseBeatSyncReturn {
  isSynced: boolean;
  syncedRateA: number;
  syncedRateB: number;
  adjustedDeck: DeckId | null;
  targetBpm: number | null;
  adjustedBpm: number | null;
  canSync: boolean;
  bpmGapWarning: boolean;
  toggleSync: () => void;
}

// Wide range to support real DJ use cases (pitch faders go ±50% on CDJs)
// Most DJ software supports ±8% to ±50% range
const MIN_RATE = 0.75;
const MAX_RATE = 1.35;

/**
 * Normalize BPM so it falls in the 70-170 range.
 * DJs often treat 70 BPM and 140 BPM as compatible (half-time/double-time).
 * This ensures we pick the closest match for syncing.
 */
function normalizeBpm(bpm: number): number {
  let n = bpm;
  while (n < 70) n *= 2;
  while (n > 170) n /= 2;
  return n;
}

export function useBeatSync({
  deckABpm,
  deckBBpm,
  deckAConfidence,
  deckBConfidence,
  mainDeck,
}: UseBeatSyncInput): UseBeatSyncReturn {
  const [isSynced, setIsSynced] = useState(false);

  const { canSync, adjustedDeck, targetBpm, rate, bpmGapWarning } = useMemo(() => {
    if (deckABpm == null || deckBBpm == null) {
      return { canSync: false, adjustedDeck: null, targetBpm: null, rate: 1, bpmGapWarning: false };
    }

    // Normalize BPMs to comparable range
    const normA = normalizeBpm(deckABpm);
    const normB = normalizeBpm(deckBBpm);
    const normDiff = Math.abs(normA - normB);

    // Already same BPM (within 0.5) — sync is trivial
    if (normDiff < 0.5) {
      return { canSync: true, adjustedDeck: 'B' as DeckId, targetBpm: normA, rate: 1, bpmGapWarning: false };
    }

    // Decide target: main deck keeps its tempo; incoming deck adjusts.
    // Fall back to confidence if no main deck is specified.
    const aConf = deckAConfidence ?? 0.5;
    const bConf = deckBConfidence ?? 0.5;

    let target: DeckId;
    let adjusted: DeckId;

    if (mainDeck) {
      target = mainDeck;
      adjusted = mainDeck === 'A' ? 'B' : 'A';
    } else if (aConf >= bConf) {
      target = 'A';
      adjusted = 'B';
    } else {
      target = 'B';
      adjusted = 'A';
    }

    const targetBpmVal = target === 'A' ? normA : normB;
    const adjustedBpmVal = adjusted === 'A' ? normA : normB;
    const syncRate = targetBpmVal / adjustedBpmVal;

    if (syncRate < MIN_RATE || syncRate > MAX_RATE) {
      return { canSync: false, adjustedDeck: null, targetBpm: null, rate: 1, bpmGapWarning: false };
    }

    return {
      canSync: true,
      adjustedDeck: adjusted,
      targetBpm: targetBpmVal,
      rate: syncRate,
      // Warn when BPMs are more than 5 apart — syncing will work but may sound odd
      bpmGapWarning: normDiff > 5,
    };
  }, [deckABpm, deckBBpm, deckAConfidence, deckBConfidence]);

  const toggleSync = useCallback(() => {
    if (canSync) {
      setIsSynced(prev => !prev);
    }
  }, [canSync]);

  // Turn off sync if it becomes impossible
  const effectiveSynced = isSynced && canSync;

  const syncedRateA = effectiveSynced && adjustedDeck === 'A' ? rate : 1;
  const syncedRateB = effectiveSynced && adjustedDeck === 'B' ? rate : 1;
  const adjustedBpm = effectiveSynced && targetBpm != null ? targetBpm : null;

  return {
    isSynced: effectiveSynced,
    syncedRateA,
    syncedRateB,
    adjustedDeck: effectiveSynced ? adjustedDeck : null,
    targetBpm: effectiveSynced ? targetBpm : null,
    adjustedBpm,
    canSync,
    bpmGapWarning,
    toggleSync,
  };
}
