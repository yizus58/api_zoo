import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { checkJWT } from '../helpers/jwt';
import { UserService } from '../services/user.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const token = authorization.replace('Bearer ', '');
    const [isValid, payload] = checkJWT(token);

    if (!isValid || !payload) {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.userService.findById(payload.uid);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return true;
  }
}
