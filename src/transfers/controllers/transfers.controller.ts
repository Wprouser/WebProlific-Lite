import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { TransfersService } from '../services/transfers.service';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { ReceiveTransferDto } from '../dto/receive-transfer.dto';
import { QueryTransfersDto } from '../dto/query-transfers.dto';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { AuditLogService } from '../../rbac/services/audit-log.service';

/**
 * No `@Roles()`/`@ResourceScope()` — FR-08's endpoints are flat, same
 * reasoning as Items/PurchaseOrders/Recipes/Sales; authorization is fully
 * enforced inside TransfersService via assertOutletAccess, once the
 * relevant outlet (source or destination, depending on the action) is
 * known.
 *
 * Each audit entry below is deliberately scoped to a single outlet even
 * though a transfer always touches two: CREATE_TRANSFER and
 * DISPATCH_TRANSFER are actions happening at the source, RECEIVE_TRANSFER
 * and CANCEL_TRANSFER at the source too (cancel only ever applies pre-
 * dispatch) except RECEIVE_TRANSFER, which happens at the destination —
 * so each shows up in the activity feed of the outlet it actually
 * concerns.
 */
@Controller('transfers')
export class TransfersController {
  constructor(
    private readonly transfersService: TransfersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  async create(@Req() request: RequestWithAccess, @Body() dto: CreateTransferDto) {
    const transfer = await this.transfersService.create(request, dto);
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'CREATE_TRANSFER',
      entityType: 'Transfer',
      entityId: transfer.id,
      outletId: transfer.sourceOutletId,
      after: transfer,
    });
    return transfer;
  }

  @Get()
  list(@Req() request: RequestWithAccess, @Query() query: QueryTransfersDto) {
    return this.transfersService.list(request, query);
  }

  @Get(':id')
  findOne(@Req() request: RequestWithAccess, @Param('id') id: string) {
    return this.transfersService.findDetail(request, id);
  }

  @Patch(':id/dispatch')
  async dispatch(@Req() request: RequestWithAccess, @Param('id') id: string) {
    const before = await this.transfersService.findPlain(request, id);
    const after = await this.transfersService.dispatch(request, id);
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'DISPATCH_TRANSFER',
      entityType: 'Transfer',
      entityId: id,
      outletId: after.sourceOutletId,
      before,
      after,
    });
    return after;
  }

  @Patch(':id/receive')
  async receive(@Req() request: RequestWithAccess, @Param('id') id: string, @Body() dto: ReceiveTransferDto) {
    const before = await this.transfersService.findPlain(request, id);
    const after = await this.transfersService.receive(request, id, dto);
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'RECEIVE_TRANSFER',
      entityType: 'Transfer',
      entityId: id,
      outletId: after.destOutletId,
      before,
      after,
    });
    return after;
  }

  @Patch(':id/cancel')
  async cancel(@Req() request: RequestWithAccess, @Param('id') id: string) {
    const before = await this.transfersService.findPlain(request, id);
    const after = await this.transfersService.cancel(request, id);
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'CANCEL_TRANSFER',
      entityType: 'Transfer',
      entityId: id,
      outletId: after.sourceOutletId,
      before,
      after,
    });
    return after;
  }
}
