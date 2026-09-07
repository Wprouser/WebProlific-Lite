// FR-11's permission matrix, "View financial reports" row: CHAIN_OWNER
// chain-wide, PROPERTY_MANAGER property-wide, OUTLET_MANAGER own outlet
// only, STORE_STAFF/CHEF excluded at every level. The dashboard's figures
// (stock valuation, PO approvals) are exactly that kind of financial view,
// so it's gated the same way rather than reusing FR-08's own transfer
// creation role set.
export const DASHBOARD_OUTLET_ROLES = ['OUTLET_MANAGER', 'PROPERTY_MANAGER', 'CHAIN_OWNER'] as const;
export const DASHBOARD_PROPERTY_ROLES = ['PROPERTY_MANAGER', 'CHAIN_OWNER'] as const;
export const DASHBOARD_CHAIN_ROLES = ['CHAIN_OWNER'] as const;
