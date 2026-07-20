import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { InviteToken } from '../../domain/invite-token.entity';
import { CreateInviteTokenInput, InviteTokenRepository } from '../invite-token.repository';

@Injectable()
export class PrismaInviteTokenRepository implements InviteTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInviteTokenInput): Promise<InviteToken> {
    return this.prisma.inviteToken.create({ data });
  }

  async findByTokenHash(tokenHash: string): Promise<InviteToken | null> {
    return this.prisma.inviteToken.findFirst({ where: { tokenHash } });
  }

  async markUsed(id: string): Promise<InviteToken> {
    return this.prisma.inviteToken.update({ where: { id }, data: { usedAt: new Date() } });
  }

  async invalidateUnusedForUser(userId: string): Promise<void> {
    await this.prisma.inviteToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
