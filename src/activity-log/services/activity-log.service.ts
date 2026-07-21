import { Inject, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { ActivityLogRepository, ActivityLogFilters } from '../repositories/activity-log.repository';
import {
  TransactionLogRepository,
  TransactionLogFilters,
} from '../repositories/transaction-log.repository';
import { ACTIVITY_LOG_REPOSITORY, TRANSACTION_LOG_REPOSITORY } from '../repositories/tokens';
import { ActivityLog } from '../domain/activity-log.entity';
import { RequestWithAccess } from '../../tenancy/types/request-with-access';
import { QueryActivityLogDto } from '../dto/query-activity-log.dto';
import { QueryTransactionLogDto } from '../dto/query-transaction-log.dto';
import { ExportActivityLogDto } from '../dto/export-activity-log.dto';

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

/**
 * FR-18's `GET /activity-log` / `GET /transaction-log` / export — scoping
 * follows the same "resolve the caller's effective access, filter to it"
 * pattern UsersService.listUsers already uses for FR-14, just extended to
 * the property/chain levels via ScopeResolutionService's now-exposed
 * effectivePropertyIds/effectiveChainIds.
 */
@Injectable()
export class ActivityLogService {
  constructor(
    @Inject(ACTIVITY_LOG_REPOSITORY) private readonly activityLogRepository: ActivityLogRepository,
    @Inject(TRANSACTION_LOG_REPOSITORY)
    private readonly transactionLogRepository: TransactionLogRepository,
  ) {}

  async findActivityLog(request: RequestWithAccess, query: QueryActivityLogDto): Promise<ActivityLog[]> {
    return this.activityLogRepository.findScoped(this.buildActivityFilters(request, query));
  }

  async findTransactionLog(request: RequestWithAccess, query: QueryTransactionLogDto) {
    const access = request.effectiveAccess!;
    const filters: TransactionLogFilters = {
      accessibleChainIds: access.effectiveChainIds,
      accessiblePropertyIds: access.effectivePropertyIds,
      accessibleOutletIds: access.effectiveOutletIds,
      outletId: query.outletId,
      propertyId: query.propertyId,
      chainId: query.chainId,
      entityCategory: query.entityCategory,
      entityType: query.entityType,
      entityId: query.entityId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    };
    return this.transactionLogRepository.findScoped(filters);
  }

  async exportActivityLog(request: RequestWithAccess, query: ExportActivityLogDto): Promise<ExportResult> {
    const rows = await this.activityLogRepository.findScoped(this.buildActivityFilters(request, query));
    return query.format === 'xlsx' ? this.exportXlsx(rows) : this.exportPdf(rows);
  }

  private buildActivityFilters(
    request: RequestWithAccess,
    query: {
      outletId?: string;
      propertyId?: string;
      chainId?: string;
      category?: QueryActivityLogDto['category'];
      userId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): ActivityLogFilters {
    const access = request.effectiveAccess!;
    return {
      accessibleChainIds: access.effectiveChainIds,
      accessiblePropertyIds: access.effectivePropertyIds,
      accessibleOutletIds: access.effectiveOutletIds,
      requesterId: request.user!.id,
      outletId: query.outletId,
      propertyId: query.propertyId,
      chainId: query.chainId,
      category: query.category,
      userId: query.userId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    };
  }

  private async exportXlsx(rows: ActivityLog[]): Promise<ExportResult> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Activity Log');
    sheet.columns = [
      { header: 'Date', key: 'createdAt', width: 22 },
      { header: 'Category', key: 'category', width: 16 },
      { header: 'Action', key: 'action', width: 24 },
      { header: 'Entity Type', key: 'entityType', width: 16 },
      { header: 'Entity ID', key: 'entityId', width: 24 },
      { header: 'User ID', key: 'userId', width: 24 },
      { header: 'Outlet ID', key: 'outletId', width: 24 },
      { header: 'Description Key', key: 'description', width: 32 },
    ];
    for (const row of rows) {
      sheet.addRow({
        createdAt: row.createdAt.toISOString(),
        category: row.category,
        action: row.action,
        entityType: row.entityType ?? '',
        entityId: row.entityId ?? '',
        userId: row.userId ?? '',
        outletId: row.outletId ?? '',
        description: row.description,
      });
    }
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      buffer,
      filename: `activity-log-${Date.now()}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private async exportPdf(rows: ActivityLog[]): Promise<ExportResult> {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    doc.fontSize(16).text('Activity Log', { underline: true });
    doc.moveDown();
    doc.fontSize(9);
    for (const row of rows) {
      doc.text(
        `${row.createdAt.toISOString()}  [${row.category}]  ${row.action}` +
          (row.entityType ? `  ${row.entityType}${row.entityId ? `#${row.entityId}` : ''}` : ''),
      );
    }
    if (rows.length === 0) doc.text('No activity in the selected range.');
    doc.end();

    const buffer = await done;
    return { buffer, filename: `activity-log-${Date.now()}.pdf`, contentType: 'application/pdf' };
  }
}
