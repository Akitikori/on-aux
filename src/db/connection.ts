import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface OnAuxDB extends DBSchema {
  tracks: {
    key: string;
    value: {
      id: string;
      name: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      duration: number;
      addedAt: number;
      blob: Blob;
    };
    indexes: {
      'by-added': number;
      'by-name': string;
    };
  };
  analysis: {
    key: string;
    value: {
      trackId: string;
      bpm: number;
      bpmConfidence: number;
      key?: string;
      keyConfidence?: number;
      energyCurve: number[];
      segments: Array<{
        type: 'intro' | 'buildup' | 'chorus' | 'breakdown' | 'outro';
        startTime: number;
        endTime: number;
        avgEnergy: number;
        label: string;
      }>;
      analyzedAt: number;
    };
    indexes: {
      'by-bpm': number;
    };
  };
  sessions: {
    key: string;
    value: {
      id: string;
      trackId?: string;
      playbackPosition?: number;
      deckA?: { trackId: string; playbackPosition: number; volume: number } | null;
      deckB?: { trackId: string; playbackPosition: number; volume: number } | null;
      crossfaderPosition?: number;
      lastActiveAt: number;
      onboardingCompleted: boolean;
      onboardingStep: number;
      dismissedTips: string[];
    };
    indexes: {
      'by-last-active': number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<OnAuxDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<OnAuxDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OnAuxDB>('on-aux-db', 1, {
      upgrade(db) {
        const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
        trackStore.createIndex('by-added', 'addedAt');
        trackStore.createIndex('by-name', 'name');

        const analysisStore = db.createObjectStore('analysis', { keyPath: 'trackId' });
        analysisStore.createIndex('by-bpm', 'bpm');

        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionStore.createIndex('by-last-active', 'lastActiveAt');
      },
    });
  }
  return dbPromise;
}

export type { OnAuxDB };
