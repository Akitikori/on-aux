import { useState, useCallback } from 'react';
import { DeckDragDropProvider } from '../../hooks/useDeckDragDrop';
import { DualDeckView, type DeckData } from '../mixer/DualDeckView';
import { UploadProgress } from '../upload/UploadProgress';
import { UploadZone } from '../upload/UploadZone';
import { RecentTracks } from './RecentTracks';
import { ResumeSession } from './ResumeSession';
import { MusicSearch } from '../spotify/MusicSearch';
import type { Track, AnalysisResult } from '../../types/track';
import type { Session, DeckId } from '../../types/session';

type LibraryTab = 'library' | 'search';

interface DjWorkspaceProps {
  // Deck data
  deckA: DeckData | null;
  deckB: DeckData | null;
  library: { track: Track; analysis: AnalysisResult }[];
  // Session
  session: Session | null;
  initialPositionA?: number;
  initialPositionB?: number;
  initialCrossfader?: number;
  // Track library
  tracks: Track[];
  analysisMap: Map<string, AnalysisResult>;
  // Analysis progress
  analysisStatus: string;
  analysisProgress: number;
  pendingDeck: DeckId;
  // Callbacks
  onPositionChange: (deck: DeckId, position: number) => void;
  onLoadToDeck: (deck: DeckId) => void;
  onLoadTrackToDeck: (trackId: string, deck: DeckId) => void;
  onSelectTrack: (trackId: string) => void;
  onDeleteTrack?: (trackId: string) => void;
  onUploadFile: (file: File) => void;
  onUploadFileToDeck: (file: File, deck: DeckId) => void;
  onResumeSession: () => void;
  tutorialEnabled?: boolean;
  onDismissTip?: (tipId: string) => void;
  dismissedTips?: string[];
  onCrossfaderChange?: (position: number) => void;
  onVolumeChange?: (deck: DeckId, volume: number) => void;
  onGoToLearn?: () => void;
}

export function DjWorkspace({
  deckA,
  deckB,
  library,
  session,
  initialPositionA = 0,
  initialPositionB = 0,
  initialCrossfader = 0.5,
  tracks,
  analysisMap,
  analysisStatus,
  analysisProgress,
  pendingDeck,
  onPositionChange,
  onLoadToDeck,
  onLoadTrackToDeck,
  onSelectTrack,
  onDeleteTrack,
  onUploadFile,
  onUploadFileToDeck,
  onResumeSession,
  tutorialEnabled = true,
  onDismissTip,
  dismissedTips = [],
  onCrossfaderChange,
  onVolumeChange,
  onGoToLearn,
}: DjWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('library');
  const hasDecksLoaded = deckA !== null || deckB !== null;
  const analysisActive = analysisStatus !== 'complete' && analysisStatus !== 'idle' && analysisStatus !== 'error';

  // Resolve session tracks for resume card
  const sessionTrackA = session?.deckA
    ? tracks.find(t => t.id === session.deckA!.trackId) ?? null
    : null;
  const sessionTrackB = session?.deckB
    ? tracks.find(t => t.id === session.deckB!.trackId) ?? null
    : null;

  const handleFileUploadFromDrop = useCallback((file: File) => {
    onUploadFile(file);
  }, [onUploadFile]);

  return (
    <DeckDragDropProvider>
      <div className="flex flex-col">
        {/* Back to Learning nav */}
        {onGoToLearn && (
          <div className="px-4 pt-2 pb-0">
            <button
              onClick={onGoToLearn}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back to Learning
            </button>
          </div>
        )}

        {/* Top: Decks + Mixer */}
        <div className="px-4 py-3">
          {/* Upload/analysis progress */}
          {analysisActive && (
            <div className="mb-3">
              <UploadProgress
                status={analysisStatus}
                progress={analysisProgress}
                trackName={pendingDeck === 'A' ? deckA?.track.name : deckB?.track.name}
              />
            </div>
          )}

          <DualDeckView
            deckA={deckA}
            deckB={deckB}
            library={library}
            initialPositionA={initialPositionA}
            initialPositionB={initialPositionB}
            initialCrossfader={initialCrossfader}
            onPositionChange={onPositionChange}
            onLoadToDeck={onLoadToDeck}
            onLoadTrackToDeck={onLoadTrackToDeck}
            onUploadFileToDeck={onUploadFileToDeck}
            tutorialEnabled={tutorialEnabled}
            onDismissTip={onDismissTip}
            dismissedTips={dismissedTips}
            onCrossfaderChange={onCrossfaderChange}
            onVolumeChange={onVolumeChange}
          />
        </div>

        {/* Bottom: Library panel with tabs */}
        <div className="border-t border-border flex flex-col">
          {/* Tab bar + upload button */}
          <div className="flex items-center justify-between px-4 py-2 shrink-0">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('library')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'library'
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
                }`}
              >
                Library ({tracks.length})
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'search'
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                Search
              </button>
            </div>
            <UploadZone onFileSelected={handleFileUploadFromDrop} compact />
          </div>

          {/* Tab content */}
          <div className="px-4 pb-3">
            {activeTab === 'library' && (
              <div className="space-y-3">
                {/* Resume session card when no decks loaded */}
                {!hasDecksLoaded && session && (sessionTrackA || sessionTrackB) && (
                  <ResumeSession
                    trackA={sessionTrackA}
                    trackB={sessionTrackB}
                    session={session}
                    onResume={onResumeSession}
                  />
                )}

                {tracks.length > 0 ? (
                  <RecentTracks
                    tracks={tracks}
                    analysisMap={analysisMap}
                    onSelectTrack={onSelectTrack}
                    onLoadToDeck={onLoadTrackToDeck}
                    onDeleteTrack={onDeleteTrack}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-text-muted">No tracks yet. Upload a track to get started!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'search' && (
              <MusicSearch />
            )}
          </div>
        </div>
      </div>
    </DeckDragDropProvider>
  );
}
