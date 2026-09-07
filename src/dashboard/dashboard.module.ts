import { Module } from '@nestjs/common';
import { RbacModule } from '../rbac/rbac.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { ItemsModule } from '../items/items.module';
import { AlertsModule } from '../alerts/alerts.module';
import { TransfersModule } from '../transfers/transfers.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';

/**
 * FR-08's consolidated dashboard. Imports rather than reimplements:
 * - TenancyModule for CHAIN_REPOSITORY/PROPERTY_REPOSITORY/OUTLET_REPOSITORY
 *   — resolving each scope level's own outlet set and reporting currency.
 * - ItemsModule for ITEM_REPOSITORY's summarizeStock (stock valuation,
 *   active item count).
 * - AlertsModule for ALERT_REPOSITORY's summarize (open low-stock alerts,
 *   pending PO approvals) — reused as-is rather than duplicating that
 *   aggregation query a third time (FR-07 alert bar, now this).
 * - TransfersModule for TRANSFER_REPOSITORY's countInTransitFromOutlets.
 * - ExchangeRatesModule for ExchangeRatesService.resolveRate — the FX
 *   conversion extracted from GrnService/PurchaseOrdersService.
 */
@Module({
  imports: [RbacModule, TenancyModule, ItemsModule, AlertsModule, TransfersModule, ExchangeRatesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
