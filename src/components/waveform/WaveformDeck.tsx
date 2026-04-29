import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import type { Track, AnalysisResult, StructureSegment } from '../../types/track';
import { segmentColors } from '../../utils/colors';
import { formatTime } from '../../utils/formatTime';
import { TransportControls } from './TransportControls';
import { BpmDisplay } from '../analysis/BpmDisplay';
import { StructureTimeline } from '../analysis/StructureTimeline';
import { EnergyGraph } from '../analysis/EnergyGraph';
import { TipOverlay } from '../learning/TipOverlay';
import { TransitionGuide } from '../learning/TransitionGuide';
import { NextTrackSuggestion } from '../learning/NextTrackSuggestion';
import { useLearningTips } from '../../hooks/useLearningTips';

// Index 0 = auto-fit (zoom(0)); indices 1–3 are px/sec values for 2×/4×/8×.
// 2× ≈ 16 bars visible at 120 BPM on an 800 px container (800/25 = 32 s ≈ 16 bars).
// Each step doubles: 25 → 50 → 100.
const ZOOM_PX_PER_SEC = [0, 25, 50, 100]; // 1× (auto-fit), 2×, 4×, 8×
const ZOOM_LABELS = ['1×', '2×', '4×', '8×'];

interface WaveformDeckProps {
  track: Track;
  blob: Blob;
  analysis: AnalysisResult | null;
  initialPosition?: number;
  onPositionChange?: (position: number) => void;
  onDismissTip?: (tipId: string) => void;
  dismissedTips?: string[];
  showLearning?: boolean;
  volume?: number;
  deckLabel?: string;
  compact?: boolean;
  onPlayStateChange?: (playing: boolean) => void;
  playbackRate?: number;
  highlightPlay?: boolean;
  isSynced?: boolean;
  adjustedBpm?: number | null;
  quantizePlay?: boolean;
  quantizeBpm?: number;
  phaseOffsetTime?: number;
  countdownOverlay?: { seconds: number; label: string } | null;
  /** When id changes, seek to time and pause */
  seekCommand?: { time: number; id: number };
  /** Initial zoom index (0=1×, 1=2×, 2=4×, 3=8×). Default 0. */
  initialZoom?: number;
  /** Keep the playhead centered and scroll the waveform underneath it */
  autoCenter?: boolean;
}

