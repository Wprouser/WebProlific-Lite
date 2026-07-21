/**
 * Mock data for FR-17's demonstration surfaces (AppShell/ContextSwitcher,
 * Dashboard, Global App Chrome). Not wired to the real FR-00/FR-13/FR-07/
 * FR-04 backends — those don't exist yet. Real wiring happens once each
 * owning FR is built; this just proves the chrome mechanism now, same
 * pattern as FR-11's FieldRestrictionInterceptor ahead of FR-01.
 */

export interface OutletFixture {
  id: string;
  name: string;
}

export interface PropertyFixture {
  id: string;
  name: string;
  outlets: OutletFixture[];
}

export interface ChainFixture {
  id: string;
  name: string;
  properties: PropertyFixture[];
}

export const mockChain: ChainFixture = {
  id: 'chain-1',
  name: 'Al Waha Hospitality Group',
  properties: [
    {
      id: 'property-1',
      name: 'Jeddah Hotel',
      outlets: [
        { id: 'outlet-1', name: 'Main Restaurant' },
        { id: 'outlet-2', name: 'Pool Bar' },
      ],
    },
    {
      id: 'property-2',
      name: 'Riyadh Hotel',
      outlets: [{ id: 'outlet-3', name: 'Main Kitchen' }],
    },
  ],
};

export const mockCurrentUser = {
  name: 'Ahmed Al-Rashid',
  effectiveRole: 'Outlet Manager',
  initials: 'AR',
};

export type AlertSeverity = 'warning' | 'danger';

export interface AlertBarItem {
  /** Route param for /alerts/:type */
  type: string;
  label: string;
  count: number;
  severity: AlertSeverity;
}

/** Sourced from FR-07 (Alerts) + FR-04's variance-approval workflow, per
 * the Global App Chrome spec — mocked since neither backend exists yet. */
export const mockAlertBar: AlertBarItem[] = [
  { type: 'low-stock', label: 'Low-Stock Items', count: 3, severity: 'warning' },
  { type: 'expiry', label: 'Expiry Warnings', count: 2, severity: 'warning' },
  { type: 'po-approvals', label: 'Pending PO Approvals', count: 3, severity: 'warning' },
  { type: 'grn-variance', label: 'GRN Variance Awaiting Sign-off', count: 1, severity: 'danger' },
  { type: 'unacknowledged', label: 'Unacknowledged Alerts', count: 5, severity: 'danger' },
];

export type SearchEntityType =
  | 'Item'
  | 'Category'
  | 'Supplier'
  | 'Purchase Order'
  | 'GRN'
  | 'Transfer'
  | 'Recipe/Menu Item'
  | 'User';

export interface SearchResultFixture {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle: string;
}

/** Global Search index (FR-17 Global App Chrome) — scoped to
 * effectiveOutletIds in the real implementation; this fixture just
 * demonstrates grouped, type-ahead results. */
export const mockSearchIndex: SearchResultFixture[] = [
  { id: 'i1', type: 'Item', title: 'All-Purpose Flour', subtitle: 'Dry Goods · 42 kg on hand' },
  { id: 'i2', type: 'Item', title: 'Olive Oil (5L)', subtitle: 'Oils · 3 bottles on hand' },
  { id: 'i3', type: 'Item', title: 'Fresh Basil', subtitle: 'Produce · 0 bunches on hand' },
  { id: 'c1', type: 'Category', title: 'Dry Goods', subtitle: '128 items' },
  { id: 'c2', type: 'Category', title: 'Produce', subtitle: '64 items' },
  { id: 's1', type: 'Supplier', title: 'Gulf Fresh Produce Co.', subtitle: 'Jeddah · 12 active POs' },
  { id: 's2', type: 'Supplier', title: 'Al-Marai Dairy', subtitle: 'Riyadh · 4 active POs' },
  { id: 'po1', type: 'Purchase Order', title: 'PO-2026-0142', subtitle: 'Gulf Fresh Produce Co. · Pending approval' },
  { id: 'g1', type: 'GRN', title: 'GRN-2026-0098', subtitle: 'Variance flagged · awaiting sign-off' },
  { id: 't1', type: 'Transfer', title: 'TRF-2026-0031', subtitle: 'Main Restaurant → Pool Bar' },
  { id: 'r1', type: 'Recipe/Menu Item', title: 'Grilled Sea Bass', subtitle: 'Main Restaurant menu' },
  { id: 'u1', type: 'User', title: 'Ahmed Al-Rashid', subtitle: 'Outlet Manager — Main Restaurant' },
];
