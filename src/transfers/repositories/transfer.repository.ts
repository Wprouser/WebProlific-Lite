import { StockTransfer, StockTransferDetail, StockTransferWithOutlets } from '../domain/transfer.entity';
import { TransferStatus } from '../constants/enums';

export interface CreateTransferLineInput {
  itemId: string;
  destItemId: string;
  quantity: string;
}

export interface CreateTransferInput {
  sourceOutletId: string;
  destOutletId: string;
  requestedById: string;
  lines: CreateTransferLineInput[];
}

export interface TransferFilters {
  /** Every result row must touch at least one outlet in this set (as either
   * source or destination) — scoping, not an explicit user-chosen filter. */
  accessibleOutletIds: string[];
  /** Narrows to transfers touching this specific outlet, on either side —
   * a transfer inbound to an outlet is just as relevant to that outlet's
   * view as one outbound from it. */
  outletId?: string;
  status?: TransferStatus;
}

export interface ReceiveTransferLineInput {
  transferLineId: string;
  actualReceivedQty: string;
  // Computed by TransfersService (tolerance-percent comparison against the
  // dispatched quantity), not by the repository — same split as GRN's own
  // buildPoLines, which computes varianceFlagged as business logic and
  // leaves the repository to just persist it.
  varianceFlagged: boolean;
}

export abstract class TransferRepository {
  /** Inserts the transfer and all its lines in one transaction — a
   * half-written transfer (header with no lines, or vice versa) is never
   * observable. */
  abstract create(data: CreateTransferInput): Promise<StockTransfer>;

  abstract findById(id: string): Promise<StockTransfer | null>;
  /** The detail screen's shape — both outlets' names, and every line's item
   * names/units at both ends. */
  abstract findDetailById(id: string): Promise<StockTransferDetail | null>;
  abstract findScoped(filters: TransferFilters): Promise<StockTransferWithOutlets[]>;

  abstract markDispatched(id: string, dispatchedById: string, dispatchedAt: Date): Promise<StockTransfer>;
  abstract markCancelled(id: string, cancelledAt: Date): Promise<StockTransfer>;

  /**
   * Records each line's actual received quantity/variance flag and
   * transitions the transfer to RECEIVED, in one transaction — the two
   * must not be separable, or a crash mid-write could leave lines marked
   * received against a transfer that's still IN_TRANSIT.
   */
  abstract markReceived(
    id: string,
    receivedById: string,
    receivedAt: Date,
    lines: ReceiveTransferLineInput[],
  ): Promise<StockTransfer>;
}
