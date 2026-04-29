import { getDB } from './connection';
import type { Track } from '../types/track';

export async function saveTrack(track: Track, blob: Blob): Promise<void> {
  const db = await getDB();
  await db.put('tracks', { ...track, blob });
}

export async function getTrack(id: string): Promise<(Track & { blob: Blob }) | undefined> {
  const db = await getDB();
  return db.get('tracks', id);
}

export async function getAllTracks(): Promise<Track[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('tracks', 'by-added');
  return all.reverse().map(({ blob: _, ...track }) => track);
}

export async function deleteTrack(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('tracks', id);
}

export async function getTrackBlob(id: string): Promise<Blob | undefined> {
  const db = await getDB();
  const record = await db.get('tracks', id);
  return record?.blob;
}
