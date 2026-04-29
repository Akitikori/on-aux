import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { DeckId } from '../types/session';

interface DeckDragDropState {
  draggedTrackId: string | null;
  dragOverDeck: DeckId | null;
  startDrag: (trackId: string) => void;
  setDragOverDeck: (deck: DeckId | null) => void;
  endDrag: () => void;
}

const DeckDragDropContext = createContext<DeckDragDropState>({
  draggedTrackId: null,
  dragOverDeck: null,
  startDrag: () => {},
  setDragOverDeck: () => {},
  endDrag: () => {},
});

export function DeckDragDropProvider({ children }: { children: ReactNode }) {
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null);
  const [dragOverDeck, setDragOverDeckState] = useState<DeckId | null>(null);

  const startDrag = useCallback((trackId: string) => {
    setDraggedTrackId(trackId);
  }, []);

  const setDragOverDeck = useCallback((deck: DeckId | null) => {
    setDragOverDeckState(deck);
  }, []);

  const endDrag = useCallback(() => {
    setDraggedTrackId(null);
    setDragOverDeckState(null);
  }, []);

  return (
    <DeckDragDropContext.Provider value={{ draggedTrackId, dragOverDeck, startDrag, setDragOverDeck, endDrag }}>
      {children}
    </DeckDragDropContext.Provider>
  );
}

export function useDeckDragDrop() {
  return useContext(DeckDragDropContext);
}
