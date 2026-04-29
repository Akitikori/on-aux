interface MixerControlsProps {
  deckAVolume: number;
  deckBVolume: number;
  crossfader: number;
  onDeckAVolumeChange: (v: number) => void;
  onDeckBVolumeChange: (v: number) => void;
  onCrossfaderChange: (v: number) => void;
  highlightCrossfader?: boolean;
  crossfaderTarget?: number | null;
}

export function MixerControls({
  deckAVolume,
  deckBVolume,
  crossfader,
  onDeckAVolumeChange,
  onDeckBVolumeChange,
  onCrossfaderChange,
  highlightCrossfader,
  crossfaderTarget,
}: MixerControlsProps) {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-6">
        {/* Deck A Volume */}
        <div className="flex flex-col items-center gap-1 w-16">
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Vol A</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={deckAVolume}
            onChange={e => onDeckAVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1.5 accent-intro appearance-auto rotate-[-90deg] origin-center"
            style={{ width: '80px' }}
          />
          <span className="text-[10px] text-text-muted tabular-nums">{Math.round(deckAVolume * 100)}%</span>
        </div>

        {/* Crossfader */}
        <div className={`relative flex-1 flex flex-col items-center gap-2 ${
          highlightCrossfader
            ? 'ring-2 ring-accent rounded-lg p-2 animate-pulse shadow-[0_0_20px_rgba(139,92,246,0.5)]'
            : ''
        }`}>
          <div className="flex items-center justify-between w-full px-2">
            <span className="text-xs font-semibold text-intro">A</span>
            <span className="text-[10px] text-text-muted uppercase tracking-wider">Crossfader</span>
            <span className="text-xs font-semibold text-chorus">B</span>
          </div>
          <div className="relative w-full">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={crossfader}
              onChange={e => onCrossfaderChange(parseFloat(e.target.value))}
              className="w-full h-2 accent-accent appearance-auto cursor-pointer"
            />
            {crossfaderTarget != null && (
              <div
                className="absolute top-1/2 w-0.5 h-5 bg-yellow-400 rounded-full opacity-80 pointer-events-none"
                style={{
                  left: `${crossfaderTarget * 100}%`,
                  transform: 'translateX(-50%) translateY(-50%)',
                }}
              />
            )}
          </div>
          {crossfaderTarget != null ? (
            <p className="text-[10px] font-medium text-yellow-400">
              Move to {crossfaderTarget === 0 ? 'A side' : crossfaderTarget === 1 ? 'B side' : `${Math.round(crossfaderTarget * 100)}%`}
            </p>
          ) : highlightCrossfader ? (
            <p className="text-[10px] font-bold text-accent animate-bounce">Move Crossfader</p>
          ) : (
            <p className="text-[10px] text-text-muted">Slide to blend between decks</p>
          )}
        </div>

        {/* Deck B Volume */}
        <div className="flex flex-col items-center gap-1 w-16">
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Vol B</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={deckBVolume}
            onChange={e => onDeckBVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1.5 accent-chorus appearance-auto rotate-[-90deg] origin-center"
            style={{ width: '80px' }}
          />
          <span className="text-[10px] text-text-muted tabular-nums">{Math.round(deckBVolume * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
