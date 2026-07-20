import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';

export interface AccessTokenPayload {
  sub: string; // userId
}

/**
 * Pure crypto/JWT primitives — no repository/Prisma access, per the
 * Repository Pattern rule (data access lives in AuthService/TwoFactorService
 * via the injected repositories, not here).
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  get accessTokenExpiresInSeconds(): number {
    return Number(this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? 900);
  }

  signAccessToken(userId: string): string {
    const payload: AccessTokenPayload = { sub: userId };
    return this.jwtService.sign(payload, { expiresIn: this.accessTokenExpiresInSeconds });
  }

  /** Throws if invalid/expired — callers (JwtAuthGuard) should catch and 401. */
  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwtService.verify<AccessTokenPayload>(token);
  }

  /** High-entropy opaque token for refresh/trusted-device/reset-password use. */
  generateOpaqueToken(): string {
    return randomBytes(48).toString('base64url');
  }

  /** SHA-256 is sufficient (not bcrypt) for these — inputs are already
   * high-entropy random tokens, not low-entropy user-chosen secrets. */
  hashOpaqueToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  refreshTokenExpiry(): Date {
    const days = Number(this.config.get<string>('JWT_REFRESH_EXPIRES_IN_DAYS') ?? 30);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  trustedDeviceExpiry(): Date {
    const days = Number(this.config.get<string>('TRUSTED_DEVICE_TTL_DAYS') ?? 30);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  passwordResetExpiry(): Date {
    return new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }

  pendingTwoFactorExpiry(): Date {
    const minutes = Number(this.config.get<string>('PENDING_2FA_TOKEN_TTL_MIN') ?? 10);
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  /** FR-14: invite tokens expire in 7 days per spec. */
  inviteTokenExpiry(): Date {
    const days = Number(this.config.get<string>('INVITE_TOKEN_TTL_DAYS') ?? 7);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
