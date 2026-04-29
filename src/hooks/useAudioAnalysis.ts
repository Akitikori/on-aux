import { useState, useCallback } from 'react';
import { decodeAudioFile } from '../audio/decode';
import { detectBPM } from '../audio/bpm';
import { computeEnergyCurve, smoothEnergyCurve } from '../audio/energy';
import { detectKey } from '../audio/key';
import { detectStructure } from '../audio/structure';
import { saveAnalysis, getAnalysis } from '../db/analysis';
import type { AnalysisResult } from '../types/track';

type AnalysisStatus = 'idle' | 'decoding' | 'analyzing-bpm' | 'analyzing-structure' | 'complete' | 'error';

export function useAudioAnalysis() {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (trackId: string, blob: Blob): Promise<AnalysisResult | null> => {
    // Check for cached analysis
    const cached = await getAnalysis(trackId);
    if (cached) {
      setStatus('complete');
      setProgress(100);
      return cached;
    }

    try {
      setStatus('decoding');
      setProgress(10);
      setError(null);

      const buffer = await decodeAudioFile(blob);
      setProgress(30);

      setStatus('analyzing-bpm');
      const bpmResult = await detectBPM(buffer);
      setProgress(50);

      const keyResult = detectKey(buffer);
      setProgress(60);

      setStatus('analyzing-structure');

      // Compute energy curve for display
      const rawEnergy = computeEnergyCurve(buffer);
      const smoothedEnergy = smoothEnergyCurve(rawEnergy);
      setProgress(70);

      // Detect structure using multi-band spectral analysis + beat-grid alignment
      const segments = detectStructure(buffer, bpmResult.bpm);
      setProgress(90);

      const analysis: AnalysisResult = {
        trackId,
        bpm: bpmResult.bpm,
        bpmConfidence: bpmResult.confidence,
        beatPhase: bpmResult.beatPhase,
        bpmDebug: bpmResult.bpmDebug,
        key: keyResult.key,
        keyConfidence: keyResult.keyConfidence,
        energyCurve: smoothedEnergy,
        segments,
        analyzedAt: Date.now(),
      };

      await saveAnalysis(analysis);
      setStatus('complete');
      setProgress(100);
      return analysis;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Analysis failed');
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setError(null);
  }, []);

  return { analyze, status, progress, error, reset };
}
