import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  instance,
  modelMock,
  ModelMock,
  sequelizeMock,
} from '../../testing/model-mock';
import {
  ANIMAL_NOT_FOUND,
  AnimalsService,
  SPECIES_NOT_FOUND,
} from './animals.service';

describe('AnimalsService', () => {
  let animals: ModelMock;
  let species: ModelMock;
  let comments: ModelMock;
  let sequelize: ReturnType<typeof sequelizeMock>;
  let service: AnimalsService;
  const dto = { nombre: 'Leon', id_especie: 's' };

  beforeEach(() => {
    animals = modelMock();
    species = modelMock();
    comments = modelMock();
    sequelize = sequelizeMock();
    service = new AnimalsService(
      animals as never,
      species as never,
      comments as never,
      sequelize as never,
    );
  });

  it('findAll and findById (404)', async () => {
    animals.findAll.mockResolvedValue([]);
    await expect(service.findAll()).resolves.toEqual([]);
    animals.findByPk.mockResolvedValueOnce(null);
    await expect(service.findById('x')).rejects.toThrow(NotFoundException);
  });

  it('create: the employee becomes responsible; 409 name; 404 species', async () => {
    animals.findOne.mockResolvedValue(null);
    species.findByPk.mockResolvedValue({ id: 's' });
    animals.create.mockImplementation(async (values) => ({
      id: 'a',
      ...values,
    }));
    const created = await service.create('u1', dto);
    expect(created).toEqual(
      expect.objectContaining({
        ...dto,
        id_user: 'u1',
        fecha: expect.any(Date),
      }),
    );

    animals.findOne.mockResolvedValueOnce({ id: 'other' });
    await expect(service.create('u1', dto)).rejects.toThrow(ConflictException);

    species.findByPk.mockResolvedValueOnce(null);
    await expect(service.create('u1', dto)).rejects.toThrow(
      new NotFoundException(SPECIES_NOT_FOUND),
    );
  });

  it("update: only the responsible employee; 409 for another animal's name (it was 500)", async () => {
    const animal = instance({ id: 'a', id_user: 'u1' });
    animals.findByPk.mockResolvedValue(animal);
    species.findByPk.mockResolvedValue({ id: 's' });

    await expect(service.update('a', 'u2', dto)).rejects.toThrow(
      ForbiddenException,
    );

    animals.findOne.mockResolvedValueOnce({ id: 'other' });
    await expect(service.update('a', 'u1', dto)).rejects.toThrow(
      ConflictException,
    );

    animals.findOne.mockResolvedValueOnce(null);
    await service.update('a', 'u1', dto);
    expect(animal.update).toHaveBeenCalledWith(dto);

    animals.findByPk.mockResolvedValueOnce(null);
    await expect(service.update('x', 'u1', dto)).rejects.toThrow(
      new NotFoundException(ANIMAL_NOT_FOUND),
    );
  });

  it('remove: owner only; comments and animal deleted in one transaction', async () => {
    const animal = instance({ id: 'a', id_user: 'u1' });
    animals.findByPk.mockResolvedValue(animal);
    await expect(service.remove('a', 'u2')).rejects.toThrow(ForbiddenException);
    expect(sequelize.transaction).not.toHaveBeenCalled();

    await service.remove('a', 'u1');
    expect(comments.destroy).toHaveBeenCalledWith({
      where: { id_animal: 'a' },
      transaction: sequelize.transactionObject,
    });
    expect(animal.destroy).toHaveBeenCalledWith({
      transaction: sequelize.transactionObject,
    });
  });
});
