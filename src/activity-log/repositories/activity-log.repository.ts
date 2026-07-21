import { ActivityLog } from '../domain/activity-log.entity';
import { ActivityCategory } from '../constants/enums';

export interface CreateActivityLogInput {
  chainId?: string;
  propertyId?: string;
  outletId?: string;
  userId?: string;
  category: ActivityCategory;
  action: string;
  entityType?: string;
  entityId?: string;
  description: string;
  metadata?: unknown;
  ipAddress?: string;
  deviceInfo?: string;
}

export interface ActivityLogFilters {
  /** The caller's effective access — every result row must satisfy the
   * scoping rule the repository implements (see PrismaActivityLogRepository
   * for the exact OR-of-scopes logic), never just the explicit filters
   * below on their own. */
  accessibleChainIds: string[];
  accessiblePropertyIds: string[];
  accessibleOutletIds: string[];
  /** Unscoped (chain/property/outlet all null) rows — e.g. login/logout —
   * are only visible for the requester's own userId, see the repository's
   * implementation note on why this is a deliberate v1 scope limit. */
  requesterId: string;
  outletId?: string;
  propertyId?: string;
  chainId?: string;
  category?: ActivityCategory;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ActivityLogRepository {
  create(data: CreateActivityLogInput): Promise<ActivityLog>;
  findScoped(filters: ActivityLogFilters): Promise<ActivityLog[]>;
}
