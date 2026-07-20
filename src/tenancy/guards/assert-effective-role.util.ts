import { ForbiddenException } from '@nestjs/common';
import { Role } from '../constants/enums';
import { RequestWithAccess } from '../types/request-with-access';

type ScopeLevel = 'chain' | 'property' | 'outlet';

function resolveRole(
  request: RequestWithAccess,
  level: ScopeLevel,
  scopeId: string,
): Role | undefined {
  const access = request.effectiveAccess;
  return level === 'chain'
    ? access?.roleForChain(scopeId)
    : level === 'property'
      ? access?.roleForProperty(scopeId)
      : access?.roleForOutlet(scopeId);
}

/**
 * Minimal, inline role check against the ScopeResolutionService-resolved
 * effective access — enough to satisfy FR-00's own acceptance criteria
 * (e.g. "only CHAIN_OWNER can create/edit properties") ahead of FR-11's
 * full @Roles()-decorator + permission-matrix guard.
 *
 * Every call site is intentionally easy to grep for and swap out later.
 */
export function assertEffectiveRole(
  request: RequestWithAccess,
  level: ScopeLevel,
  scopeId: string,
  allowedRoles: Role[],
): void {
  const role = resolveRole(request, level, scopeId);
  if (!role || !allowedRoles.includes(role)) {
    throw new ForbiddenException(
      `Requires role [${allowedRoles.join(', ')}] at ${level} ${scopeId}`,
    );
  }
}

/**
 * Read-access check: any role at all covering this resource, no specific
 * role required. Enforces FR-00's cross-property/cross-chain isolation
 * acceptance criteria on GET endpoints.
 *
 * TODO: replace with @Roles() guard once FR-11 is implemented
 */
export function assertHasAccess(
  request: RequestWithAccess,
  level: ScopeLevel,
  scopeId: string,
): void {
  if (!resolveRole(request, level, scopeId)) {
    throw new ForbiddenException(`No access to ${level} ${scopeId}`);
  }
}
