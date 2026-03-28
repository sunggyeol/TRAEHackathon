import type { CacheEntry, MappingCache, ColumnMapping } from '@/types';

const CACHE_KEY = 'saleslens_mappings';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0').slice(0, 16);
}

export async function fingerprint(columns: string[]): Promise<string> {
  const normalized = columns.map(c => c.trim().toLowerCase()).sort();
  const data = new TextEncoder().encode(JSON.stringify(normalized));

  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hash = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 16);
    }
  } catch {
    // Fallback for non-secure contexts
  }

  return simpleHash(JSON.stringify(normalized));
}

export function getCachedMapping(fp: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: MappingCache = JSON.parse(raw);
    return cache[fp] || null;
  } catch {
    return null;
  }
}

export function saveMappingToCache(
  fp: string,
  platform: string,
  mapping: ColumnMapping[]
): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache: MappingCache = raw ? JSON.parse(raw) : {};
    cache[fp] = {
      platform,
      mapping,
      confirmedAt: new Date().toISOString(),
      useCount: (cache[fp]?.useCount || 0) + 1,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    console.warn('[CACHE] Failed to save mapping to localStorage');
  }
}

// File-level duplicate detection (per session)
let uploadedFileHashes = new Set<string>();

export function clearDuplicateCache(): void {
  uploadedFileHashes = new Set<string>();
}

export async function isFileDuplicate(file: File): Promise<boolean> {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  let hash = 0;
  for (let i = 0; i < Math.min(data.length, 10000); i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash;
  }
  const key = `${file.name}-${file.size}-${hash}`;
  if (uploadedFileHashes.has(key)) return true;
  uploadedFileHashes.add(key);
  return false;
}
