import { Module } from '@nestjs/common';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { DatabaseModule } from './database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, UserService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, UserService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
