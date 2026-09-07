import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TRANSFER_REPOSITORY } from '../repositories/tokens';
import {
  CreateTransferLineInput,
  ReceiveTransferLineInput,
  TransferRepository,
} from '../repositories/transfer.repository';
import { StockTransfer, StockTransferDetail, StockTransferWithOutlets, TransferLine } from '../domain/transfer.entity';
import { TRANSFER_MUTATE_ROLES, TRANSFER_VARIANCE_TOLERANCE_PERCENT, TransferStatus } from '../constants/enums';
import { resolveDestItem, unitsMatchByLabel } from '../lib/resolve-dest-item';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { ReceiveTransferDto } from '../dto/receive-transfer.dto';
import { QueryTransfersDto } from '../dto/query-transfers.dto';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { assertOutletAccess } from '../../tenancy/access.util';
import { ROLE_PRECEDENCE, Role } from '../../tenancy/constants/enums';
import { OUTLET_REPOSITORY } from '../../tenancy/repositories/tokens';
import { OutletRepository } from '../../tenancy/repositories/outlet.repository';
import { Outlet } from '../../tenancy/domain/outlet.entity';
import { ITEM_REPOSITORY, UNIT_OF_MEASURE_REPOSITORY } from '../../items/repositories/tokens';
import { ItemRepository } from '../../items/repositories/item.repository';
import { UnitOfMeasureRepository } from '../../items/repositories/unit-of-measure.repository';
import { Item } from '../../items/domain/item.entity';
import { StockTransactionsService } from '../../stock-transactions/services/stock-transactions.service';

const MUTATE_ROLES = [...TRANSFER_MUTATE_ROLES] as Role[];

@Injectable()
export class TransfersService {
  constructor(
    @Inject(TRANSFER_REPOSITORY) private readonly transferRepository: TransferRepository,
    @Inject(OUTLET_REPOSITORY) private readonly outletRepository: OutletRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(UNIT_OF_MEASURE_REPOSITORY) private readonly unitRepository: UnitOfMeasureRepository,
    private readonly stockTransactionsService: StockTransactionsService,
  ) {}

  // ------------------------------------------------------------------ create

  async create(request: RequestWithAccess, dto: CreateTransferDto): Promise<StockTransfer> {
    if (dto.sourceOutletId === dto.destOutletId) {
      throw new BadRequestException('Source and destination outlets must be different');
    }

    const sourceOutlet = await this.getOutletOrThrow(dto.sourceOutletId);
    const destOutlet = await this.getOutletOrThrow(dto.destOutletId);

    this.assertCanCreate(request, sourceOutlet, destOutlet);

    const lines = await this.resolveLines(dto.lines, sourceOutlet.id, destOutlet.id);

    return this.transferRepository.create({
      sourceOutletId: sourceOutlet.id,
      destOutletId: destOutlet.id,
      requestedById: request.user!.id,
      lines,
    });
  }

  /**
   * Spec rule: reject with 403 if the requester's effective role for the
   * source outlet is STORE_STAFF or CHEF — the first assertOutletAccess
   * call below, using the same allowlist the endpoint's own docs state.
   *
   * The cross-property rule is stricter and additional: a transfer between
   * outlets under different properties requires the requester to have at
   * least PROPERTY_MANAGER-or-higher effective access covering both
   * outlets. Read literally rather than as "must be CHAIN_OWNER" — the
   * spec explains a PROPERTY_MANAGER normally cannot reach an outlet under
   * a different property (their grant does not expand there), which is
   * exactly what roleForOutlet already reflects; this only needs to check
   * the precedence of whatever role (if any) actually resolves at each
   * outlet, for the general case where one does.
   *
   * For a same-property transfer, no destination-side check happens here at
   * all. The person requesting a transfer within one property need not
   * personally have authority at the receiving outlet; whoever calls
   * receive() there is checked independently, at that point.
   */
  private assertCanCreate(request: RequestWithAccess, sourceOutlet: Outlet, destOutlet: Outlet): void {
    assertOutletAccess(request, sourceOutlet.id, MUTATE_ROLES);
    if (sourceOutlet.propertyId === destOutlet.propertyId) return;

    const sourceRole = request.effectiveAccess!.roleForOutlet(sourceOutlet.id)!;
    const destRole = request.effectiveAccess!.roleForOutlet(destOutlet.id);
    const isPropertyManagerOrHigher = (role: Role) => ROLE_PRECEDENCE[role] <= ROLE_PRECEDENCE.PROPERTY_MANAGER;

    if (!destRole || !isPropertyManagerOrHigher(destRole) || !isPropertyManagerOrHigher(sourceRole)) {
      throw new ForbiddenException(
        'This transfer crosses properties: insufficient access to destination outlet. ' +
          'PROPERTY_MANAGER-or-higher access covering both outlets is required.',
      );
    }
  }

