import { TransferStatus } from '../constants/enums';

export interface TransferLine {
  id: string;
  transferId: string;
  itemId: string;
  destItemId: string;
  /** Decimal(10,3) as a fixed-precision string. */
  quantity: string;
  /** Null until received. */
  actualReceivedQty: string | null;
  varianceFlagged: boolean;
}

export interface StockTransfer {
  id: string;
  sourceOutletId: string;
  destOutletId: string;
  status: TransferStatus;
  requestedById: string;
  dispatchedById: string | null;
  receivedById: string | null;
  lines: TransferLine[];
  createdAt: Date;
  dispatchedAt: Date | null;
  receivedAt: Date | null;
  cancelledAt: Date | null;
}

/** What the list screen actually needs — both outlets' names, without a
 * round-trip per row. */
export interface StockTransferWithOutlets extends StockTransfer {
  sourceOutletName: string;
  destOutletName: string;
}

/** A transfer line as the builder/detail screens render it — both items'
 * names and units, alongside the raw ids. */
export interface TransferLineWithItems extends TransferLine {
  itemName: string;
  itemUnitAbbreviation: string;
  destItemName: string;
  destItemUnitAbbreviation: string;
}

export interface StockTransferDetail extends StockTransferWithOutlets {
  lines: TransferLineWithItems[];
}
