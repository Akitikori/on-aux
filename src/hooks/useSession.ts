import { useState, useEffect, useCallback, useRef } from 'react';
import { saveSession, getLatestSession, getSessionForTrack } from '../db/sessions';
import type { Session, DeckId, DeckState } from '../types/session';

function migrateSession(raw: any): Session {
  // Lazy migration from old single-deck format
  if (raw.trackId && !raw.deckA) {
    return {
      ...raw,
      deckA: {
        trackId: raw.trackId,
        playbackPosition: raw.playbackPosition ?? 0,
        volume: 1,
      },
      deckB: null,
      crossfaderPosition: 0.5,
    };
  }
  return raw as Session;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    getLatestSession().then(raw => {
      setSession(raw ? migrateSession(raw) : null);
      setLoading(false);
    });
  }, []);

  const persistSession = useCallback((updated: Session) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveSession(updated);
    }, 3000);
  }, []);

  const persistSessionImmediate = useCallback((updated: Session) => {
    saveSession(updated);
  }, []);

  const createSession = useCallback(async (
    deckId: DeckId,
    trackId: string,
    onboardingCompleted: boolean = false
  ) => {
    const existing = await getSessionForTrack(trackId);
    const migrated = existing ? migrateSession(existing) : null;

    const deckState: DeckState = {
      trackId,
      playbackPosition: 0,
      volume: 1,
    };

    const newSession: Session = migrated ?? {
      id: crypto.randomUUID(),
      deckA: null,
      deckB: null,
      crossfaderPosition: 0.5,
      lastActiveAt: Date.now(),
      onboardingCompleted,
      onboardingStep: 0,
      dismissedTips: [],
    };

    if (deckId === 'A') {
      newSession.deckA = deckState;
    } else {
      newSession.deckB = deckState;
    }
    newSession.lastActiveAt = Date.now();
    newSession.onboardingCompleted = onboardingCompleted || newSession.onboardingCompleted;

    await saveSession(newSession);
    setSession(newSession);
    return newSession;
  }, []);

  const updateDeckPosition = useCallback((deckId: DeckId, position: number) => {
    setSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, lastActiveAt: Date.now() };
      if (deckId === 'A' && updated.deckA) {
        updated.deckA = { ...updated.deckA, playbackPosition: position };
      } else if (deckId === 'B' && updated.deckB) {
        updated.deckB = { ...updated.deckB, playbackPosition: position };
      }
      persistSession(updated);
      return updated;
    });
  }, [persistSession]);

  const updateDeckVolume = useCallback((deckId: DeckId, volume: number) => {
    setSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, lastActiveAt: Date.now() };
      if (deckId === 'A' && updated.deckA) {
        updated.deckA = { ...updated.deckA, volume };
      } else if (deckId === 'B' && updated.deckB) {
        updated.deckB = { ...updated.deckB, volume };
      }
      persistSession(updated);
      return updated;
    });
  }, [persistSession]);

  const updateCrossfader = useCallback((position: number) => {
    setSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, crossfaderPosition: position, lastActiveAt: Date.now() };
      persistSession(updated);
      return updated;
    });
  }, [persistSession]);

  const completeOnboarding = useCallback(async () => {
    setSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, onboardingCompleted: true, lastActiveAt: Date.now() };
      persistSessionImmediate(updated);
      return updated;
    });
  }, [persistSessionImmediate]);

  const updateOnboardingStep = useCallback((step: number) => {
    setSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, onboardingStep: step, lastActiveAt: Date.now() };
      persistSessionImmediate(updated);
      return updated;
    });
  }, [persistSessionImmediate]);

  const dismissTip = useCallback((tipId: string) => {
    setSession(prev => {
      if (!prev) return prev;
      if (prev.dismissedTips.includes(tipId)) return prev;
      const updated = { ...prev, dismissedTips: [...prev.dismissedTips, tipId], lastActiveAt: Date.now() };
      persistSessionImmediate(updated);
      return updated;
    });
  }, [persistSessionImmediate]);

  const isOnboardingComplete = session?.onboardingCompleted ?? false;

  return {
    session,
    loading,
    createSession,
    updateDeckPosition,
    updateDeckVolume,
    updateCrossfader,
    completeOnboarding,
    updateOnboardingStep,
    dismissTip,
    isOnboardingComplete,
  };
}
