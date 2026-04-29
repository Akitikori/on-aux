interface BpmDisplayProps {
  bpm: number;
  isSynced?: boolean;
  adjustedBpm?: number | null;
}

export function BpmDisplay({ bpm, isSynced, adjustedBpm }: BpmDisplayProps) {
  const displayBpm = isSynced && adjustedBpm != null ? adjustedBpm : bpm;

  return (
    <div className="text-right">
      <div className="flex items-baseline gap-1.5 justify-end">
        <span className="text-2xl font-bold text-text-primary tabular-nums">{Math.round(displayBpm)}</span>
        <span className="text-sm text-text-secondary">BPM</span>
        {isSynced && (
          <span className="text-[10px] font-semibold text-outro bg-outro/15 px-1.5 py-0.5 rounded-full self-center">
            SYNCED
          </span>
        )}
      </div>
      <p className="text-[10px] text-text-muted text-right h-4">
        {isSynced && adjustedBpm != null && adjustedBpm !== bpm
          ? `orig. ${Math.round(bpm)} BPM`
          : ''}
      </p>
    </div>
  );
}
