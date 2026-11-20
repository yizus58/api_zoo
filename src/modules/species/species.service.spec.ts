import { ConflictException, NotFoundException } from '@nestjs/common';
import { instance, modelMock, ModelMock } from '../../testing/model-mock';
import {
  AREA_NOT_FOUND,
  SPECIES_NOT_FOUND,
  SpeciesService,
} from './species.service';

describe('SpeciesService', () => {
  let species: ModelMock;
  let zones: ModelMock;
  let animals: ModelMock;
  let service: SpeciesService;
  const dto = { nombre: 'Felinos', id_area: 'z' };

  beforeEach(() => {
    species = modelMock();
    zones = modelMock();
    animals = modelMock();
    service = new SpeciesService(
      species as never,
      zones as never,
      animals as never,
    );
  });

  it('findAll and findById (404)', async () => {
    species.findAll.mockResolvedValue([]);
    await expect(service.findAll()).resolves.toEqual([]);
    species.findByPk
      .mockResolvedValueOnce({ id: 's' })
      .mockResolvedValueOnce(null);
    await expect(service.findById('s')).resolves.toEqual({ id: 's' });
    await expect(service.findById('x')).rejects.toThrow(
      new NotFoundException(SPECIES_NOT_FOUND),
    );
  });

  it('create: happy path, 409 for a taken name, 404 for an unknown area', async () => {
    species.findOne.mockResolvedValue(null);
    zones.findByPk.mockResolvedValue({ id: 'z' });
    species.create.mockResolvedValue({ id: 's', ...dto });
    await expect(service.create(dto)).resolves.toEqual({ id: 's', ...dto });

    species.findOne.mockResolvedValueOnce({ id: 'other' });
    await expect(service.create(dto)).rejects.toThrow(ConflictException);

    zones.findByPk.mockResolvedValueOnce(null);
    await expect(service.create(dto)).rejects.toThrow(
      new NotFoundException(AREA_NOT_FOUND),
    );
  });

  it('update: keeping the same name is allowed (it used to be 409)', async () => {
    const row = instance({ id: 's', ...dto });
    species.findByPk.mockResolvedValue(row);
    zones.findByPk.mockResolvedValue({ id: 'z' });
    species.findOne.mockResolvedValue(null);
    await service.update('s', dto);
    expect(row.update).toHaveBeenCalledWith(dto);
  });

  it('update: 404 species, 404 area, 409 name of another species', async () => {
    species.findByPk.mockResolvedValueOnce(null);
    await expect(service.update('x', dto)).rejects.toThrow(
      new NotFoundException(SPECIES_NOT_FOUND),
    );

    species.findByPk.mockResolvedValue(instance({ id: 's' }));
    zones.findByPk.mockResolvedValueOnce(null);
    await expect(service.update('s', dto)).rejects.toThrow(
      new NotFoundException(AREA_NOT_FOUND),
    );

    zones.findByPk.mockResolvedValue({ id: 'z' });
    species.findOne.mockResolvedValueOnce({ id: 'other' });
    await expect(service.update('s', dto)).rejects.toThrow(ConflictException);
  });

  it('remove: 404, 409 with animals (it crashed with 500), otherwise destroyed', async () => {
    species.findByPk.mockResolvedValueOnce(null);
    await expect(service.remove('x')).rejects.toThrow(NotFoundException);

    const row = instance({ id: 's' });
    species.findByPk.mockResolvedValue(row);
    animals.count.mockResolvedValueOnce(1);
    await expect(service.remove('s')).rejects.toThrow(ConflictException);
    animals.count.mockResolvedValueOnce(0);
    await service.remove('s');
    expect(row.destroy).toHaveBeenCalled();
  });
});
