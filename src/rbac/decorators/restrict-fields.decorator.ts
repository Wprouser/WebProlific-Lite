import { SetMetadata } from '@nestjs/common';
import { Role } from '../../tenancy/constants/enums';

export const RESTRICT_FIELDS_KEY = 'rbac:restrict-fields';

export interface RestrictFieldsMeta {
  role: Role;
  fields: string[];
}

/**
 * Declares fields to strip from this endpoint's response when the caller's
 * effective role *for the resource in question* is `role` — e.g.
 * `@RestrictFields('CHEF', 'costPrice', 'lastPurchasePrice')` on an Item
 * endpoint. Read by `FieldRestrictionInterceptor`, which resolves the
 * per-resource role the same way RolesGuard does (never the flat
 * `effectiveRole`), since a user's role can differ per outlet/property.
 *
 * No FR currently emits a response with a field this applies to (FR-01,
 * which owns `costPrice`, isn't built yet) — this ships the mechanism ahead
 * of that, proven only against a synthetic fixture in
 * field-restriction.interceptor.spec.ts. Real wiring happens when FR-01
 * lands.
 */
export const RestrictFields = (role: Role, ...fields: string[]) =>
  SetMetadata(RESTRICT_FIELDS_KEY, { role, fields } satisfies RestrictFieldsMeta);
