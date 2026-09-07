import {
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ItemsService } from '../services/items.service';
import { CreateItemDto } from '../dto/create-item.dto';
import { UpdateItemDto } from '../dto/update-item.dto';
import { QueryItemsDto } from '../dto/query-items.dto';
import { CloneItemDto } from '../dto/clone-item.dto';
import { BulkImportItemsDto } from '../dto/bulk-import-items.dto';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { AuditLogService } from '../../rbac/services/audit-log.service';
import { RestrictFields } from '../../rbac/decorators/restrict-fields.decorator';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/**
 * No `@Roles()`/`@ResourceScope()` on these routes — FR-01's endpoints are
 * flat (no /outlets/:outletId/items nesting), so there's no route param
 * those decorators could resolve an outlet id from for most of them (see
 * access.util.ts). Authorization is still fully enforced, just from
 * ItemsService/CategoriesService using the same `effectiveAccess.
 * roleForOutlet` primitive RolesGuard would otherwise use — JwtAuthGuard
 * and ScopeResolutionGuard (both global) still gate every route here.
 */
@Controller('items')
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  async create(@Body() dto: CreateItemDto, @Req() request: RequestWithAccess) {
    const item = await this.itemsService.create(request, dto);
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'CREATE_ITEM',
      entityType: 'Item',
      entityId: item.id,
      outletId: item.outletId,
      after: item,
    });
    return item;
  }

  /** Spec: "validate every row before committing any; return a per-row
   * error report ... rather than partial success." A validation failure
   * throws BadRequestException with the full `{row, error}[]` report and
   * creates nothing — see ItemsService.bulkImport. */
  @Post('bulk-import')
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(
    @Body() dto: BulkImportItemsDto,
    @Req() request: RequestWithAccess,
    @UploadedFile(
      new ParseFilePipe({
        // Size only, no FileTypeValidator — same reasoning as FR-06's sales
        // import: a CSV/Excel export arrives under all sorts of MIME types
        // depending on browser/OS, and the parser itself is the real check.
        validators: [new MaxFileSizeValidator({ maxSize: MAX_IMPORT_BYTES })],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.itemsService.bulkImport(request, dto.outletId, {
      buffer: file.buffer,
      originalName: file.originalname,
    });
    for (const item of result.items) {
      await this.auditLogService.record({
        userId: request.user!.id,
        action: 'CREATE_ITEM',
        entityType: 'Item',
        entityId: item.id,
        outletId: item.outletId,
        after: item,
      });
    }
    return result;
  }

  @Get()
  @RestrictFields('CHEF', 'costPrice')
  list(@Req() request: RequestWithAccess, @Query() query: QueryItemsDto) {
    return this.itemsService.list(request, query);
  }

  @Get(':id')
  @RestrictFields('CHEF', 'costPrice')
  findOne(@Req() request: RequestWithAccess, @Param('id') id: string) {
    return this.itemsService.findById(request, id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
    @Req() request: RequestWithAccess,
  ) {
    const before = await this.itemsService.findById(request, id);
    const after = await this.itemsService.update(request, id, dto);
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'UPDATE_ITEM',
      entityType: 'Item',
      entityId: id,
      outletId: after.outletId,
      before,
      after,
    });
    return after;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() request: RequestWithAccess) {
    const before = await this.itemsService.findById(request, id);
    const after = await this.itemsService.softDelete(request, id);
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'DEACTIVATE_ITEM',
      entityType: 'Item',
      entityId: id,
      outletId: after.outletId,
      before,
      after,
    });
    return after;
  }

  @Post(':id/clone')
  async clone(
    @Param('id') id: string,
    @Body() dto: CloneItemDto,
    @Req() request: RequestWithAccess,
  ) {
    const clone = await this.itemsService.clone(request, id, dto.sku);
    // Named CREATE_ITEM (not CLONE_ITEM) — from the new item's own history
    // this genuinely is its creation, and AuditLogService.inferOperation
    // matches actions by prefix, so this keeps the clone's own "History" tab
    // (FR-18 TransactionLog) populated the same way a normal create is.
    await this.auditLogService.record({
      userId: request.user!.id,
      action: 'CREATE_ITEM',
      entityType: 'Item',
      entityId: clone.id,
      outletId: clone.outletId,
      after: clone,
    });
    return clone;
  }
}
