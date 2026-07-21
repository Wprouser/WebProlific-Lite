import { Inject, Injectable } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AUDIT_LOG_REPOSITORY } from '../repositories/tokens';
import { AuditLog } from '../domain/audit-log.entity';
import { ActivityBus } from '../../activity-log/services/activity-bus.service';
import { ActivityCategory, Operation } from '../../activity-log/constants/enums';
import { EntityChangedEvent, TransactionLogEntryInput } from '../../activity-log/events/entity-changed.event';
import { computeFieldDiffs, serializeValue } from '../../activity-log/util/compute-field-diffs';

export interface RecordAuditLogInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  outletId?: string;
  before?: unknown;
  after?: unknown;
}

// FR-18: actions whose ActivityCategory doesn't follow the default
// entityType-based mapping below (e.g. a 2FA policy change is an AUTH
// event even though it's recorded against a Chain entity).
const ACTION_CATEGORY_OVERRIDES: Partial<Record<string, ActivityCategory>> = {
  SET_TWO_FACTOR_POLICY: 'AUTH',
};

function inferCategory(action: string, entityType: string): ActivityCategory {
  if (ACTION_CATEGORY_OVERRIDES[action]) return ACTION_CATEGORY_OVERRIDES[action]!;
  if (entityType === 'User') return 'USER_MGMT';
  // Chain/Property/Outlet (FR-00 org-structure changes) — the spec's
  // ActivityCategory enum has no dedicated org/tenancy bucket, so these
  // fall under SETTINGS as the closest fit (flagged in the FR-18 plan).
  return 'SETTINGS';
}

// FR-00 entity types where the AuditLog entityId directly *is* the
// matching scope id — Chain's own id is its chainId, etc. For Property, the
// entity itself carries its parent chainId (Property.chainId), so that's
// pulled from the before/after payload rather than being derivable from
// entityId alone.
function inferChainId(entityType: string, entityId: string, before: unknown, after: unknown): string | undefined {
  if (entityType === 'Chain') return entityId;
  if (entityType === 'Property') {
    const record = (after ?? before) as { chainId?: unknown } | undefined;
    return typeof record?.chainId === 'string' ? record.chainId : undefined;
  }
  return undefined;
}
function inferPropertyId(entityType: string, entityId: string): string | undefined {
  return entityType === 'Property' ? entityId : undefined;
}

function inferOperation(action: string): Operation | undefined {
  if (action.startsWith('CREATE_') || action === 'INVITE_USER') return 'CREATE';
  if (action.startsWith('DELETE_')) return 'DELETE';
  if (action.startsWith('UPDATE_') || action === 'DEACTIVATE_USER') return 'UPDATE';
  // ADMIN_RESET_PASSWORD / ADMIN_RESET_2FA / SET_TWO_FACTOR_POLICY: these
  // do mutate a User/TwoFactorAuth row, but the sensitive fields involved
  // (password hash, TOTP secret) should never be diffed into a readable
  // log, and this call site isn't given before/after for them anyway — no
  // TransactionLog entry is attempted.
  return undefined;
}

/**
 * FR-18 (revised): builds the `entity.changed` payload for `ActivityBus`,
 * or returns undefined when this action shouldn't produce any
 * TransactionLog rows at all.
 *
 * Chain and Property changes resolve their own chainId/propertyId (Chain's
 * id is its own chainId; Property carries its parent chainId). User
 * changes (invite/access-update/deactivate) resolve none of the three — a
 * User has no chain/property/outlet of its own, only many-to-many
 * UserAccess grants — so those still produce ActivityLog coverage only.
 * Closing that gap needs per-action logic to resolve scope from the
 * specific grant being modified, not just a schema column; left as
 * documented backlog.
 */
function buildEntityChange(input: RecordAuditLogInput): EntityChangedEvent | undefined {
  const chainId = inferChainId(input.entityType, input.entityId, input.before, input.after);
  const propertyId = inferPropertyId(input.entityType, input.entityId);
  const outletId = input.outletId;
  if (!chainId && !propertyId && !outletId) return undefined;

  const operation = inferOperation(input.action);
  if (!operation) return undefined;

  let entries: TransactionLogEntryInput[];
  if (operation === 'CREATE') {
    entries = [{ newValue: serializeValue(input.after) }];
  } else if (operation === 'DELETE') {
    entries = [{ oldValue: serializeValue(input.before) }];
  } else {
    entries = computeFieldDiffs(input.before, input.after);
    if (entries.length === 0) return undefined; // nothing actually changed
  }

  return {
    outletId,
    propertyId,
    chainId,
    entityCategory: 'MASTER_DATA',
    entityType: input.entityType,
    entityId: input.entityId,
    operation,
    performedById: input.userId,
    entries,
  };
}

/**
 * FR-11: "every mutating endpoint must write an AuditLog entry." A plain
 * injectable called explicitly from mutating handlers — not itself an
 * interceptor/event-bus. FR-18 layers on top here rather than replacing
 * this: every `record()` call also emits `activity.recorded` (always) and
 * `entity.changed` (when the action created/updated/deleted a master-data
 * entity), so every existing FR-00/FR-11/FR-14 call site gets both
 * ActivityLog and TransactionLog coverage automatically, without any of
 * them changing.
 */
@Injectable()
export class AuditLogService {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: AuditLogRepository,
    private readonly activityBus: ActivityBus,
  ) {}

  async record(input: RecordAuditLogInput): Promise<void> {
    await this.auditLogRepository.create({
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      outletId: input.outletId,
      before: input.before === undefined ? undefined : JSON.stringify(input.before),
      after: input.after === undefined ? undefined : JSON.stringify(input.after),
    });

    await this.activityBus.record({
      userId: input.userId,
      category: inferCategory(input.action, input.entityType),
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      chainId: inferChainId(input.entityType, input.entityId, input.before, input.after),
      propertyId: inferPropertyId(input.entityType, input.entityId),
      outletId: input.outletId,
      descriptionKey: `activity.${input.entityType.toLowerCase()}.${input.action.toLowerCase()}`,
      metadata: input.after !== undefined ? { after: input.after } : undefined,
      entityChange: buildEntityChange(input),
    });
  }

  /** FR-14: GET /users/:id/audit-log. */
  async findByUserId(userId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.findByUserId(userId);
  }
}
