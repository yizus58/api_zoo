import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../types/user-role';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

function context(request: object): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const tokens = { verify: jest.fn() };
  const users = { findAuthenticated: jest.fn() };
  const guard = new JwtAuthGuard(
    reflector as unknown as Reflector,
    tokens as never,
    users as never,
  );
  const user = { id: 'u1', email: 'a@mail.com', role: UserRole.USUARIO };

  beforeEach(() => jest.resetAllMocks());

  it('lets @Public() routes through without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(context({ headers: {} }))).resolves.toBe(
      true,
    );
    expect(tokens.verify).not.toHaveBeenCalled();
  });

  it.each([undefined, 'token', 'Basic abc', 'Bearer', 'Bearer a b'])(
    '401 "Token no proporcionado" for header %p',
    async (authorization) => {
      await expect(
        guard.canActivate(context({ headers: { authorization } })),
      ).rejects.toThrow(new UnauthorizedException('Token no proporcionado'));
    },
  );

  it('401 "Token inválido" when the signature or expiry is wrong', async () => {
    tokens.verify.mockReturnValue(null);
    await expect(
      guard.canActivate(context({ headers: { authorization: 'Bearer abc' } })),
    ).rejects.toThrow(new UnauthorizedException('Token inválido'));
  });

  it('401 "Usuario no encontrado" when the user was deleted (it was 404)', async () => {
    tokens.verify.mockReturnValue({ uid: 'gone' });
    users.findAuthenticated.mockResolvedValue(null);
    await expect(
      guard.canActivate(context({ headers: { authorization: 'Bearer abc' } })),
    ).rejects.toThrow(new UnauthorizedException('Usuario no encontrado'));
  });

  it('attaches the current user (role from the database) to the request', async () => {
    tokens.verify.mockReturnValue({ uid: 'u1', role: UserRole.ADMIN });
    users.findAuthenticated.mockResolvedValue(user);
    const request: { headers: object; user?: unknown } = {
      headers: { authorization: 'bearer abc' },
    };
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(tokens.verify).toHaveBeenCalledWith('abc');
    expect(request.user).toBe(user);
  });
});

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  it('allows any authenticated user when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(context({}))).toBe(true);
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(context({}))).toBe(true);
  });

  it('allows a user with one of the roles', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.ADMIN,
      UserRole.USUARIO,
    ]);
    expect(
      guard.canActivate(context({ user: { role: UserRole.USUARIO } })),
    ).toBe(true);
  });

  it('403 for any other role or no user', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(() =>
      guard.canActivate(context({ user: { role: UserRole.EMPLEADO } })),
    ).toThrow(
      new ForbiddenException('No tiene permisos para realizar esta acción'),
    );
    expect(() => guard.canActivate(context({}))).toThrow(ForbiddenException);
  });
});
