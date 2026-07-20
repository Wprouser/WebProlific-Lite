import { Injectable } from '@nestjs/common';
import { UserAccess as PrismaUserAccess } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserAccess } from '../../domain/user-access.entity';
import { Role, ScopeType } from '../../constants/enums';
import {
  CreateUserAccessInput,
  UserAccessRepository,
} from '../user-access.repository';

function toDomain(row: PrismaUserAccess): UserAccess {
  return {
    ...row,
    scopeType: row.scopeType as ScopeType,
    role: row.role as Role,
  };
}

@Injectable()
export class PrismaUserAccessRepository implements UserAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<UserAccess[]> {
    const rows = await this.prisma.userAccess.findMany({ where: { userId } });
    return rows.map(toDomain);
  }

  async create(data: CreateUserAccessInput): Promise<UserAccess> {
    const row = await this.prisma.userAccess.create({ data });
    return toDomain(row);
  }

  async findUserIdsByScope(scopeType: ScopeType, scopeIds: string[]): Promise<string[]> {
    if (scopeIds.length === 0) return [];
    const rows = await this.prisma.userAccess.findMany({
      where: { scopeType, scopeId: { in: scopeIds } },
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.map((r) => r.userId);
  }
}
