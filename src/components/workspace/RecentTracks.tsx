import { useState, useMemo } from 'react';
import type { Track, AnalysisResult } from '../../types/track';
import type { DeckId } from '../../types/session';
import { TrackCard } from '../library/TrackCard';

type SortField = 'recent' | 'bpm' | 'name';
type SortDir = 'asc' | 'desc';

interface RecentTracksProps {
  tracks: Track[];
  analysisMap: Map<string, AnalysisResult>;
  onSelectTrack: (trackId: string) => void;
  onLoadToDeck?: (trackId: string, deck: DeckId) => void;
  onDeleteTrack?: (trackId: string) => void;
}

export function RecentTracks({ tracks, analysisMap, onSelectTrack, onLoadToDeck, onDeleteTrack }: RecentTracksProps) {
  const [sortField, setSortField] = useState<SortField>('recent');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  const sortedTracks = useMemo(() => {
    const sorted = [...tracks];
    const dir = sortDir === 'asc' ? 1 : -1;

    switch (sortField) {
      case 'bpm':
        sorted.sort((a, b) => {
          const aBpm = analysisMap.get(a.id)?.bpm ?? 0;
          const bBpm = analysisMap.get(b.id)?.bpm ?? 0;
          return (aBpm - bBpm) * dir;
        });
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name) * dir);
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => (a.addedAt - b.addedAt) * dir);
        break;
    }

    return sorted;
  }, [tracks, analysisMap, sortField, sortDir]);

  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="inline-block ml-0.5">
        {sortDir === 'asc' ? (
          <polyline points="18 15 12 9 6 15"/>
        ) : (
          <polyline points="6 9 12 15 18 9"/>
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-2">
      {/* Sort bar */}
      <div className="flex items-center gap-1 pb-1">
        <span className="text-[10px] text-text-muted uppercase tracking-wider mr-1">Sort:</span>
        {([
          { field: 'recent' as SortField, label: 'Recent' },
          { field: 'bpm' as SortField, label: 'BPM' },
          { field: 'name' as SortField, label: 'Name' },
        ]).map(({ field, label }) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              sortField === field
                ? 'bg-accent/15 text-accent'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
            }`}
          >
            {label}
            <SortArrow field={field} />
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="grid gap-2">
        {sortedTracks.map(track => (
          <TrackCard
            key={track.id}
            track={track}
            analysis={analysisMap.get(track.id)}
            onClick={() => onSelectTrack(track.id)}
            onLoadToDeck={onLoadToDeck ? (deck) => onLoadToDeck(track.id, deck) : undefined}
            onDelete={onDeleteTrack ? () => onDeleteTrack(track.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