  /**
   * Resolves and validates every line. The destination catalogue is loaded
   * once for the whole request, not per line — a transfer with many lines
   * should not turn into an N+1 query re-fetching it each time.
   */
  private async resolveLines(
    lines: CreateTransferDto['lines'],
    sourceOutletId: string,
    destOutletId: string,
  ): Promise<CreateTransferLineInput[]> {
    const destCandidates = await this.itemRepository.findScoped({
      accessibleOutletIds: [destOutletId],
      outletId: destOutletId,
      isActive: true,
    });
    const fuzzyCandidates = destCandidates.map((item) => ({ id: item.id, name: item.name, barcode: item.barcode }));

    const resolved: CreateTransferLineInput[] = [];
    for (const line of lines) {
      if (Number(line.quantity) <= 0) {
        throw new BadRequestException('quantity must be greater than 0');
      }

      const sourceItem = await this.getItemOrThrow(line.itemId);
      if (sourceItem.outletId !== sourceOutletId) {
        throw new BadRequestException(`Item "${sourceItem.name}" does not belong to the source outlet`);
      }

      const destItemId = line.destItemId ?? resolveDestItem(sourceItem, fuzzyCandidates);
      if (!destItemId) {
        throw new BadRequestException(
          `"${sourceItem.name}" has no matching item at the destination outlet — select one manually.`,
        );
      }

      const destItem =
        destCandidates.find((item) => item.id === destItemId) ?? (await this.getItemOrThrow(destItemId));
      if (destItem.outletId !== destOutletId) {
        throw new BadRequestException(`Item "${destItem.name}" does not belong to the destination outlet`);
      }

      const [sourceUnit, destUnit] = await Promise.all([
        this.unitRepository.findById(sourceItem.unitId),
        this.unitRepository.findById(destItem.unitId),
      ]);
      if (!sourceUnit || !destUnit) throw new NotFoundException('A referenced unit no longer exists');
      if (!unitsMatchByLabel(sourceUnit, destUnit)) {
        throw new BadRequestException(
          `"${sourceItem.name}" (${sourceUnit.abbreviation}) and "${destItem.name}" (${destUnit.abbreviation}) ` +
            'use different units — a transfer cannot convert between them.',
        );
      }

      resolved.push({ itemId: sourceItem.id, destItemId: destItem.id, quantity: line.quantity });
    }
    return resolved;
  }

  // -------------------------------------------------------------- lifecycle

