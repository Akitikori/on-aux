import { useState, useMemo, useCallback } from 'react';

export function useDeckVolume(initialCrossfader = 0.5) {
  const [deckAVolume, setDeckAVolume] = useState(1);
  const [deckBVolume, setDeckBVolume] = useState(1);
  const [crossfader, setCrossfader] = useState(initialCrossfader);

  // Linear taper: center = both at 100%, ends = one side only
  const effectiveA = useMemo(() => {
    return deckAVolume * Math.min(1, 2 * (1 - crossfader));
  }, [deckAVolume, crossfader]);

  const effectiveB = useMemo(() => {
    return deckBVolume * Math.min(1, 2 * crossfader);
  }, [deckBVolume, crossfader]);

  const reset = useCallback(() => {
    setDeckAVolume(1);
    setDeckBVolume(1);
    setCrossfader(0.5);
  }, []);

  return {
    deckAVolume,
    deckBVolume,
    crossfader,
    effectiveA,
    effectiveB,
    setDeckAVolume,
    setDeckBVolume,
    setCrossfader,
    reset,
  };
}
