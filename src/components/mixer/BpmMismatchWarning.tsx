import type { Track, AnalysisResult } from '../../types/track';
import type { DeckId } from '../../types/session';
import { formatKeyShort } from '../../audio/key';

interface BpmMismatchWarningProps {
  deckAAnalysis: AnalysisResult;
  deckBAnalysis: AnalysisResult;
  library: { track: Track; analysis: AnalysisResult }[];
  loadedTrackIds: string[];
  onLoadToDeck: (trackId: string, deck: DeckId) => void;
  isBeatSynced?: boolean;
}

export function BpmMismatchWarning({
  deckAAnalysis,
  deckBAnalysis,
  library,
  loadedTrackIds,
  onLoadToDeck,
  isBeatSynced,
}: BpmMismatchWarningProps) {
  const bpmDiff = Math.abs(deckAAnalysis.bpm - deckBAnalysis.bpm);
  if (bpmDiff <= 5 || isBeatSynced) return null;

  // Determine which deck to suggest replacements for (the one loaded most recently or B by default)
  const targetDeck: DeckId = 'B';
  const targetBpm = deckAAnalysis.bpm; // Suggest tracks matching Deck A's BPM for Deck B

  // Find compatible tracks
  const suggestions = library
    .filter(item => !loadedTrackIds.includes(item.track.id))
    .map(item => ({
      ...item,
      bpmDiff: Math.abs(item.analysis.bpm - targetBpm),
    }))
    .filter(item => item.bpmDiff <= 5)
    .sort((a, b) => a.bpmDiff - b.bpmDiff)
    .slice(0, 3);

  return (
    <div className="rounded-xl p-4 border border-buildup/30 bg-buildup/5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-buildup">
            BPM Mismatch — {bpmDiff} BPM apart
          </h4>
          <p className="text-sm text-text-secondary mt-1">
            Deck A is {Math.round(deckAAnalysis.bpm)} BPM and Deck B is {Math.round(deckBAnalysis.bpm)} BPM.
            Mixing tracks this far apart will sound off-beat.
          </p>

          {suggestions.length > 0 ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-text-muted">Try one of these instead for Deck B:</p>
              {suggestions.map(({ track, analysis, bpmDiff: diff }) => (
                <button
                  key={track.id}
                  onClick={() => onLoadToDeck(track.id, targetDeck)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg bg-bg-card/50 border border-border hover:border-accent/30 hover:bg-bg-hover transition-all text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-bg-secondary flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted group-hover:text-accent transition-colors">
                        <path d="M9 18V5l12-2v13"/>
                        <circle cx="6" cy="18" r="3"/>
                        <circle cx="18" cy="16" r="3"/>
                      </svg>
                    </div>
                    <span className="text-sm text-text-primary truncate group-hover:text-accent-light transition-colors">
                      {track.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-text-secondary">{Math.round(analysis.bpm)} BPM</span>
                    {analysis.key && (
                      <span className="text-xs text-accent-light">{formatKeyShort(analysis.key)}</span>
                    )}
                    {diff === 0 ? (
                      <span className="text-[10px] text-outro font-medium">Perfect match</span>
                    ) : (
                      <span className="text-[10px] text-text-muted">±{diff} BPM</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted mt-3">
              No matching tracks in your library. Upload a track around {targetBpm} BPM.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
