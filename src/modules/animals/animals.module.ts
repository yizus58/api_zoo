import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Comment } from '../comments/comment.model';
import { Species } from '../species/species.model';
import { Animal } from './animal.model';
import { AnimalsController } from './animals.controller';
import { AnimalsService } from './animals.service';

@Module({
  imports: [SequelizeModule.forFeature([Animal, Species, Comment])],
  controllers: [AnimalsController],
  providers: [AnimalsService],
})
export class AnimalsModule {}
