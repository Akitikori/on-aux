import { useState, useCallback, useRef } from 'react';
import { WaveformDeck } from '../waveform/WaveformDeck';
import { RecentTracks } from '../workspace/RecentTracks';
import { UploadZone } from '../upload/UploadZone';
import { UploadProgress } from '../upload/UploadProgress';
import { DeckDragDropProvider } from '../../hooks/useDeckDragDrop';
import { DeckDropZone } from '../mixer/DeckDropZone';
import { TapBeatExercise } from './TapBeatExercise';
import { BeatHighlighter } from './BeatHighlighter';
import type { Track, AnalysisResult } from '../../types/track';
import type { DeckData } from '../mixer/DualDeckView';
import type { DeckId } from '../../types/session';

type ExerciseTab = 'intro' | 'highlight' | 'tap';

interface LearnPageProps {
  deckA: DeckData | null;
  tracks: Track[];
  analysisMap: Map<string, AnalysisResult>;
  analysisStatus: string;
  analysisProgress: number;
  pendingDeck: DeckId;
  onLoadTrackToDeck: (trackId: string, deck: DeckId) => void;
  onSelectTrack: (trackId: string) => void;
  onDeleteTrack?: (trackId: string) => void;
  onUploadFile: (file: File) => void;
  onPositionChange: (deck: DeckId, position: number) => void;
  onGoToMix: () => void;
}

