import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RESOURCE_SCOPE_KEY, ResourceScopeMeta } from '../decorators/resource-scope.decorator';
import { Role } from '../../tenancy/constants/enums';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { resolveRoleForScope, resolveScopeId } from '../resource-scope.util';

/**
 * Registered globally (see AppModule), AFTER ScopeResolutionGuard (needs
 * `request.effectiveAccess` already resolved). Formalizes FR-11: every
 * inline `assertEffectiveRole`/`assertHasAccess` call from FR-00/FR-13 is
 * replaced by `@Roles()`/`@ResourceScope()` metadata read here.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const scopeMeta = this.reflector.getAllAndOverride<ResourceScopeMeta | undefined>(
      RESOURCE_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles?.length && !scopeMeta) return true; // no restriction declared on this route

    const request = context.switchToHttp().getRequest<RequestWithAccess>();

    if (scopeMeta) {
      const scopeId = resolveScopeId(request, scopeMeta.source);
      if (!scopeId) {
        throw new ForbiddenException(`Missing scope id (${scopeMeta.source}) for authorization`);
      }
      const role = resolveRoleForScope(request, scopeMeta.level, scopeId);
      if (!role) {
        throw new ForbiddenException(`No access to ${scopeMeta.level} ${scopeId}`);
      }
      if (roles?.length && !roles.includes(role)) {
        throw new ForbiddenException(
          `Requires role [${roles.join(', ')}] at ${scopeMeta.level} ${scopeId}`,
        );
      }
      return true;
    }

    // @Roles() with no @ResourceScope(): coarse gate against the flat
    // effectiveRole — used for list-style endpoints with no single resource
    // id (e.g. FR-14's GET /users). Callers must still do per-resource
    // filtering/validation in the service layer.
    const role = request.effectiveRole;
    if (!role || !roles!.includes(role)) {
      throw new ForbiddenException(`Requires role [${roles!.join(', ')}]`);
    }
    return true;
  }
}
