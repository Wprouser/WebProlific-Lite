import { Module } from '@nestjs/common';
import { RbacModule } from '../rbac/rbac.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { ItemsModule } from '../items/items.module';
import { StockTransactionsModule } from '../stock-transactions/stock-transactions.module';
import { TransfersController } from './controllers/transfers.controller';
import { TransfersService } from './services/transfers.service';
import { TRANSFER_REPOSITORY } from './repositories/tokens';
import { PrismaTransferRepository } from './repositories/prisma/prisma-transfer.repository';

/**
 * FR-08. Imports rather than reimplements:
 * - TenancyModule for OUTLET_REPOSITORY — cross-property transfer checks
 *   need each outlet's propertyId.
 * - ItemsModule for ITEM_REPOSITORY/UNIT_OF_MEASURE_REPOSITORY — resolving
 *   and validating the source/destination item pairing on each line.
 * - StockTransactionsModule for StockTransactionsService — dispatch and
 *   receive both post through the same FR-02 ledger every other stock
 *   movement uses, which is what gives each posting FR-18's audit trail and
 *   FR-07's alert re-evaluation for free.
 */
@Module({
  imports: [RbacModule, TenancyModule, ItemsModule, StockTransactionsModule],
  controllers: [TransfersController],
  providers: [TransfersService, { provide: TRANSFER_REPOSITORY, useClass: PrismaTransferRepository }],
  // FR-08's own dashboard needs the "transfers in transit" count too.
  exports: [TRANSFER_REPOSITORY],
})
export class TransfersModule {}
