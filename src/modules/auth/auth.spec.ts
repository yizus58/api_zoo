import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UserRole } from '../../common/types/user-role';
import { AuthService, INVALID_CREDENTIALS } from './auth.service';
import { TokenService } from './token.service';

const KEY = 'unit-test-signing-key-0123456789abcdef';
const config = (values: Record<string, string> = {}) =>
  new ConfigService({ JWT_KEY: KEY, ...values });

describe('TokenService', () => {
  const tokens = new TokenService(config());
  const payload = { uid: 'u1', email: 'a@mail.com', role: UserRole.ADMIN };

  it('signs HS256 tokens that verify back to the payload, 24h by default', () => {
    const token = tokens.sign(payload);
    expect(jwt.decode(token, { complete: true })?.header.alg).toBe('HS256');
    const verified = tokens.verify(token) as unknown as jwt.JwtPayload;
    expect(verified).toEqual(expect.objectContaining(payload));
    expect(verified.exp - verified.iat).toBe(24 * 3600);
  });

  it('honours JWT_EXPIRES_IN', () => {
    const verified = jwt.decode(
      new TokenService(config({ JWT_EXPIRES_IN: '1h' })).sign(payload),
    ) as jwt.JwtPayload;
    expect(verified.exp - verified.iat).toBe(3600);
  });

  it('rejects other keys, expired tokens, other algorithms, garbage and tokens without uid', () => {
    expect(
      tokens.verify(jwt.sign(payload, 'another-key-another-key-another-key')),
    ).toBeNull();
    expect(
      tokens.verify(
        jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) - 10 }, KEY),
      ),
    ).toBeNull();
    expect(
      tokens.verify(jwt.sign(payload, KEY, { algorithm: 'HS512' })),
    ).toBeNull();
    expect(tokens.verify(jwt.sign({ email: 'a@mail.com' }, KEY))).toBeNull();
    expect(tokens.verify('not-a-token')).toBeNull();
  });
});

describe('AuthService', () => {
  const users = { findByEmailWithPassword: jest.fn() };
  const tokens = { sign: jest.fn(() => 'signed-token') };
  const service = new AuthService(users as never, tokens as never);
  let hash: string;

  beforeAll(async () => {
    hash = await bcrypt.hash('right-password', 4);
  });
  beforeEach(() => jest.clearAllMocks());

  it('returns a token and the user without the password', async () => {
    users.findByEmailWithPassword.mockResolvedValue({
      id: 'u1',
      email: 'a@mail.com',
      role: UserRole.EMPLEADO,
      password: hash,
    });
    await expect(
      service.login({ email: 'a@mail.com', password: 'right-password' }),
    ).resolves.toEqual({
      token: 'signed-token',
      user: { id: 'u1', email: 'a@mail.com', role: UserRole.EMPLEADO },
    });
    expect(tokens.sign).toHaveBeenCalledWith({
      uid: 'u1',
      email: 'a@mail.com',
      role: UserRole.EMPLEADO,
    });
  });

  it('same 401 for a wrong password and an unknown email', async () => {
    users.findByEmailWithPassword.mockResolvedValueOnce({
      id: 'u1',
      email: 'a@mail.com',
      role: UserRole.EMPLEADO,
      password: hash,
    });
    await expect(
      service.login({ email: 'a@mail.com', password: 'wrong' }),
    ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS));
    users.findByEmailWithPassword.mockResolvedValueOnce(null);
    await expect(
      service.login({ email: 'nobody@mail.com', password: 'whatever' }),
    ).rejects.toThrow(new UnauthorizedException(INVALID_CREDENTIALS));
    expect(tokens.sign).not.toHaveBeenCalled();
  });
});
