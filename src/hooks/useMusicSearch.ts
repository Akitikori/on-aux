import { useState, useCallback } from 'react';

export interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  durationMs: number;
  previewUrl: string | null;
}

export function useMusicSearch() {
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        term: query,
        media: 'music',
        entity: 'song',
        limit: '10',
      });

      const response = await fetch(`https://itunes.apple.com/search?${params}`);

      if (!response.ok) {
        setError('Search failed. Please try again.');
        setResults([]);
        return;
      }

      const data = await response.json();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tracks: MusicTrack[] = (data.results ?? []).map((item: any) => ({
        id: String(item.trackId),
        name: item.trackName ?? 'Unknown',
        artist: item.artistName ?? 'Unknown',
        album: item.collectionName ?? '',
        albumArt: (item.artworkUrl100 ?? '').replace('100x100', '200x200'),
        durationMs: item.trackTimeMillis ?? 0,
        previewUrl: item.previewUrl ?? null,
      }));

      setResults(tracks);
    } catch {
      setError('Network error. Please check your connection.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, search, clearResults };
}
