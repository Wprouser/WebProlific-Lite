import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ChainRepository } from '../../tenancy/repositories/chain.repository';
import { PropertyRepository } from '../../tenancy/repositories/property.repository';
import { OutletRepository } from '../../tenancy/repositories/outlet.repository';
import { Outlet } from '../../tenancy/domain/outlet.entity';
import { ItemRepository, OutletStockSummary } from '../../items/repositories/item.repository';
import { AlertRepository } from '../../alerts/repositories/alert.repository';
import { AlertSummary } from '../../alerts/domain/alert.entity';
import { TransferRepository } from '../../transfers/repositories/transfer.repository';
import { ExchangeRatesService } from '../../exchange-rates/services/exchange-rates.service';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { Role } from '../../tenancy/constants/enums';

function fixtureRequest(overrides: {
  roleForOutlet?: Role;
  roleForProperty?: Role;
  roleForChain?: Role;
} = {}): RequestWithAccess {
  return {
    user: { id: 'u1' },
    effectiveAccess: {
      roleForOutlet: () => overrides.roleForOutlet,
      roleForProperty: () => overrides.roleForProperty,
      roleForChain: () => overrides.roleForChain,
    },
  } as unknown as RequestWithAccess;
}

function fixtureOutlet(overrides: Partial<Outlet> = {}): Outlet {
  return {
    id: 'o1',
    propertyId: 'p1',
    chainId: 'c1',
    name: 'Main Restaurant',
    type: 'RESTAURANT',
    baseCurrency: 'SAR',
    poApprovalThreshold: null,
    isActive: true,
    ...overrides,
  };
}

const emptyAlertSummary: AlertSummary = { lowStock: 0, expiry: 0, unacknowledged: 0, poApprovals: 0, grnVariance: 0 };

