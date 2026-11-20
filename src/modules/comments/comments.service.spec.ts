import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../common/types/user-role';
import {
  instance,
  modelMock,
  ModelMock,
  sequelizeMock,
} from '../../testing/model-mock';
import {
  ANIMAL_NOT_FOUND,
  COMMENT_NOT_FOUND,
  CommentsService,
  PARENT_NOT_FOUND,
} from './comments.service';

describe('CommentsService', () => {
  let comments: ModelMock;
  let animals: ModelMock;
  let sequelize: ReturnType<typeof sequelizeMock>;
  let service: CommentsService;
  const visitor = { id: 'u1', email: 'v@mail.com', role: UserRole.USUARIO };

  beforeEach(() => {
    comments = modelMock();
    animals = modelMock();
    sequelize = sequelizeMock();
    service = new CommentsService(
      comments as never,
      animals as never,
      sequelize as never,
    );
    animals.findByPk.mockResolvedValue({ id: 'a' });
  });

  it('findAll returns every comment with fresh include objects each call', async () => {
    comments.findAll.mockResolvedValue([]);
    await service.findAll();
    await service.findAll();
    const [first, second] = comments.findAll.mock.calls.map(
      (call) => call[0].include,
    );
    expect(first).toEqual(second);
    expect(first[1]).not.toBe(second[1]);
  });

  it('findByAnimal: main comments only; 404 for an unknown animal', async () => {
    comments.findAll.mockResolvedValue([]);
    await expect(service.findByAnimal('a')).resolves.toEqual([]);
    expect(comments.findAll.mock.calls[0][0].where).toEqual({
      id_animal: 'a',
      id_comentario_principal: null,
    });

    animals.findByPk.mockResolvedValueOnce(null);
    await expect(service.findByAnimal('x')).rejects.toThrow(
      new NotFoundException(ANIMAL_NOT_FOUND),
    );
  });

  it('create a main comment', async () => {
    comments.create.mockImplementation(async (values) => ({
      id: 'c',
      ...values,
    }));
    const created = await service.create('u1', {
      comentario: 'Hola',
      id_animal: 'a',
    });
    expect(created).toEqual(
      expect.objectContaining({ id_user: 'u1', id_comentario_principal: null }),
    );
  });

  it('create a reply: parent 404, other animal 400, reply to a reply 400, otherwise ok', async () => {
    const reply = {
      comentario: 'Re',
      id_animal: 'a',
      id_comentario_principal: 'p',
    };
    comments.findByPk.mockResolvedValueOnce(null);
    await expect(service.create('u1', reply)).rejects.toThrow(
      new NotFoundException(PARENT_NOT_FOUND),
    );

    comments.findByPk.mockResolvedValueOnce({
      id: 'p',
      id_animal: 'b',
      id_comentario_principal: null,
    });
    await expect(service.create('u1', reply)).rejects.toThrow(
      BadRequestException,
    );

    comments.findByPk.mockResolvedValueOnce({
      id: 'p',
      id_animal: 'a',
      id_comentario_principal: 'root',
    });
    await expect(service.create('u1', reply)).rejects.toThrow(
      BadRequestException,
    );

    comments.findByPk.mockResolvedValueOnce({
      id: 'p',
      id_animal: 'a',
      id_comentario_principal: null,
    });
    comments.create.mockImplementation(async (values) => values);
    await expect(service.create('u1', reply)).resolves.toEqual(
      expect.objectContaining({ id_comentario_principal: 'p' }),
    );
  });

  it('create: 404 for an unknown animal', async () => {
    animals.findByPk.mockResolvedValueOnce(null);
    await expect(
      service.create('u1', { comentario: 'x', id_animal: 'x' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('update: 404 (it was 403), other author 403 (it was 401), only the text changes', async () => {
    comments.findByPk.mockResolvedValueOnce(null);
    await expect(
      service.update('x', 'u1', { comentario: 'n' }),
    ).rejects.toThrow(new NotFoundException(COMMENT_NOT_FOUND));

    const comment = instance({ id: 'c', id_user: 'u1' });
    comments.findByPk.mockResolvedValue(comment);
    await expect(
      service.update('c', 'u2', { comentario: 'n' }),
    ).rejects.toThrow(ForbiddenException);
    await service.update('c', 'u1', { comentario: 'nuevo' });
    expect(comment.update).toHaveBeenCalledWith({ comentario: 'nuevo' });
  });

  it.each([
    ['the author', visitor, true],
    ['another visitor', { ...visitor, id: 'u2' }, false],
    ['an employee', { ...visitor, id: 'e', role: UserRole.EMPLEADO }, true],
    ['an admin', { ...visitor, id: 'ad', role: UserRole.ADMIN }, true],
  ])(
    'remove by %s allowed: %p (replies deleted in the same transaction)',
    async (_label, user, allowed) => {
      const comment = instance({ id: 'c', id_user: 'u1' });
      comments.findByPk.mockResolvedValue(comment);
      if (!allowed) {
        await expect(service.remove('c', user)).rejects.toThrow(
          ForbiddenException,
        );
        expect(comment.destroy).not.toHaveBeenCalled();
        return;
      }
      await service.remove('c', user);
      expect(comments.destroy).toHaveBeenCalledWith({
        where: { id_comentario_principal: 'c' },
        transaction: sequelize.transactionObject,
      });
      expect(comment.destroy).toHaveBeenCalledWith({
        transaction: sequelize.transactionObject,
      });
    },
  );

  it('remove: 404 for an unknown comment', async () => {
    comments.findByPk.mockResolvedValue(null);
    await expect(service.remove('x', visitor)).rejects.toThrow(
      NotFoundException,
    );
  });
});
