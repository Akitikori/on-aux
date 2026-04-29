interface TransportControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  highlightPlay?: boolean;
}

export function TransportControls({ isPlaying, onPlayPause, onSkipForward, onSkipBackward, highlightPlay }: TransportControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={onSkipBackward}
        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        title="Skip back 5s"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="19 20 9 12 19 4 19 20"/>
          <line x1="5" y1="19" x2="5" y2="5"/>
        </svg>
      </button>

      <div className="relative">
        <button
          onClick={onPlayPause}
          className={`w-12 h-12 rounded-full bg-accent hover:bg-accent-light transition-colors flex items-center justify-center shadow-lg shadow-accent/25 ${
            highlightPlay
              ? 'ring-2 ring-accent animate-pulse shadow-[0_0_20px_rgba(139,92,246,0.6)]'
              : ''
          }`}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <polygon points="8 4 20 12 8 20"/>
            </svg>
          )}
        </button>
        {highlightPlay && !isPlaying && (
          <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-bold text-accent whitespace-nowrap animate-bounce">
            Press Play
          </span>
        )}
      </div>

      <button
        onClick={onSkipForward}
        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        title="Skip forward 5s"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 4 15 12 5 20 5 4"/>
          <line x1="19" y1="5" x2="19" y2="19"/>
        </svg>
      </button>
    </div>
  );
}
