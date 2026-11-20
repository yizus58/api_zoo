import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Animal } from '../animals/animal.model';
import { Zone } from '../zones/zone.model';
import { SpeciesController } from './species.controller';
import { Species } from './species.model';
import { SpeciesService } from './species.service';

@Module({
  imports: [SequelizeModule.forFeature([Species, Zone, Animal])],
  controllers: [SpeciesController],
  providers: [SpeciesService],
})
export class SpeciesModule {}
