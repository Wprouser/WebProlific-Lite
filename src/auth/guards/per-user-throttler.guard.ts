import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Spec requires login/2fa-verify/2fa-resend rate limits "per user", not per
 * IP — overrides the default IP-based tracker to key on the identifier
 * already present in the request body for these routes (email or
 * pendingTwoFactorToken), falling back to IP if neither is present.
 */
@Injectable()
export class PerUserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const body = req.body ?? {};
    return body.email ?? body.pendingTwoFactorToken ?? req.ip;
  }
}
