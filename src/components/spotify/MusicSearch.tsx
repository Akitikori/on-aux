import { useState, useCallback, useRef } from 'react';
import { useMusicSearch, type MusicTrack } from '../../hooks/useMusicSearch';

function formatDurationMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getDownloadUrl(track: MusicTrack): string {
  const query = encodeURIComponent(`${track.name} ${track.artist}`);
  return `https://spotidownloader.com/?link=https://open.spotify.com/search/${query}`;
}

export function MusicSearch() {
  const { results, loading, error, search, clearResults } = useMusicSearch();
  const [query, setQuery] = useState('');
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        search(value);
      }, 400);
    } else {
      clearResults();
    }
  }, [search, clearResults]);

  const handleDownload = useCallback((track: MusicTrack) => {
    window.open(getDownloadUrl(track), '_blank', 'noopener,noreferrer');
  }, []);

  const handlePreview = useCallback((track: MusicTrack) => {
    if (!track.previewUrl) return;

    if (playingPreview === track.id) {
      // Stop playing
      audioRef.current?.pause();
      setPlayingPreview(null);
      return;
    }

    // Play preview
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(track.previewUrl);
    audio.volume = 0.5;
    audio.play();
    audio.onended = () => setPlayingPreview(null);
    audioRef.current = audio;
    setPlayingPreview(track.id);
  }, [playingPreview]);

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative flex-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search for songs..."
          className="w-full pl-9 pr-3 py-2 bg-bg-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted border border-border focus:border-accent/50 focus:outline-none transition-colors"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-4">
          <p className="text-xs text-text-muted animate-pulse">Searching...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-4">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-1">
          {results.map((track) => (
            <div
              key={track.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-hover transition-colors group"
            >
              {/* Album art */}
              {track.albumArt ? (
                <img
                  src={track.albumArt}
                  alt={track.album}
                  className="w-10 h-10 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-bg-secondary shrink-0 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                  </svg>
                </div>
              )}

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{track.name}</p>
                <p className="text-xs text-text-muted truncate">{track.artist}</p>
              </div>

              {/* Duration */}
              <span className="text-xs text-text-muted tabular-nums shrink-0">
                {formatDurationMs(track.durationMs)}
              </span>

              {/* Preview button */}
              {track.previewUrl && (
                <button
                  onClick={() => handlePreview(track)}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                    playingPreview === track.id
                      ? 'bg-accent/20 text-accent'
                      : 'text-text-muted hover:text-text-secondary hover:bg-bg-secondary opacity-0 group-hover:opacity-100'
                  }`}
                  title={playingPreview === track.id ? 'Stop preview' : 'Preview 30s clip'}
                >
                  {playingPreview === track.id ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16"/>
                      <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="8 4 20 12 8 20"/>
                    </svg>
                  )}
                </button>
              )}

              {/* Download button */}
              <button
                onClick={() => handleDownload(track)}
                className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                title="Download track"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            </div>
          ))}

          <p className="text-[10px] text-text-muted text-center pt-2">
            Click download to get the MP3, then drag it into a deck or click Upload
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && query.length < 2 && results.length === 0 && (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <p className="text-xs text-text-muted">Search for any song to find and download it</p>
        </div>
      )}

      {/* No results */}
      {!loading && !error && query.length >= 2 && results.length === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-text-muted">No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
