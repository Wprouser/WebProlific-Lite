import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Chain, ChainHierarchy } from '../../domain/chain.entity';
import {
  ChainRepository,
  CreateChainInput,
  UpdateChainInput,
} from '../chain.repository';

@Injectable()
export class PrismaChainRepository implements ChainRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateChainInput): Promise<Chain> {
    return this.prisma.chain.create({ data });
  }

  async findById(id: string): Promise<Chain | null> {
    return this.prisma.chain.findUnique({ where: { id } });
  }

  async findHierarchy(id: string): Promise<ChainHierarchy | null> {
    return this.prisma.chain.findUnique({
      where: { id },
      include: {
        properties: {
          include: { outlets: true },
        },
      },
    });
  }

  async update(id: string, data: UpdateChainInput): Promise<Chain> {
    return this.prisma.chain.update({ where: { id }, data });
  }

  async deactivateCascade(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.chain.update({ where: { id }, data: { isActive: false } });
      await tx.property.updateMany({
        where: { chainId: id },
        data: { isActive: false },
      });
      await tx.outlet.updateMany({
        where: { chainId: id },
        data: { isActive: false },
      });
    });
  }
}
