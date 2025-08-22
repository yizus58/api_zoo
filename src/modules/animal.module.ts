import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Animal } from '../models/animal.model';
import { Species } from '../models/species.model';
import { User } from '../models/user.model';
import { AnimalController } from '../controllers/animal.controller';
import { AnimalService } from '../services/animal.service';
import { AuthModule } from './auth.module';
import { RolesGuard } from '../guards/roles.guard';

@Module({
  imports: [SequelizeModule.forFeature([Animal, Species, User]), AuthModule],
  controllers: [AnimalController],
  providers: [AnimalService, RolesGuard],
  exports: [AnimalService],
})
export class AnimalModule {}
