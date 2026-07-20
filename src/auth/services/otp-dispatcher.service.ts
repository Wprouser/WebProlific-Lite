import { Injectable, Logger } from '@nestjs/common';
import { TwoFactorMethod } from '../constants/enums';

export const OTP_DISPATCHER = Symbol('OTP_DISPATCHER');

export interface OtpDispatcher {
  /** Sends a one-time code to the user via SMS/EMAIL. Never called for TOTP. */
  dispatch(destination: string, method: Extract<TwoFactorMethod, 'SMS' | 'EMAIL'>, code: string): Promise<void>;
}

/**
 * No SMS/email provider (Twilio, SendGrid, etc.) is configured in this
 * project yet — this dev-only implementation just logs the code so the
 * login/enrollment flow is fully testable end-to-end. Swap the binding in
 * auth.module.ts for a real provider-backed implementation later; every
 * caller depends on the OtpDispatcher interface, not this class.
 */
@Injectable()
export class ConsoleOtpDispatcherService implements OtpDispatcher {
  private readonly logger = new Logger(ConsoleOtpDispatcherService.name);

  async dispatch(
    destination: string,
    method: Extract<TwoFactorMethod, 'SMS' | 'EMAIL'>,
    code: string,
  ): Promise<void> {
    this.logger.log(`[DEV OTP] ${method} to ${destination}: ${code}`);
  }
}
