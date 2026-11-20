import { ConflictException, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import { instance, modelMock, ModelMock } from '../../testing/model-mock';
import { ZONE_NOT_FOUND, ZonesService } from './zones.service';

describe('ZonesService', () => {
  let zones: ModelMock;
  let species: ModelMock;
  let service: ZonesService;

  beforeEach(() => {
    zones = modelMock();
    species = modelMock();
    service = new ZonesService(zones as never, species as never);
  });

  it('findAll includes species with their animals, by name', async () => {
    zones.findAll.mockResolvedValue([]);
    await expect(service.findAll()).resolves.toEqual([]);
    expect(zones.findAll.mock.calls[0][0]).toEqual(
      expect.objectContaining({ order: [['nombre', 'ASC']] }),
    );
  });

  it('builds fresh include objects on every call (Sequelize mutates them)', async () => {
    zones.findAll.mockResolvedValue([]);
    await service.findAll();
    await service.findAll();
    expect(zones.findAll.mock.calls[0][0].include[0]).not.toBe(
      zones.findAll.mock.calls[1][0].include[0],
    );
  });

  it('findById: zone or 404', async () => {
    zones.findByPk
      .mockResolvedValueOnce({ id: 'z' })
      .mockResolvedValueOnce(null);
    await expect(service.findById('z')).resolves.toEqual({ id: 'z' });
    await expect(service.findById('x')).rejects.toThrow(
      new NotFoundException(ZONE_NOT_FOUND),
    );
  });

  it('create: new name or 409', async () => {
    zones.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'other' });
    zones.create.mockResolvedValue({ id: 'z', nombre: 'Sabana' });
    await expect(service.create({ nombre: 'Sabana' })).resolves.toEqual({
      id: 'z',
      nombre: 'Sabana',
    });
    await expect(service.create({ nombre: 'Sabana' })).rejects.toThrow(
      ConflictException,
    );
  });

  it("update: 404, keeping its own name is fine, another zone's name is 409", async () => {
    const zone = instance({ id: 'z', nombre: 'Sabana' });
    zones.findByPk.mockResolvedValueOnce(null);
    await expect(service.update('x', { nombre: 'A' })).rejects.toThrow(
      NotFoundException,
    );

    zones.findByPk.mockResolvedValue(zone);
    zones.findOne.mockResolvedValueOnce(null);
    await service.update('z', { nombre: 'Sabana' });
    expect(zones.findOne).toHaveBeenLastCalledWith({
      where: { nombre: 'Sabana', id: { [Op.ne]: 'z' } },
    });
    expect(zone.update).toHaveBeenCalledWith({ nombre: 'Sabana' });

    zones.findOne.mockResolvedValueOnce({ id: 'other' });
    await expect(service.update('z', { nombre: 'Selva' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('remove: 404, 409 while it has species, otherwise destroyed', async () => {
    zones.findByPk.mockResolvedValueOnce(null);
    await expect(service.remove('x')).rejects.toThrow(NotFoundException);

    const zone = instance({ id: 'z' });
    zones.findByPk.mockResolvedValue(zone);
    species.count.mockResolvedValueOnce(2);
    await expect(service.remove('z')).rejects.toThrow(ConflictException);
    expect(zone.destroy).not.toHaveBeenCalled();

    species.count.mockResolvedValueOnce(0);
    await service.remove('z');
    expect(zone.destroy).toHaveBeenCalled();
  });
});
