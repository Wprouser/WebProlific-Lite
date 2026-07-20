import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TwoFactorChallenge } from '../../domain/two-factor-challenge.entity';
import { TwoFactorMethod } from '../../constants/enums';
import {
  CreateTwoFactorChallengeInput,
  TwoFactorChallengeRepository,
} from '../two-factor-challenge.repository';

@Injectable()
export class PrismaTwoFactorChallengeRepository implements TwoFactorChallengeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(row: {
    id: string;
    userId: string;
    code: string | null;
    method: string;
    expiresAt: Date;
    attemptCount: number;
    consumedAt: Date | null;
  }): TwoFactorChallenge {
    return { ...row, method: row.method as TwoFactorMethod };
  }

  async create(data: CreateTwoFactorChallengeInput): Promise<TwoFactorChallenge> {
    const row = await this.prisma.twoFactorChallenge.create({ data });
    return this.toDomain(row);
  }

  async findById(id: string): Promise<TwoFactorChallenge | null> {
    const row = await this.prisma.twoFactorChallenge.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async incrementAttemptCount(id: string): Promise<TwoFactorChallenge> {
    const row = await this.prisma.twoFactorChallenge.update({
      where: { id },
      data: { attemptCount: { increment: 1 } },
    });
    return this.toDomain(row);
  }

  async consume(id: string): Promise<TwoFactorChallenge> {
    const row = await this.prisma.twoFactorChallenge.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
    return this.toDomain(row);
  }

  async updateCode(id: string, code: string, expiresAt: Date): Promise<TwoFactorChallenge> {
    const row = await this.prisma.twoFactorChallenge.update({
      where: { id },
      data: { code, expiresAt, attemptCount: 0 },
    });
    return this.toDomain(row);
  }
}
