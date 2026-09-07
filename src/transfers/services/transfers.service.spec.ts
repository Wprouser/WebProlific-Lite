import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { TransferRepository } from '../repositories/transfer.repository';
import { StockTransfer, TransferLine } from '../domain/transfer.entity';
import { OutletRepository } from '../../tenancy/repositories/outlet.repository';
import { Outlet } from '../../tenancy/domain/outlet.entity';
import { ItemRepository } from '../../items/repositories/item.repository';
import { Item } from '../../items/domain/item.entity';
import { UnitOfMeasureRepository } from '../../items/repositories/unit-of-measure.repository';
import { UnitOfMeasure } from '../../items/domain/unit-of-measure.entity';
import { StockTransactionsService } from '../../stock-transactions/services/stock-transactions.service';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { Role } from '../../tenancy/constants/enums';

const SOURCE = 'source-outlet';
const DEST = 'dest-outlet';
const OTHER_PROPERTY_DEST = 'other-property-dest';

function requestWithRoles(roles: Partial<Record<string, Role | undefined>>): RequestWithAccess {
  return {
    user: { id: 'u1' },
    effectiveAccess: {
      effectiveOutletIds: Object.keys(roles).filter((id) => roles[id]),
      roleForOutlet: (outletId: string) => roles[outletId],
    },
  } as unknown as RequestWithAccess;
}

function fixtureOutlet(overrides: Partial<Outlet> = {}): Outlet {
  return {
    id: SOURCE,
    propertyId: 'prop-1',
    chainId: 'chain-1',
    name: 'Main Restaurant',
    type: 'RESTAURANT',
    baseCurrency: 'SAR',
    poApprovalThreshold: null,
    isActive: true,
    ...overrides,
  };
}

function fixtureItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'source-item',
    outletId: SOURCE,
    name: 'Basmati Rice',
    categoryId: 'c1',
    sku: 'RICE-001',
    barcode: null,
    unitId: 'kg-source',
    minStock: '10.000',
    maxStock: '100.000',
    currentStock: '50.000',
    shelfLifeDays: null,
    costPrice: '8.50',
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

