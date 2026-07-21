import { EntityCategory, Operation } from '../constants/enums';

export const ENTITY_CHANGED_EVENT = 'entity.changed';

/** One entry per changed field for UPDATE (fieldName set, oldValue/newValue
 * are that field's before/after). For CREATE/DELETE, exactly one entry
 * with `fieldName` undefined — the producer puts the whole serialized
 * record in `newValue` (CREATE) or `oldValue` (DELETE) instead, per the
 * spec's "fieldName: null, full record's relevant state" guidance. */
export interface TransactionLogEntryInput {
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  valueAmount?: number;
  currencyCode?: string;
}

/**
 * FR-18 (revised): "every create/update/delete on a master-data or
 * transactional entity" — separate from `activity.recorded` because not
 * every activity changes tracked entity data (login, logout, a report
 * export produce an ActivityLog row but no entity.changed event at all).
 */
export interface EntityChangedEvent {
  // At least one of these three is always set — which one(s) depends on
  // where the changed entity sits in the org hierarchy (e.g. a Chain
  // change sets only chainId; an Outlet change sets all three). None of
  // them apply to User-entity changes yet — see AuditLogService's
  // buildEntityChange for why that's still a known gap.
  outletId?: string;
  propertyId?: string;
  chainId?: string;
  entityCategory: EntityCategory;
  entityType: string;
  entityId: string;
  operation: Operation;
  performedById?: string;
  entries: TransactionLogEntryInput[];
}
