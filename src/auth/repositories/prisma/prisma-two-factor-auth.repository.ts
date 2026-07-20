import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TwoFactorAuth } from '../../domain/two-factor-auth.entity';
import { TwoFactorMethod } from '../../constants/enums';
import {
  TwoFactorAuthRepository,
  UpdateTwoFactorAuthInput,
} from '../two-factor-auth.repository';

@Injectable()
export class PrismaTwoFactorAuthRepository implements TwoFactorAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(row: {
    id: string;
    userId: string;
    isEnabled: boolean;
    method: string;
    totpSecret: string | null;
    enforcedByPolicy: boolean;
    enrolledAt: Date | null;
  }): TwoFactorAuth {
    return { ...row, method: row.method as TwoFactorMethod };
  }

  async findByUserId(userId: string): Promise<TwoFactorAuth | null> {
    const row = await this.prisma.twoFactorAuth.findUnique({ where: { userId } });
    return row ? this.toDomain(row) : null;
  }

  async findOrCreateByUserId(userId: string): Promise<TwoFactorAuth> {
    const existing = await this.prisma.twoFactorAuth.findUnique({ where: { userId } });
    if (existing) return this.toDomain(existing);
    const created = await this.prisma.twoFactorAuth.create({ data: { userId } });
    return this.toDomain(created);
  }

  async update(userId: string, data: UpdateTwoFactorAuthInput): Promise<TwoFactorAuth> {
    const row = await this.prisma.twoFactorAuth.update({ where: { userId }, data });
    return this.toDomain(row);
  }
}
