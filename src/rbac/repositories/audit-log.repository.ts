import { AuditLog } from '../domain/audit-log.entity';

export interface CreateAuditLogInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  outletId?: string;
  before?: string;
  after?: string;
}

export interface AuditLogRepository {
  create(data: CreateAuditLogInput): Promise<AuditLog>;
  findByUserId(userId: string): Promise<AuditLog[]>;
}
