import { RecentTracks } from './RecentTracks';
import { ResumeSession } from './ResumeSession';
import { UploadZone } from '../upload/UploadZone';
import type { Track, AnalysisResult } from '../../types/track';
import type { Session } from '../../types/session';
import type { DeckId } from '../../types/session';

interface WorkspaceHomeProps {
  tracks: Track[];
  analysisMap: Map<string, AnalysisResult>;
  latestSession: Session | null;
  onUploadFile: (file: File) => void;
  onSelectTrack: (trackId: string) => void;
  onLoadToDeck?: (trackId: string, deck: DeckId) => void;
  onResumeSession: () => void;
}

export function WorkspaceHome({
  tracks,
  analysisMap,
  latestSession,
  onUploadFile,
  onSelectTrack,
  onLoadToDeck,
  onResumeSession,
}: WorkspaceHomeProps) {
  const sessionTrackA = latestSession?.deckA
    ? tracks.find(t => t.id === latestSession.deckA!.trackId) ?? null
    : null;
  const sessionTrackB = latestSession?.deckB
    ? tracks.find(t => t.id === latestSession.deckB!.trackId) ?? null
    : null;

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto w-full space-y-8">
      {/* Welcome back header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
        <p className="text-text-secondary mt-1">Pick up where you left off, or start something new.</p>
      </div>

      {/* Resume session card */}
      {latestSession && (sessionTrackA || sessionTrackB) && (
        <ResumeSession
          trackA={sessionTrackA}
          trackB={sessionTrackB}
          session={latestSession}
          onResume={onResumeSession}
        />
      )}

      {/* Upload new track */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
          Upload New Track
        </h2>
        <UploadZone onFileSelected={onUploadFile} compact />
      </div>

      {/* Recent tracks */}
      {tracks.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
            Your Library ({tracks.length} {tracks.length === 1 ? 'track' : 'tracks'})
          </h2>
          <RecentTracks
            tracks={tracks}
            analysisMap={analysisMap}
            onSelectTrack={onSelectTrack}
            onLoadToDeck={onLoadToDeck}
          />
        </div>
      )}
    </div>
  );
}
