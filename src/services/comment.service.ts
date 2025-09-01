import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CommentDto } from '../dto/comment.dto';
import { Animal } from '../models/animal.model';
import { Comment } from '../models/comment.model';
import { User } from '../models/user.model';
import { UserRole } from '../types/user.types';

interface CommentWithAnimalAndUser {
  comentario: string;
  id_animal: string;
  id_user: string;
  fecha: Date;
  id_comentario_principal?: string;
}

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment)
    private readonly commentRepository: typeof Comment,
    @InjectModel(Animal)
    private readonly animalRepository: typeof Animal,
    @InjectModel(User)
    private readonly userRepository: typeof User,
  ) {}

  async getAllComments() {
    const findComments = await this.commentRepository.findAll({
      attributes: {
        exclude: ['id_animal', 'id_user', 'id_comentario_principal'],
      },
      include: [
        {
          model: Animal,
          attributes: ['nombre'],
        },
        {
          model: User,
          attributes: ['email'],
        },
        {
          model: Comment,
          as: 'comentarioPrincipal',
          attributes: ['comentario'],
        },
        {
          model: Comment,
          as: 'respuestas',
          attributes: ['id', 'comentario'],
          include: [
            {
              model: User,
              attributes: ['email'],
            },
          ],
        },
      ],
    });

    if (findComments.length == 0) {
      throw new HttpException(
        'No hay comentarios registrados',
        HttpStatus.NOT_FOUND,
      );
    }
    return findComments;
  }

  async getCommentsByAnimal(animalId: string) {
    const findAnimal = await this.animalRepository.findByPk(animalId);
    if (!findAnimal) {
      throw new HttpException(
        'El animal especificado no existe',
        HttpStatus.FORBIDDEN,
      );
    }

    const findComments = await this.commentRepository.findAll({
      where: { id_animal: animalId, id_comentario_principal: null },
      attributes: {
        exclude: ['id_animal', 'id_user', 'id_comentario_principal'],
      },
      include: [
        {
          model: Animal,
          attributes: ['nombre'],
        },
        {
          model: User,
          attributes: ['email'],
        },
        {
          model: Comment,
          as: 'respuestas',
          attributes: ['id', 'comentario'],
          include: [
            {
              model: User,
              attributes: ['email'],
            },
          ],
        },
      ],
    });

    return findComments;
  }

  async createComment(id: string, commentDto: CommentDto) {
    const findAnimal = await this.animalRepository.findByPk(
      commentDto.id_animal,
    );
    if (!findAnimal) {
      throw new HttpException(
        'El animal especificado no existe',
        HttpStatus.FORBIDDEN,
      );
    }

    const findUser = await this.userRepository.findByPk(id);
    if (!findUser) {
      throw new HttpException(
        'El usuario especificado no existe',
        HttpStatus.FORBIDDEN,
      );
    }

    const data: CommentWithAnimalAndUser = {
      comentario: commentDto.comentario,
      id_animal: commentDto.id_animal,
      id_user: id,
      fecha: new Date(),
    };

    if (commentDto.id_comentario_principal) {
      const findMainComment = await this.commentRepository.findByPk(
        commentDto.id_comentario_principal,
      );
      if (!findMainComment) {
        throw new HttpException(
          'El comentario principal especificado no existe',
          HttpStatus.FORBIDDEN,
        );
      }
      data.id_comentario_principal = commentDto.id_comentario_principal;
    }

    const save = await this.commentRepository.create(data);
    if (save) {
      return 'Comentario creado correctamente';
    }
  }

  async updateComment(id: string, id_user: string, commentDto: CommentDto) {
    const findComment = await this.commentRepository.findByPk(id);
    if (!findComment) {
      throw new HttpException(
        'El comentario especificado no existe',
        HttpStatus.FORBIDDEN,
      );
    }

    const findAnimal = await this.animalRepository.findByPk(
      commentDto.id_animal,
    );
    if (!findAnimal) {
      throw new HttpException(
        'El animal especificado no existe',
        HttpStatus.FORBIDDEN,
      );
    }

    const findUser = await this.userRepository.findByPk(id_user);
    if (!findUser) {
      throw new HttpException(
        'El usuario especificado no existe',
        HttpStatus.FORBIDDEN,
      );
    }

    if (commentDto.id_comentario_principal) {
      const findMainComment = await this.commentRepository.findByPk(
        commentDto.id_comentario_principal,
      );
      if (!findMainComment) {
        throw new HttpException(
          'El comentario principal especificado no existe',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    if (id_user !== findComment.id_user) {
      throw new HttpException(
        'No puede modificar este comentario',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const update = await this.commentRepository.update(commentDto, {
      where: { id },
    });

    if (update) {
      return 'Comentario actualizado correctamente';
    }
  }

  async deleteComment(id_user: string, id: string) {
    const findUser = await this.userRepository.findByPk(id_user);
    if (!findUser) {
      throw new HttpException(
        'El usuario especificado no existe',
        HttpStatus.FORBIDDEN,
      );
    }

    const findComment = await this.commentRepository.findByPk(id);
    if (!findComment) {
      throw new HttpException(
        'El comentario especificado no existe',
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      findUser.role == UserRole.ADMIN ||
      findUser.role == UserRole.EMPLEADO ||
      id_user == findComment.id_user
    ) {
      const deleteComment = await this.commentRepository.destroy({
        where: { id },
      });

      if (deleteComment) {
        return 'Comentario eliminado correctamente';
      }
    }
    throw new UnauthorizedException(
      'No tiene permisos para eliminar este comentario',
    );
  }
}
