import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import {
  BCRYPT_ROUNDS,
  toResponse,
  UsersService,
} from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { TokenService } from './token.service';

export const INVALID_CREDENTIALS = 'Credenciales inválidas';

/** Hash of a random string, compared when the email is unknown so both cases take as long. */
let dummyHash: string | undefined;
const getDummyHash = () =>
  (dummyHash ??= bcrypt.hashSync(randomUUID(), BCRYPT_ROUNDS));

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
  ) {}

  /** Unknown email and wrong password get the same 401, so emails cannot be enumerated. */
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.password ?? getDummyHash(),
    );
    if (!user || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const token = this.tokens.sign({
      uid: user.id,
      email: user.email,
      role: user.role,
    });
    return { token, user: toResponse(user) };
  }
}
