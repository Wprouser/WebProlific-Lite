import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { STOCK_TRANSACTION_REPOSITORY } from '../repositories/tokens';
import { StockTransactionRepository } from '../repositories/stock-transaction.repository';
import { StockTransaction } from '../domain/stock-transaction.entity';
import { CreateStockTransactionDto } from '../dto/create-stock-transaction.dto';
import { QueryStockTransactionsDto } from '../dto/query-stock-transactions.dto';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { Role } from '../../tenancy/constants/enums';
import { assertOutletAccess } from '../../tenancy/access.util';
import { AuditLogService } from '../../rbac/services/audit-log.service';
import { ITEM_REPOSITORY } from '../../items/repositories/tokens';
import { ItemRepository } from '../../items/repositories/item.repository';
import { CHEF_ALLOWED_TYPES, FORCE_OVERRIDE_ROLES, ReasonCode, TransactionType } from '../constants/enums';
import { ITEM_STOCK_CHANGED_EVENT, ItemStockChangedEvent } from '../events/stock-changed.event';

@Injectable()
export class StockTransactionsService {
  constructor(
    @Inject(STOCK_TRANSACTION_REPOSITORY) private readonly stockTransactionRepository: StockTransactionRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(request: RequestWithAccess, dto: CreateStockTransactionDto): Promise<StockTransaction> {
    const item = await this.itemRepository.findById(dto.itemId);
    if (!item) throw new NotFoundException(`Item ${dto.itemId} not found`);

    // FR-11 matrix: all 5 roles may create stock transactions (unlike
    // Item mutations, which are manager-only) — just verify some access
    // to this outlet exists, no role list to pass.
    assertOutletAccess(request, item.outletId);
    const role = request.effectiveAccess!.roleForOutlet(item.outletId)!;

    this.assertQuantityPositive(dto.quantity);
    this.assertReasonCode(dto.type, dto.reasonCode);
    this.assertChefTypeRestriction(role, dto.type);

    // Spec: "unless requester has role IN [...] AND passes forceOverride:
    // true" — both conditions gate it. A STORE_STAFF/CHEF setting
    // forceOverride has no effect; the negative-balance check still runs.
    const allowNegativeBalance = Boolean(dto.forceOverride) && (FORCE_OVERRIDE_ROLES as readonly string[]).includes(role);

    const result = await this.stockTransactionRepository.createWithBalanceUpdate({
      outletId: item.outletId,
      itemId: dto.itemId,
      type: dto.type,
      quantity: dto.quantity,
      referenceType: dto.referenceType ?? null,
      referenceId: dto.referenceId ?? null,
      reasonCode: dto.reasonCode ?? null,
      performedById: request.user!.id,
      allowNegativeBalance,
    });

    if (!result.ok) {
      throw new BadRequestException('Insufficient stock for this transaction');
    }

    // HIGH only when the override was actually exercised (balance really
    // did go negative) — not just because forceOverride was passed.
    const overrideExercised = allowNegativeBalance && Number(result.transaction.balanceAfter) < 0;

    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'CREATE_STOCK_TRANSACTION',
      entityType: 'StockTransaction',
      entityId: result.transaction.id,
      outletId: item.outletId,
      after: result.transaction,
      severity: overrideExercised ? 'HIGH' : undefined,
    });

    const event: ItemStockChangedEvent = {
      itemId: item.id,
      outletId: item.outletId,
      currentStock: result.item.currentStock,
      minStock: result.item.minStock,
    };
    this.eventEmitter.emit(ITEM_STOCK_CHANGED_EVENT, event);

    return result.transaction;
  }

  async findById(request: RequestWithAccess, id: string): Promise<StockTransaction> {
    const transaction = await this.getOrThrow(id);
    assertOutletAccess(request, transaction.outletId);
    return transaction;
  }

  async list(request: RequestWithAccess, query: QueryStockTransactionsDto): Promise<StockTransaction[]> {
    return this.stockTransactionRepository.findScoped({
      accessibleOutletIds: request.effectiveAccess!.effectiveOutletIds,
      outletId: query.outletId,
      itemId: query.itemId,
      type: query.type,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    });
  }

  private assertQuantityPositive(quantity: string): void {
    if (Number(quantity) <= 0) {
      throw new BadRequestException('quantity must be greater than 0');
    }
  }

  private assertReasonCode(type: TransactionType, reasonCode?: ReasonCode): void {
    if (type === 'WASTAGE_OUT' && !reasonCode) {
      throw new BadRequestException('reasonCode is required for WASTAGE_OUT transactions');
    }
    if (type !== 'WASTAGE_OUT' && reasonCode) {
      throw new BadRequestException('reasonCode must only be set for WASTAGE_OUT transactions');
    }
  }

  private assertChefTypeRestriction(role: Role, type: TransactionType): void {
    if (role === 'CHEF' && !CHEF_ALLOWED_TYPES.includes(type)) {
      throw new ForbiddenException(`CHEF role can only create ${CHEF_ALLOWED_TYPES.join('/')} transactions`);
    }
  }

  private async getOrThrow(id: string): Promise<StockTransaction> {
    const transaction = await this.stockTransactionRepository.findById(id);
    if (!transaction) throw new NotFoundException(`StockTransaction ${id} not found`);
    return transaction;
  }
}
