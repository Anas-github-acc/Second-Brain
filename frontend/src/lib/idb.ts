/**
 * lib/idb.ts – Simple localStorage cache for unified session state.
 */
import { UnifiedSession } from '@/types';

const KEY = (id: string) => `session_v2_${id}`;

export const cacheSession = async (session: UnifiedSession): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY(session.session_id), JSON.stringify(session));
  } catch {
    // quota exceeded or SSR – ignore
  }
};

export const getCachedSession = async (
  id: string
): Promise<UnifiedSession | null> => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY(id));
    if (!raw) return null;
    return JSON.parse(raw) as UnifiedSession;
  } catch {
    return null;
  }
};

export const clearCachedSession = (id: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY(id));
};
