export type DeckId = 'A' | 'B';

export interface DeckState {
  trackId: string;
  playbackPosition: number;
  volume: number;
}

export interface Session {
  id: string;
  // Legacy single-deck fields (for backward compat)
  trackId?: string;
  playbackPosition?: number;
  // Dual-deck fields
  deckA: DeckState | null;
  deckB: DeckState | null;
  crossfaderPosition: number;
  lastActiveAt: number;
  onboardingCompleted: boolean;
  onboardingStep: number;
  dismissedTips: string[];
}

export type AppView = 'loading' | 'onboarding' | 'main' | 'learn';
