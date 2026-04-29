interface BeatSyncButtonProps {
  isSynced: boolean;
  canSync: boolean;
  onToggle: () => void;
  isHighlighted?: boolean;
  bpmGapWarning?: boolean;
  bpmDiff?: number;
}

export function BeatSyncButton({ isSynced, canSync, onToggle, isHighlighted, bpmGapWarning, bpmDiff }: BeatSyncButtonProps) {
  const tooltipText = !canSync
    ? 'Load two tracks to sync'
    : isSynced
      ? 'Click to unsync tempos'
      : bpmGapWarning && bpmDiff !== undefined
        ? `These tracks are ${Math.round(bpmDiff)} BPM apart — beats may drift. Consider a closer match.`
        : 'Click to match tempos';

  const buttonStyle = isSynced
    ? 'bg-outro/20 text-outro border border-outro/30'
    : !canSync
      ? 'bg-bg-secondary/50 text-text-muted border border-border/50 cursor-not-allowed opacity-50'
      : bpmGapWarning
        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20'
        : 'bg-bg-secondary text-text-secondary border border-border hover:border-accent/30 hover:text-text-primary';

  return (
    <div className="relative inline-flex">
      <button
        onClick={onToggle}
        disabled={!canSync}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
          ${buttonStyle}
          ${isHighlighted ? 'ring-2 ring-accent animate-pulse shadow-[0_0_20px_rgba(139,92,246,0.6)]' : ''}
        `}
        title={tooltipText}
      >
        {/* Sync icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12c0-4.418 3.582-8 8-8 2.21 0 4.21.896 5.657 2.343"/>
          <polyline points="20 4 20 8 16 8"/>
          <path d="M20 12c0 4.418-3.582 8-8 8-2.21 0-4.21-.896-5.657-2.343"/>
          <polyline points="4 20 4 16 8 16"/>
        </svg>
        {isSynced ? 'Synced' : 'Sync'}
        {isSynced && bpmGapWarning && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-yellow-400 ml-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        )}
      </button>
      {isHighlighted && !isSynced && (
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-accent whitespace-nowrap animate-bounce">
          Press Sync
        </span>
      )}
      {bpmGapWarning && !isSynced && !isHighlighted && (
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-yellow-400 whitespace-nowrap">
          {Math.round(bpmDiff ?? 0)} BPM apart
        </span>
      )}
    </div>
  );
}
