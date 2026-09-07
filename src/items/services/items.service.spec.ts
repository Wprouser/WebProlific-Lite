import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemRepository } from '../repositories/item.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { UnitOfMeasureRepository } from '../repositories/unit-of-measure.repository';
import { SupplierRepository } from '../../suppliers/repositories/supplier.repository';
import { TaxRateRepository } from '../../tax-rates/repositories/tax-rate.repository';
import { Item } from '../domain/item.entity';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';

function fixtureItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    outletId: 'o1',
    name: 'Basmati Rice',
    categoryId: 'c1',
    sku: 'RICE-BAS-001',
    barcode: null,
    unitId: 'u1',
    minStock: '10',
    maxStock: '100',
    currentStock: '0',
    shelfLifeDays: 365,
    costPrice: '85.50',
    defaultSupplierId: null,
    purchaseGLAccount: null,
    defaultTaxRateId: null,
    storageLocation: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// `null` (not `undefined`) means "no role at this outlet" — a default
// parameter only substitutes for an omitted/`undefined` argument, so
// `fixtureRequest(undefined)` would silently fall through to the default
// role instead of testing the no-access case.
function fixtureRequest(role: string | null = 'OUTLET_MANAGER'): RequestWithAccess {
  return {
    user: { id: 'u1' },
    effectiveAccess: {
      userId: 'u1',
      effectiveOutletIds: ['o1'],
      effectivePropertyIds: [],
      effectiveChainIds: [],
      effectiveRole: role as never,
      grants: [],
      roleForChain: () => undefined,
      roleForProperty: () => undefined,
      roleForOutlet: () => role as never,
    },
  } as unknown as RequestWithAccess;
}

