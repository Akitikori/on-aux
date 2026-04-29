import { useState, useEffect, useCallback } from 'react';
import { saveTrack, getAllTracks, getTrack, deleteTrack as dbDeleteTrack } from '../db/tracks';
import { getAnalysis, deleteAnalysis } from '../db/analysis';
import type { Track, AnalysisResult } from '../types/track';
import { validateAudioFile } from '../utils/fileValidation';

export function useTrackLibrary() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await getAllTracks();
    setTracks(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTrack = useCallback(async (file: File): Promise<{ track: Track; blob: Blob } | { error: string }> => {
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      return { error: validation.error! };
    }

    const blob = new Blob([await file.arrayBuffer()], { type: file.type });

    // Decode to get duration
    const audioCtx = new AudioContext();
    let duration: number;
    try {
      const buffer = await audioCtx.decodeAudioData(await blob.arrayBuffer());
      duration = buffer.duration;
    } finally {
      await audioCtx.close();
    }

    const track: Track = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.(mp3|wav)$/i, ''),
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      duration,
      addedAt: Date.now(),
    };

    await saveTrack(track, blob);
    await refresh();
    return { track, blob };
  }, [refresh]);

  const deleteTrack = useCallback(async (id: string) => {
    await dbDeleteTrack(id);
    await deleteAnalysis(id);
    await refresh();
  }, [refresh]);

  const loadTrackWithAnalysis = useCallback(async (id: string): Promise<{
    track: Track;
    blob: Blob;
    analysis: AnalysisResult | undefined;
  } | null> => {
    const record = await getTrack(id);
    if (!record) return null;
    const { blob, ...track } = record;
    const analysis = await getAnalysis(id);
    return { track, blob, analysis };
  }, []);

  return { tracks, loading, addTrack, deleteTrack, loadTrackWithAnalysis, refresh };
}