  /**
   * Spec: dispatch creates StockTransaction(type: TRANSFER_OUT) at the
   * source outlet via the FR-02 service, subject to the same negative-stock
   * guard.
   *
   * Each line goes through the full StockTransactionsService.create() path
   * rather than one raw multi-item database transaction the way GRN's
   * receipt posting does, because FR-08's own acceptance criterion requires
   * each resulting StockTransaction to be independently auditable, and that
   * audit trail (plus FR-07's alert re-evaluation) is exactly what
   * create() already provides per call. The trade-off, stated rather than
   * hidden: dispatch is therefore not atomic across lines the way a single
   * database transaction would be. The stock-sufficiency pre-check below
   * makes the common failure case (not enough stock somewhere) fail
   * cleanly before anything moves; a genuine concurrent race landing
   * between that check and the per-line writes is the same accepted class
   * of edge case FR-06's per-ingredient sale deduction already lives with,
   * for the same underlying reason — this ledger offers no cross-item
   * atomic primitive.
   */
  async dispatch(request: RequestWithAccess, id: string): Promise<StockTransfer> {
    const transfer = await this.getOrThrow(id);
    assertOutletAccess(request, transfer.sourceOutletId, MUTATE_ROLES);

    if (transfer.status !== 'REQUESTED') {
      throw new ConflictException(`Cannot dispatch a transfer in ${transfer.status} status`);
    }

    await this.assertSufficientStock(transfer.lines);

    for (const line of transfer.lines) {
      await this.stockTransactionsService.create(request, {
        itemId: line.itemId,
        type: 'TRANSFER_OUT',
        quantity: line.quantity,
        referenceType: 'TRANSFER',
        referenceId: transfer.id,
      });
    }

    return this.transferRepository.markDispatched(id, request.user!.id, new Date());
  }

  private async assertSufficientStock(lines: TransferLine[]): Promise<void> {
    for (const line of lines) {
      const item = await this.getItemOrThrow(line.itemId);
      if (Number(item.currentStock) < Number(line.quantity)) {
        throw new BadRequestException(
          `Insufficient stock to dispatch "${item.name}" — ${item.currentStock} on hand, ${line.quantity} requested.`,
        );
      }
    }
  }

  /**
   * Spec: receive creates StockTransaction(type: TRANSFER_IN) at the
   * destination outlet. Quantity received can differ from dispatched
   * (damage in transit) — capture actualReceivedQty per line and flag
   * variance similarly to GRN.
   *
   * A zero receipt (the line arrived entirely damaged or lost) skips
   * writing a TRANSFER_IN — there is nothing to add to stock — but still
   * records the line as received, with variance flagged, mirroring FR-06's
   * "skip a quantity that rounds below the ledger's resolution" handling:
   * the zero is a real, meaningful outcome, not an error.
   *
   * Each successful TRANSFER_IN goes through StockTransactionsService.
   * create(), whose item.stock.changed event is exactly what lets a
   * transfer landing at the destination auto-resolve an open low-stock or
   * out-of-stock alert there — no separate FR-07 wiring needed, this is the
   * same event FR-07's listener already reacts to.
   */
  async receive(request: RequestWithAccess, id: string, dto: ReceiveTransferDto): Promise<StockTransfer> {
    const transfer = await this.getOrThrow(id);
    assertOutletAccess(request, transfer.destOutletId, MUTATE_ROLES);

    if (transfer.status !== 'IN_TRANSIT') {
      throw new ConflictException(`Cannot receive a transfer in ${transfer.status} status`);
    }

    const byLineId = new Map(dto.lines.map((line) => [line.transferLineId, line]));
    if (dto.lines.length !== transfer.lines.length || transfer.lines.some((line) => !byLineId.has(line.id))) {
      throw new BadRequestException(
        'The received lines must match this transfer’s lines exactly — one actualReceivedQty per line, no more, no less.',
      );
    }

    const receiveInputs: ReceiveTransferLineInput[] = [];
    for (const line of transfer.lines) {
      const received = byLineId.get(line.id)!;
      const dispatchedQty = Number(line.quantity);
      const receivedQty = Number(received.actualReceivedQty);
      if (receivedQty < 0) throw new BadRequestException('actualReceivedQty cannot be negative');

      const varianceFlagged =
        dispatchedQty > 0 &&
        (Math.abs(receivedQty - dispatchedQty) / dispatchedQty) * 100 > TRANSFER_VARIANCE_TOLERANCE_PERCENT;

      if (receivedQty > 0) {
        await this.stockTransactionsService.create(request, {
          itemId: line.destItemId,
          type: 'TRANSFER_IN',
          quantity: received.actualReceivedQty,
          referenceType: 'TRANSFER',
          referenceId: transfer.id,
        });
      }

      receiveInputs.push({
        transferLineId: line.id,
        actualReceivedQty: received.actualReceivedQty,
        varianceFlagged,
      });
    }

    return this.transferRepository.markReceived(id, request.user!.id, new Date(), receiveInputs);
  }

