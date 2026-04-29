import { useState, useCallback } from 'react';

const TUTORIAL_KEY = 'on-aux-tutorial-mode';

export function useTutorialMode() {
  const [enabled, setEnabled] = useState(() =>
    localStorage.getItem(TUTORIAL_KEY) !== 'false' // default ON
  );

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      localStorage.setItem(TUTORIAL_KEY, String(next));
      return next;
    });
  }, []);

  return { tutorialEnabled: enabled, toggleTutorial: toggle };
}
