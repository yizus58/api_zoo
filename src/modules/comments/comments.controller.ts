import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { Comment } from './comment.model';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('comentarios')
@ApiBearerAuth()
@Controller('comentarios')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Comentario o respuesta creada' })
  @ApiNotFoundResponse({
    description: 'El animal o el comentario principal no existen',
  })
  @ApiBadRequestResponse({
    description: 'El comentario principal es de otro animal o es una respuesta',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCommentDto,
  ): Promise<Comment> {
    return this.comments.create(user.id, dto);
  }

  @Get()
  @ApiOkResponse({ description: 'Todos los comentarios ([] si no hay)' })
  findAll(): Promise<Comment[]> {
    return this.comments.findAll();
  }

  @Get(':animalId')
  @ApiOkResponse({
    description: 'Comentarios principales del animal con sus respuestas',
  })
  @ApiNotFoundResponse({ description: 'El animal especificado no existe' })
  findByAnimal(
    @Param('animalId', ParseUUIDPipe) animalId: string,
  ): Promise<Comment[]> {
    return this.comments.findByAnimal(animalId);
  }

  @Put(':id')
  @ApiOkResponse({ description: 'Comentario actualizado' })
  @ApiForbiddenResponse({ description: 'Solo el autor puede editarlo' })
  @ApiNotFoundResponse({ description: 'El comentario especificado no existe' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<Comment> {
    return this.comments.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Comentario y sus respuestas eliminados',
  })
  @ApiForbiddenResponse({ description: 'Ni autor, ni ADMIN, ni EMPLEADO' })
  @ApiNotFoundResponse({ description: 'El comentario especificado no existe' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.comments.remove(id, user);
  }
}
