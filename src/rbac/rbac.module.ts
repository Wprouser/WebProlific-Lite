import { Module } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';
import { FieldRestrictionInterceptor } from './interceptors/field-restriction.interceptor';
import { AuditLogService } from './services/audit-log.service';
import { AUDIT_LOG_REPOSITORY } from './repositories/tokens';
import { PrismaAuditLogRepository } from './repositories/prisma/prisma-audit-log.repository';

@Module({
  providers: [
    RolesGuard,
    FieldRestrictionInterceptor,
    AuditLogService,
    { provide: AUDIT_LOG_REPOSITORY, useClass: PrismaAuditLogRepository },
  ],
  exports: [RolesGuard, FieldRestrictionInterceptor, AuditLogService],
})
export class RbacModule {}