export function LearnPage({
  deckA,
  tracks,
  analysisMap,
  analysisStatus,
  analysisProgress,
  pendingDeck,
  onLoadTrackToDeck,
  onSelectTrack,
  onDeleteTrack,
  onUploadFile,
  onPositionChange,
  onGoToMix,
}: LearnPageProps) {
  const [activeTab, setActiveTab] = useState<ExerciseTab>('intro');
  const [currentTime, setCurrentTime] = useState(0);

  // Track position with wall-clock interpolation for <10ms tap accuracy
  const positionSnap = useRef<{ wallTime: number; trackTime: number }>({
    wallTime: 0,
    trackTime: 0,
  });

  const getEstimatedTime = useCallback((): number => {
    const { wallTime, trackTime } = positionSnap.current;
    return trackTime + (performance.now() - wallTime) / 1000;
  }, []);

  const handlePositionChange = useCallback(
    (pos: number) => {
      positionSnap.current = { wallTime: performance.now(), trackTime: pos };
      setCurrentTime(pos);
      onPositionChange('A', pos);
    },
    [onPositionChange],
  );

  const analysisActive =
    analysisStatus !== 'complete' &&
    analysisStatus !== 'idle' &&
    analysisStatus !== 'error';

  const handleSelectTrack = useCallback(
    (trackId: string) => onLoadTrackToDeck(trackId, 'A'),
    [onLoadTrackToDeck],
  );

  const tabs: { id: ExerciseTab; label: string }[] = [
    { id: 'intro', label: 'Song Structure' },
    { id: 'highlight', label: 'Beat Highlighter' },
    { id: 'tap', label: 'Tap the Beat' },
  ];

  return (
    <DeckDragDropProvider>
      <div className="flex flex-col min-h-0">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Learn the Basics</h2>
            <p className="text-xs text-text-muted">Understand music, then mix it</p>
          </div>
          <button
            onClick={onGoToMix}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            Ready to Mix
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors -mb-px border border-transparent ${
                activeTab === tab.id
                  ? 'bg-bg-card text-accent border-border border-b-bg-card'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-4 py-4">

          {/* ── Song Structure intro ── */}
          {activeTab === 'intro' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">The Beat</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Every song has a rhythmic pulse called the <span className="text-text-primary font-medium">beat</span>, measured in BPM (beats per minute). A DJ's core skill is matching the BPM of two tracks so they can blend seamlessly — if the beats don't align, the mix sounds chaotic.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2">Song Sections</h3>
                <p className="text-xs text-text-secondary leading-relaxed mb-3">
                  Songs are divided into distinct parts. Learning to spot them lets you know <em>when</em> to bring in a new track — a good DJ times their mix to the structure of the music.
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Intro', color: 'bg-text-muted', desc: 'Sparse opening — gives you time to mix in before the energy builds.' },
                    { label: 'Buildup', color: 'bg-buildup', desc: 'Tension rises. Drums and elements layer in ahead of the drop.' },
                    { label: 'Chorus / Drop', color: 'bg-chorus', desc: 'Peak energy. The crowd is most engaged here — use this moment wisely.' },
                    { label: 'Breakdown', color: 'bg-breakdown', desc: 'Energy dips. Melody or vocals come forward, giving the crowd a breather.' },
                    { label: 'Outro', color: 'bg-text-muted', desc: 'The track winds down — a good window to blend into your next song.' },
                  ].map(({ label, color, desc }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className={`mt-0.5 w-2.5 h-2.5 rounded-sm shrink-0 ${color} opacity-80`} />
                      <div>
                        <span className="text-xs font-medium text-text-primary">{label}</span>
                        <span className="text-xs text-text-secondary"> — {desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">Energy Levels</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  The waveform height shows how loud and energetic each moment is. DJs read this at a glance to plan their set — you want to bring in a new track when the energy of both songs matches, so the transition feels natural rather than jarring.
                </p>
              </div>

              <div className="rounded-lg bg-accent/8 border border-accent/20 px-4 py-3">
                <p className="text-xs text-accent">
                  Load a track from the library below to see its structure and energy map, then move to the Beat Highlighter to start feeling the rhythm.
                </p>
              </div>
            </div>
          )}

          {/* ── Beat Highlighter ── */}
          {activeTab === 'highlight' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Feel the Rhythm</h3>
                <p className="text-xs text-text-secondary leading-relaxed mt-1">
                  Watch the beat counter pulse in time with the music. Your goal is to internalise the beat — when you can predict the next <span className="text-amber-400 font-medium">1</span> before it lands, you're thinking like a DJ.
                </p>
              </div>
              <BeatHighlighter
                analysis={deckA?.analysis ?? null}
                currentTime={currentTime}
              />
            </div>
          )}

          {/* ── Tap the Beat ── */}
          {activeTab === 'tap' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Test Your Timing</h3>
                <p className="text-xs text-text-secondary leading-relaxed mt-1">
                  Tap along with the beat to measure how accurately you lock in. DJs need sub-100ms accuracy to blend tracks without them drifting apart — anything under 50ms is excellent.
                </p>
              </div>
              <TapBeatExercise
                analysis={deckA?.analysis ?? null}
                getEstimatedTime={getEstimatedTime}
                trackName={deckA?.track.name}
              />
            </div>
          )}
        </div>

        {/* Analysis progress */}
        {analysisActive && (
          <div className="px-4 pb-2">
            <UploadProgress
              status={analysisStatus}
              progress={analysisProgress}
              trackName={pendingDeck === 'A' ? deckA?.track.name : undefined}
            />
          </div>
        )}

        {/* Waveform deck — below exercises */}
        <div className="px-4 pb-3 border-t border-border pt-3">
          <DeckDropZone
            deck="A"
            onDropTrack={(trackId) => onLoadTrackToDeck(trackId, 'A')}
          >
            {deckA ? (
              <WaveformDeck
                track={deckA.track}
                blob={deckA.blob}
                analysis={deckA.analysis}
                deckLabel="A"
                showLearning={false}
                initialZoom={1}
                autoCenter={true}
                onPositionChange={handlePositionChange}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-bg-card/50 flex flex-col items-center justify-center py-10 gap-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
                <p className="text-xs text-text-muted">Load a track from the library below</p>
              </div>
            )}
          </DeckDropZone>
        </div>

        {/* Library panel */}
        <div className="border-t border-border flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 shrink-0">
            <span className="text-xs font-medium text-text-secondary">
              Library ({tracks.length})
            </span>
            <UploadZone onFileSelected={onUploadFile} compact />
          </div>
          <div className="px-4 pb-4">
            {tracks.length > 0 ? (
              <RecentTracks
                tracks={tracks}
                analysisMap={analysisMap}
                onSelectTrack={handleSelectTrack}
                onLoadToDeck={onLoadTrackToDeck}
                onDeleteTrack={onDeleteTrack}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-text-muted">No tracks yet. Upload a track to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DeckDragDropProvider>
  );
}
