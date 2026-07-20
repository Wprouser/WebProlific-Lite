import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TrustedDevice } from '../../domain/trusted-device.entity';
import { CreateTrustedDeviceInput, TrustedDeviceRepository } from '../trusted-device.repository';

@Injectable()
export class PrismaTrustedDeviceRepository implements TrustedDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTrustedDeviceInput): Promise<TrustedDevice> {
    return this.prisma.trustedDevice.create({ data });
  }

  async findValidByTokenHash(tokenHash: string): Promise<TrustedDevice | null> {
    const row = await this.prisma.trustedDevice.findUnique({ where: { deviceToken: tokenHash } });
    if (!row || row.expiresAt.getTime() <= Date.now()) return null;
    return row;
  }
}
