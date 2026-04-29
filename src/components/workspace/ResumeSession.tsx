import type { Track } from '../../types/track';
import type { Session } from '../../types/session';
import { formatTime } from '../../utils/formatTime';

interface ResumeSessionProps {
  trackA: Track | null;
  trackB: Track | null;
  session: Session;
  onResume: () => void;
}

export function ResumeSession({ trackA, trackB, session, onResume }: ResumeSessionProps) {
  const timeAgo = getTimeAgo(session.lastActiveAt);
  const hasTrackA = trackA && session.deckA;
  const hasTrackB = trackB && session.deckB;

  if (!hasTrackA && !hasTrackB) return null;

  return (
    <div
      onClick={onResume}
      className="bg-gradient-to-r from-accent/10 to-accent-dim/5 rounded-xl p-5 border border-accent/20 cursor-pointer hover:border-accent/40 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-accent font-medium uppercase tracking-wider mb-1">
            Resume Last Session
          </p>
          <div className="space-y-0.5">
            {hasTrackA && (
              <p className="text-sm text-text-primary">
                <span className="text-xs font-bold text-intro mr-1.5">A</span>
                {trackA!.name}
                <span className="text-text-muted ml-2 text-xs">at {formatTime(session.deckA!.playbackPosition)}</span>
              </p>
            )}
            {hasTrackB && (
              <p className="text-sm text-text-primary">
                <span className="text-xs font-bold text-chorus mr-1.5">B</span>
                {trackB!.name}
                <span className="text-text-muted ml-2 text-xs">at {formatTime(session.deckB!.playbackPosition)}</span>
              </p>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1">{timeAgo}</p>
        </div>
        <button className="px-5 py-2.5 bg-accent hover:bg-accent-light text-white font-medium rounded-xl transition-colors text-sm shrink-0">
          Continue
        </button>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
