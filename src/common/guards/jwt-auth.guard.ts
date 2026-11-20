import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../types/authenticated-user';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenService } from '../../modules/auth/token.service';
import { UsersService } from '../../modules/users/users.service';

/**
 * Global guard: every route needs a valid "Bearer <jwt>" unless it is marked @Public().
 * The user and its role are read from the database, so a deleted user or a changed
 * role takes effect immediately instead of when the token expires.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const header = request.headers.authorization;
    const match = header?.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const payload = this.tokens.verify(match[1]);
    if (!payload) {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.users.findAuthenticated(payload.uid);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    request.user = user;
    return true;
  }
}
