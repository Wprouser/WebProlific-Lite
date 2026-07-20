import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PasswordResetToken } from '../../domain/password-reset-token.entity';
import {
  CreatePasswordResetTokenInput,
  PasswordResetTokenRepository,
} from '../password-reset-token.repository';

@Injectable()
export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePasswordResetTokenInput): Promise<PasswordResetToken> {
    return this.prisma.passwordResetToken.create({ data });
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.prisma.passwordResetToken.findFirst({ where: { tokenHash } });
  }

  async markUsed(id: string): Promise<PasswordResetToken> {
    return this.prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
  }
}
