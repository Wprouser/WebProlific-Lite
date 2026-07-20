import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

/**
 * bcryptjs (pure JS) instead of native `bcrypt`, to avoid node-gyp build
 * requirements on developer machines — same algorithm/cost, spec-compliant.
 */
@Injectable()
export class PasswordService {
  async hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, BCRYPT_COST);
  }

  async verify(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }
}
