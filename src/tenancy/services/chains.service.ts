import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CHAIN_REPOSITORY } from '../repositories/tokens';
import { ChainRepository } from '../repositories/chain.repository';
import { Chain, ChainHierarchy } from '../domain/chain.entity';
import { CreateChainDto } from '../dto/create-chain.dto';
import { UpdateChainDto } from '../dto/update-chain.dto';

@Injectable()
export class ChainsService {
  constructor(
    @Inject(CHAIN_REPOSITORY) private readonly chainRepository: ChainRepository,
  ) {}

  create(dto: CreateChainDto): Promise<Chain> {
    return this.chainRepository.create(dto);
  }

  async findById(id: string): Promise<Chain> {
    const chain = await this.chainRepository.findById(id);
    if (!chain) throw new NotFoundException(`Chain ${id} not found`);
    return chain;
  }

  async findHierarchy(id: string): Promise<ChainHierarchy> {
    const hierarchy = await this.chainRepository.findHierarchy(id);
    if (!hierarchy) throw new NotFoundException(`Chain ${id} not found`);
    return hierarchy;
  }

  async update(id: string, dto: UpdateChainDto): Promise<Chain> {
    await this.findById(id);
    // Deactivating a chain cascades soft-deactivation to every property and
    // outlet beneath it — never a hard delete (spec: FR-00 Business Logic).
    if (dto.isActive === false) {
      await this.chainRepository.deactivateCascade(id);
      return this.findById(id);
    }
    return this.chainRepository.update(id, dto);
  }
}
