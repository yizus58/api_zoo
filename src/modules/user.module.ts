import { Module } from '@nestjs/common';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { DatabaseModule } from './database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [UserService, JwtAuthGuard, RolesGuard],
  exports: [UserService],
})
export class UserModule {}
