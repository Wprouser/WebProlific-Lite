import { ScopeResolutionService } from './scope-resolution.service';
import { UserAccessRepository } from '../repositories/user-access.repository';
import { PropertyRepository } from '../repositories/property.repository';
import { OutletRepository } from '../repositories/outlet.repository';
import { UserAccess } from '../domain/user-access.entity';
import { Role, ScopeType } from '../constants/enums';

// Fixture hierarchy used throughout:
//   Chain C1
//     Property P1 -> Outlets O1, O2
//     Property P2 -> Outlets O3, O4
const OUTLETS_BY_PROPERTY: Record<string, string[]> = {
  P1: ['O1', 'O2'],
  P2: ['O3', 'O4'],
};
const OUTLETS_BY_CHAIN: Record<string, string[]> = {
  C1: ['O1', 'O2', 'O3', 'O4'],
};
const PROPERTIES_BY_CHAIN: Record<string, string[]> = {
  C1: ['P1', 'P2'],
};

function grant(scopeType: ScopeType, scopeId: string, role: Role): UserAccess {
  return { id: `${scopeType}-${scopeId}-${role}`, userId: 'u1', scopeType, scopeId, role, createdAt: new Date() };
}

function buildService(grants: UserAccess[]) {
  const userAccessRepository: UserAccessRepository = {
    findByUserId: jest.fn().mockResolvedValue(grants),
    create: jest.fn(),
    findUserIdsByScope: jest.fn().mockResolvedValue([]),
  };
  const propertyRepository: Partial<PropertyRepository> = {
    findIdsByChainId: jest.fn((chainId: string) =>
      Promise.resolve(PROPERTIES_BY_CHAIN[chainId] ?? []),
    ),
  };
  const outletRepository: Partial<OutletRepository> = {
    findIdsByPropertyId: jest.fn((propertyId: string) =>
      Promise.resolve(OUTLETS_BY_PROPERTY[propertyId] ?? []),
    ),
    findIdsByChainId: jest.fn((chainId: string) =>
      Promise.resolve(OUTLETS_BY_CHAIN[chainId] ?? []),
    ),
  };

  return new ScopeResolutionService(
    userAccessRepository,
    propertyRepository as PropertyRepository,
    outletRepository as OutletRepository,
  );
}

describe('ScopeResolutionService', () => {
  it('lets a CHAIN_OWNER reach every property/outlet in their chain without explicit per-outlet grants', async () => {
    const service = buildService([grant('CHAIN', 'C1', 'CHAIN_OWNER')]);
    const access = await service.resolveEffectiveAccess('u1');

    expect(access.effectiveOutletIds.sort()).toEqual(['O1', 'O2', 'O3', 'O4']);
    expect(access.roleForChain('C1')).toBe('CHAIN_OWNER');
    expect(access.roleForProperty('P1')).toBe('CHAIN_OWNER');
    expect(access.roleForProperty('P2')).toBe('CHAIN_OWNER');
    expect(access.roleForOutlet('O1')).toBe('CHAIN_OWNER');
    expect(access.roleForOutlet('O4')).toBe('CHAIN_OWNER');
  });

  it('does not let a PROPERTY_MANAGER reach outlets in a sibling property of the same chain', async () => {
    const service = buildService([grant('PROPERTY', 'P1', 'PROPERTY_MANAGER')]);
    const access = await service.resolveEffectiveAccess('u1');

    expect(access.effectiveOutletIds.sort()).toEqual(['O1', 'O2']);
    expect(access.roleForOutlet('O1')).toBe('PROPERTY_MANAGER');
    expect(access.roleForOutlet('O2')).toBe('PROPERTY_MANAGER');
    // O3/O4 belong to P2 — a different property under the same chain C1
    expect(access.roleForOutlet('O3')).toBeUndefined();
    expect(access.roleForOutlet('O4')).toBeUndefined();
    expect(access.roleForProperty('P2')).toBeUndefined();
  });

  it('does not leak sibling outlets when a user is granted access to a single outlet', async () => {
    const service = buildService([grant('OUTLET', 'O1', 'OUTLET_MANAGER')]);
    const access = await service.resolveEffectiveAccess('u1');

    expect(access.effectiveOutletIds).toEqual(['O1']);
    expect(access.roleForOutlet('O1')).toBe('OUTLET_MANAGER');
    // O2 is a sibling outlet under the same property P1
    expect(access.roleForOutlet('O2')).toBeUndefined();
  });

  it('unions overlapping grants without duplicates and keeps the higher-privilege role', async () => {
    const service = buildService([
      grant('CHAIN', 'C1', 'PROPERTY_MANAGER'),
      grant('OUTLET', 'O1', 'CHAIN_OWNER'),
    ]);
    const access = await service.resolveEffectiveAccess('u1');

    const sorted = [...access.effectiveOutletIds].sort();
    expect(sorted).toEqual(['O1', 'O2', 'O3', 'O4']);
    expect(new Set(access.effectiveOutletIds).size).toBe(access.effectiveOutletIds.length);
    // O1 is covered by both grants — the more privileged role wins
    expect(access.roleForOutlet('O1')).toBe('CHAIN_OWNER');
    // O2 is only covered by the CHAIN grant
    expect(access.roleForOutlet('O2')).toBe('PROPERTY_MANAGER');
  });

  it('resolves effectiveRole as the highest-privilege role across all grants', async () => {
    const service = buildService([
      grant('OUTLET', 'O1', 'CHEF'),
      grant('PROPERTY', 'P2', 'OUTLET_MANAGER'),
    ]);
    const access = await service.resolveEffectiveAccess('u1');

    expect(access.effectiveRole).toBe('OUTLET_MANAGER');
  });

  it('resolves an empty EffectiveAccess for a user with no grants', async () => {
    const service = buildService([]);
    const access = await service.resolveEffectiveAccess('u1');

    expect(access.effectiveOutletIds).toEqual([]);
    expect(access.effectiveRole).toBeUndefined();
    expect(access.roleForOutlet('O1')).toBeUndefined();
  });
});
