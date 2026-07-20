import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TwoFactorBackupCode } from '../../domain/two-factor-backup-code.entity';
import { TwoFactorBackupCodeRepository } from '../two-factor-backup-code.repository';

@Injectable()
export class PrismaTwoFactorBackupCodeRepository implements TwoFactorBackupCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createBatch(
    twoFactorAuthId: string,
    codeHashes: string[],
  ): Promise<TwoFactorBackupCode[]> {
    // SQL Server's createMany doesn't return rows, so insert individually
    // inside a transaction to get back the created records.
    return this.prisma.$transaction(
      codeHashes.map((codeHash) =>
        this.prisma.twoFactorBackupCode.create({ data: { twoFactorAuthId, codeHash } }),
      ),
    );
  }

  async findUnusedByTwoFactorAuthId(twoFactorAuthId: string): Promise<TwoFactorBackupCode[]> {
    return this.prisma.twoFactorBackupCode.findMany({
      where: { twoFactorAuthId, usedAt: null },
    });
  }

  async markUsed(id: string): Promise<TwoFactorBackupCode> {
    return this.prisma.twoFactorBackupCode.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteUnused(twoFactorAuthId: string): Promise<void> {
    await this.prisma.twoFactorBackupCode.deleteMany({
      where: { twoFactorAuthId, usedAt: null },
    });
  }
}
