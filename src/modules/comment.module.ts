import { Module } from '@nestjs/common';
import { CommentController } from '../controllers/comment.controller';
import { CommentService } from '../services/comment.service';
import { AuthModule } from './auth.module';
import { RolesGuard } from '../guards/roles.guard';
import { DatabaseModule } from './database.module';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [CommentController],
  providers: [CommentService, RolesGuard],
  exports: [CommentService],
})
export class CommentModule {}
