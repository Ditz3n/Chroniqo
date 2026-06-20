// src/lib/utils/search-storage.ts
import { RecentSearch } from "@/types/app-types";
import { MAX_ITEMS, QUERIES_KEY, RECENTS_KEY } from "../constants";

export function getRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as RecentSearch[]) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(item: RecentSearch): void {
  if (typeof window === "undefined") return;
  try {
    const current = getRecentSearches();
    const filtered = current.filter(
      (r) => !(r.id === item.id && r.kind === item.kind),
    );
    localStorage.setItem(
      RECENTS_KEY,
      JSON.stringify([item, ...filtered].slice(0, MAX_ITEMS)),
    );
  } catch {
    // Silently absorb storage errors
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENTS_KEY);
  } catch {
    // Silently absorb storage errors
  }
}

export function getRecentQueries(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUERIES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addRecentQuery(query: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getRecentQueries();
    const filtered = current.filter((q) => q !== query);
    localStorage.setItem(
      QUERIES_KEY,
      JSON.stringify([query, ...filtered].slice(0, MAX_ITEMS)),
    );
  } catch {
    // Silently absorb storage errors
  }
}

export function clearRecentQueries(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(QUERIES_KEY);
  } catch {
    // Silently absorb storage errors
  }
}