describe('DashboardService', () => {
  function buildService() {
    const chainRepository: Partial<ChainRepository> = {
      findById: jest.fn().mockResolvedValue({ id: 'c1', name: 'Al-Fahad Group', baseCurrency: 'SAR' }),
    };
    const propertyRepository: Partial<PropertyRepository> = {
      findById: jest.fn().mockResolvedValue({
        id: 'p1',
        chainId: 'c1',
        name: 'Jeddah Hotel',
        outlets: [{ id: 'o1', name: 'Main Restaurant', type: 'RESTAURANT', isActive: true }],
      }),
      findIdsByChainId: jest.fn().mockResolvedValue(['p1']),
    };
    const outletRepository: Partial<OutletRepository> = {
      findByIds: jest.fn().mockImplementation((ids: string[]) => Promise.resolve(ids.map((id) => fixtureOutlet({ id })))),
      findIdsByChainId: jest.fn().mockResolvedValue(['o1']),
    };
    const itemRepository: Partial<ItemRepository> = {
      summarizeStock: jest
        .fn()
        .mockImplementation((ids: string[]): Promise<OutletStockSummary[]> =>
          Promise.resolve(ids.map((outletId) => ({ outletId, activeItemCount: 5, stockValuation: '1000.00' }))),
        ),
    };
    const alertRepository: Partial<AlertRepository> = {
      summarize: jest.fn().mockResolvedValue({ ...emptyAlertSummary, lowStock: 2, poApprovals: 1 }),
    };
    const transferRepository: Partial<TransferRepository> = {
      countInTransitFromOutlets: jest.fn().mockResolvedValue(3),
    };
    const exchangeRatesService: Partial<ExchangeRatesService> = {
      resolveRate: jest.fn().mockResolvedValue('1'),
    };

    const service = new DashboardService(
      chainRepository as ChainRepository,
      propertyRepository as PropertyRepository,
      outletRepository as OutletRepository,
      itemRepository as ItemRepository,
      alertRepository as AlertRepository,
      transferRepository as TransferRepository,
      exchangeRatesService as ExchangeRatesService,
    );

    return {
      service,
      chainRepository,
      propertyRepository,
      outletRepository,
      itemRepository,
      alertRepository,
      transferRepository,
      exchangeRatesService,
    };
  }

  describe('getOutletDashboard', () => {
    it('AC: OUTLET_MANAGER, PROPERTY_MANAGER and CHAIN_OWNER can view their own outlet', async () => {
      const { service } = buildService();
      for (const role of ['OUTLET_MANAGER', 'PROPERTY_MANAGER', 'CHAIN_OWNER'] as Role[]) {
        await expect(service.getOutletDashboard(fixtureRequest({ roleForOutlet: role }), 'o1')).resolves.toBeDefined();
      }
    });

    it('AC: STORE_STAFF and CHEF cannot view the dashboard (View financial reports, FR-11)', async () => {
      const { service } = buildService();
      for (const role of ['STORE_STAFF', 'CHEF'] as Role[]) {
        await expect(service.getOutletDashboard(fixtureRequest({ roleForOutlet: role }), 'o1')).rejects.toThrow(
          ForbiddenException,
        );
      }
    });

    it('rejects a caller with no access to the outlet at all', async () => {
      const { service } = buildService();
      await expect(service.getOutletDashboard(fixtureRequest(), 'o1')).rejects.toThrow(ForbiddenException);
    });

    it('assembles the five approved metrics for a single outlet', async () => {
      const { service } = buildService();
      const dashboard = await service.getOutletDashboard(fixtureRequest({ roleForOutlet: 'OUTLET_MANAGER' }), 'o1');
      expect(dashboard).toEqual({
        outletId: 'o1',
        outletName: 'Main Restaurant',
        activeItemCount: 5,
        stockValuation: '1000.00',
        currency: 'SAR',
        isConverted: false,
        openLowStockAlerts: 2,
        pendingPoApprovals: 1,
        transfersInTransit: 3,
      });
    });

    it('404s for an outlet that does not exist', async () => {
      const { service, outletRepository } = buildService();
      (outletRepository.findByIds as jest.Mock).mockResolvedValue([]);
      await expect(
        service.getOutletDashboard(fixtureRequest({ roleForOutlet: 'OUTLET_MANAGER' }), 'ghost'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPropertyDashboard', () => {
    it('AC: PROPERTY_MANAGER and CHAIN_OWNER can view; OUTLET_MANAGER cannot', async () => {
      const { service } = buildService();
      await expect(
        service.getPropertyDashboard(fixtureRequest({ roleForProperty: 'PROPERTY_MANAGER' }), 'p1'),
      ).resolves.toBeDefined();
      await expect(
        service.getPropertyDashboard(fixtureRequest({ roleForProperty: 'OUTLET_MANAGER' }), 'p1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('reports in the owning chain\'s baseCurrency and includes the outlet breakdown count', async () => {
      const { service } = buildService();
      const dashboard = await service.getPropertyDashboard(
        fixtureRequest({ roleForProperty: 'PROPERTY_MANAGER' }),
        'p1',
      );
      expect(dashboard.propertyId).toBe('p1');
      expect(dashboard.propertyName).toBe('Jeddah Hotel');
      expect(dashboard.currency).toBe('SAR');
      expect(dashboard.outletCount).toBe(1);
    });

    it('AC: marks isConverted when a member outlet\'s currency differs from the reporting currency', async () => {
      const { service, outletRepository } = buildService();
      (outletRepository.findByIds as jest.Mock).mockResolvedValue([fixtureOutlet({ id: 'o1', baseCurrency: 'AED' })]);
      const dashboard = await service.getPropertyDashboard(
        fixtureRequest({ roleForProperty: 'CHAIN_OWNER' }),
        'p1',
      );
      expect(dashboard.isConverted).toBe(true);
    });

    it('404s for a property that does not exist', async () => {
      const { service, propertyRepository } = buildService();
      (propertyRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        service.getPropertyDashboard(fixtureRequest({ roleForProperty: 'PROPERTY_MANAGER' }), 'ghost'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getChainDashboard', () => {
    it('AC: only CHAIN_OWNER can view the chain-wide dashboard', async () => {
      const { service } = buildService();
      await expect(service.getChainDashboard(fixtureRequest({ roleForChain: 'CHAIN_OWNER' }), 'c1')).resolves.toBeDefined();
      await expect(
        service.getChainDashboard(fixtureRequest({ roleForChain: 'PROPERTY_MANAGER' }), 'c1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('includes property and outlet counts, reported in the chain\'s own currency', async () => {
      const { service } = buildService();
      const dashboard = await service.getChainDashboard(fixtureRequest({ roleForChain: 'CHAIN_OWNER' }), 'c1');
      expect(dashboard).toEqual(
        expect.objectContaining({ chainId: 'c1', chainName: 'Al-Fahad Group', propertyCount: 1, outletCount: 1, currency: 'SAR' }),
      );
    });

    it('404s for a chain that does not exist', async () => {
      const { service, chainRepository } = buildService();
      (chainRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(service.getChainDashboard(fixtureRequest({ roleForChain: 'CHAIN_OWNER' }), 'ghost')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('FX conversion', () => {
    it('converts each outlet\'s stock valuation via ExchangeRatesService before summing', async () => {
      const { service, outletRepository, itemRepository, exchangeRatesService } = buildService();
      (outletRepository.findByIds as jest.Mock).mockResolvedValue([
        fixtureOutlet({ id: 'o1', baseCurrency: 'AED' }),
        fixtureOutlet({ id: 'o2', baseCurrency: 'SAR' }),
      ]);
      (itemRepository.summarizeStock as jest.Mock).mockResolvedValue([
        { outletId: 'o1', activeItemCount: 2, stockValuation: '100.00' },
        { outletId: 'o2', activeItemCount: 3, stockValuation: '200.00' },
      ]);
      (exchangeRatesService.resolveRate as jest.Mock).mockImplementation((from: string, to: string) =>
        Promise.resolve(from === 'AED' && to === 'SAR' ? '1.02' : '1'),
      );

      const dashboard = await service.getChainDashboard(fixtureRequest({ roleForChain: 'CHAIN_OWNER' }), 'c1');

      // o1: 100.00 * 1.02 = 102.00; o2: 200.00 * 1 = 200.00; total 302.00
      expect(dashboard.stockValuation).toBe('302.00');
      expect(dashboard.activeItemCount).toBe(5);
      expect(dashboard.isConverted).toBe(true);
    });
  });
});
