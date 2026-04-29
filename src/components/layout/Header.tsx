interface HeaderProps {
  tutorialEnabled?: boolean;
  onToggleTutorial?: () => void;
}

export function Header({ tutorialEnabled = true, onToggleTutorial }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-text-primary tracking-tight">On Aux</h1>
      </div>

      <div className="flex items-center gap-4">
        {onToggleTutorial && (
          <button
            onClick={onToggleTutorial}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              tutorialEnabled
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-bg-secondary text-text-muted border border-border hover:border-accent/30 hover:text-text-secondary'
            }`}
            title={tutorialEnabled ? 'Tutorial mode on — click to turn off' : 'Tutorial mode off — click to turn on'}
          >
            {/* Mortarboard / graduation cap icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/>
              <path d="M6 12v5c0 0 2 3 6 3s6-3 6-3v-5"/>
            </svg>
            Tutorial
            {/* Toggle pill */}
            <span className={`w-7 h-4 rounded-full relative flex items-center transition-colors ${
              tutorialEnabled ? 'bg-accent' : 'bg-bg-card border border-border'
            }`}>
              <span className={`w-3 h-3 rounded-full bg-white absolute transition-transform shadow-sm ${
                tutorialEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
              }`} />
            </span>
          </button>
        )}
        <span className="text-xs text-text-muted">Learn to DJ</span>
      </div>
    </header>
  );
}
