import { useCallback } from 'react';
import type { Track, AnalysisResult } from '../../types/track';
import { formatDuration } from '../../utils/formatTime';
import { formatKeyShort } from '../../audio/key';
import { useDeckDragDrop } from '../../hooks/useDeckDragDrop';
import type { DeckId } from '../../types/session';

interface TrackCardProps {
  track: Track;
  analysis?: AnalysisResult;
  onClick: () => void;
  onLoadToDeck?: (deck: DeckId) => void;
  onDelete?: () => void;
}

export function TrackCard({ track, analysis, onClick, onLoadToDeck, onDelete }: TrackCardProps) {
  const { startDrag, endDrag } = useDeckDragDrop();

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', track.id);
    e.dataTransfer.effectAllowed = 'copy';
    startDrag(track.id);
  }, [track.id, startDrag]);

  const handleDragEnd = useCallback(() => {
    endDrag();
  }, [endDrag]);

  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="flex items-center gap-4 p-3 rounded-xl bg-bg-card border border-border hover:border-accent/30 hover:bg-bg-hover cursor-pointer transition-all group"
    >
      {/* Mini waveform placeholder */}
      <div className="w-12 h-12 rounded-lg bg-bg-secondary flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted group-hover:text-accent transition-colors">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent-light transition-colors">
          {track.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-muted">
            {formatDuration(track.duration)}
          </span>
          {analysis && (
            <>
              <span className="text-xs text-text-muted">&middot;</span>
              <span className="text-xs font-mono text-accent-light">{Math.round(analysis.bpm)} BPM</span>
              {analysis.key && (
                <>
                  <span className="text-xs text-text-muted">&middot;</span>
                  <span className="text-xs text-text-secondary">{formatKeyShort(analysis.key)}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {onLoadToDeck && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onLoadToDeck('A'); }}
              className="px-2 py-1 rounded-md text-[10px] font-bold bg-intro/10 text-intro hover:bg-intro/20 transition-colors"
              title="Load to Deck A"
            >
              A
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onLoadToDeck('B'); }}
              className="px-2 py-1 rounded-md text-[10px] font-bold bg-chorus/10 text-chorus hover:bg-chorus/20 transition-colors"
              title="Load to Deck B"
            >
              B
            </button>
          </>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded-md text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Delete track"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
