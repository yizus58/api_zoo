import { Module } from '@nestjs/common';
import { ZoneController } from '../controllers/zone.controller';
import { ZoneService } from '../services/zone.service';
import { RolesGuard } from '../guards/roles.guard';
import { AuthModule } from './auth.module';
import { DatabaseModule } from './database.module';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ZoneController],
  providers: [ZoneService, RolesGuard],
  exports: [ZoneService],
})
export class ZoneModule {}
