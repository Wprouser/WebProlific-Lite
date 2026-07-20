import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CHAIN_REPOSITORY, PROPERTY_REPOSITORY } from '../repositories/tokens';
import { PropertyRepository } from '../repositories/property.repository';
import { ChainRepository } from '../repositories/chain.repository';
import { Property, PropertyWithOutlets } from '../domain/property.entity';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(CHAIN_REPOSITORY) private readonly chainRepository: ChainRepository,
  ) {}

  async create(chainId: string, dto: CreatePropertyDto): Promise<Property> {
    const chain = await this.chainRepository.findById(chainId);
    if (!chain) throw new NotFoundException(`Chain ${chainId} not found`);
    return this.propertyRepository.create({ chainId, ...dto });
  }

  async findById(id: string): Promise<PropertyWithOutlets> {
    const property = await this.propertyRepository.findById(id);
    if (!property) throw new NotFoundException(`Property ${id} not found`);
    return property;
  }

  async update(id: string, dto: UpdatePropertyDto): Promise<Property> {
    await this.findById(id);
    // Deactivating a property cascades soft-deactivation to every outlet
    // beneath it — never a hard delete (spec: FR-00 Business Logic).
    if (dto.isActive === false) {
      await this.propertyRepository.deactivateCascade(id);
      return this.findById(id);
    }
    return this.propertyRepository.update(id, dto);
  }
}
