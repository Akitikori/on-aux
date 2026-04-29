import type { DeckId } from '../../types/session';

interface MixDirectionBarProps {
  mainDeck: DeckId;
  incomingDeck: DeckId;
  onFlip: () => void;
  deckAName?: string;
  deckBName?: string;
  tutorialEnabled?: boolean;
}

export function MixDirectionBar({ mainDeck, incomingDeck, onFlip, deckAName, deckBName, tutorialEnabled = true }: MixDirectionBarProps) {
  const deckALabel = deckAName ? `A · ${deckAName}` : 'Deck A';
  const deckBLabel = deckBName ? `B · ${deckBName}` : 'Deck B';

  const mainLabel = mainDeck === 'A' ? deckALabel : deckBLabel;
  const incomingLabel = incomingDeck === 'A' ? deckALabel : deckBLabel;

  return (
    <div className="flex items-center justify-center gap-2 py-1.5">
      {/* Main deck chip */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-intro/15 border border-intro/25">
        <span className="text-[10px] font-bold text-intro uppercase tracking-wider">Main</span>
        <span className="text-xs font-semibold text-text-primary truncate max-w-[100px]">{mainLabel}</span>
      </div>

      {/* Arrow + flip button */}
      <button
        onClick={onFlip}
        className="flex items-center gap-1 px-2 py-1 rounded-full bg-bg-secondary border border-border hover:border-accent/40 hover:bg-bg-hover transition-all group"
        title="Flip mix direction — swap which deck is main and which is incoming"
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-accent group-hover:text-accent-light transition-colors"
        >
          <path d="M5 12h14"/>
          <path d="m12 5 7 7-7 7"/>
        </svg>
        <span className="text-[10px] text-text-muted group-hover:text-text-secondary transition-colors">flip</span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-text-muted group-hover:text-text-secondary transition-colors"
        >
          <path d="M8 3 4 7l4 4"/>
          <path d="M4 7h16"/>
          <path d="m16 21 4-4-4-4"/>
          <path d="M20 17H4"/>
        </svg>
      </button>

      {/* Incoming deck chip */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-chorus/10 border border-chorus/25">
        <span className="text-[10px] font-bold text-chorus uppercase tracking-wider">New</span>
        <span className="text-xs font-semibold text-text-primary truncate max-w-[100px]">{incomingLabel}</span>
      </div>

      {!tutorialEnabled && (
        <span className="text-[10px] text-text-muted ml-1">(tutorial off)</span>
      )}
    </div>
  );
}
