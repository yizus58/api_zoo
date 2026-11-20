import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Includeable } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { UserRole } from '../../common/types/user-role';
import { Animal } from '../animals/animal.model';
import { User } from '../users/user.model';
import { Comment } from './comment.model';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

export const ANIMAL_NOT_FOUND = 'El animal especificado no existe';
export const COMMENT_NOT_FOUND = 'El comentario especificado no existe';
export const PARENT_NOT_FOUND =
  'El comentario principal especificado no existe';

// Factories, not constants: Sequelize mutates the include objects it is given.
const author = (): Includeable => ({ model: User, attributes: ['email'] });
const replies = (): Includeable => ({
  model: Comment,
  as: 'respuestas',
  attributes: ['id', 'comentario', 'fecha'],
  include: [author()],
});
const PUBLIC_ATTRIBUTES = ['id', 'comentario', 'fecha'];

/** Roles that moderate comments: they may delete anybody's comment. */
const MODERATORS = [UserRole.ADMIN, UserRole.EMPLEADO];

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment) private readonly comments: typeof Comment,
    @InjectModel(Animal) private readonly animals: typeof Animal,
    private readonly sequelize: Sequelize,
  ) {}

  findAll(): Promise<Comment[]> {
    return this.comments.findAll({
      attributes: PUBLIC_ATTRIBUTES,
      include: [
        { model: Animal, attributes: ['nombre'] },
        author(),
        {
          model: Comment,
          as: 'comentarioPrincipal',
          attributes: ['comentario'],
        },
        replies(),
      ],
      order: [['fecha', 'ASC']],
    });
  }

  /** Main comments of an animal, each with its replies. */
  async findByAnimal(animalId: string): Promise<Comment[]> {
    await this.ensureAnimalExists(animalId);
    return this.comments.findAll({
      where: { id_animal: animalId, id_comentario_principal: null },
      attributes: PUBLIC_ATTRIBUTES,
      include: [{ model: Animal, attributes: ['nombre'] }, author(), replies()],
      order: [
        ['fecha', 'ASC'],
        [{ model: Comment, as: 'respuestas' }, 'fecha', 'ASC'],
      ],
    });
  }

  /**
   * A reply must answer a main comment of the same animal: replies are one level deep,
   * which is how they are listed and reported.
   */
  async create(userId: string, dto: CreateCommentDto): Promise<Comment> {
    await this.ensureAnimalExists(dto.id_animal);

    if (dto.id_comentario_principal) {
      const parent = await this.comments.findByPk(dto.id_comentario_principal);
      if (!parent) {
        throw new NotFoundException(PARENT_NOT_FOUND);
      }
      if (parent.id_animal !== dto.id_animal) {
        throw new BadRequestException(
          'El comentario principal pertenece a otro animal',
        );
      }
      if (parent.id_comentario_principal) {
        throw new BadRequestException(
          'Solo se puede responder a un comentario principal',
        );
      }
    }

    return this.comments.create({
      comentario: dto.comentario,
      id_animal: dto.id_animal,
      id_user: userId,
      id_comentario_principal: dto.id_comentario_principal ?? null,
      fecha: new Date(),
    });
  }

  /** Only the author edits a comment. */
  async update(
    id: string,
    userId: string,
    dto: UpdateCommentDto,
  ): Promise<Comment> {
    const comment = await this.findComment(id);
    if (comment.id_user !== userId) {
      throw new ForbiddenException('No puede modificar este comentario');
    }
    return comment.update({ comentario: dto.comentario });
  }

  /** The author, an ADMIN or an EMPLEADO may delete; the replies go with the comment. */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const comment = await this.findComment(id);
    if (comment.id_user !== user.id && !MODERATORS.includes(user.role)) {
      throw new ForbiddenException(
        'No tiene permisos para eliminar este comentario',
      );
    }
    await this.sequelize.transaction(async (transaction) => {
      await this.comments.destroy({
        where: { id_comentario_principal: id },
        transaction,
      });
      await comment.destroy({ transaction });
    });
  }

  private async findComment(id: string): Promise<Comment> {
    const comment = await this.comments.findByPk(id);
    if (!comment) {
      throw new NotFoundException(COMMENT_NOT_FOUND);
    }
    return comment;
  }

  private async ensureAnimalExists(id: string): Promise<void> {
    if (!(await this.animals.findByPk(id))) {
      throw new NotFoundException(ANIMAL_NOT_FOUND);
    }
  }
}
