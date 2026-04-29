import { useCallback, useState, useRef } from 'react';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  compact?: boolean;
}

export function UploadZone({ onFileSelected, compact = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }, [onFileSelected]);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset immediately via ref before any async work, so the same file
    // can be re-selected again (browser won't fire onChange if value unchanged)
    if (inputRef.current) inputRef.current.value = '';
    if (file) onFileSelected(file);
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm font-medium"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Upload Track
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          onChange={handleChange}
          className="hidden"
        />
      </button>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200
        ${isDragging
          ? 'border-accent bg-accent/10 scale-[1.02]'
          : 'border-border hover:border-accent/50 hover:bg-bg-card/50'
        }
        ${compact ? 'p-6' : 'p-12'}
      `}
    >
      <div className="flex flex-col items-center gap-4">
        <div className={`rounded-full bg-accent/10 flex items-center justify-center ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}>
          <svg width={compact ? 24 : 32} height={compact ? 24 : 32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-accent">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div className="text-center">
          <p className={`font-medium text-text-primary ${compact ? 'text-sm' : 'text-lg'}`}>
            Upload a track
          </p>
          <p className={`text-text-secondary mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
            Drag & drop an MP3 or WAV file, or click to browse
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
