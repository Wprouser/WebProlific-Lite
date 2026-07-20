import { SetMetadata } from '@nestjs/common';

export const RESOURCE_SCOPE_KEY = 'rbac:resource-scope';

export type ScopeLevel = 'chain' | 'property' | 'outlet';

export interface ResourceScopeMeta {
  level: ScopeLevel;
  /** Route-param name by default (e.g. 'id', 'propertyId'). Prefix with
   * 'body.' to read from the request body instead (e.g. 'body.chainId') —
   * needed for the handful of routes where the scope id isn't in the URL. */
  source: string;
}

/**
 * Tells RolesGuard how to resolve the scope id for this route, so it can
 * check the caller's role *for that specific resource* via
 * `effectiveAccess.roleFor{Chain,Property,Outlet}(scopeId)` — the per-
 * resource resolution FR-00/FR-11 require, not the flat `effectiveRole`.
 *
 * Used without `@Roles()`, it means "any role at all covering this
 * resource" (equivalent to the old `assertHasAccess`).
 */
export const ResourceScope = (level: ScopeLevel, source: string) =>
  SetMetadata(RESOURCE_SCOPE_KEY, { level, source } satisfies ResourceScopeMeta);
