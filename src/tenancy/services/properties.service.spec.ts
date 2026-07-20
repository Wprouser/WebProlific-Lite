import { NotFoundException } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertyRepository } from '../repositories/property.repository';
import { ChainRepository } from '../repositories/chain.repository';
import { PropertyWithOutlets } from '../domain/property.entity';

function fixtureProperty(overrides: Partial<PropertyWithOutlets> = {}): PropertyWithOutlets {
  return {
    id: 'P1',
    chainId: 'C1',
    name: 'Jeddah Hotel',
    type: 'HOTEL',
    address: null,
    timezone: 'Asia/Riyadh',
    isActive: true,
    outlets: [],
    ...overrides,
  };
}

describe('PropertiesService', () => {
  function buildService(property = fixtureProperty()) {
    const propertyRepository: Partial<PropertyRepository> = {
      findById: jest.fn().mockResolvedValue(property),
      update: jest.fn().mockResolvedValue(property),
      deactivateCascade: jest.fn().mockResolvedValue(undefined),
    };
    const chainRepository: Partial<ChainRepository> = {
      findById: jest.fn().mockResolvedValue({ id: 'C1' }),
    };
    const service = new PropertiesService(
      propertyRepository as PropertyRepository,
      chainRepository as ChainRepository,
    );
    return { service, propertyRepository, chainRepository };
  }

  it('deactivating a property cascades to its outlets instead of a plain field update', async () => {
    const deactivated = fixtureProperty({
      isActive: false,
      outlets: [
        { id: 'O1', name: 'Main Restaurant', type: 'RESTAURANT', isActive: false },
        { id: 'O2', name: 'Pool Bar', type: 'BAR', isActive: false },
      ],
    });
    const { service, propertyRepository } = buildService();
    (propertyRepository.findById as jest.Mock).mockResolvedValueOnce(fixtureProperty());
    (propertyRepository.findById as jest.Mock).mockResolvedValueOnce(deactivated);

    const result = (await service.update('P1', { isActive: false })) as PropertyWithOutlets;

    expect(propertyRepository.deactivateCascade).toHaveBeenCalledWith('P1');
    expect(propertyRepository.update).not.toHaveBeenCalled();
    // Historical outlet rows are preserved (still present, just isActive: false) — not deleted.
    expect(result.outlets).toHaveLength(2);
    expect(result.outlets.every((o) => o.isActive === false)).toBe(true);
  });

  it('a non-deactivating update goes through the plain update path, not the cascade', async () => {
    const { service, propertyRepository } = buildService();

    await service.update('P1', { name: 'Renamed Hotel' });

    expect(propertyRepository.update).toHaveBeenCalledWith('P1', { name: 'Renamed Hotel' });
    expect(propertyRepository.deactivateCascade).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when updating a property that does not exist', async () => {
    const { service, propertyRepository } = buildService();
    (propertyRepository.findById as jest.Mock).mockResolvedValueOnce(null);

    await expect(service.update('missing', { name: 'x' })).rejects.toThrow(NotFoundException);
  });
});
