import { ForbiddenException } from '@nestjs/common';
import { RequestWithAccess } from '../tenancy/types/request-with-access';
import { Role } from '../tenancy/constants/enums';

/**
 * FR-01's endpoints are flat (`/items/:id`, not nested under
 * `/outlets/:outletId/items/:id`), so an item's outletId can't be resolved
 * from a route param the way `@ResourceScope` expects — it has to be
 * looked up first, from the loaded entity (update/delete/detail) or the
 * request body (create). This runs the same per-resource role check
 * `RolesGuard`/`@ResourceScope` do (`effectiveAccess.roleForOutlet`), just
 * called from the service once the outletId is known, instead of resolved
 * from route metadata. Not an ad-hoc role check — same resolved-access
 * primitive, just invoked from a different place out of structural
 * necessity.
 */
export function assertOutletAccess(request: RequestWithAccess, outletId: string, allowedRoles?: Role[]): void {
  const role = request.effectiveAccess?.roleForOutlet(outletId);
  if (!role) {
    throw new ForbiddenException(`No access to outlet ${outletId}`);
  }
  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new ForbiddenException(`Requires role [${allowedRoles.join(', ')}] at outlet ${outletId}`);
  }
}
