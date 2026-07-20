import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RESOURCE_SCOPE_KEY, ResourceScopeMeta } from '../decorators/resource-scope.decorator';
import { Role } from '../../tenancy/constants/enums';

function buildContext(
  params: Record<string, string>,
  body: Record<string, unknown>,
  effectiveAccess: unknown,
  effectiveRole?: string,
): ExecutionContext {
  const request = { params, body, effectiveAccess, effectiveRole };
  return {
    getHandler: () => ({}) as never,
    getClass: () => ({}) as never,
    switchToHttp: () => ({ getRequest: () => request }) as never,
  } as unknown as ExecutionContext;
}

function buildGuard(rolesMeta: Role[] | undefined, scopeMeta: ResourceScopeMeta | undefined) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === ROLES_KEY) return rolesMeta;
      if (key === RESOURCE_SCOPE_KEY) return scopeMeta;
      return undefined;
    }),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('allows the request through when neither @Roles nor @ResourceScope is declared', () => {
    const guard = buildGuard(undefined, undefined);
    expect(guard.canActivate(buildContext({}, {}, undefined))).toBe(true);
  });

  it('resolves the scope id from a route param and checks the per-resource role', () => {
    const guard = buildGuard(['CHAIN_OWNER'], { level: 'property', source: 'id' });
    const access = { roleForProperty: jest.fn().mockReturnValue('CHAIN_OWNER') };
    const context = buildContext({ id: 'p1' }, {}, access);
    expect(guard.canActivate(context)).toBe(true);
    expect(access.roleForProperty).toHaveBeenCalledWith('p1');
  });

  it("resolves the scope id from the request body when source is prefixed 'body.'", () => {
    const guard = buildGuard(['CHAIN_OWNER'], { level: 'chain', source: 'body.chainId' });
    const access = { roleForChain: jest.fn().mockReturnValue('CHAIN_OWNER') };
    const context = buildContext({}, { chainId: 'c1' }, access);
    expect(guard.canActivate(context)).toBe(true);
    expect(access.roleForChain).toHaveBeenCalledWith('c1');
  });

  it('throws Forbidden when the resolved role is not in the allowed list', () => {
    const guard = buildGuard(['CHAIN_OWNER'], { level: 'property', source: 'id' });
    const access = { roleForProperty: jest.fn().mockReturnValue('OUTLET_MANAGER') };
    const context = buildContext({ id: 'p1' }, {}, access);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('throws Forbidden when there is no role at all for that resource (old assertHasAccess behavior)', () => {
    const guard = buildGuard(undefined, { level: 'outlet', source: 'id' });
    const access = { roleForOutlet: jest.fn().mockReturnValue(undefined) };
    const context = buildContext({ id: 'o1' }, {}, access);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('@ResourceScope alone (no @Roles) allows any role covering the resource', () => {
    const guard = buildGuard(undefined, { level: 'outlet', source: 'id' });
    const access = { roleForOutlet: jest.fn().mockReturnValue('CHEF') };
    const context = buildContext({ id: 'o1' }, {}, access);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws Forbidden when the scope id itself is missing from params/body', () => {
    const guard = buildGuard(['CHAIN_OWNER'], { level: 'chain', source: 'body.chainId' });
    const context = buildContext({}, {}, {});
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('falls back to the coarse effectiveRole check when only @Roles is declared', () => {
    const guard = buildGuard(['CHAIN_OWNER', 'PROPERTY_MANAGER'], undefined);
    const context = buildContext({}, {}, undefined, 'PROPERTY_MANAGER');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('coarse check rejects a role not in the list', () => {
    const guard = buildGuard(['CHAIN_OWNER'], undefined);
    const context = buildContext({}, {}, undefined, 'OUTLET_MANAGER');
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('coarse check rejects when the caller has no effectiveRole at all', () => {
    const guard = buildGuard(['CHAIN_OWNER'], undefined);
    const context = buildContext({}, {}, undefined, undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
