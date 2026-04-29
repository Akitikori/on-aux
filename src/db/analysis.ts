import { getDB } from './connection';
import type { AnalysisResult } from '../types/track';

export async function saveAnalysis(analysis: AnalysisResult): Promise<void> {
  const db = await getDB();
  await db.put('analysis', analysis);
}

export async function getAnalysis(trackId: string): Promise<AnalysisResult | undefined> {
  const db = await getDB();
  const result = await db.get('analysis', trackId);
  if (!result) return undefined;
  // Ensure backwards compat for records without these fields
  return {
    ...result,
    key: result.key ?? '',
    keyConfidence: result.keyConfidence ?? 0,
    beatPhase: result.beatPhase ?? 0,
  } as AnalysisResult;
}

export async function deleteAnalysis(trackId: string): Promise<void> {
  const db = await getDB();
  await db.delete('analysis', trackId);
}

export async function getAllAnalysis(): Promise<AnalysisResult[]> {
  const db = await getDB();
  const all = await db.getAll('analysis');
  return all as unknown as AnalysisResult[];
}
