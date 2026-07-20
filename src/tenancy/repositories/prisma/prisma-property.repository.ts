import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Property, PropertyWithOutlets } from '../../domain/property.entity';
import {
  CreatePropertyInput,
  PropertyRepository,
  UpdatePropertyInput,
} from '../property.repository';

@Injectable()
export class PrismaPropertyRepository implements PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePropertyInput): Promise<Property> {
    return this.prisma.property.create({ data });
  }

  async findById(id: string): Promise<PropertyWithOutlets | null> {
    return this.prisma.property.findUnique({
      where: { id },
      include: { outlets: true },
    });
  }

  async update(id: string, data: UpdatePropertyInput): Promise<Property> {
    return this.prisma.property.update({ where: { id }, data });
  }

  async deactivateCascade(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.property.update({ where: { id }, data: { isActive: false } });
      await tx.outlet.updateMany({
        where: { propertyId: id },
        data: { isActive: false },
      });
    });
  }

  async findIdsByChainId(chainId: string): Promise<string[]> {
    const properties = await this.prisma.property.findMany({
      where: { chainId },
      select: { id: true },
    });
    return properties.map((p) => p.id);
  }
}