export function WaveformDeck({
  track,
  blob,
  analysis,
  initialPosition = 0,
  onPositionChange,
  onDismissTip,
  dismissedTips = [],
  showLearning = true,
  volume,
  deckLabel,
  compact = false,
  onPlayStateChange,
  playbackRate,
  highlightPlay,
  isSynced,
  adjustedBpm,
  quantizePlay,
  quantizeBpm,
  phaseOffsetTime,
  countdownOverlay,
  seekCommand,
  initialZoom = 1,
  autoCenter = false,
}: WaveformDeckProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  // Tracks the canvas injected into WaveSurfer's shadow DOM (for cleanup)
  const injectedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phaseAdjust, setPhaseAdjust] = useState(0);
  const [bpmOverride, setBpmOverride] = useState<number | null>(null);
  const [editingBpm, setEditingBpm] = useState(false);
  const [bpmInput, setBpmInput] = useState('');

  const { activeTips, currentSegment } = useLearningTips(
    analysis?.segments ?? [],
    currentTime,
    dismissedTips
  );

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    // Reset ready state so the zoom effect re-fires when the new track is ready
    setIsReady(false);

    const regions = RegionsPlugin.create();

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#7c84ee',
      progressColor: '#9ba3f7',
      cursorColor: '#ffffff',
      cursorWidth: 2,
      height: compact ? 80 : 120,
      barWidth: 0,
      barGap: 0,
      barRadius: 0,
      normalize: true,
      interact: true,
      dragToSeek: true,
      autoScroll: true,
      autoCenter,
      plugins: [regions],
    });

    const blobUrl = URL.createObjectURL(blob);
    ws.load(blobUrl);

    ws.on('ready', () => {
      const dur = ws.getDuration();
      setDuration(dur);
      setIsReady(true);
      if (initialPosition > 0) {
        ws.seekTo(initialPosition / dur);
      }
    });

    ws.on('timeupdate', (time: number) => {
      setCurrentTime(time);
      onPositionChange?.(time);
    });

    ws.on('play', () => { setIsPlaying(true); onPlayStateChange?.(true); });
    ws.on('pause', () => { setIsPlaying(false); onPlayStateChange?.(false); });
    ws.on('finish', () => { setIsPlaying(false); onPlayStateChange?.(false); });


    wavesurferRef.current = ws;

    return () => {
      URL.revokeObjectURL(blobUrl);
      ws.destroy();
    };
  }, [blob]);

  // Reset phase + BPM adjustments when track changes
  useEffect(() => {
    setPhaseAdjust(0);
    setBpmOverride(null);
    setEditingBpm(false);
  }, [blob]);

  // Add segment regions when analysis is ready
  useEffect(() => {
    if (!wavesurferRef.current || !analysis || !isReady) return;

    const ws = wavesurferRef.current;
    const regionsPlugin = ws.getActivePlugins().find(
      (p): p is RegionsPlugin => p instanceof RegionsPlugin
    );
    if (!regionsPlugin) return;

    regionsPlugin.clearRegions();

    analysis.segments.forEach((segment: StructureSegment) => {
      const colors = segmentColors[segment.type];
      regionsPlugin.addRegion({
        start: segment.startTime,
        end: segment.endTime,
        color: colors.regionBg,
        drag: false,
        resize: false,
      });
    });
  }, [analysis, isReady]);

  // Beat grid: inject a full-width canvas into WaveSurfer's shadow DOM .wrapper element.
  // .wrapper spans the full waveform width and sits inside .scroll (the scrollable container),
  // so the canvas scrolls in perfect sync with the waveform — no scroll event handler needed.
  useEffect(() => {
    if (!analysis || !isReady || duration <= 0) return;
    const bpm = bpmOverride ?? analysis.bpm;
    if (!bpm || bpm <= 0) return;

    let rafId: number;

    const tryInject = () => {
      // WaveSurfer v7 renders into a Shadow DOM attached to its child div
      const host = containerRef.current?.querySelector<HTMLElement>(':scope > div');
      const shadow = host?.shadowRoot;
      if (!shadow) { rafId = requestAnimationFrame(tryInject); return; }

      // .wrapper spans the full waveform width; .scroll is the overflow container
      const wrapper = shadow.querySelector<HTMLElement>('.wrapper');
      const scrollEl = shadow.querySelector<HTMLElement>('.scroll');
      if (!wrapper || !scrollEl) { rafId = requestAnimationFrame(tryInject); return; }

      // Remove any previously injected canvas
      injectedCanvasRef.current?.remove();

      const waveHeight = compact ? 80 : 120;
      const pxPerSec = zoomLevel > 0
        ? ZOOM_PX_PER_SEC[zoomLevel]
        : (scrollEl.clientWidth / duration);
      const totalWidth = Math.round(duration * pxPerSec);

      const canvas = document.createElement('canvas');
      canvas.width = totalWidth;
      canvas.height = waveHeight;
      canvas.style.cssText = `position:absolute;top:0;left:0;width:${totalWidth}px;height:${waveHeight}px;pointer-events:none;mix-blend-mode:screen;z-index:10;`;
      wrapper.appendChild(canvas);
      injectedCanvasRef.current = canvas;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const beatPhase = (analysis.beatPhase ?? 0) + phaseAdjust;
      const beatDuration = 60 / bpm;
      const showLabels = beatDuration * pxPerSec > 20;
      const labelsToDraw: Array<{ x: number; text: string; isPhrase: boolean }> = [];

      for (let i = 0; ; i++) {
        const t = beatPhase + i * beatDuration;
        if (t > duration + beatDuration) break;
        if (t < 0) continue;

        const x = t * pxPerSec;
        const beatInBar = i % 4;
        const barIndex = Math.floor(i / 4);
        const isPhrase = barIndex % 4 === 0 && beatInBar === 0;
        const isDownbeat = beatInBar === 0;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        if (isPhrase) {
          ctx.strokeStyle = 'rgba(255, 180, 30, 0.9)';
          ctx.lineWidth = 2;
        } else if (isDownbeat) {
          ctx.strokeStyle = 'rgba(255, 160, 40, 0.75)';
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 0.75;
        }
        ctx.stroke();

        if (showLabels) {
          labelsToDraw.push({
            x,
            text: isPhrase ? String(barIndex + 1) : String(beatInBar + 1),
            isPhrase,
          });
        }
      }

      if (showLabels) {
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (const { x, text, isPhrase } of labelsToDraw) {
          const tw = ctx.measureText(text).width;
          const bgW = tw + 6, bgH = 11, bgX = x - bgW / 2, bgY = 3;
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.beginPath();
          ctx.roundRect(bgX, bgY, bgW, bgH, 2);
          ctx.fill();
          ctx.fillStyle = isPhrase ? 'rgba(255,180,30,1)' : 'rgba(255,255,255,0.85)';
          ctx.fillText(text, x, bgY + 2);
        }
      }
    };

    rafId = requestAnimationFrame(tryInject);

    return () => {
      cancelAnimationFrame(rafId);
      injectedCanvasRef.current?.remove();
      injectedCanvasRef.current = null;
    };
  }, [analysis, isReady, duration, zoomLevel, phaseAdjust, bpmOverride]);

  // Sync external volume
  useEffect(() => {
    if (wavesurferRef.current && volume !== undefined) {
      wavesurferRef.current.setVolume(volume);
    }
  }, [volume]);

  // Sync playback rate (beat sync)
  useEffect(() => {
    if (wavesurferRef.current && isReady && playbackRate !== undefined) {
      wavesurferRef.current.setPlaybackRate(playbackRate, true);
    }
  }, [playbackRate, isReady]);

  // Apply zoom level when zoomed in. At zoomLevel=0 we skip this —
  // WaveSurfer auto-fits the full track to the container by default, and
  // calling zoom(n) at default zoom causes per-frame scroll events during
  // playback that produce a React render loop.
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return;
    if (zoomLevel > 0) {
      wavesurferRef.current.zoom(ZOOM_PX_PER_SEC[zoomLevel]);
    } else {
      // Reset to auto-fit: WaveSurfer fits the full duration in the container
      wavesurferRef.current.zoom(0);
    }
  }, [zoomLevel, isReady]);

  // Seek command: seek to time and pause when id changes
  useEffect(() => {
    if (!seekCommand || !wavesurferRef.current || !isReady || duration <= 0) return;
    const ws = wavesurferRef.current;
    const fraction = Math.max(0, Math.min(seekCommand.time / duration, 1));
    ws.seekTo(fraction);
    if (ws.isPlaying()) {
      ws.pause();
    }
  }, [seekCommand?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlayPause = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    if (!ws.isPlaying() && quantizePlay && quantizeBpm) {
      // Beat-quantized play with tighter beat-level snap.
      // If within ±30% of a beat, snap to that beat for very tight feel.
      // Otherwise snap to bar boundary (musically correct default).
      const beatDuration = 60 / quantizeBpm;
      const barDuration = beatDuration * 4;
      const phase = phaseOffsetTime ?? 0;

      const beatSnapped = Math.round((currentTime - phase) / beatDuration) * beatDuration + phase;
      const beatError = Math.abs(currentTime - beatSnapped);

      const snappedTime = beatError < beatDuration * 0.3
        ? beatSnapped
        : Math.round((currentTime - phase) / barDuration) * barDuration + phase;

      const clampedTime = Math.max(0, Math.min(snappedTime, duration));
      if (duration > 0) {
        ws.seekTo(clampedTime / duration);
      }
      ws.play();
    } else {
      ws.playPause();
    }
  }, [quantizePlay, quantizeBpm, currentTime, duration, phaseOffsetTime]);

  const skipForward = useCallback(() => {
    if (wavesurferRef.current) {
      const time = Math.min(currentTime + 5, duration);
      wavesurferRef.current.seekTo(time / duration);
    }
  }, [currentTime, duration]);

  const skipBackward = useCallback(() => {
    if (wavesurferRef.current) {
      const time = Math.max(currentTime - 5, 0);
      wavesurferRef.current.seekTo(time / duration);
    }
  }, [currentTime, duration]);

  return (
    <div className="space-y-3">
      {/* Track info bar */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 min-w-0">
            {deckLabel && (
              <span className="text-xs font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded shrink-0">
                {deckLabel}
              </span>
            )}
            <span className="truncate" title={track.name}>{track.name}</span>
          </h2>
          <p className="text-sm text-text-secondary">{formatTime(currentTime)} / {formatTime(duration || track.duration)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Beat grid phase nudge controls */}
          {analysis && (
            <div className="flex items-center gap-1" title="Shift beat grid left/right to align with kicks">
              <button
                onClick={() => setPhaseAdjust(p => p - 0.010)}
                className="w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-accent hover:bg-bg-hover text-xs transition-colors"
                title="Shift grid earlier (−10ms)"
              >
                ◄
              </button>
              <span
                className={`text-[10px] tabular-nums w-8 text-center cursor-pointer select-none ${phaseAdjust !== 0 ? 'text-accent' : 'text-text-muted'}`}
                title="Click to reset grid offset"
                onClick={() => setPhaseAdjust(0)}
              >
                {phaseAdjust === 0 ? 'grid' : `${phaseAdjust > 0 ? '+' : ''}${Math.round(phaseAdjust * 1000)}ms`}
              </span>
              <button
                onClick={() => setPhaseAdjust(p => p + 0.010)}
                className="w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-accent hover:bg-bg-hover text-xs transition-colors"
                title="Shift grid later (+10ms)"
              >
                ►
              </button>
              <button
                onClick={() => {
                  const halfBeat = (60 / (bpmOverride ?? analysis.bpm)) / 2;
                  setPhaseAdjust(p => {
                    const beatDuration = 60 / (bpmOverride ?? analysis.bpm);
                    const newVal = p + halfBeat;
                    return ((newVal % beatDuration) + beatDuration) % beatDuration > beatDuration / 2
                      ? newVal - beatDuration
                      : newVal;
                  });
                }}
                className="w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-accent hover:bg-bg-hover text-[10px] transition-colors"
                title="Flip half beat"
              >
                ½
              </button>
            </div>
          )}
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0, prev - 1))}
              disabled={zoomLevel === 0}
              className="w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
              title="Zoom out"
            >
              −
            </button>
            <span className="text-[10px] text-text-muted tabular-nums w-5 text-center">{ZOOM_LABELS[zoomLevel]}</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(3, prev + 1))}
              disabled={zoomLevel === 3}
              className="w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
              title="Zoom in"
            >
              +
            </button>
          </div>
          {analysis && (
            editingBpm ? (
              <input
                autoFocus
                type="number"
                min={40}
                max={220}
                value={bpmInput}
                onChange={e => setBpmInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = parseFloat(bpmInput);
                    if (val >= 40 && val <= 220) setBpmOverride(val);
                    setEditingBpm(false);
                  } else if (e.key === 'Escape') {
                    setEditingBpm(false);
                  }
                }}
                onBlur={() => {
                  const val = parseFloat(bpmInput);
                  if (val >= 40 && val <= 220) setBpmOverride(val);
                  setEditingBpm(false);
                }}
                className="w-16 bg-bg-secondary border border-accent/50 rounded px-1 text-right text-lg font-bold text-accent tabular-nums focus:outline-none"
              />
            ) : (
              <button
                onClick={() => {
                  setBpmInput(String(Math.round(bpmOverride ?? analysis.bpm)));
                  setEditingBpm(true);
                }}
                title="Click to edit BPM"
                className="text-right hover:opacity-70 transition-opacity"
              >
                <BpmDisplay bpm={bpmOverride ?? analysis.bpm} isSynced={isSynced} adjustedBpm={adjustedBpm} />
              </button>
            )
          )}
        </div>
      </div>

      {/* Waveform with beat grid overlay */}
      <div className="relative rounded-xl overflow-hidden border border-border p-3" style={{ backgroundColor: '#0f172a' }}>
        {/* Segment labels */}
        {analysis && isReady && duration > 0 && (
          <div className="relative h-5 mb-1">
            {analysis.segments.map((segment, i) => {
              const left = (segment.startTime / duration) * 100;
              const width = ((segment.endTime - segment.startTime) / duration) * 100;
              return (
                <div
                  key={i}
                  className="absolute top-0 text-[10px] font-medium truncate px-1"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    color: segmentColors[segment.type]?.text ?? '#9898a8',
                  }}
                >
                  {segment.label}
                </div>
              );
            })}
          </div>
        )}

        {/* Waveform container — beat grid canvas is injected into WaveSurfer's shadow DOM */}
        <div className="cursor-grab active:cursor-grabbing">
          <div ref={containerRef} style={{ backgroundColor: '#0f172a' }} />
        </div>

        {/* Current segment indicator */}
        {currentSegment && (
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: segmentColors[currentSegment.type]?.text }}
            />
            <span className="text-xs text-text-secondary">
              {currentSegment.label}
            </span>
          </div>
        )}
      </div>

      {/* Countdown banner (non-blocking, below waveform) */}
      {countdownOverlay && (
        <div className={`flex items-center justify-center gap-3 py-2 px-3 rounded-lg ${
          countdownOverlay.seconds <= 0 ? 'bg-red-500/15 border border-red-400/30' :
          countdownOverlay.seconds <= 3 ? 'bg-yellow-500/15 border border-yellow-400/30' :
          'bg-accent/10 border border-accent/20'
        }`}>
          {countdownOverlay.seconds > 0 && (
            <span
              key={countdownOverlay.seconds}
              className={`text-2xl font-black tabular-nums leading-none animate-in zoom-in-50 duration-150 ${
                countdownOverlay.seconds <= 1 ? 'text-red-400' :
                countdownOverlay.seconds <= 3 ? 'text-yellow-400' :
                'text-accent'
              }`}
            >
              {countdownOverlay.seconds}
            </span>
          )}
          <span className={`text-xs font-bold ${
            countdownOverlay.seconds <= 0 ? 'text-red-400 animate-bounce' :
            countdownOverlay.seconds <= 3 ? 'text-yellow-400' :
            'text-accent'
          }`}>
            {countdownOverlay.label}
          </span>
        </div>
      )}

      {/* Transport controls */}
      <TransportControls
        isPlaying={isPlaying}
        onPlayPause={togglePlayPause}
        onSkipForward={skipForward}
        onSkipBackward={skipBackward}
        highlightPlay={highlightPlay}
      />

      {/* Structure timeline */}
      {!compact && analysis && <StructureTimeline segments={analysis.segments} duration={duration || track.duration} />}

      {/* Energy graph */}
      {!compact && analysis && <EnergyGraph energyCurve={analysis.energyCurve} />}

      {/* Learning features */}
      {!compact && showLearning && analysis && (
        <div className="space-y-3">
          {activeTips.map(tip => (
            <TipOverlay
              key={tip.id}
              tip={tip}
              onDismiss={() => onDismissTip?.(tip.id)}
            />
          ))}
          <TransitionGuide analysis={analysis} />
          <NextTrackSuggestion analysis={analysis} />
        </div>
      )}
    </div>
  );
}
