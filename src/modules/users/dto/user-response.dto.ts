import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/types/user-role';

export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426655440000' })
  id: string;

  @ApiProperty({ example: 'john.doe@mail.com' })
  email: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;
}
