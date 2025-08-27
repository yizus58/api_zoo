import { Module } from '@nestjs/common';
import { AnimalController } from '../controllers/animal.controller';
import { AnimalService } from '../services/animal.service';
import { AuthModule } from './auth.module';
import { RolesGuard } from '../guards/roles.guard';
import { DatabaseModule } from './database.module';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AnimalController],
  providers: [AnimalService, RolesGuard],
  exports: [AnimalService],
})
export class AnimalModule {}
