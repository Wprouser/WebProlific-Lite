import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ActivityLog } from '../../domain/activity-log.entity';
import {
  ActivityLogFilters,
  ActivityLogRepository,
  CreateActivityLogInput,
} from '../activity-log.repository';
import { ActivityCategory } from '../../constants/enums';

@Injectable()
export class PrismaActivityLogRepository implements ActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateActivityLogInput): Promise<ActivityLog> {
    const row = await this.prisma.activityLog.create({
      data: {
        ...data,
        metadata: data.metadata === undefined ? undefined : JSON.stringify(data.metadata),
      },
    });
    return this.toDomain(row);
  }

  async findScoped(filters: ActivityLogFilters): Promise<ActivityLog[]> {
    const scopeClauses: Prisma.ActivityLogWhereInput[] = [];
    if (filters.accessibleOutletIds.length) {
      scopeClauses.push({ outletId: { in: filters.accessibleOutletIds } });
    }
    if (filters.accessiblePropertyIds.length) {
      scopeClauses.push({ outletId: null, propertyId: { in: filters.accessiblePropertyIds } });
    }
    if (filters.accessibleChainIds.length) {
      scopeClauses.push({
        outletId: null,
        propertyId: null,
        chainId: { in: filters.accessibleChainIds },
      });
    }
    // Unscoped rows (login/logout/password-reset — no chain/property/outlet
    // at all) are only visible for the requester's own events. Broader
    // visibility (e.g. a CHAIN_OWNER seeing every user's login history in
    // their chain) would need joining through UserAccess to resolve which
    // chain(s) a given userId belongs to — a real v1 scope limit, not an
    // oversight; flagged in the implementation summary.
    scopeClauses.push({
      chainId: null,
      propertyId: null,
      outletId: null,
      userId: filters.requesterId,
    });

    const where: Prisma.ActivityLogWhereInput = {
      OR: scopeClauses,
      ...(filters.outletId && { outletId: filters.outletId }),
      ...(filters.propertyId && { propertyId: filters.propertyId }),
      ...(filters.chainId && { chainId: filters.chainId }),
      ...(filters.category && { category: filters.category }),
      ...(filters.userId && { userId: filters.userId }),
      ...((filters.dateFrom || filters.dateTo) && {
        createdAt: {
          ...(filters.dateFrom && { gte: filters.dateFrom }),
          ...(filters.dateTo && { lte: filters.dateTo }),
        },
      }),
    };

    const rows = await this.prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' } });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: {
    id: string;
    chainId: string | null;
    propertyId: string | null;
    outletId: string | null;
    userId: string | null;
    category: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    description: string;
    metadata: string | null;
    ipAddress: string | null;
    deviceInfo: string | null;
    createdAt: Date;
  }): ActivityLog {
    return { ...row, category: row.category as ActivityCategory };
  }
}
