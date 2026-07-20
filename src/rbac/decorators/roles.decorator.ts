import { SetMetadata } from '@nestjs/common';
import { Role } from '../../tenancy/constants/enums';

export const ROLES_KEY = 'rbac:roles';

/**
 * Lists the roles allowed to call this endpoint. Paired with
 * `@ResourceScope()` for per-resource resolution (e.g. "CHAIN_OWNER or
 * PROPERTY_MANAGER of *this* property"); used alone it falls back to a
 * coarse check against the caller's flat `effectiveRole` (see RolesGuard) —
 * fine as a first-pass gate, but per FR-00's own warning `effectiveRole` is
 * "NOT sufficient for per-resource authorization," so endpoints reading/
 * writing a specific resource should always pair this with `@ResourceScope`.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
