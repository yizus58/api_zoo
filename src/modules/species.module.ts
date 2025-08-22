import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SpeciesController } from '../controllers/species.controller';
import { SpeciesService } from '../services/species.service';
import { RolesGuard } from '../guards/roles.guard';
import { Species } from '../models/species.model';
import { Zone } from '../models/zone.model';
import { AuthModule } from './auth.module';

@Module({
  imports: [SequelizeModule.forFeature([Species, Zone]), AuthModule],
  controllers: [SpeciesController],
  providers: [SpeciesService, RolesGuard],
  exports: [SpeciesService],
})
export class SpeciesModule {}
