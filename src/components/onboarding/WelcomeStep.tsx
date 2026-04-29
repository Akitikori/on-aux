interface WelcomeStepProps {
  onContinue: () => void;
}

export function WelcomeStep({ onContinue }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center mb-8 shadow-lg shadow-accent/25">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2a10 10 0 0 1 0 20" opacity="0.4"/>
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-text-primary mb-3">
        Welcome to On Aux
      </h1>
      <p className="text-text-secondary max-w-md leading-relaxed mb-2">
        Learn to DJ by understanding your music. We'll analyze your tracks
        and show you exactly where and how to mix.
      </p>
      <p className="text-sm text-text-muted max-w-sm mb-8">
        No experience needed — we'll guide you through everything step by step.
      </p>

      <button
        onClick={onContinue}
        className="px-8 py-3 bg-accent hover:bg-accent-light text-white font-medium rounded-xl transition-colors shadow-lg shadow-accent/25"
      >
        Get Started
      </button>

      <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg text-left">
        {[
          { icon: '1', title: 'Upload', desc: 'Drop in any MP3 or WAV' },
          { icon: '2', title: 'Analyze', desc: 'We detect BPM & structure' },
          { icon: '3', title: 'Learn', desc: 'Get mixing tips & guidance' },
        ].map((item) => (
          <div key={item.icon} className="text-center">
            <div className="w-8 h-8 rounded-full bg-accent/10 text-accent text-sm font-bold flex items-center justify-center mx-auto mb-2">
              {item.icon}
            </div>
            <p className="text-sm font-medium text-text-primary">{item.title}</p>
            <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
