import { normalizeAddress } from "./stellar";

export function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readAllEntries<T>(storageKey: string): T[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as T[];
  } catch {
    return [];
  }
}

export function writeAllEntries<T>(storageKey: string, entries: T[], maxEntries?: number): void {
  if (!canUseStorage()) return;

  try {
    const toStore = maxEntries != null ? entries.slice(-maxEntries) : entries;
    window.localStorage.setItem(storageKey, JSON.stringify(toStore));
  } catch {
    // Ignore localStorage write failures.
  }
}

export function appendTimestamp<T extends object>(
  entry: Omit<T, "timestamp"> & { timestamp?: number },
): T {
  return { ...entry, timestamp: Date.now() } as T;
}

export function filterAndSortByTimestamp<T extends { timestamp: number }>(
  entries: T[],
  addressField: keyof T,
  address: string,
  limit?: number,
): T[] {
  const normalized = normalizeAddress(address);
  const filtered = entries.filter(
    (entry) => normalizeAddress(entry[addressField] as string) === normalized,
  );
  const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);
  return limit != null ? sorted.slice(0, Math.max(0, limit)) : sorted;
}
