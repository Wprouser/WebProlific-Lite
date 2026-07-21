import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { StockTransactionsService } from '../services/stock-transactions.service';
import { CreateStockTransactionDto } from '../dto/create-stock-transaction.dto';
import { QueryStockTransactionsDto } from '../dto/query-stock-transactions.dto';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';

/**
 * No `@Roles()`/`@ResourceScope()` here — same reasoning as
 * ItemsController: these routes are flat, outletId is only knowable once
 * the referenced Item is loaded, so authorization runs from the service
 * via `assertOutletAccess`. AuditLog/event emission also happen inside
 * the service here (not the controller, unlike ItemsController) — the
 * service already needs the transaction+updated-item result to decide the
 * AuditLog severity and build the stock-changed event payload, so
 * duplicating that fetch in the controller just to log would be worse.
 */
@Controller('stock-transactions')
export class StockTransactionsController {
  constructor(private readonly stockTransactionsService: StockTransactionsService) {}

  @Post()
  create(@Body() dto: CreateStockTransactionDto, @Req() request: RequestWithAccess) {
    return this.stockTransactionsService.create(request, dto);
  }

  @Get()
  list(@Req() request: RequestWithAccess, @Query() query: QueryStockTransactionsDto) {
    return this.stockTransactionsService.list(request, query);
  }

  @Get(':id')
  findOne(@Req() request: RequestWithAccess, @Param('id') id: string) {
    return this.stockTransactionsService.findById(request, id);
  }
}
