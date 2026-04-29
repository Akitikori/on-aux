import { useState, useCallback, useEffect, useRef } from 'react';
import type { AnalysisResult } from '../../types/track';

const MAX_TAPS = 16;

interface TapBeatExerciseProps {
  analysis: AnalysisResult | null | undefined;
  getEstimatedTime: () => number;
  trackName?: string;
}

export function TapBeatExercise({ analysis, getEstimatedTime, trackName }: TapBeatExerciseProps) {
  const [taps, setTaps] = useState<number[]>([]);
  const [phase, setPhase] = useState<'idle' | 'tapping' | 'result'>('idle');
  const [runCount, setRunCount] = useState(1);
  const [copied, setCopied] = useState(false);
  const tapsRef = useRef<number[]>([]);

  const handleTap = useCallback(() => {
    if (!analysis || phase === 'result') return;
    if (tapsRef.current.length >= MAX_TAPS) return;

    const tapTime = getEstimatedTime();
    const newTaps = [...tapsRef.current, tapTime];
    tapsRef.current = newTaps;
    setTaps([...newTaps]);

    if (phase === 'idle') setPhase('tapping');
    if (newTaps.length >= MAX_TAPS) setPhase('result');
  }, [analysis, phase, getEstimatedTime]);

  // Space bar tapping
  useEffect(() => {
    if (phase === 'result') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target === document.body || (e.target as HTMLElement).tagName !== 'INPUT')) {
        e.preventDefault();
        handleTap();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase, handleTap]);

  const reset = useCallback(() => {
    tapsRef.current = [];
    setTaps([]);
    setPhase('idle');
    setRunCount(r => r + 1);
    setCopied(false);
  }, []);

  // Compute per-tap errors and overall score
  const results = (() => {
    if (!analysis || taps.length === 0) return null;
    const beatDuration = 60 / analysis.bpm;
    const beatPhase = analysis.beatPhase ?? 0;

    const tapErrors = taps.map((tapTime) => {
      const n = Math.round((tapTime - beatPhase) / beatDuration);
      const nearestBeat = beatPhase + n * beatDuration;
      return (tapTime - nearestBeat) * 1000;
    });

    const avgAbsError = tapErrors.reduce((s, e) => s + Math.abs(e), 0) / tapErrors.length;
    const avgSignedError = tapErrors.reduce((s, e) => s + e, 0) / tapErrors.length;

    let rating: string;
    let ratingColor: string;
    if (avgAbsError < 50) {
      rating = 'On the beat 🔥';
      ratingColor = 'text-outro';
    } else if (avgAbsError < 120) {
      rating = 'Getting there 👍';
      ratingColor = 'text-buildup';
    } else {
      rating = 'Keep practicing 🎧';
      ratingColor = 'text-text-secondary';
    }

    return { tapErrors, avgAbsError, avgSignedError, rating, ratingColor, beatDuration };
  })();

  const copyTrainingData = useCallback(() => {
    if (!analysis || !results) return;
    const payload = {
      track: trackName ?? 'Unknown',
      run: runCount,
      detectedBpm: Math.round(analysis.bpm * 1000) / 1000,
      detectedBeatPhase: Math.round((analysis.beatPhase ?? 0) * 1000) / 1000,
      bpmDebug: analysis.bpmDebug,
      tapTimesSeconds: taps.map(t => Math.round(t * 1000) / 1000),
      signedErrorsMs: results.tapErrors.map(e => Math.round(e)),
      avgSignedErrorMs: Math.round(results.avgSignedError),
      avgAbsErrorMs: Math.round(results.avgAbsError),
    };
    const text = JSON.stringify(payload, null, 2);
    const tryClipboard = async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    tryClipboard();
  }, [analysis, results, taps, trackName, runCount]);

  const hasAnalysis = !!analysis && analysis.bpm > 0;

  return (
    <div className="rounded-xl border border-border bg-bg-card/50 p-4 flex flex-col gap-3">

      {/* Fixed-height info area — always the same height so tap button doesn't move */}
      <div className="h-20 flex flex-col justify-center">
        {phase === 'idle' && (
          <p className="text-xs text-text-muted text-center">
            {hasAnalysis
              ? <>Play the track, then tap the button or press <kbd className="px-1 py-0.5 rounded bg-bg-secondary text-text-secondary text-[10px] font-mono">Space</kbd> in time with the beat</>
              : 'Load and play a track first'}
          </p>
        )}

        {phase === 'tapping' && (
          <div className="space-y-2">
            {/* Progress dots */}
            <div className="flex justify-center gap-1">
              {Array.from({ length: MAX_TAPS }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i < taps.length ? 'bg-accent' : 'bg-border'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-text-muted text-center tabular-nums">
              {taps.length} / {MAX_TAPS} taps
            </p>
          </div>
        )}

        {phase === 'result' && results && (
          <div className="text-center">
            <p className={`text-xl font-bold ${results.ratingColor}`}>{results.rating}</p>
            <p className="text-xs text-text-muted mt-1">
              Average: {Math.round(results.avgAbsError)} ms off the beat
              {results.avgSignedError > 5 ? ' (slightly late)' : results.avgSignedError < -5 ? ' (slightly early)' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Tap button — always in the same position */}
      {phase !== 'result' && (
        <div className="relative">
          <button
            onClick={handleTap}
            disabled={!hasAnalysis}
            className={`w-full py-5 rounded-xl text-base font-bold tracking-wide transition-all select-none ${
              !hasAnalysis
                ? 'bg-bg-secondary text-text-muted cursor-not-allowed'
                : phase === 'tapping'
                ? 'bg-accent text-bg-primary hover:bg-accent-light active:scale-95 shadow-lg shadow-accent/20'
                : 'bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 active:scale-95'
            }`}
          >
            {phase === 'idle'
              ? `Tap to Start${runCount > 1 ? ` (Run ${runCount})` : ''}`
              : 'Tap'}
          </button>
          {/* Cancel button — visible during tapping */}
          {phase === 'tapping' && (
            <button
              onClick={reset}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-secondary/60 transition-colors"
              title="Cancel"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Dot strip — below the tap button, appears as taps come in */}
      {taps.length > 0 && results && (
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
            Early ← Your taps → Late
          </p>
          <div className="relative h-9 bg-bg-secondary rounded-lg overflow-hidden">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-accent/50" />
            {results.tapErrors.map((errMs, i) => {
              const halfBeatMs = (results.beatDuration * 1000) / 2;
              const pct = 50 + (errMs / halfBeatMs) * 50;
              const clamped = Math.max(2, Math.min(98, pct));
              const abs = Math.abs(errMs);
              const color = abs < 50 ? 'bg-outro' : abs < 120 ? 'bg-buildup' : 'bg-text-muted';
              return (
                <div
                  key={i}
                  className={`absolute top-1/2 w-2.5 h-2.5 rounded-full ${color}`}
                  style={{ left: `${clamped}%`, transform: 'translate(-50%, -50%)' }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-text-muted">−½ beat</span>
            <span className="text-[10px] text-accent">Perfect</span>
            <span className="text-[10px] text-text-muted">+½ beat</span>
          </div>
        </div>
      )}

      {/* Result actions */}
      {phase === 'result' && (
        <div className="space-y-2">
          <button
            onClick={copyTrainingData}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              copied ? 'bg-outro/15 text-outro' : 'bg-accent/10 text-accent hover:bg-accent/20'
            }`}
          >
            {copied ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copied ✓
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy training data — Run {runCount}
              </>
            )}
          </button>
          <button
            onClick={reset}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-bg-secondary text-text-secondary hover:bg-bg-hover transition-colors"
          >
            Try Again (Run {runCount + 1})
          </button>
        </div>
      )}
    </div>
  );
}
