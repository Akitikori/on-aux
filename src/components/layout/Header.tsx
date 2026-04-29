export function Header() {
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
        <span className="text-xs text-text-muted">Learn to DJ</span>
      </div>
    </header>
  );
}
