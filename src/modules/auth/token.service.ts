import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { UserRole } from '../../common/types/user-role';

export interface TokenPayload {
  uid: string;
  email: string;
  role: UserRole;
}

/** HS256 tokens signed with JWT_KEY. */
@Injectable()
export class TokenService {
  constructor(private readonly config: ConfigService) {}

  sign(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret(), {
      algorithm: 'HS256',
      expiresIn: this.config.get('JWT_EXPIRES_IN', '24h'),
    });
  }

  /** The payload of a valid, unexpired token with a uid; otherwise null. */
  verify(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret(), {
        algorithms: ['HS256'],
      });
      if (typeof decoded !== 'object' || typeof decoded.uid !== 'string') {
        return null;
      }
      return decoded as unknown as TokenPayload;
    } catch {
      return null;
    }
  }

  private secret(): string {
    return this.config.getOrThrow<string>('JWT_KEY');
  }
}
