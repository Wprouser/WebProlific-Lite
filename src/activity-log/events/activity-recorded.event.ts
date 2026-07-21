import { ActivityCategory } from '../constants/enums';
import { EntityChangedEvent } from './entity-changed.event';

export const ACTIVITY_RECORDED_EVENT = 'activity.recorded';

/**
 * The one payload shape every write path in the system emits after a
 * successful mutation — see the FR-18 spec's "single cross-cutting
 * interceptor/event-listener" approach. `descriptionKey` is a message key
 * (e.g. "activity.chain.created"), not a frozen English sentence — the
 * spec is explicit that rendering happens at read time via FR-15 i18n +
 * `metadata`, so the feed stays correctly localized regardless of who
 * wrote it vs. who's viewing it.
 */
export interface ActivityRecordedEvent {
  userId?: string;
  category: ActivityCategory;
  action: string;
  entityType?: string;
  entityId?: string;
  // Deliberately optional, deviating from the spec's literal `chainId
  // String` (required) — see the implementation note in schema.prisma.
  // System-level events (login, logout, password reset) have no natural
  // single-chain scope, and forcing one would mean either fabricating an
  // arbitrary chain for a multi-chain user or silently dropping the
  // ActivityLog row the spec itself requires for those events.
  chainId?: string;
  propertyId?: string;
  outletId?: string;
  descriptionKey: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  deviceInfo?: string;
  /**
   * Present only when this action created, updated, or deleted a
   * master-data or transactional entity — most mutating actions, per the
   * revised FR-18 spec. Absent for actions that don't change tracked
   * entity data at all (login, logout, a report export). `ActivityBus`
   * emits this as its own separate `entity.changed` event, per spec.
   */
  entityChange?: EntityChangedEvent;
}
