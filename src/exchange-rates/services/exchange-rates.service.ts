import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EXCHANGE_RATE_REPOSITORY } from '../repositories/tokens';
import { ExchangeRateRepository } from '../repositories/exchange-rate.repository';
import { ExchangeRate } from '../domain/exchange-rate.entity';
import { CurrenciesService } from '../../currencies/services/currencies.service';
import { CreateExchangeRateDto } from '../dto/create-exchange-rate.dto';
import { QueryExchangeRatesDto } from '../dto/query-exchange-rates.dto';

@Injectable()
export class ExchangeRatesService {
  constructor(
    @Inject(EXCHANGE_RATE_REPOSITORY) private readonly exchangeRateRepository: ExchangeRateRepository,
    private readonly currenciesService: CurrenciesService,
  ) {}

  // ExchangeRate is global reference data (no outletId) — role authorization
  // for create() is the flat @Roles('CHAIN_OWNER','PROPERTY_MANAGER') check
  // on the controller (RolesGuard, no @ResourceScope), same pattern as
  // FR-14's GET /users. Nothing further to check here.
  list(query: QueryExchangeRatesDto): Promise<ExchangeRate[]> {
    return this.exchangeRateRepository.findLatestPerPair({ baseCurrency: query.base, targetCurrency: query.target });
  }

  async create(dto: CreateExchangeRateDto): Promise<ExchangeRate> {
    if (dto.baseCurrency === dto.targetCurrency) {
      throw new BadRequestException('Base and target currency must be different');
    }
    // Confirms both codes are real, known currencies (404s via getOrThrow
    // if not) — never silently record a rate for a nonexistent currency.
    await this.currenciesService.getOrThrow(dto.baseCurrency);
    await this.currenciesService.getOrThrow(dto.targetCurrency);

    return this.exchangeRateRepository.create({
      baseCurrency: dto.baseCurrency,
      targetCurrency: dto.targetCurrency,
      rate: dto.rate,
      source: 'MANUAL',
    });
  }

  /**
   * Resolves the multiplier to convert an amount FROM `fromCurrency` TO
   * `toCurrency`: an explicit caller-supplied value always wins; the same
   * currency on both sides is always 1; otherwise the latest on-file
   * ExchangeRate for this exact pair; else '1' as a last-resort default (a
   * caller surfacing this as an editable field, like FR-04's PO/GRN forms,
   * still lets the user correct it).
   *
   * Previously two byte-identical private methods (GrnService,
   * PurchaseOrdersService) — extracted here before FR-08's dashboard needed
   * the same conversion for a third time.
   */
  async resolveRate(fromCurrency: string, toCurrency: string, explicit?: string): Promise<string> {
    if (explicit) return explicit;
    if (fromCurrency === toCurrency) return '1';
    const [latest] = await this.exchangeRateRepository.findLatestPerPair({
      baseCurrency: fromCurrency,
      targetCurrency: toCurrency,
    });
    return latest?.rate ?? '1';
  }
}
