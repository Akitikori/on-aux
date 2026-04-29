import { useCallback, type ReactNode } from 'react';
import { useDeckDragDrop } from '../../hooks/useDeckDragDrop';
import type { DeckId } from '../../types/session';

interface DeckDropZoneProps {
  deck: DeckId;
  onDropTrack: (trackId: string) => void;
  children: ReactNode;
}

export function DeckDropZone({ deck, onDropTrack, children }: DeckDropZoneProps) {
  const { draggedTrackId, dragOverDeck, setDragOverDeck, endDrag } = useDeckDragDrop();

  const isOver = dragOverDeck === deck && draggedTrackId !== null;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverDeck(deck);
  }, [deck, setDragOverDeck]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if actually leaving this zone (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverDeck(null);
    }
  }, [setDragOverDeck]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const trackId = e.dataTransfer.getData('text/plain');
    if (trackId) {
      onDropTrack(trackId);
    }
    endDrag();
  }, [onDropTrack, endDrag]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative"
    >
      {children}

      {/* Drop overlay */}
      {isOver && (
        <div className="absolute inset-0 z-10 rounded-xl border-2 border-dashed border-accent bg-accent/10 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <p className="text-sm font-semibold text-accent">
              Drop to load on Deck {deck}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
