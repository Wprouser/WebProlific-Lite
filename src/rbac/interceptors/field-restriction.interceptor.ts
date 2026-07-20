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
 * endpoints. A list endpoint whose items span multiple outlets with
 * different effective roles per item would need per-item resolution; no
 * such endpoint exists yet (FR-01 isn't built), so that's a real extension
 * to make when it does, not something to build speculatively now.
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
        const role = scopeMeta
          ? this.resolveScopedRole(request, scopeMeta)
          : request.effectiveRole;
        if (role !== meta.role) return data;
        return this.stripFields(data, meta.fields);
      }),
    );
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
