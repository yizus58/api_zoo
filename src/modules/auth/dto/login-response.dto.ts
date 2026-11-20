import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT para el header Authorization: Bearer <token>',
  })
  token: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
