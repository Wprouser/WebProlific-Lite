import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';
import { UsersModule } from './users/users.module';
import { ScopeResolutionGuard } from './tenancy/guards/scope-resolution.guard';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './rbac/guards/roles.guard';
import { FieldRestrictionInterceptor } from './rbac/interceptors/field-restriction.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    TenancyModule,
    AuthModule,
    RbacModule,
    UsersModule,
  ],
  providers: [
    // Order matters: JwtAuthGuard populates request.user, ScopeResolutionGuard
    // resolves effective access from it, RolesGuard (FR-11) authorizes
    // against that resolved access.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ScopeResolutionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: FieldRestrictionInterceptor,
    },
  ],
})
export class AppModule {}
