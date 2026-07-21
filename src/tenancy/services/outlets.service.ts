import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OUTLET_REPOSITORY, PROPERTY_REPOSITORY } from '../repositories/tokens';
import { OutletRepository } from '../repositories/outlet.repository';
import { PropertyRepository } from '../repositories/property.repository';
import { Outlet } from '../domain/outlet.entity';
import { CreateOutletDto } from '../dto/create-outlet.dto';
import { UpdateOutletDto } from '../dto/update-outlet.dto';
import { OUTLET_CREATED_EVENT, OutletCreatedEvent } from '../events/outlet-created.event';

@Injectable()
export class OutletsService {
  constructor(
    @Inject(OUTLET_REPOSITORY) private readonly outletRepository: OutletRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(propertyId: string, dto: CreateOutletDto): Promise<Outlet> {
    const property = await this.propertyRepository.findById(propertyId);
    if (!property) throw new NotFoundException(`Property ${propertyId} not found`);
    // chainId is denormalized from property.chainId — never accepted from the client (spec: FR-00 note).
    const outlet = await this.outletRepository.create({
      propertyId,
      chainId: property.chainId,
      ...dto,
    });
    // tenancy doesn't know items/Category exists — whoever cares about a
    // freshly created outlet (today: FR-01 seeding default categories)
    // listens for this instead of tenancy depending on them. emitAsync +
    // await so the seed is guaranteed done before create() returns, same
    // reasoning as ActivityBus.
    const event: OutletCreatedEvent = { outletId: outlet.id };
    await this.eventEmitter.emitAsync(OUTLET_CREATED_EVENT, event);
    return outlet;
  }

  async findById(id: string): Promise<Outlet> {
    const outlet = await this.outletRepository.findById(id);
    if (!outlet) throw new NotFoundException(`Outlet ${id} not found`);
    return outlet;
  }

  async update(id: string, dto: UpdateOutletDto): Promise<Outlet> {
    await this.findById(id);
    return this.outletRepository.update(id, dto);
  }
}
