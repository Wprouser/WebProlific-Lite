import { useMemo, useSyncExternalStore } from 'react';
import { getSession } from './auth-store';

const STORAGE_KEY = 'webprolific.selectedContext';

export interface SelectedContext {
  /** 'property' means the caller has deliberately chosen to view the whole
   * property (a CHAIN_OWNER/PROPERTY_MANAGER "roll-up" view) rather than
   * one specific outlet within it — currently only Dashboard has anywhere
   * to send that. `outletId` is still always a concrete, resolved outlet
   * (that property's first one) even at this level, so every other screen
   * can read `.outletId` without ever caring about `level` at all. */
  level: 'outlet' | 'property';
  outletId: string;
  propertyId: string;
}

// Cached so repeated reads return the same reference until an actual
// mutation happens — required for useSyncExternalStore, which otherwise
// treats a fresh object on every call as a change and can loop.
let cached: SelectedContext | null | undefined = undefined;

function readFromStorage(): SelectedContext | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SelectedContext;
  } catch {
    return null;
  }
}

function readCached(): SelectedContext | null {
  if (cached === undefined) cached = readFromStorage();
  return cached;
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((listener) => listener());
}

/** The explicitly-selected context, or null if nothing has been chosen
 * yet (a fresh session, or one from before this feature existed). Prefer
 * `useSelectedContext()` in components — it already falls back to the
 * caller's first accessible outlet, matching every screen's prior
 * default, so callers don't each need to handle null themselves. */
export function getSelectedContext(): SelectedContext | null {
  return readCached();
}

export function setSelectedContext(context: SelectedContext): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  cached = context;
  notify();
}

/** Cleared alongside the session itself (see auth-store.ts's
 * clearSession) — a different user on the same browser shouldn't inherit
 * someone else's outlet selection. */
export function clearSelectedContext(): void {
  localStorage.removeItem(STORAGE_KEY);
  cached = null;
  notify();
}

function subscribe(callback: () => void): () => void {
  // The native `storage` event only fires in *other* tabs, never the one
  // that made the write — so this also gives cross-tab sync for free,
  // without double-notifying the tab that actually switched.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    cached = undefined;
    callback();
  };
  listeners.add(callback);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Reactive read of the current selection — re-renders the caller when the
 * Context Switcher changes it, or another tab does. Always returns a
 * usable context: if nothing has been explicitly selected yet (including
 * the moment before the Context Switcher's own async hierarchy load
 * resolves), falls back to the session's first accessible outlet — the
 * exact prior default every screen used, so there's no race and no
 * "undefined outlet" flash on first render.
 */
export function useSelectedContext(): SelectedContext {
  const stored = useSyncExternalStore(subscribe, getSelectedContext, () => null);
  return useMemo(() => {
    if (stored) return stored;
    return { level: 'outlet', outletId: getSession()?.user.effectiveOutletIds[0] ?? '', propertyId: '' };
  }, [stored]);
}
