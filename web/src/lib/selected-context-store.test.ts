import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { clearSelectedContext, getSelectedContext, setSelectedContext, useSelectedContext } from './selected-context-store';
import { setSession } from './auth-store';

describe('selected-context-store', () => {
  beforeEach(() => {
    clearSelectedContext();
  });

  it('AC: returns null when nothing has been selected yet', () => {
    expect(getSelectedContext()).toBeNull();
  });

  it('AC: persists and returns the exact context set', () => {
    setSelectedContext({ level: 'outlet', outletId: 'o1', propertyId: 'p1' });
    expect(getSelectedContext()).toEqual({ level: 'outlet', outletId: 'o1', propertyId: 'p1' });
  });

  it('survives being read a second time (localStorage round-trip, not just an in-memory value)', () => {
    setSelectedContext({ level: 'property', outletId: 'o1', propertyId: 'p1' });
    expect(JSON.parse(localStorage.getItem('webprolific.selectedContext')!)).toEqual({
      level: 'property',
      outletId: 'o1',
      propertyId: 'p1',
    });
  });

  describe('useSelectedContext', () => {
    it('AC: falls back to the session\'s first accessible outlet when nothing is explicitly selected yet', () => {
      setSession({
        accessToken: 't',
        refreshToken: 'r',
        user: {
          id: 'u1',
          email: 'e',
          preferredLanguage: 'en',
          effectiveRole: 'OUTLET_MANAGER',
          effectiveOutletIds: ['o1'],
          effectivePropertyIds: [],
          effectiveChainIds: [],
        },
      });
      const { result } = renderHook(() => useSelectedContext());
      expect(result.current).toEqual({ level: 'outlet', outletId: 'o1', propertyId: '' });
    });

    it('AC: re-renders subscribers when the selection changes', () => {
      const { result } = renderHook(() => useSelectedContext());
      act(() => setSelectedContext({ level: 'outlet', outletId: 'o2', propertyId: 'p2' }));
      expect(result.current).toEqual({ level: 'outlet', outletId: 'o2', propertyId: 'p2' });
    });

    it('reflects clearSelectedContext (e.g. on logout) back to the session fallback', () => {
      setSession({
        accessToken: 't',
        refreshToken: 'r',
        user: {
          id: 'u1',
          email: 'e',
          preferredLanguage: 'en',
          effectiveRole: 'OUTLET_MANAGER',
          effectiveOutletIds: ['o9'],
          effectivePropertyIds: [],
          effectiveChainIds: [],
        },
      });
      const { result } = renderHook(() => useSelectedContext());
      act(() => setSelectedContext({ level: 'outlet', outletId: 'o2', propertyId: 'p2' }));
      act(() => clearSelectedContext());
      expect(result.current).toEqual({ level: 'outlet', outletId: 'o9', propertyId: '' });
    });
  });
});
