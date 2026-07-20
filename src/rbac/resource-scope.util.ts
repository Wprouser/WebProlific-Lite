import { ScopeLevel } from './decorators/resource-scope.decorator';
import { Role } from '../tenancy/constants/enums';
import { RequestWithAccess } from '../tenancy/types/request-with-access';

/** Shared by RolesGuard and FieldRestrictionInterceptor so both resolve
 * "the role for this resource" identically. */
export function resolveScopeId(request: RequestWithAccess, source: string): string | undefined {
  if (source.startsWith('body.')) {
    return request.body?.[source.slice('body.'.length)];
  }
  return request.params?.[source];
}

export function resolveRoleForScope(
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
