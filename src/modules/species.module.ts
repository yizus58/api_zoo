import { Module } from '@nestjs/common';
import { SpeciesController } from '../controllers/species.controller';
import { SpeciesService } from '../services/species.service';
import { RolesGuard } from '../guards/roles.guard';
import { AuthModule } from './auth.module';
import { DatabaseModule } from './database.module';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [SpeciesController],
  providers: [SpeciesService, RolesGuard],
  exports: [SpeciesService],
})
export class SpeciesModule {}