  /**
   * Not in the spec's endpoint table, which lists only dispatch and
   * receive — but TransferStatus already declares CANCELLED with no way to
   * reach it. Restricted to REQUESTED only: once dispatched, stock has
   * actually left the source outlet, and cancelling at that point would
   * need a compensating reversal, not a simple status flip.
   */
  async cancel(request: RequestWithAccess, id: string): Promise<StockTransfer> {
    const transfer = await this.getOrThrow(id);
    assertOutletAccess(request, transfer.sourceOutletId, MUTATE_ROLES);

    if (transfer.status !== 'REQUESTED') {
      throw new ConflictException(
        `Cannot cancel a transfer in ${transfer.status} status — only a REQUESTED transfer (not yet dispatched) can be cancelled.`,
      );
    }

    return this.transferRepository.markCancelled(id, new Date());
  }

  // ------------------------------------------------------------------- reads

  async list(request: RequestWithAccess, query: QueryTransfersDto): Promise<StockTransferWithOutlets[]> {
    return this.transferRepository.findScoped({
      accessibleOutletIds: request.effectiveAccess!.effectiveOutletIds,
      outletId: query.outletId,
      status: query.status as TransferStatus | undefined,
    });
  }

  /**
   * The plain entity, for callers that need the same shape the mutating
   * methods above return — specifically, the controller's audit-log
   * "before" snapshots. Using this instead of findDetail there keeps
   * before/after symmetric: diffing a richer, joined shape (with
   * embedded item/outlet names) against the plain post-mutation entity
   * would make computeFieldDiffs report the lines array as "changed" on
   * every dispatch/receive/cancel, purely from the shape difference, not
   * from anything that actually changed.
   */
  async findPlain(request: RequestWithAccess, id: string): Promise<StockTransfer> {
    const transfer = await this.getOrThrow(id);
    const hasAccess =
      !!request.effectiveAccess!.roleForOutlet(transfer.sourceOutletId) ||
      !!request.effectiveAccess!.roleForOutlet(transfer.destOutletId);
    if (!hasAccess) {
      throw new ForbiddenException(`No access to outlet ${transfer.sourceOutletId} or ${transfer.destOutletId}`);
    }
    return transfer;
  }

  async findDetail(request: RequestWithAccess, id: string): Promise<StockTransferDetail> {
    const transfer = await this.getOrThrow(id);
    // Read access: either side of the transfer is enough, and unlike the
    // mutating actions, any role (not just manager-tier) may view it — same
    // read-vs-mutate split as Items/PurchaseOrders/Recipes.
    const hasAccess =
      !!request.effectiveAccess!.roleForOutlet(transfer.sourceOutletId) ||
      !!request.effectiveAccess!.roleForOutlet(transfer.destOutletId);
    if (!hasAccess) {
      throw new ForbiddenException(`No access to outlet ${transfer.sourceOutletId} or ${transfer.destOutletId}`);
    }
    return (await this.transferRepository.findDetailById(id))!;
  }

  // ----------------------------------------------------------------- helpers

  private async getOrThrow(id: string): Promise<StockTransfer> {
    const transfer = await this.transferRepository.findById(id);
    if (!transfer) throw new NotFoundException(`Transfer ${id} not found`);
    return transfer;
  }

  private async getOutletOrThrow(id: string): Promise<Outlet> {
    const outlet = await this.outletRepository.findById(id);
    if (!outlet) throw new NotFoundException(`Outlet ${id} not found`);
    return outlet;
  }

  private async getItemOrThrow(id: string): Promise<Item> {
    const item = await this.itemRepository.findById(id);
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    return item;
  }
}
