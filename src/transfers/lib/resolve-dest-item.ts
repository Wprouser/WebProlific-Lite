import { findBestFuzzyMatch, FuzzyCandidate } from '../../invoice-scans/lib/fuzzy-match';

/**
 * FR-08's real gap: `Item` is outlet-scoped (FR-01) and `sku` is globally
 * unique, so a single `itemId` cannot mean "this product" at both the
 * source and destination outlet — they are different rows, possibly with
 * different names, different units, different everything except that
 * they're conceptually the same product. This is that resolution, reusing
 * the exact matching approach FR-04 (invoice-scan line matching) and FR-06
 * (batch sales-import row matching) already established: barcode first
 * (an exact, unambiguous signal when present), then fuzzy name matching,
 * and — critically — leaving it unresolved rather than force-matching to
 * the closest-but-still-wrong candidate when neither succeeds.
 */

export interface TransferItemCandidate extends FuzzyCandidate {
  barcode: string | null;
}

/**
 * Returns the destination outlet's matching item id, or null if none can be
 * confidently identified. A null result is a normal outcome, not an error —
 * it means the caller (TransfersService) must reject the line and ask for
 * `destItemId` to be supplied explicitly, exactly as FR-06's batch import
 * leaves an unmatched row for manual assignment rather than guessing.
 */
export function resolveDestItem(
  sourceItem: { name: string; barcode: string | null },
  destCandidates: TransferItemCandidate[],
): string | null {
  if (sourceItem.barcode) {
    const barcodeMatch = destCandidates.find((candidate) => candidate.barcode === sourceItem.barcode);
    if (barcodeMatch) return barcodeMatch.id;
  }
  return findBestFuzzyMatch(sourceItem.name, destCandidates);
}

/**
 * Whether two items' units can be treated as the same physical quantity
 * across outlets.
 *
 * This is deliberately a label comparison, not a conversion: `UnitOfMeasure`
 * is outlet-scoped too, so outlet A's "kg" and outlet B's "kg" are different
 * rows with no `baseUnitId` relationship to each other — there is no
 * computable conversion factor between them, unlike FR-05's within-outlet
 * recipe unit conversions. Requiring the abbreviations to match is a
 * labeling safety net (it catches "kg" being sent against a "L" item), not
 * a proof of physical equivalence — outlets are expected to name shared
 * units consistently. Documented here rather than silently assumed.
 */
export function unitsMatchByLabel(
  sourceUnit: { abbreviation: string },
  destUnit: { abbreviation: string },
): boolean {
  return sourceUnit.abbreviation.trim().toLowerCase() === destUnit.abbreviation.trim().toLowerCase();
}
