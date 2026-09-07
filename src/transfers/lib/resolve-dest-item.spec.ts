import { resolveDestItem, unitsMatchByLabel, TransferItemCandidate } from './resolve-dest-item';

const candidates: TransferItemCandidate[] = [
  { id: 'dest-rice', name: 'Basmati Rice', barcode: '111222333' },
  { id: 'dest-flour', name: 'All-Purpose Flour', barcode: null },
  { id: 'dest-sugar', name: 'White Sugar', barcode: '999888777' },
];

describe('resolveDestItem', () => {
  it('AC: matches by barcode when both items share one, even if names differ', () => {
    const result = resolveDestItem({ name: 'Basmati Rice (5kg bag)', barcode: '111222333' }, candidates);
    expect(result).toBe('dest-rice');
  });

  it('prefers an exact barcode match over a fuzzy name match', () => {
    // Deliberately a poor name match for "White Sugar" but the exact barcode
    // of a different candidate — barcode must win.
    const result = resolveDestItem({ name: 'Zzz Nonsense Name', barcode: '999888777' }, candidates);
    expect(result).toBe('dest-sugar');
  });

  it('falls back to fuzzy name matching when there is no barcode', () => {
    const result = resolveDestItem({ name: 'All Purpose Flour', barcode: null }, candidates);
    expect(result).toBe('dest-flour');
  });

  it('falls back to fuzzy matching when the barcode does not match anything at the destination', () => {
    const result = resolveDestItem({ name: 'Basmati Rice', barcode: 'no-such-barcode' }, candidates);
    expect(result).toBe('dest-rice');
  });

  it('AC: returns null rather than force-matching to the closest-but-wrong candidate', () => {
    const result = resolveDestItem({ name: 'Frozen Chicken Breast', barcode: null }, candidates);
    expect(result).toBeNull();
  });

  it('returns null against an empty destination catalogue', () => {
    expect(resolveDestItem({ name: 'Basmati Rice', barcode: '111222333' }, [])).toBeNull();
  });
});

describe('unitsMatchByLabel', () => {
  it('matches identical abbreviations', () => {
    expect(unitsMatchByLabel({ abbreviation: 'kg' }, { abbreviation: 'kg' })).toBe(true);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(unitsMatchByLabel({ abbreviation: ' KG ' }, { abbreviation: 'kg' })).toBe(true);
  });

  it('AC: rejects genuinely different units rather than assuming compatibility', () => {
    expect(unitsMatchByLabel({ abbreviation: 'kg' }, { abbreviation: 'L' })).toBe(false);
  });
});
