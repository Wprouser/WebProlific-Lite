import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { clearUnsavedWork, confirmDiscardIfNeeded, getUnsavedWork, setUnsavedWork, useUnsavedWorkGuard } from './unsaved-work-registry';

describe('unsaved-work-registry', () => {
  beforeEach(() => {
    clearUnsavedWork();
  });

  it('AC: nothing registered means it is always safe to proceed, without prompting', () => {
    const buildMessage = vi.fn();
    expect(confirmDiscardIfNeeded(buildMessage)).toBe(true);
    expect(buildMessage).not.toHaveBeenCalled();
  });

  it('AC: prompts with the registered label and returns the user\'s answer', () => {
    setUnsavedWork('New Transfer');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const result = confirmDiscardIfNeeded((label) => `Discard ${label}?`);
    expect(confirmSpy).toHaveBeenCalledWith('Discard New Transfer?');
    expect(result).toBe(false);
    confirmSpy.mockRestore();
  });

  it('getUnsavedWork reflects the current registration', () => {
    expect(getUnsavedWork()).toBeNull();
    setUnsavedWork('New Purchase Order');
    expect(getUnsavedWork()).toEqual({ label: 'New Purchase Order' });
    clearUnsavedWork();
    expect(getUnsavedWork()).toBeNull();
  });

  describe('useUnsavedWorkGuard', () => {
    it('AC: registers while dirty and clears once not dirty', () => {
      const { rerender, unmount } = renderHook(({ isDirty }) => useUnsavedWorkGuard(isDirty, 'New Transfer'), {
        initialProps: { isDirty: true },
      });
      expect(getUnsavedWork()).toEqual({ label: 'New Transfer' });

      rerender({ isDirty: false });
      expect(getUnsavedWork()).toBeNull();

      unmount();
      expect(getUnsavedWork()).toBeNull();
    });

    it('AC: clears on unmount even while still dirty — leaving the screen isn\'t itself unsafe', () => {
      const { unmount } = renderHook(() => useUnsavedWorkGuard(true, 'New Transfer'));
      expect(getUnsavedWork()).toEqual({ label: 'New Transfer' });
      unmount();
      expect(getUnsavedWork()).toBeNull();
    });
  });
});
