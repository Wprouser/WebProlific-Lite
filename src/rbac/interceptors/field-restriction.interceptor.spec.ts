import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, firstValueFrom } from 'rxjs';
import { FieldRestrictionInterceptor } from './field-restriction.interceptor';
import { RESTRICT_FIELDS_KEY, RestrictFieldsMeta } from '../decorators/restrict-fields.decorator';
import { RESOURCE_SCOPE_KEY, ResourceScopeMeta } from '../decorators/resource-scope.decorator';

/**
 * No real endpoint uses @RestrictFields yet (its target, `costPrice`, is an
 * FR-01 field and FR-01 isn't built) — these tests prove the mechanism
 * against a synthetic "Item-shaped" fixture instead, per the implementation
 * plan. Real wiring happens when FR-01 lands.
 */
function buildInterceptor(
  restrictMeta: RestrictFieldsMeta | undefined,
  scopeMeta: ResourceScopeMeta | undefined,
) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === RESTRICT_FIELDS_KEY) return restrictMeta;
      if (key === RESOURCE_SCOPE_KEY) return scopeMeta;
      return undefined;
    }),
  } as unknown as Reflector;
  return new FieldRestrictionInterceptor(reflector);
}

function buildContext(params: Record<string, string>, effectiveAccess: unknown): ExecutionContext {
  const request = { params, effectiveAccess };
  return {
    getHandler: () => ({}) as never,
    getClass: () => ({}) as never,
    switchToHttp: () => ({ getRequest: () => request }) as never,
  } as unknown as ExecutionContext;
}

const fixtureItem = { id: 'item-1', name: 'Flour', costPrice: 12.5, currentStock: 40 };

describe('FieldRestrictionInterceptor', () => {
  it('passes the response through unchanged when no @RestrictFields is declared', async () => {
    const interceptor = buildInterceptor(undefined, undefined);
    const context = buildContext({}, undefined);
    const result = await firstValueFrom(
      interceptor.intercept(context, { handle: () => of(fixtureItem) }),
    );
    expect(result).toEqual(fixtureItem);
  });

  it('strips the restricted fields when the resolved per-resource role matches', async () => {
    const interceptor = buildInterceptor(
      { role: 'CHEF', fields: ['costPrice'] },
      { level: 'outlet', source: 'id' },
    );
    const access = { roleForOutlet: jest.fn().mockReturnValue('CHEF') };
    const context = buildContext({ id: 'o1' }, access);

    const result = await firstValueFrom(
      interceptor.intercept(context, { handle: () => of(fixtureItem) }),
    );
    expect(result).toEqual({ id: 'item-1', name: 'Flour', currentStock: 40 });
    expect((result as Record<string, unknown>).costPrice).toBeUndefined();
  });

  it('leaves fields intact when the resolved role does not match', async () => {
    const interceptor = buildInterceptor(
      { role: 'CHEF', fields: ['costPrice'] },
      { level: 'outlet', source: 'id' },
    );
    const access = { roleForOutlet: jest.fn().mockReturnValue('OUTLET_MANAGER') };
    const context = buildContext({ id: 'o1' }, access);

    const result = await firstValueFrom(
      interceptor.intercept(context, { handle: () => of(fixtureItem) }),
    );
    expect(result).toEqual(fixtureItem);
  });

  it('strips fields from every item in an array response', async () => {
    const interceptor = buildInterceptor(
      { role: 'CHEF', fields: ['costPrice'] },
      { level: 'outlet', source: 'id' },
    );
    const access = { roleForOutlet: jest.fn().mockReturnValue('CHEF') };
    const context = buildContext({ id: 'o1' }, access);
    const items = [fixtureItem, { ...fixtureItem, id: 'item-2' }];

    const result = await firstValueFrom(interceptor.intercept(context, { handle: () => of(items) }));
    expect(Array.isArray(result)).toBe(true);
    for (const item of result as Record<string, unknown>[]) {
      expect(item.costPrice).toBeUndefined();
    }
  });

  it('AC (FR-01): resolves role per row for an array response with no @ResourceScope, using each row\'s own outletId', async () => {
    const interceptor = buildInterceptor({ role: 'CHEF', fields: ['costPrice'] }, undefined);
    // Same caller: CHEF at outlet A, OUTLET_MANAGER at outlet B — a plain
    // flat effectiveRole would resolve to the higher-privilege role and
    // leak costPrice for outlet A's rows too.
    const access = {
      roleForOutlet: jest.fn((outletId: string) => (outletId === 'oA' ? 'CHEF' : 'OUTLET_MANAGER')),
    };
    const context = buildContext({}, access);
    const rows = [
      { ...fixtureItem, id: 'item-a', outletId: 'oA' },
      { ...fixtureItem, id: 'item-b', outletId: 'oB' },
    ];

    const result = (await firstValueFrom(
      interceptor.intercept(context, { handle: () => of(rows) }),
    )) as Record<string, unknown>[];

    expect(result[0]!.costPrice).toBeUndefined(); // outlet A: CHEF — stripped
    expect(result[1]!.costPrice).toBe(12.5); // outlet B: OUTLET_MANAGER — untouched
  });

  it('falls back to flat effectiveRole for array rows with no outletId field', async () => {
    const interceptor = buildInterceptor({ role: 'CHEF', fields: ['costPrice'] }, undefined);
    const context: ExecutionContext = {
      getHandler: () => ({}) as never,
      getClass: () => ({}) as never,
      switchToHttp: () => ({ getRequest: () => ({ effectiveRole: 'CHEF' }) }) as never,
    } as unknown as ExecutionContext;
    const rows = [{ id: 'x1', costPrice: 5 }];

    const result = (await firstValueFrom(
      interceptor.intercept(context, { handle: () => of(rows) }),
    )) as Record<string, unknown>[];

    expect(result[0]!.costPrice).toBeUndefined();
  });

  it('does not mutate the original response object', async () => {
    const interceptor = buildInterceptor(
      { role: 'CHEF', fields: ['costPrice'] },
      { level: 'outlet', source: 'id' },
    );
    const access = { roleForOutlet: jest.fn().mockReturnValue('CHEF') };
    const context = buildContext({ id: 'o1' }, access);

    await firstValueFrom(interceptor.intercept(context, { handle: () => of(fixtureItem) }));
    expect(fixtureItem.costPrice).toBe(12.5);
  });
});
