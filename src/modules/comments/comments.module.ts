import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Animal } from '../animals/animal.model';
import { Comment } from './comment.model';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [SequelizeModule.forFeature([Comment, Animal])],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
