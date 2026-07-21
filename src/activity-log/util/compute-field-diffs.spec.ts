import { computeFieldDiffs } from './compute-field-diffs';

describe('computeFieldDiffs', () => {
  it('returns one diff per changed top-level field, omitting unchanged ones', () => {
    const diffs = computeFieldDiffs(
      { name: 'Rice', minStock: 10, isActive: true },
      { name: 'Basmati Rice', minStock: 10, isActive: false },
    );

    expect(diffs).toEqual([
      { fieldName: 'name', oldValue: 'Rice', newValue: 'Basmati Rice' },
      { fieldName: 'isActive', oldValue: 'true', newValue: 'false' },
    ]);
  });

  it('returns nothing when before and after are identical', () => {
    expect(computeFieldDiffs({ name: 'Rice' }, { name: 'Rice' })).toEqual([]);
  });

  it('excludes id and known relation/sensitive fields from diffing', () => {
    const diffs = computeFieldDiffs(
      { id: 'p1', name: 'A', passwordHash: 'old', outlets: [{ id: 'o1' }] },
      { id: 'p1', name: 'B', passwordHash: 'new', outlets: [{ id: 'o2' }] },
    );

    expect(diffs).toEqual([{ fieldName: 'name', oldValue: 'A', newValue: 'B' }]);
  });

  it('serializes Date values to ISO strings', () => {
    const before = new Date('2026-01-01T00:00:00.000Z');
    const after = new Date('2026-02-01T00:00:00.000Z');

    const diffs = computeFieldDiffs({ expiresAt: before }, { expiresAt: after });

    expect(diffs).toEqual([
      { fieldName: 'expiresAt', oldValue: before.toISOString(), newValue: after.toISOString() },
    ]);
  });

  it('returns nothing when either side is not a plain object (e.g. no before/after supplied)', () => {
    expect(computeFieldDiffs(undefined, { name: 'A' })).toEqual([]);
    expect(computeFieldDiffs({ name: 'A' }, undefined)).toEqual([]);
  });
});
