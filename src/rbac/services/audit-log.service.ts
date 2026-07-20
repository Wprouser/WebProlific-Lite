import { Inject, Injectable } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AUDIT_LOG_REPOSITORY } from '../repositories/tokens';
import { AuditLog } from '../domain/audit-log.entity';

export interface RecordAuditLogInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  outletId?: string;
  before?: unknown;
  after?: unknown;
}

/**
 * FR-11: "every mutating endpoint must write an AuditLog entry." A plain
 * injectable called explicitly from mutating handlers — not an interceptor/
 * event-bus. That broader auto-logging mechanism is FR-18's ActivityLog,
 * not built yet; this is the narrower, spec-defined FR-11 log it layers on
 * top of later.
 */
@Injectable()
export class AuditLogService {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: AuditLogRepository,
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
  }

  /** FR-14: GET /users/:id/audit-log. */
  async findByUserId(userId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.findByUserId(userId);
  }
}
