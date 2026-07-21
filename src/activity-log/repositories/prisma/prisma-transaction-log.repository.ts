import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TransactionLog } from '../../domain/transaction-log.entity';
import {
  CreateTransactionLogInput,
  TransactionLogFilters,
  TransactionLogRepository,
} from '../transaction-log.repository';
import { EntityCategory, Operation } from '../../constants/enums';

@Injectable()
export class PrismaTransactionLogRepository implements TransactionLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTransactionLogInput): Promise<TransactionLog> {
    const row = await this.prisma.transactionLog.create({ data });
    return this.toDomain(row);
  }

  async findScoped(filters: TransactionLogFilters): Promise<TransactionLog[]> {
    // Every row has at least one of outletId/propertyId/chainId set (never
    // fully unscoped, unlike ActivityLog's login/logout rows) — so unlike
    // that repository, there's no "visible only to the requester" fallback
    // branch needed here.
    const scopeClauses: Prisma.TransactionLogWhereInput[] = [];
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
    if (scopeClauses.length === 0) return [];

    const where: Prisma.TransactionLogWhereInput = {
      OR: scopeClauses,
      ...(filters.outletId && { outletId: filters.outletId }),
      ...(filters.propertyId && { propertyId: filters.propertyId }),
      ...(filters.chainId && { chainId: filters.chainId }),
      ...(filters.entityCategory && { entityCategory: filters.entityCategory }),
      ...(filters.entityType && { entityType: filters.entityType }),
      ...(filters.entityId && { entityId: filters.entityId }),
      ...((filters.dateFrom || filters.dateTo) && {
        createdAt: {
          ...(filters.dateFrom && { gte: filters.dateFrom }),
          ...(filters.dateTo && { lte: filters.dateTo }),
        },
      }),
    };

    const rows = await this.prisma.transactionLog.findMany({ where, orderBy: { createdAt: 'desc' } });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: {
    id: string;
    outletId: string | null;
    chainId: string | null;
    propertyId: string | null;
    entityCategory: string;
    entityType: string;
    entityId: string;
    operation: string;
    fieldName: string | null;
    oldValue: string | null;
    newValue: string | null;
    valueAmount: Prisma.Decimal | null;
    currencyCode: string | null;
    performedById: string | null;
    summary: string;
    createdAt: Date;
  }): TransactionLog {
    return {
      ...row,
      entityCategory: row.entityCategory as EntityCategory,
      operation: row.operation as Operation,
      // .toFixed(2), not .toString() — see PrismaItemRepository's toDomain
      // for why (Decimal.toString() drops trailing zeros).
      valueAmount: row.valueAmount === null ? null : row.valueAmount.toFixed(2),
    };
  }
}
