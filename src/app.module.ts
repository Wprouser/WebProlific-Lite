import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { ScopeResolutionGuard } from './tenancy/guards/scope-resolution.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    TenancyModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ScopeResolutionGuard,
    },
  ],
})
export class AppModule {}
