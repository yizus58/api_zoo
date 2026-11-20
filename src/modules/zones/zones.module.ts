import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Species } from '../species/species.model';
import { Zone } from './zone.model';
import { ZonesController } from './zones.controller';
import { ZonesService } from './zones.service';

@Module({
  imports: [SequelizeModule.forFeature([Zone, Species])],
  controllers: [ZonesController],
  providers: [ZonesService],
})
export class ZonesModule {}
