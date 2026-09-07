import { Injectable } from '@nestjs/common';
import {
  StockTransfer as PrismaStockTransfer,
  TransferLine as PrismaTransferLine,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  StockTransfer,
  StockTransferDetail,
  StockTransferWithOutlets,
  TransferLine,
} from '../../domain/transfer.entity';
import { TransferStatus } from '../../constants/enums';
import {
  CreateTransferInput,
  ReceiveTransferLineInput,
  TransferFilters,
  TransferRepository,
} from '../transfer.repository';

type PrismaTransferRow = PrismaStockTransfer & { lines: PrismaTransferLine[] };

function lineToDomain(row: PrismaTransferLine): TransferLine {
  return {
    id: row.id,
    transferId: row.transferId,
    itemId: row.itemId,
    destItemId: row.destItemId,
    quantity: row.quantity.toFixed(3),
    actualReceivedQty: row.actualReceivedQty === null ? null : row.actualReceivedQty.toFixed(3),
    varianceFlagged: row.varianceFlagged,
  };
}

function toDomain(row: PrismaTransferRow): StockTransfer {
  return {
    id: row.id,
    sourceOutletId: row.sourceOutletId,
    destOutletId: row.destOutletId,
    status: row.status as TransferStatus,
    requestedById: row.requestedById,
    dispatchedById: row.dispatchedById,
    receivedById: row.receivedById,
    lines: row.lines.map(lineToDomain),
    createdAt: row.createdAt,
    dispatchedAt: row.dispatchedAt,
    receivedAt: row.receivedAt,
    cancelledAt: row.cancelledAt,
  };
}

const DETAIL_INCLUDE = {
  sourceOutlet: { select: { name: true } },
  destOutlet: { select: { name: true } },
  lines: {
    include: {
      item: { select: { name: true, unit: { select: { abbreviation: true } } } },
      destItem: { select: { name: true, unit: { select: { abbreviation: true } } } },
    },
  },
} satisfies Prisma.StockTransferInclude;

type PrismaTransferDetailRow = Prisma.StockTransferGetPayload<{ include: typeof DETAIL_INCLUDE }>;

function detailToDomain(row: PrismaTransferDetailRow): StockTransferDetail {
  return {
    id: row.id,
    sourceOutletId: row.sourceOutletId,
    destOutletId: row.destOutletId,
    sourceOutletName: row.sourceOutlet.name,
    destOutletName: row.destOutlet.name,
    status: row.status as TransferStatus,
    requestedById: row.requestedById,
    dispatchedById: row.dispatchedById,
    receivedById: row.receivedById,
    createdAt: row.createdAt,
    dispatchedAt: row.dispatchedAt,
    receivedAt: row.receivedAt,
    cancelledAt: row.cancelledAt,
    lines: row.lines.map((line) => ({
      ...lineToDomain(line),
      itemName: line.item.name,
      itemUnitAbbreviation: line.item.unit.abbreviation,
      destItemName: line.destItem.name,
      destItemUnitAbbreviation: line.destItem.unit.abbreviation,
    })),
  };
}

@Injectable()
export class PrismaTransferRepository implements TransferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTransferInput): Promise<StockTransfer> {
    const row = await this.prisma.stockTransfer.create({
      data: {
        sourceOutletId: data.sourceOutletId,
        destOutletId: data.destOutletId,
        requestedById: data.requestedById,
        lines: {
          create: data.lines.map((line) => ({
            itemId: line.itemId,
            destItemId: line.destItemId,
            quantity: line.quantity,
          })),
        },
      },
      include: { lines: true },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<StockTransfer | null> {
    const row = await this.prisma.stockTransfer.findUnique({ where: { id }, include: { lines: true } });
    return row ? toDomain(row) : null;
  }

  async findDetailById(id: string): Promise<StockTransferDetail | null> {
    const row = await this.prisma.stockTransfer.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    return row ? detailToDomain(row) : null;
  }

  async findScoped(filters: TransferFilters): Promise<StockTransferWithOutlets[]> {
    // Same authorization-relevant guard as every other findScoped here — an
    // explicit outletId outside the caller's accessible set returns empty
    // rather than being queried anyway.
    if (filters.accessibleOutletIds.length === 0) return [];
    if (filters.outletId && !filters.accessibleOutletIds.includes(filters.outletId)) return [];

    const touchesAccessible: Prisma.StockTransferWhereInput = {
      OR: [
        { sourceOutletId: { in: filters.accessibleOutletIds } },
        { destOutletId: { in: filters.accessibleOutletIds } },
      ],
    };
    const touchesExplicitOutlet: Prisma.StockTransferWhereInput | undefined = filters.outletId
      ? { OR: [{ sourceOutletId: filters.outletId }, { destOutletId: filters.outletId }] }
      : undefined;

    const rows = await this.prisma.stockTransfer.findMany({
      where: {
        AND: [touchesAccessible, touchesExplicitOutlet ?? {}, filters.status ? { status: filters.status } : {}],
      },
      include: {
        lines: true,
        sourceOutlet: { select: { name: true } },
        destOutlet: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      ...toDomain(row),
      sourceOutletName: row.sourceOutlet.name,
      destOutletName: row.destOutlet.name,
    }));
  }

  async markDispatched(id: string, dispatchedById: string, dispatchedAt: Date): Promise<StockTransfer> {
    const row = await this.prisma.stockTransfer.update({
      where: { id },
      data: { status: 'IN_TRANSIT', dispatchedById, dispatchedAt },
      include: { lines: true },
    });
    return toDomain(row);
  }

  async markCancelled(id: string, cancelledAt: Date): Promise<StockTransfer> {
    const row = await this.prisma.stockTransfer.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt },
      include: { lines: true },
    });
    return toDomain(row);
  }

  async markReceived(
    id: string,
    receivedById: string,
    receivedAt: Date,
    lines: ReceiveTransferLineInput[],
  ): Promise<StockTransfer> {
    const row = await this.prisma.$transaction(async (tx) => {
      for (const line of lines) {
        await tx.transferLine.update({
          where: { id: line.transferLineId },
          data: { actualReceivedQty: line.actualReceivedQty, varianceFlagged: line.varianceFlagged },
        });
      }
      return tx.stockTransfer.update({
        where: { id },
        data: { status: 'RECEIVED', receivedById, receivedAt },
        include: { lines: true },
      });
    });
    return toDomain(row);
  }

  async countInTransitFromOutlets(outletIds: string[]): Promise<number> {
    if (outletIds.length === 0) return 0;
    return this.prisma.stockTransfer.count({
      where: { sourceOutletId: { in: outletIds }, status: 'IN_TRANSIT' },
    });
  }
}
