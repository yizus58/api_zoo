import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Animal } from '../animals/animal.model';
import { Comment } from '../comments/comment.model';
import { Species } from '../species/species.model';
import { Zone } from '../zones/zone.model';
import { IndicatorsController } from './indicators.controller';
import { IndicatorsService } from './indicators.service';

@Module({
  imports: [SequelizeModule.forFeature([Animal, Comment, Species, Zone])],
  controllers: [IndicatorsController],
  providers: [IndicatorsService],
})
export class IndicatorsModule {}
