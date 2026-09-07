import { useEffect } from 'react';

/**
 * Guards the Context Switcher specifically against silently discarding a
 * half-filled full-page form (New Transfer, New Purchase Order, etc.) when
 * the user switches outlet/property mid-edit — not general in-app
 * navigation-away (a link click, the back button). That's a separate,
 * larger gap: React Router's `useBlocker` is the standard tool for it, but
 * it only works with the data-router API (`createBrowserRouter`), and this
 * app still uses the plain `<BrowserRouter>`/`<Routes>` tree — migrating
 * just for this would be a much bigger, separate change. Left as a known,
 * explicitly-flagged limitation rather than silently declared solved.
 */
let current: { label: string } | null = null;

export function setUnsavedWork(label: string): void {
  current = { label };
}

export function clearUnsavedWork(): void {
  current = null;
}

export function getUnsavedWork(): { label: string } | null {
  return current;
}

/** True if it's safe to proceed (nothing unsaved, or the user confirmed
 * discarding it). Called by the Context Switcher before applying a
 * selection change. `buildMessage` receives the registered label so the
 * caller can render an already-translated confirm message — kept out of
 * this module so it stays a plain, i18n-agnostic utility. */
export function confirmDiscardIfNeeded(buildMessage: (label: string) => string): boolean {
  if (!current) return true;
  return window.confirm(buildMessage(current.label));
}

/** Registers/unregisters this screen's dirty state for the guard above.
 * `label` should be a short, already-translated name for what's in
 * progress (e.g. "New Transfer") — shown verbatim in the confirm prompt. */
export function useUnsavedWorkGuard(isDirty: boolean, label: string): void {
  useEffect(() => {
    if (isDirty) setUnsavedWork(label);
    else clearUnsavedWork();
    return () => clearUnsavedWork();
  }, [isDirty, label]);
}
