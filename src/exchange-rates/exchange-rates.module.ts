import { Module } from '@nestjs/common';
import { RbacModule } from '../rbac/rbac.module';
import { CurrenciesModule } from '../currencies/currencies.module';
import { ExchangeRatesController } from './controllers/exchange-rates.controller';
import { ExchangeRatesService } from './services/exchange-rates.service';
import { EXCHANGE_RATE_REPOSITORY } from './repositories/tokens';
import { PrismaExchangeRateRepository } from './repositories/prisma/prisma-exchange-rate.repository';

@Module({
  imports: [RbacModule, CurrenciesModule],
  controllers: [ExchangeRatesController],
  providers: [
    ExchangeRatesService,
    { provide: EXCHANGE_RATE_REPOSITORY, useClass: PrismaExchangeRateRepository },
  ],
  // FR-04's GrnService/PurchaseOrdersService and FR-08's DashboardService
  // all need FX conversion — exported as the service (resolveRate), not the
  // raw repository, now that the conversion logic itself lives here too.
  exports: [ExchangeRatesService],
})
export class ExchangeRatesModule {}
