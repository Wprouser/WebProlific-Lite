import { GRN, GrnStatus } from '../domain/grn.entity';
import { InvoiceScanStatus } from '../constants/enums';

export interface CreateGrnLineTaxComponentInput {
  componentName: string;
  componentRate: string;
  componentAmount: string;
}

export interface CreateGrnLineInput {
  itemId: string;
  // Set only for a PO-linked line — used internally by the repository to
  // update POLine.receivedQty and recompute the PO's status inside the same
  // transaction as this GRN's creation. Never persisted on GRNLine itself
  // (no such column exists — see the schema's GRNLine model), so it's
  // stripped before the GRNLine row is written.
  poLineId?: string;
  orderedQty?: string;
  receivedQty: string;
  actualPrice: string;
  taxRateId?: string;
  taxRate: string;
  lineSubtotal: string;
  lineTaxAmount: string;
  lineTotal: string;
  taxComponents: CreateGrnLineTaxComponentInput[];
}

export interface CreateGrnInput {
  outletId: string;
  purchaseOrderId?: string;
  supplierId: string;
  createdById: string;
  currencyCode: string;
  exchangeRateToBase: string;
  isTaxInclusive: boolean;
  discountAmount: string;
  otherChargesAmount: string;
  subtotal: string;
  taxAmount: string;
  totalValue: string;
  invoiceNumber?: string;
  invoiceScanUrl?: string;
  invoiceScanStatus?: InvoiceScanStatus;
  varianceFlagged: boolean;
  lines: CreateGrnLineInput[];
}

export interface GrnFilters {
  /** Every result row must have an outletId in this set — scoping, not an
   * explicit user-chosen filter. */
  accessibleOutletIds: string[];
  outletId?: string;
  supplierId?: string;
  purchaseOrderId?: string;
  status?: GrnStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface UpdateEmailSentInput {
  lastEmailedAt: Date;
  lastEmailedTo: string;
}

export interface GrnRepository {
  /**
   * Creates the GRN + lines only, as a DRAFT — no stock impact yet. See
   * `post()` for the step that actually moves stock.
   */
  create(data: CreateGrnInput): Promise<GRN>;
  /**
   * "Post Received Items" — atomically, in one transaction: posts a
   * PURCHASE_IN StockTransaction per line, records a SupplierPriceHistory
   * row per line, and — when the GRN is PO-linked — updates the linked
   * POLine.receivedQty and recomputes the PurchaseOrder's status, then
   * flips the GRN itself from DRAFT to POSTED. See PrismaGrnRepository for
   * why this crosses module boundaries (same narrow, deliberate exception
   * as PrismaItemRepository's opening-stock path).
   */
  post(id: string, postedById: string): Promise<GRN>;
  findById(id: string): Promise<GRN | null>;
  findScoped(filters: GrnFilters): Promise<GRN[]>;
  /** Spec: "Every successful send-email call is recorded, including
   * timestamp and recipient, viewable from the PO/GRN detail screen." */
  updateEmailSent(id: string, data: UpdateEmailSentInput): Promise<GRN>;
}
