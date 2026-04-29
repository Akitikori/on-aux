import { getDB } from './connection';
import type { Session } from '../types/session';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySession = any;

export async function saveSession(session: Session): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session as AnySession);
}

export async function getLatestSession(): Promise<Session | undefined> {
  const db = await getDB();
  const cursor = await db.transaction('sessions').store.index('by-last-active').openCursor(null, 'prev');
  return cursor?.value as Session | undefined;
}

export async function getSessionForTrack(trackId: string): Promise<Session | undefined> {
  const db = await getDB();
  const all = await db.getAll('sessions') as unknown as AnySession[];
  return all.find((s: AnySession) =>
    s.deckA?.trackId === trackId ||
    s.deckB?.trackId === trackId ||
    s.trackId === trackId
  ) as Session | undefined;
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sessions', id);
}
