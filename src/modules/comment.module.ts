import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Comment } from '../models/comment.model';
import { Animal } from '../models/animal.model';
import { User } from '../models/user.model';
import { CommentController } from '../controllers/comment.controller';
import { CommentService } from '../services/comment.service';
import { AuthModule } from './auth.module';
import { RolesGuard } from '../guards/roles.guard';

@Module({
  imports: [SequelizeModule.forFeature([Comment, Animal, User]), AuthModule],
  controllers: [CommentController],
  providers: [CommentService, RolesGuard],
  exports: [CommentService],
})
export class CommentModule {}