describe('ItemsService', () => {
  function buildService(item = fixtureItem()) {
    const itemRepository: Partial<ItemRepository> = {
      create: jest.fn().mockResolvedValue(item),
      findById: jest.fn().mockResolvedValue(item),
      update: jest.fn().mockResolvedValue({ ...item, isActive: false }),
      findBySku: jest.fn().mockResolvedValue(null),
      findByBarcode: jest.fn().mockResolvedValue(null),
      findScoped: jest.fn().mockResolvedValue([item]),
    };
    const categoryRepository: Partial<CategoryRepository> = {
      findScoped: jest.fn().mockResolvedValue([{ id: 'c1', name: 'Dry Goods', outletId: 'o1', isActive: true }]),
    };
    const unitRepository: Partial<UnitOfMeasureRepository> = {
      findScoped: jest.fn().mockResolvedValue([
        { id: 'u1', name: 'Kilogram', abbreviation: 'kg', outletId: 'o1', isActive: true, baseUnitId: null, conversionFactor: null },
      ]),
    };
    const supplierRepository: Partial<SupplierRepository> = {
      findScoped: jest.fn().mockResolvedValue([]),
    };
    const taxRateRepository: Partial<TaxRateRepository> = {
      findScoped: jest.fn().mockResolvedValue([]),
    };
    const service = new ItemsService(
      itemRepository as ItemRepository,
      categoryRepository as CategoryRepository,
      unitRepository as UnitOfMeasureRepository,
      supplierRepository as SupplierRepository,
      taxRateRepository as TaxRateRepository,
    );
    return { service, itemRepository, categoryRepository, unitRepository, supplierRepository, taxRateRepository };
  }

  const createDto = {
    outletId: 'o1',
    name: 'Basmati Rice',
    categoryId: 'c1',
    sku: 'RICE-BAS-001',
    unitId: 'u1',
    minStock: '10',
    maxStock: '100',
    costPrice: '85.50',
  };

  it('AC: cannot set minStock >= maxStock on create', async () => {
    const { service } = buildService();
    await expect(
      service.create(fixtureRequest(), { ...createDto, minStock: '100', maxStock: '100' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('AC: cannot create two items with the same SKU', async () => {
    const { service, itemRepository } = buildService();
    (itemRepository.findBySku as jest.Mock).mockResolvedValue(fixtureItem());
    await expect(service.create(fixtureRequest(), createDto)).rejects.toThrow(ConflictException);
  });

  it('rejects a duplicate barcode the same way', async () => {
    const { service, itemRepository } = buildService();
    (itemRepository.findByBarcode as jest.Mock).mockResolvedValue(fixtureItem());
    await expect(
      service.create(fixtureRequest(), { ...createDto, barcode: '8901030123456' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects create for a role not permitted to mutate items (e.g. STORE_STAFF)', async () => {
    const { service } = buildService();
    await expect(service.create(fixtureRequest('STORE_STAFF'), createDto)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects create for a caller with no access to the target outlet at all', async () => {
    const { service } = buildService();
    await expect(service.create(fixtureRequest(null), createDto)).rejects.toThrow(ForbiddenException);
  });

  it('creates successfully for an authorized role with valid data', async () => {
    const { service, itemRepository } = buildService();
    const request = fixtureRequest('OUTLET_MANAGER');
    await service.create(request, createDto);
    expect(itemRepository.create).toHaveBeenCalledWith({ ...createDto, performedById: request.user!.id });
  });

  it('findById throws NotFoundException for a missing item', async () => {
    const { service, itemRepository } = buildService();
    (itemRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(service.findById(fixtureRequest(), 'missing')).rejects.toThrow(NotFoundException);
  });

  it('findById is readable by any role with access to the outlet (no MUTATE_ROLES gate)', async () => {
    const { service } = buildService();
    await expect(service.findById(fixtureRequest('CHEF'), 'i1')).resolves.toBeDefined();
  });

  it('findById rejects a caller with no access to the item\'s outlet', async () => {
    const { service } = buildService();
    await expect(service.findById(fixtureRequest(null), 'i1')).rejects.toThrow(ForbiddenException);
  });

  it('update validates the effective stock range using existing values for fields not being changed', async () => {
    const { service } = buildService(fixtureItem({ minStock: '10', maxStock: '100' }));
    // Only lowering maxStock — service must compare against the EXISTING
    // minStock (10), not treat the omitted field as unbounded.
    await expect(service.update(fixtureRequest(), 'i1', { maxStock: '5' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('update allows changing the SKU when the new one is unused', async () => {
    const { service, itemRepository } = buildService();
    await service.update(fixtureRequest(), 'i1', { sku: 'RICE-BAS-002' });
    expect(itemRepository.update).toHaveBeenCalledWith('i1', { sku: 'RICE-BAS-002' });
  });

  it('softDelete sets isActive false and does not touch currentStock', async () => {
    const { service, itemRepository } = buildService();
    await service.softDelete(fixtureRequest(), 'i1');
    expect(itemRepository.update).toHaveBeenCalledWith('i1', { isActive: false });
  });

  it('list scopes by the caller\'s effectiveOutletIds and converts string query params to booleans', async () => {
    const { service, itemRepository } = buildService();
    await service.list(fixtureRequest(), { belowMinStock: 'true', isActive: 'false' });
    expect(itemRepository.findScoped).toHaveBeenCalledWith(
      expect.objectContaining({ accessibleOutletIds: ['o1'], belowMinStock: true, isActive: false }),
    );
  });

  describe('clone', () => {
    it('AC: copies master data but never copies sku or current stock', async () => {
      const source = fixtureItem({
        currentStock: '37.500',
        defaultSupplierId: 's1',
        purchaseGLAccount: 'COGS',
        defaultTaxRateId: 't1',
      });
      const { service, itemRepository } = buildService(source);
      const request = fixtureRequest('OUTLET_MANAGER');

      await service.clone(request, 'i1', 'RICE-BAS-002');

      expect(itemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          outletId: source.outletId,
          name: 'Basmati Rice (Copy)',
          categoryId: source.categoryId,
          sku: 'RICE-BAS-002',
          unitId: source.unitId,
          minStock: source.minStock,
          maxStock: source.maxStock,
          costPrice: source.costPrice,
          defaultSupplierId: source.defaultSupplierId,
          purchaseGLAccount: source.purchaseGLAccount,
          defaultTaxRateId: source.defaultTaxRateId,
          performedById: request.user!.id,
        }),
      );
      // No currentStock/openingStock field is ever passed through — the
      // clone always starts at 0 via CreateItemInput's own defaulting.
      const call = (itemRepository.create as jest.Mock).mock.calls[0][0];
      expect(call.currentStock).toBeUndefined();
      expect(call.openingStock).toBeUndefined();
    });

    it('rejects cloning into an already-used sku', async () => {
      const { service, itemRepository } = buildService();
      (itemRepository.findBySku as jest.Mock).mockResolvedValue(fixtureItem());
      await expect(service.clone(fixtureRequest(), 'i1', 'RICE-BAS-001')).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects cloning for a role not permitted to mutate items', async () => {
      const { service } = buildService();
      await expect(service.clone(fixtureRequest('STORE_STAFF'), 'i1', 'RICE-BAS-002')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('bulkImport', () => {
    const HEADER = 'Name,Category,SKU,Unit,Min Stock,Max Stock,Cost Price';
    function csvFile(rows: string[]) {
      return { buffer: Buffer.from([HEADER, ...rows].join('\n'), 'utf8'), originalName: 'items.csv' };
    }

    it('AC: every valid row is created, resolving category/unit names to ids', async () => {
      const { service, itemRepository } = buildService();
      const result = await service.bulkImport(
        fixtureRequest(),
        'o1',
        csvFile(['Basmati Rice,Dry Goods,RICE-002,Kilogram,10,100,85.50']),
      );
      expect(result.createdCount).toBe(1);
      expect(itemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'c1', unitId: 'u1', sku: 'RICE-002' }),
      );
    });

    it('AC: validates every row before committing any — a single bad row rejects the whole batch with a per-row error report', async () => {
      const { service, itemRepository } = buildService();
      await expect(
        service.bulkImport(
          fixtureRequest(),
          'o1',
          csvFile([
            'Basmati Rice,Dry Goods,RICE-002,Kilogram,10,100,85.50',
            'Bad Item,Nonexistent Category,RICE-003,Kilogram,10,100,85.50',
          ]),
        ),
      ).rejects.toMatchObject({
        response: { errors: [{ row: 2, error: expect.stringContaining('Nonexistent Category') }] },
      });
      expect(itemRepository.create).not.toHaveBeenCalled();
    });

    it('AC: rejects the whole batch when a row\'s SKU already exists, without creating any row', async () => {
      const { service, itemRepository } = buildService();
      (itemRepository.findBySku as jest.Mock).mockResolvedValue(fixtureItem());
      await expect(
        service.bulkImport(fixtureRequest(), 'o1', csvFile(['Basmati Rice,Dry Goods,RICE-002,Kilogram,10,100,85.50'])),
      ).rejects.toMatchObject({ response: { errors: [{ row: 1, error: expect.stringContaining('already exists') }] } });
      expect(itemRepository.create).not.toHaveBeenCalled();
    });

    it('rejects a file with no usable header row with a clear error', async () => {
      const { service } = buildService();
      await expect(
        service.bulkImport(fixtureRequest(), 'o1', {
          buffer: Buffer.from('junk,data\n1,2', 'utf8'),
          originalName: 'items.csv',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects bulk import for a role not permitted to mutate items', async () => {
      const { service } = buildService();
      await expect(
        service.bulkImport(
          fixtureRequest('STORE_STAFF'),
          'o1',
          csvFile(['Basmati Rice,Dry Goods,RICE-002,Kilogram,10,100,85.50']),
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