function fixtureUnit(overrides: Partial<UnitOfMeasure> = {}): UnitOfMeasure {
  return {
    id: 'kg-source',
    outletId: SOURCE,
    name: 'Kilogram',
    abbreviation: 'kg',
    baseUnitId: null,
    conversionFactor: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function fixtureLine(overrides: Partial<TransferLine> = {}): TransferLine {
  return {
    id: 'line-1',
    transferId: 't1',
    itemId: 'source-item',
    destItemId: 'dest-item',
    quantity: '5.000',
    actualReceivedQty: null,
    varianceFlagged: false,
    ...overrides,
  };
}

function fixtureTransfer(overrides: Partial<StockTransfer> = {}): StockTransfer {
  return {
    id: 't1',
    sourceOutletId: SOURCE,
    destOutletId: DEST,
    status: 'REQUESTED',
    requestedById: 'u1',
    dispatchedById: null,
    receivedById: null,
    lines: [fixtureLine()],
    createdAt: new Date(),
    dispatchedAt: null,
    receivedAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

describe('TransfersService', () => {
  function build(options: {
    outlets?: Record<string, Outlet>;
    items?: Record<string, Item>;
    units?: Record<string, UnitOfMeasure>;
    destCandidates?: Item[];
    transfer?: StockTransfer | null;
  } = {}) {
    const outlets =
      options.outlets ??
      {
        [SOURCE]: fixtureOutlet({ id: SOURCE, propertyId: 'prop-1' }),
        [DEST]: fixtureOutlet({ id: DEST, propertyId: 'prop-1', name: 'Downtown Branch' }),
        [OTHER_PROPERTY_DEST]: fixtureOutlet({ id: OTHER_PROPERTY_DEST, propertyId: 'prop-2', name: 'Other City' }),
      };
    const destItem = fixtureItem({ id: 'dest-item', outletId: DEST, name: 'Basmati Rice', unitId: 'kg-dest' });
    const items =
      options.items ?? { 'source-item': fixtureItem(), 'dest-item': destItem };
    const units =
      options.units ?? {
        'kg-source': fixtureUnit({ id: 'kg-source', outletId: SOURCE }),
        'kg-dest': fixtureUnit({ id: 'kg-dest', outletId: DEST }),
      };
    const destCandidates = options.destCandidates ?? [destItem];
    const transfer = options.transfer === undefined ? fixtureTransfer() : options.transfer;

    const transferRepository: Partial<TransferRepository> = {
      create: jest.fn().mockImplementation(async (input) =>
        fixtureTransfer({
          sourceOutletId: input.sourceOutletId,
          destOutletId: input.destOutletId,
          requestedById: input.requestedById,
          lines: input.lines.map((line: { itemId: string; destItemId: string; quantity: string }, i: number) =>
            fixtureLine({ id: `line-${i + 1}`, itemId: line.itemId, destItemId: line.destItemId, quantity: line.quantity }),
          ),
        }),
      ),
      findById: jest.fn().mockResolvedValue(transfer),
      findDetailById: jest.fn().mockResolvedValue(null),
      findScoped: jest.fn().mockResolvedValue([]),
      markDispatched: jest.fn().mockImplementation(async (id, dispatchedById) =>
        fixtureTransfer({ id, status: 'IN_TRANSIT', dispatchedById, dispatchedAt: new Date() }),
      ),
      markCancelled: jest.fn().mockImplementation(async (id) =>
        fixtureTransfer({ id, status: 'CANCELLED', cancelledAt: new Date() }),
      ),
      markReceived: jest.fn().mockImplementation(async (id, receivedById) =>
        fixtureTransfer({ id, status: 'RECEIVED', receivedById, receivedAt: new Date() }),
      ),
    };

    const outletRepository: Partial<OutletRepository> = {
      findById: jest.fn().mockImplementation(async (id: string) => outlets[id] ?? null),
    };
    const itemRepository: Partial<ItemRepository> = {
      findById: jest.fn().mockImplementation(async (id: string) => items[id] ?? null),
      findScoped: jest.fn().mockResolvedValue(destCandidates),
    };
    const unitRepository: Partial<UnitOfMeasureRepository> = {
      findById: jest.fn().mockImplementation(async (id: string) => units[id] ?? null),
    };
    const stockTransactionsService = {
      create: jest.fn().mockResolvedValue({ id: 'st1', balanceAfter: '0' }),
    } as unknown as StockTransactionsService;

    const service = new TransfersService(
      transferRepository as TransferRepository,
      outletRepository as OutletRepository,
      itemRepository as ItemRepository,
      unitRepository as UnitOfMeasureRepository,
      stockTransactionsService,
    );

    return { service, transferRepository, outletRepository, itemRepository, unitRepository, stockTransactionsService };
  }

  const createDto = {
    sourceOutletId: SOURCE,
    destOutletId: DEST,
    lines: [{ itemId: 'source-item', quantity: '5.000' }],
  };

  // ------------------------------------------------------------------ create

  it('creates a transfer, auto-resolving destItemId by fuzzy name match', async () => {
    const { service, transferRepository } = build();
    const transfer = await service.create(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), createDto);

    expect(transferRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceOutletId: SOURCE,
        destOutletId: DEST,
        lines: [{ itemId: 'source-item', destItemId: 'dest-item', quantity: '5.000' }],
      }),
    );
    expect(transfer.lines[0].destItemId).toBe('dest-item');
  });

  it('accepts an explicit destItemId, overriding auto-resolution', async () => {
    const { service, itemRepository, transferRepository } = build({
      items: {
        'source-item': fixtureItem(),
        'dest-item': fixtureItem({ id: 'dest-item', outletId: DEST, unitId: 'kg-dest' }),
        'dest-item-2': fixtureItem({ id: 'dest-item-2', outletId: DEST, name: 'Jasmine Rice', unitId: 'kg-dest' }),
      },
    });
    void itemRepository;

    await service.create(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), {
      ...createDto,
      lines: [{ itemId: 'source-item', quantity: '5.000', destItemId: 'dest-item-2' }],
    });

    expect(transferRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [{ itemId: 'source-item', destItemId: 'dest-item-2', quantity: '5.000' }],
      }),
    );
  });

  it('AC: STORE_STAFF cannot create a transfer', async () => {
    const { service } = build();
    await expect(
      service.create(requestWithRoles({ [SOURCE]: 'STORE_STAFF' }), createDto),
    ).rejects.toThrow(ForbiddenException);
  });

  it('AC: CHEF cannot create a transfer', async () => {
    const { service } = build();
    await expect(service.create(requestWithRoles({ [SOURCE]: 'CHEF' }), createDto)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects a requester with no access to the source outlet at all', async () => {
    const { service } = build();
    await expect(service.create(requestWithRoles({}), createDto)).rejects.toThrow(ForbiddenException);
  });

  it('rejects source and destination being the same outlet', async () => {
    const { service } = build();
    await expect(
      service.create(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), {
        ...createDto,
        destOutletId: SOURCE,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects zero or negative quantity', async () => {
    const { service } = build();
    await expect(
      service.create(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), {
        ...createDto,
        lines: [{ itemId: 'source-item', quantity: '0.000' }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a line whose item does not belong to the source outlet', async () => {
    const { service } = build({
      items: { 'source-item': fixtureItem({ outletId: 'some-other-outlet' }), 'dest-item': fixtureItem({ id: 'dest-item', outletId: DEST }) },
    });
    await expect(
      service.create(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), createDto),
    ).rejects.toThrow(/does not belong to the source outlet/);
  });

  it('AC (gap-fill): rejects a line whose destination item cannot be resolved, naming it', async () => {
    const { service } = build({ destCandidates: [] });
    await expect(
      service.create(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), createDto),
    ).rejects.toThrow(/Basmati Rice.*no matching item at the destination outlet/);
  });

  it('rejects an explicit destItemId belonging to a different outlet', async () => {
    const { service } = build({
      items: {
        'source-item': fixtureItem(),
        'dest-item': fixtureItem({ id: 'dest-item', outletId: DEST }),
        'wrong-outlet-item': fixtureItem({ id: 'wrong-outlet-item', outletId: 'yet-another-outlet' }),
      },
    });
    await expect(
      service.create(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), {
        ...createDto,
        lines: [{ itemId: 'source-item', quantity: '5.000', destItemId: 'wrong-outlet-item' }],
      }),
    ).rejects.toThrow(/does not belong to the destination outlet/);
  });

  it('AC (gap-fill): rejects a line whose source and destination items use different units', async () => {
    const { service } = build({
      units: {
        'kg-source': fixtureUnit({ id: 'kg-source', outletId: SOURCE, abbreviation: 'kg' }),
        'kg-dest': fixtureUnit({ id: 'kg-dest', outletId: DEST, abbreviation: 'L' }),
      },
    });
    await expect(
      service.create(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), createDto),
    ).rejects.toThrow(/use different units/);
  });

  // ----------------------------------------------------- cross-property gate

  it('AC: allows a same-property transfer for an OUTLET_MANAGER with no explicit destination access', async () => {
    const { service } = build();
    await expect(
      service.create(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), createDto),
    ).resolves.toBeDefined();
  });

  it('AC: blocks a cross-property transfer for a plain OUTLET_MANAGER', async () => {
    const { service } = build({
      items: {
        'source-item': fixtureItem(),
        'dest-item': fixtureItem({ id: 'dest-item', outletId: OTHER_PROPERTY_DEST, unitId: 'kg-dest' }),
      },
    });
    await expect(
      service.create(
        requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER', [OTHER_PROPERTY_DEST]: 'OUTLET_MANAGER' }),
        { ...createDto, destOutletId: OTHER_PROPERTY_DEST },
      ),
    ).rejects.toThrow(/insufficient access to destination outlet/i);
  });

  it('AC: blocks a cross-property transfer when the requester has no access to the destination at all', async () => {
    const { service } = build();
    await expect(
      service.create(requestWithRoles({ [SOURCE]: 'PROPERTY_MANAGER' }), {
        ...createDto,
        destOutletId: OTHER_PROPERTY_DEST,
      }),
    ).rejects.toThrow(/insufficient access to destination outlet/i);
  });

  it('AC: allows a cross-property transfer for a PROPERTY_MANAGER-or-higher role spanning both outlets', async () => {
    const destItem = fixtureItem({ id: 'dest-item', outletId: OTHER_PROPERTY_DEST, unitId: 'kg-dest' });
    const { service } = build({
      items: { 'source-item': fixtureItem(), 'dest-item': destItem },
      destCandidates: [destItem],
    });
    await expect(
      service.create(
        requestWithRoles({ [SOURCE]: 'PROPERTY_MANAGER', [OTHER_PROPERTY_DEST]: 'PROPERTY_MANAGER' }),
        { ...createDto, destOutletId: OTHER_PROPERTY_DEST },
      ),
    ).resolves.toBeDefined();
  });

  it('a CHAIN_OWNER can cross properties', async () => {
    const destItem = fixtureItem({ id: 'dest-item', outletId: OTHER_PROPERTY_DEST, unitId: 'kg-dest' });
    const { service } = build({
      items: { 'source-item': fixtureItem(), 'dest-item': destItem },
      destCandidates: [destItem],
    });
    await expect(
      service.create(
        requestWithRoles({ [SOURCE]: 'CHAIN_OWNER', [OTHER_PROPERTY_DEST]: 'CHAIN_OWNER' }),
        { ...createDto, destOutletId: OTHER_PROPERTY_DEST },
      ),
    ).resolves.toBeDefined();
  });

  // --------------------------------------------------------------- dispatch

  it('AC: dispatching decrements source stock via an independent, auditable TRANSFER_OUT', async () => {
    const { service, stockTransactionsService, transferRepository } = build();
    const transfer = await service.dispatch(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), 't1');

    expect(stockTransactionsService.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        itemId: 'source-item',
        type: 'TRANSFER_OUT',
        quantity: '5.000',
        referenceType: 'TRANSFER',
        referenceId: 't1',
      }),
    );
    expect(transferRepository.markDispatched).toHaveBeenCalledWith('t1', 'u1', expect.any(Date));
    expect(transfer.status).toBe('IN_TRANSIT');
  });

  it('rejects dispatch when source stock is insufficient, before moving anything', async () => {
    const { service, stockTransactionsService } = build({
      items: { 'source-item': fixtureItem({ currentStock: '2.000' }), 'dest-item': fixtureItem({ id: 'dest-item', outletId: DEST }) },
    });
    await expect(
      service.dispatch(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), 't1'),
    ).rejects.toThrow(/Insufficient stock/);
    expect(stockTransactionsService.create).not.toHaveBeenCalled();
  });

  it('rejects dispatching a transfer that is not REQUESTED', async () => {
    const { service } = build({ transfer: fixtureTransfer({ status: 'IN_TRANSIT' }) });
    await expect(
      service.dispatch(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), 't1'),
    ).rejects.toThrow(ConflictException);
  });

  it('requires manager-tier access at the source outlet to dispatch', async () => {
    const { service } = build();
    await expect(
      service.dispatch(requestWithRoles({ [SOURCE]: 'STORE_STAFF' }), 't1'),
    ).rejects.toThrow(ForbiddenException);
  });

  // ---------------------------------------------------------------- receive

  const receiveDto = { lines: [{ transferLineId: 'line-1', actualReceivedQty: '5.000' }] };

  it('AC: receiving increments destination stock via an independent, auditable TRANSFER_IN', async () => {
    const { service, stockTransactionsService, transferRepository } = build({
      transfer: fixtureTransfer({ status: 'IN_TRANSIT' }),
    });
    const transfer = await service.receive(requestWithRoles({ [DEST]: 'OUTLET_MANAGER' }), 't1', receiveDto);

    expect(stockTransactionsService.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        itemId: 'dest-item',
        type: 'TRANSFER_IN',
        quantity: '5.000',
        referenceType: 'TRANSFER',
        referenceId: 't1',
      }),
    );
    expect(transferRepository.markReceived).toHaveBeenCalledWith(
      't1',
      'u1',
      expect.any(Date),
      [{ transferLineId: 'line-1', actualReceivedQty: '5.000', varianceFlagged: false }],
    );
    expect(transfer.status).toBe('RECEIVED');
  });

  it('AC: flags variance beyond tolerance between dispatched and actually-received quantity', async () => {
    const { service, transferRepository } = build({ transfer: fixtureTransfer({ status: 'IN_TRANSIT' }) });
    await service.receive(requestWithRoles({ [DEST]: 'OUTLET_MANAGER' }), 't1', {
      lines: [{ transferLineId: 'line-1', actualReceivedQty: '4.000' }], // 20% short, dispatched 5.000
    });
    expect(transferRepository.markReceived).toHaveBeenCalledWith(
      't1',
      'u1',
      expect.any(Date),
      [expect.objectContaining({ varianceFlagged: true })],
    );
  });

  it('does not flag variance within tolerance', async () => {
    const { service, transferRepository } = build({ transfer: fixtureTransfer({ status: 'IN_TRANSIT' }) });
    await service.receive(requestWithRoles({ [DEST]: 'OUTLET_MANAGER' }), 't1', {
      lines: [{ transferLineId: 'line-1', actualReceivedQty: '4.700' }], // 6% short
    });
    expect(transferRepository.markReceived).toHaveBeenCalledWith(
      't1',
      'u1',
      expect.any(Date),
      [expect.objectContaining({ varianceFlagged: false })],
    );
  });

  it('AC (gap-fill): a fully damaged line skips the stock transaction but is still recorded received', async () => {
    const { service, stockTransactionsService, transferRepository } = build({
      transfer: fixtureTransfer({ status: 'IN_TRANSIT' }),
    });
    await service.receive(requestWithRoles({ [DEST]: 'OUTLET_MANAGER' }), 't1', {
      lines: [{ transferLineId: 'line-1', actualReceivedQty: '0.000' }],
    });
    expect(stockTransactionsService.create).not.toHaveBeenCalled();
    expect(transferRepository.markReceived).toHaveBeenCalledWith(
      't1',
      'u1',
      expect.any(Date),
      [expect.objectContaining({ actualReceivedQty: '0.000', varianceFlagged: true })],
    );
  });

  it('rejects a negative actualReceivedQty', async () => {
    const { service } = build({ transfer: fixtureTransfer({ status: 'IN_TRANSIT' }) });
    await expect(
      service.receive(requestWithRoles({ [DEST]: 'OUTLET_MANAGER' }), 't1', {
        lines: [{ transferLineId: 'line-1', actualReceivedQty: '-1.000' }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a receive payload missing a line the transfer actually has', async () => {
    const { service } = build({
      transfer: fixtureTransfer({
        status: 'IN_TRANSIT',
        lines: [fixtureLine({ id: 'line-1' }), fixtureLine({ id: 'line-2' })],
      }),
    });
    await expect(
      service.receive(requestWithRoles({ [DEST]: 'OUTLET_MANAGER' }), 't1', receiveDto),
    ).rejects.toThrow(/must match this transfer.s lines exactly/);
  });

  it('rejects a receive payload with an extra line the transfer does not have', async () => {
    const { service } = build({ transfer: fixtureTransfer({ status: 'IN_TRANSIT' }) });
    await expect(
      service.receive(requestWithRoles({ [DEST]: 'OUTLET_MANAGER' }), 't1', {
        lines: [
          { transferLineId: 'line-1', actualReceivedQty: '5.000' },
          { transferLineId: 'line-does-not-exist', actualReceivedQty: '1.000' },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects receiving a transfer that is not IN_TRANSIT', async () => {
    const { service } = build({ transfer: fixtureTransfer({ status: 'REQUESTED' }) });
    await expect(
      service.receive(requestWithRoles({ [DEST]: 'OUTLET_MANAGER' }), 't1', receiveDto),
    ).rejects.toThrow(ConflictException);
  });

  it('requires manager-tier access at the destination outlet to receive', async () => {
    const { service } = build({ transfer: fixtureTransfer({ status: 'IN_TRANSIT' }) });
    await expect(
      service.receive(requestWithRoles({ [DEST]: 'CHEF' }), 't1', receiveDto),
    ).rejects.toThrow(ForbiddenException);
  });

  // ----------------------------------------------------------------- cancel

  it('cancels a REQUESTED transfer', async () => {
    const { service, transferRepository } = build();
    const transfer = await service.cancel(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), 't1');
    expect(transferRepository.markCancelled).toHaveBeenCalledWith('t1', expect.any(Date));
    expect(transfer.status).toBe('CANCELLED');
  });

  it('refuses to cancel a transfer that has already been dispatched', async () => {
    const { service } = build({ transfer: fixtureTransfer({ status: 'IN_TRANSIT' }) });
    await expect(
      service.cancel(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), 't1'),
    ).rejects.toThrow(/already dispatched|IN_TRANSIT/);
  });

  // ------------------------------------------------------------------ reads

  it('findDetail allows a caller with access to either outlet', async () => {
    const { service, transferRepository } = build();
    (transferRepository.findDetailById as jest.Mock).mockResolvedValue({ id: 't1' });
    await expect(
      service.findDetail(requestWithRoles({ [DEST]: 'STORE_STAFF' }), 't1'),
    ).resolves.toEqual({ id: 't1' });
  });

  it('findDetail refuses a caller with access to neither outlet', async () => {
    const { service } = build();
    await expect(service.findDetail(requestWithRoles({}), 't1')).rejects.toThrow(ForbiddenException);
  });

  it('list scopes by the caller’s effectiveOutletIds', async () => {
    const { service, transferRepository } = build();
    await service.list(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), {});
    expect(transferRepository.findScoped).toHaveBeenCalledWith(
      expect.objectContaining({ accessibleOutletIds: [SOURCE] }),
    );
  });

  it('throws NotFoundException for a transfer that does not exist', async () => {
    const { service, transferRepository } = build();
    (transferRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(
      service.dispatch(requestWithRoles({ [SOURCE]: 'OUTLET_MANAGER' }), 'missing'),
    ).rejects.toThrow(NotFoundException);
  });
});
