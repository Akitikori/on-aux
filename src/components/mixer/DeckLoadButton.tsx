import { useRef, useCallback } from 'react';

interface DeckLoadButtonProps {
  deckLabel: string;
  onLoad: () => void;
  onUploadFile: (file: File) => void;
}

export function DeckLoadButton({ deckLabel, onLoad: _onLoad, onUploadFile }: DeckLoadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  }, [onUploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Only accept real file drags, not library-track drags
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || /\.(mp3|wav|flac|aac|ogg)$/i.test(file.name)) {
        onUploadFile(file);
      }
    }
    // If no files, let the event bubble to DeckDropZone for library-track handling
  }, [onUploadFile]);

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className="w-full rounded-xl border-2 border-dashed border-border hover:border-accent/50 bg-bg-secondary/50 hover:bg-bg-card/50 transition-all p-6 flex flex-col items-center justify-center gap-3 group min-h-[200px] cursor-pointer"
    >
      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-accent">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
          Deck {deckLabel} — Drop or click to upload
        </p>
        <p className="text-xs text-text-muted mt-0.5">
          MP3 or WAV · or drag a track from your library below
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.flac,.aac,.ogg,audio/*"
        onChange={handleFileChange}
        className="hidden"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
