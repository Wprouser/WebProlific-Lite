// Application-layer stand-ins for the enums the Technical Spec defines, since
// Prisma's SQL Server connector rejects the `enum` schema construct outright
// (see prisma/schema.prisma header note). These are the single source of
// truth for allowed values — used in DTOs (class-validator @IsIn) and by
// every service/repository instead of the database enforcing them.

export const PROPERTY_TYPES = [
  'HOTEL',
  'STANDALONE_RESTAURANT',
  'RESTAURANT_GROUP_SITE',
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const OUTLET_TYPES = [
  'RESTAURANT',
  'BAR',
  'KITCHEN',
  'STORE',
  'ROOM_SERVICE',
] as const;
export type OutletType = (typeof OUTLET_TYPES)[number];

export const SCOPE_TYPES = ['CHAIN', 'PROPERTY', 'OUTLET'] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

// Ordered highest-privilege first — used to resolve a single "highest role"
// signal per FR-00's effectiveRole (see ScopeResolutionService).
export const ROLES = [
  'CHAIN_OWNER',
  'PROPERTY_MANAGER',
  'OUTLET_MANAGER',
  'STORE_STAFF',
  'CHEF',
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_PRECEDENCE: Record<Role, number> = {
  CHAIN_OWNER: 0,
  PROPERTY_MANAGER: 1,
  OUTLET_MANAGER: 2,
  STORE_STAFF: 3,
  CHEF: 4,
};

/** Lower number = higher privilege. Returns the more privileged of the two. */
export function higherPrivilegeRole(a: Role, b: Role): Role {
  return ROLE_PRECEDENCE[a] <= ROLE_PRECEDENCE[b] ? a : b;
}
