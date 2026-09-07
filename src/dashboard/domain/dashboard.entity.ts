/**
 * The five metrics approved for FR-08's dashboard: stock valuation, active
 * item count, open low-stock alerts, pending PO approvals, and transfers in
 * transit. Shared shape across all three scope levels (outlet/property/
 * chain) — only the identifying fields differ per level.
 */
export interface DashboardMetrics {
  activeItemCount: number;
  /** Decimal(12,2), expressed in `currency` — already FX-converted if
   * `isConverted` is true. */
  stockValuation: string;
  /** The currency `stockValuation` is expressed in: the scope's own
   * baseCurrency for an outlet dashboard, or the owning chain's
   * baseCurrency (FR-16's "group reporting currency") for property/chain
   * dashboards. */
  currency: string;
  /** True if any outlet within this scope has a baseCurrency other than
   * `currency` — the UI should then label stockValuation as FX-converted,
   * not transactional truth (spec, FR-08 Business Logic). */
  isConverted: boolean;
  openLowStockAlerts: number;
  pendingPoApprovals: number;
  /**
   * Transfers dispatched from an outlet in this scope, not yet received —
   * source-side only, not "touches either side". See the reconciliation
   * note on `TransferRepository.countInTransitFromOutlets`.
   */
  transfersInTransit: number;
}

export interface OutletDashboard extends DashboardMetrics {
  outletId: string;
  outletName: string;
}

export interface PropertyDashboard extends DashboardMetrics {
  propertyId: string;
  propertyName: string;
  outletCount: number;
}

export interface ChainDashboard extends DashboardMetrics {
  chainId: string;
  chainName: string;
  propertyCount: number;
  outletCount: number;
}
