import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ScopeResolutionService } from '../services/scope-resolution.service';
import { RequestWithAccess } from '../types/request-with-access';

/**
 * Registered globally (see AppModule). Resolves effectiveOutletIds/
 * effectiveRole once per request and attaches them to `request`, per FR-00's
 * "cache the resolved effectiveOutletIds per request, not per login session"
 * note — there is no cross-request cache, this just avoids re-resolving
 * within a single request.
 *
 * This guard does NOT authenticate — it expects `request.user.id` to already
 * be set by an upstream auth mechanism. FR-13 (Auth & 2FA) hasn't been built
 * yet, so today `request.user` is simply undefined and this guard resolves
 * nothing. When FR-13 lands, its JWT auth guard must run BEFORE this one in
 * the global guard order.
 */
@Injectable()
export class ScopeResolutionGuard implements CanActivate {
  constructor(private readonly scopeResolutionService: ScopeResolutionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAccess>();

    if (request.user?.id) {
      const access = await this.scopeResolutionService.resolveEffectiveAccess(
        request.user.id,
      );
      request.effectiveAccess = access;
      request.effectiveOutletIds = access.effectiveOutletIds;
      request.effectiveRole = access.effectiveRole;
    }

    return true;
  }
}
