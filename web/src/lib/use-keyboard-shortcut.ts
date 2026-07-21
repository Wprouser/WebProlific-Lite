import { useEffect } from 'react';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

export interface KeyboardShortcutOptions {
  /** Matched key, case-insensitive (e.g. 'k', '/', '?'). */
  key: string;
  ctrlOrCmd?: boolean;
  /** If true (default), the shortcut is ignored while focus is in a text
   * input — matters for bare keys like '/' or '?' that are also typed
   * characters; Ctrl/Cmd-modified shortcuts should usually pass false. */
  ignoreWhenTyping?: boolean;
  handler: () => void;
}

/** FR-17 Global App Chrome: standardized shortcuts (Ctrl+K / search, ?
 * help, etc.) — registered once per shortcut, active app-wide. */
export function useKeyboardShortcut({
  key,
  ctrlOrCmd = false,
  ignoreWhenTyping = true,
  handler,
}: KeyboardShortcutOptions): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (ctrlOrCmd && !(event.ctrlKey || event.metaKey)) return;
      if (!ctrlOrCmd && (event.ctrlKey || event.metaKey)) return;
      if (ignoreWhenTyping && isTypingTarget(event.target)) return;
      event.preventDefault();
      handler();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, ctrlOrCmd, ignoreWhenTyping, handler]);
}
