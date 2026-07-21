export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  outletId: string | null;
  before: string | null;
  after: string | null;
  severity: string | null;
  createdAt: Date;
}
