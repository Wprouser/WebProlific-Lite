import { Module } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';
import { FieldRestrictionInterceptor } from './interceptors/field-restriction.interceptor';
import { AuditLogService } from './services/audit-log.service';
import { AUDIT_LOG_REPOSITORY } from './repositories/tokens';
import { PrismaAuditLogRepository } from './repositories/prisma/prisma-audit-log.repository';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  // FR-18: AuditLogService emits an activity.recorded event after every
  // AuditLog write, so every existing call site (FR-00/FR-11/FR-14
  // controllers/services) gets ActivityLog coverage automatically.
  imports: [ActivityLogModule],
  providers: [
    RolesGuard,
    FieldRestrictionInterceptor,
    AuditLogService,
    { provide: AUDIT_LOG_REPOSITORY, useClass: PrismaAuditLogRepository },
  ],
  exports: [RolesGuard, FieldRestrictionInterceptor, AuditLogService],
})
export class RbacModule {}
