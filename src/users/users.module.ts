import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RbacModule } from '../rbac/rbac.module';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { INVITE_TOKEN_REPOSITORY } from './repositories/tokens';
import { PrismaInviteTokenRepository } from './repositories/prisma/prisma-invite-token.repository';

@Module({
  imports: [AuthModule, TenancyModule, RbacModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: INVITE_TOKEN_REPOSITORY, useClass: PrismaInviteTokenRepository },
  ],
})
export class UsersModule {}
