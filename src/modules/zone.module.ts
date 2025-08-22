import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ZoneController } from '../controllers/zone.controller';
import { ZoneService } from '../services/zone.service';
import { RolesGuard } from '../guards/roles.guard';
import { Zone } from '../models/zone.model';
import { AuthModule } from './auth.module';

@Module({
  imports: [SequelizeModule.forFeature([Zone]), AuthModule],
  controllers: [ZoneController],
  providers: [ZoneService, RolesGuard],
  exports: [ZoneService],
})
export class ZoneModule {}
