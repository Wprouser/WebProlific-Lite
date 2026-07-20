import { TrustedDevice } from '../domain/trusted-device.entity';

export interface CreateTrustedDeviceInput {
  userId: string;
  deviceToken: string; // already-hashed value
  deviceLabel?: string;
  expiresAt: Date;
}

export interface TrustedDeviceRepository {
  create(data: CreateTrustedDeviceInput): Promise<TrustedDevice>;
  /** Looks up by the hashed token; returns null if missing or expired. */
  findValidByTokenHash(tokenHash: string): Promise<TrustedDevice | null>;
}
