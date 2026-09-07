export interface Outlet {
  id: string;
  propertyId: string;
  chainId: string;
  name: string;
  type: string;
  baseCurrency: string;
  poApprovalThreshold: string | null; // Decimal serialized as string at the repository boundary
  isActive: boolean;
}

/**
 * FR-00: an outlet enriched with its owning property/chain's display name.
 * `GET /outlets` is the only endpoint every role can reach regardless of
 * scope level — `roleForProperty`/`roleForChain` don't inherit from an
 * OUTLET-scope grant, so an OUTLET_MANAGER/STORE_STAFF/CHEF has no other
 * way to resolve their own property's or chain's name (needed by the
 * header Context Switcher and breadcrumb text for every role, not just
 * CHAIN_OWNER/PROPERTY_MANAGER).
 */
export interface OutletWithHierarchyNames extends Outlet {
  propertyName: string;
  chainName: string;
}
