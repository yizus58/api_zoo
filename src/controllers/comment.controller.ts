import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  UseGuards,
  Get,
  Request,
  Put,
  Param,
  Delete,
} from '@nestjs/common';
import { CommentService } from '../services/comment.service';
import { CommentDto } from '../dto/comment.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

@Controller('comentarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  async createComment(
    @Request() req,
    @Body(ValidationPipe) commentDto: CommentDto,
  ) {
    return await this.commentService.createComment(req.user.id, commentDto);
  }

  @Put(':id')
  async updateComment(
    @Request() req,
    @Param('id') id: string,
    @Body(ValidationPipe) commentDto: CommentDto,
  ) {
    return await this.commentService.updateComment(id, req.user.id, commentDto);
  }

  @Delete(':id')
  async deleteComment(@Request() req, @Param('id') id: string) {
    return await this.commentService.deleteComment(req.user.id, id);
  }

  @Get()
  async getAllComments() {
    return this.commentService.getAllComments();
  }

  @Get(':animalId')
  async getCommentsByAnimal(@Param('animalId') animalId: string) {
    return this.commentService.getCommentsByAnimal(animalId);
  }
}
