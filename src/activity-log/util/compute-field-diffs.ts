/**
 * FR-18 (revised): "emit one TransactionLog row per changed field" — a
 * shallow, top-level diff between an entity's before/after state. Relation
 * arrays (e.g. a Property's `outlets`) and known-sensitive fields aren't
 * meaningful as a single "field changed" row, so they're excluded rather
 * than diffed naively.
 */
const EXCLUDED_FIELDS = new Set(['id', 'passwordHash', 'outlets', 'properties', 'userAccesses']);

export interface FieldDiff {
  fieldName: string;
  oldValue: string | undefined;
  newValue: string | undefined;
}

export function computeFieldDiffs(before: unknown, after: unknown): FieldDiff[] {
  if (!isPlainRecord(before) || !isPlainRecord(after)) return [];

  const diffs: FieldDiff[] = [];
  for (const key of Object.keys(after)) {
    if (EXCLUDED_FIELDS.has(key)) continue;
    const beforeVal = before[key];
    const afterVal = after[key];
    if (JSON.stringify(beforeVal) === JSON.stringify(afterVal)) continue;
    diffs.push({
      fieldName: key,
      oldValue: serializeValue(beforeVal),
      newValue: serializeValue(afterVal),
    });
  }
  return diffs;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function serializeValue(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (value === null) return 'null';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
