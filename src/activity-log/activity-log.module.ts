import { Module } from '@nestjs/common';
import { ActivityLogController } from './controllers/activity-log.controller';
import { ActivityLogService } from './services/activity-log.service';
import { ActivityBus } from './services/activity-bus.service';
import { ActivityLogListener } from './listeners/activity-log.listener';
import { TransactionLogListener } from './listeners/transaction-log.listener';
import { ACTIVITY_LOG_REPOSITORY, TRANSACTION_LOG_REPOSITORY } from './repositories/tokens';
import { PrismaActivityLogRepository } from './repositories/prisma/prisma-activity-log.repository';
import { PrismaTransactionLogRepository } from './repositories/prisma/prisma-transaction-log.repository';

/**
 * FR-18. No imports of RbacModule/AuthModule/TenancyModule needed: the
 * cross-cutting guards (JwtAuthGuard, ScopeResolutionGuard, RolesGuard) are
 * already registered globally in AppModule, and `@Roles()` is a plain
 * metadata decorator, not a provider. `ActivityBus` is exported so
 * RbacModule (AuditLogService) and AuthModule (AuthService/AuthController)
 * can inject it without this module depending on either of them back —
 * keeps the dependency graph one-directional.
 */
@Module({
  controllers: [ActivityLogController],
  providers: [
    ActivityLogService,
    ActivityBus,
    ActivityLogListener,
    TransactionLogListener,
    { provide: ACTIVITY_LOG_REPOSITORY, useClass: PrismaActivityLogRepository },
    { provide: TRANSACTION_LOG_REPOSITORY, useClass: PrismaTransactionLogRepository },
  ],
  exports: [ActivityBus],
})
export class ActivityLogModule {}
