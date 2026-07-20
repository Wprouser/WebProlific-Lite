import { Injectable } from '@nestjs/common';
import { Outlet as PrismaOutlet } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Outlet } from '../../domain/outlet.entity';
import {
  CreateOutletInput,
  OutletRepository,
  UpdateOutletInput,
} from '../outlet.repository';

function toDomain(outlet: PrismaOutlet): Outlet {
  return {
    ...outlet,
    poApprovalThreshold: outlet.poApprovalThreshold
      ? outlet.poApprovalThreshold.toString()
      : null,
  };
}

@Injectable()
export class PrismaOutletRepository implements OutletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOutletInput): Promise<Outlet> {
    const outlet = await this.prisma.outlet.create({ data });
    return toDomain(outlet);
  }

  async findById(id: string): Promise<Outlet | null> {
    const outlet = await this.prisma.outlet.findUnique({ where: { id } });
    return outlet ? toDomain(outlet) : null;
  }

  async update(id: string, data: UpdateOutletInput): Promise<Outlet> {
    const outlet = await this.prisma.outlet.update({ where: { id }, data });
    return toDomain(outlet);
  }

  async findIdsByChainId(chainId: string): Promise<string[]> {
    const outlets = await this.prisma.outlet.findMany({
      where: { chainId },
      select: { id: true },
    });
    return outlets.map((o) => o.id);
  }

  async findIdsByPropertyId(propertyId: string): Promise<string[]> {
    const outlets = await this.prisma.outlet.findMany({
      where: { propertyId },
      select: { id: true },
    });
    return outlets.map((o) => o.id);
  }

  async deactivateManyByPropertyId(propertyId: string): Promise<void> {
    await this.prisma.outlet.updateMany({
      where: { propertyId },
      data: { isActive: false },
    });
  }

  async deactivateManyByChainId(chainId: string): Promise<void> {
    await this.prisma.outlet.updateMany({
      where: { chainId },
      data: { isActive: false },
    });
  }
}
