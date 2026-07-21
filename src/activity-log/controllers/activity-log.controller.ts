import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { ActivityLogService } from '../services/activity-log.service';
import { QueryActivityLogDto } from '../dto/query-activity-log.dto';
import { QueryTransactionLogDto } from '../dto/query-transaction-log.dto';
import { ExportActivityLogDto } from '../dto/export-activity-log.dto';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { Roles } from '../../rbac/decorators/roles.decorator';

/**
 * FR-18: "Activity feed screen ... accessible to OUTLET_MANAGER and above,
 * scoped to their effective outlets." No `@ResourceScope()` here — these
 * are filtered *list* endpoints (query-string scope, not a single route-
 * param resource), so scoping happens in ActivityLogService against
 * `request.effectiveAccess`, same pattern as FR-14's `GET /users`.
 */
@Controller()
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get('activity-log')
  @Roles('CHAIN_OWNER', 'PROPERTY_MANAGER', 'OUTLET_MANAGER')
  findActivityLog(@Req() request: RequestWithAccess, @Query() query: QueryActivityLogDto) {
    return this.activityLogService.findActivityLog(request, query);
  }

  @Get('transaction-log')
  @Roles('CHAIN_OWNER', 'PROPERTY_MANAGER', 'OUTLET_MANAGER')
  findTransactionLog(@Req() request: RequestWithAccess, @Query() query: QueryTransactionLogDto) {
    return this.activityLogService.findTransactionLog(request, query);
  }

  @Get('activity-log/export')
  @Roles('CHAIN_OWNER', 'PROPERTY_MANAGER', 'OUTLET_MANAGER')
  async exportActivityLog(
    @Req() request: RequestWithAccess,
    @Query() query: ExportActivityLogDto,
    @Res() res: Response,
  ) {
    const { buffer, filename, contentType } = await this.activityLogService.exportActivityLog(
      request,
      query,
    );
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}
