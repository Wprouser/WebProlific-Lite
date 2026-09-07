import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { assertChainAccess, assertOutletAccess, assertPropertyAccess } from '../../tenancy/access.util';
import { CHAIN_REPOSITORY, OUTLET_REPOSITORY, PROPERTY_REPOSITORY } from '../../tenancy/repositories/tokens';
import { ChainRepository } from '../../tenancy/repositories/chain.repository';
import { PropertyRepository } from '../../tenancy/repositories/property.repository';
import { OutletRepository } from '../../tenancy/repositories/outlet.repository';
import { Outlet } from '../../tenancy/domain/outlet.entity';
import { ITEM_REPOSITORY } from '../../items/repositories/tokens';
import { ItemRepository } from '../../items/repositories/item.repository';
import { ALERT_REPOSITORY } from '../../alerts/repositories/tokens';
import { AlertRepository } from '../../alerts/repositories/alert.repository';
import { TRANSFER_REPOSITORY } from '../../transfers/repositories/tokens';
import { TransferRepository } from '../../transfers/repositories/transfer.repository';
import { ExchangeRatesService } from '../../exchange-rates/services/exchange-rates.service';
import { DASHBOARD_CHAIN_ROLES, DASHBOARD_OUTLET_ROLES, DASHBOARD_PROPERTY_ROLES } from '../constants/enums';
import { ChainDashboard, DashboardMetrics, OutletDashboard, PropertyDashboard } from '../domain/dashboard.entity';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(CHAIN_REPOSITORY) private readonly chainRepository: ChainRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepository: PropertyRepository,
    @Inject(OUTLET_REPOSITORY) private readonly outletRepository: OutletRepository,
    @Inject(ITEM_REPOSITORY) private readonly itemRepository: ItemRepository,
    @Inject(ALERT_REPOSITORY) private readonly alertRepository: AlertRepository,
    @Inject(TRANSFER_REPOSITORY) private readonly transferRepository: TransferRepository,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async getOutletDashboard(request: RequestWithAccess, outletId: string): Promise<OutletDashboard> {
    assertOutletAccess(request, outletId, [...DASHBOARD_OUTLET_ROLES]);
    const [outlet] = await this.outletRepository.findByIds([outletId]);
    if (!outlet) throw new NotFoundException(`Outlet ${outletId} not found`);

    const metrics = await this.aggregate([outlet], outlet.baseCurrency);
    return { outletId: outlet.id, outletName: outlet.name, ...metrics };
  }

  async getPropertyDashboard(request: RequestWithAccess, propertyId: string): Promise<PropertyDashboard> {
    assertPropertyAccess(request, propertyId, [...DASHBOARD_PROPERTY_ROLES]);
    const property = await this.propertyRepository.findById(propertyId);
    if (!property) throw new NotFoundException(`Property ${propertyId} not found`);
    const chain = await this.chainRepository.findById(property.chainId);
    if (!chain) throw new NotFoundException(`Chain ${property.chainId} not found`);

    const outlets = await this.outletRepository.findByIds(property.outlets.map((o) => o.id));
    const metrics = await this.aggregate(outlets, chain.baseCurrency);
    return { propertyId: property.id, propertyName: property.name, outletCount: outlets.length, ...metrics };
  }

  async getChainDashboard(request: RequestWithAccess, chainId: string): Promise<ChainDashboard> {
    assertChainAccess(request, chainId, [...DASHBOARD_CHAIN_ROLES]);
    const chain = await this.chainRepository.findById(chainId);
    if (!chain) throw new NotFoundException(`Chain ${chainId} not found`);

    const [propertyIds, outletIds] = await Promise.all([
      this.propertyRepository.findIdsByChainId(chainId),
      this.outletRepository.findIdsByChainId(chainId),
    ]);
    const outlets = await this.outletRepository.findByIds(outletIds);
    const metrics = await this.aggregate(outlets, chain.baseCurrency);
    return {
      chainId: chain.id,
      chainName: chain.name,
      propertyCount: propertyIds.length,
      outletCount: outlets.length,
      ...metrics,
    };
  }

  /**
   * Aggregates the five approved metrics across an arbitrary outlet set,
   * converting each outlet's own-currency stock valuation to
   * `reportingCurrency` (FR-16's "group reporting currency" — a no-op for
   * a single-outlet dashboard, since that always passes its own currency).
   * Deliberately includes every outlet regardless of `isActive` — the spec
   * says "aggregated across all outlets in a property", and including all
   * of them, consistently, is what keeps the reconciliation acceptance
   * criterion (property = sum of its outlets) trivially true.
   */
  private async aggregate(outlets: Outlet[], reportingCurrency: string): Promise<DashboardMetrics> {
    const outletIds = outlets.map((o) => o.id);
    const [stockSummaries, alertSummary, transfersInTransit] = await Promise.all([
      this.itemRepository.summarizeStock(outletIds),
      this.alertRepository.summarize(outletIds),
      this.transferRepository.countInTransitFromOutlets(outletIds),
    ]);
    const summaryByOutlet = new Map(stockSummaries.map((s) => [s.outletId, s]));

    const perOutlet = await Promise.all(
      outlets.map(async (outlet) => {
        const summary = summaryByOutlet.get(outlet.id);
        const rate = await this.exchangeRatesService.resolveRate(outlet.baseCurrency, reportingCurrency);
        return {
          activeItemCount: summary?.activeItemCount ?? 0,
          convertedValuation: new Prisma.Decimal(summary?.stockValuation ?? '0').mul(rate),
          isConverted: outlet.baseCurrency !== reportingCurrency,
        };
      }),
    );

    return {
      activeItemCount: perOutlet.reduce((sum, o) => sum + o.activeItemCount, 0),
      stockValuation: perOutlet
        .reduce((sum, o) => sum.plus(o.convertedValuation), new Prisma.Decimal(0))
        .toFixed(2),
      currency: reportingCurrency,
      isConverted: perOutlet.some((o) => o.isConverted),
      openLowStockAlerts: alertSummary.lowStock,
      pendingPoApprovals: alertSummary.poApprovals,
      transfersInTransit,
    };
  }
}
