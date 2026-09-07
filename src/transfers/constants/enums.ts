// Application-layer stand-ins for FR-08's TransferStatus enum — Prisma's
// SQL Server connector rejects the `enum` construct outright (see
// prisma/schema.prisma's header note), so this is the single source of
// truth for allowed values, same pattern as every other module here.

export const TRANSFER_STATUSES = ['REQUESTED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

/**
 * Spec: "Create transfer request (role: OUTLET_MANAGER/PROPERTY_MANAGER/
 * CHAIN_OWNER only)". Excludes STORE_STAFF and CHEF.
 *
 * Extended here to dispatch, receive and cancel too — the spec's own
 * business logic only states the rule for creation, but dispatch/receive
 * move real stock across an outlet boundary, which is a materially bigger
 * trust decision than the plain stock-in/out entry FR-02 already lets every
 * role make within their own outlet. Requiring the same manager-tier role
 * for every lifecycle action keeps that trust boundary consistent rather
 * than opening it back up at the two steps that actually move the goods.
 */
export const TRANSFER_MUTATE_ROLES = ['OUTLET_MANAGER', 'PROPERTY_MANAGER', 'CHAIN_OWNER'] as const;

/**
 * Percentage difference between dispatched and actually-received quantity
 * above which a transfer line is flagged for review. Mirrors GRN's own
 * tolerance (VARIANCE_TOLERANCE_PERCENT in src/grn/constants/enums.ts) —
 * defined as its own constant rather than imported from GRN's module, so
 * Transfers doesn't reach into a sibling module for a value that happens to
 * coincide today but is conceptually this module's own business rule.
 */
export const TRANSFER_VARIANCE_TOLERANCE_PERCENT = 10;
