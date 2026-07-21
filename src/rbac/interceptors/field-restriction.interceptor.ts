import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { RESTRICT_FIELDS_KEY, RestrictFieldsMeta } from '../decorators/restrict-fields.decorator';
import { RESOURCE_SCOPE_KEY, ResourceScopeMeta } from '../decorators/resource-scope.decorator';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { resolveRoleForScope, resolveScopeId } from '../resource-scope.util';

/**
 * Strips `@RestrictFields()`-declared fields from the response when the
 * caller's role *for the resource in question* matches. Requires
 * `@ResourceScope()` on the same route to know which resource's role to
 * check (a user's role can differ per outlet/property — see FR-11 spec);
 * without it, falls back to the coarse `effectiveRole`.
 *
 * Resolves one role for the whole response — correct for single-resource
 * endpoints. For a route with no `@ResourceScope` whose response is an
 * array of objects each carrying their own `outletId` (FR-01's item list,
 * which can span multiple outlets with a different effective role per
 * outlet for the same caller), role is resolved **per row** instead —
 * otherwise a caller who's CHEF at outlet A but a higher role elsewhere
 * would see `costPrice` leak through for outlet A's rows just because
 * their role is higher somewhere else. This was flagged as "a real
 * extension to make when FR-01 lands" — this is that.
 */
@Injectable()
export class FieldRestrictionInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<RestrictFieldsMeta | undefined>(
      RESTRICT_FIELDS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!meta) return next.handle();

    const scopeMeta = this.reflector.getAllAndOverride<ResourceScopeMeta | undefined>(
      RESOURCE_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<RequestWithAccess>();

    return next.handle().pipe(
      map((data) => {
        if (!scopeMeta && Array.isArray(data)) {
          return data.map((row) => this.stripRow(row, meta, request));
        }
        const role = scopeMeta
          ? this.resolveScopedRole(request, scopeMeta)
          : request.effectiveRole;
        if (role !== meta.role) return data;
        return this.stripFields(data, meta.fields);
      }),
    );
  }

  private stripRow(row: unknown, meta: RestrictFieldsMeta, request: RequestWithAccess): unknown {
    const outletId = this.rowOutletId(row);
    const role = outletId ? resolveRoleForScope(request, 'outlet', outletId) : request.effectiveRole;
    if (role !== meta.role) return row;
    return this.stripFields(row, meta.fields);
  }

  private rowOutletId(row: unknown): string | undefined {
    const outletId = (row as Record<string, unknown> | null)?.outletId;
    return typeof outletId === 'string' ? outletId : undefined;
  }

  private resolveScopedRole(request: RequestWithAccess, scopeMeta: ResourceScopeMeta) {
    const scopeId = resolveScopeId(request, scopeMeta.source);
    return scopeId ? resolveRoleForScope(request, scopeMeta.level, scopeId) : undefined;
  }

  private stripFields(data: unknown, fields: string[]): unknown {
    if (Array.isArray(data)) return data.map((item) => this.stripFields(item, fields));
    if (data && typeof data === 'object') {
      const clone = { ...(data as Record<string, unknown>) };
      for (const field of fields) delete clone[field];
      return clone;
    }
    return data;
  }
}
