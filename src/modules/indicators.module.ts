import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Animal } from '../models/animal.model';
import { Comment } from '../models/comment.model';
import { Species } from '../models/species.model';
import { User } from '../models/user.model';
import { Zone } from '../models/zone.model';
import { AuthModule } from './auth.module';
import { RolesGuard } from '../guards/roles.guard';
import { IndicatorsController } from '../controllers/indicators.controller';
import { IndicatorsService } from '../services/indicators.services';

@Module({
  imports: [
    SequelizeModule.forFeature([Animal, Comment, Species, User, Zone]),
    AuthModule,
  ],
  controllers: [IndicatorsController],
  providers: [IndicatorsService, RolesGuard],
  exports: [IndicatorsService],
})
export class IndicatorsModule {}
