import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
  HttpException,
  Logger,
} from '@nestjs/common';
import {
  DatabaseError,
  ForeignKeyConstraintError,
  UniqueConstraintError,
} from 'sequelize';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('keeps HttpException status, message and error', () => {
    expect(
      filter.toErrorBody(new NotFoundException('No existe'), '/x'),
    ).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'No existe',
      path: '/x',
      timestamp: expect.any(String),
    });
  });

  it('keeps the validation message list', () => {
    const body = filter.toErrorBody(new BadRequestException(['a', 'b']), '/x');
    expect(body.message).toEqual(['a', 'b']);
    expect(body.statusCode).toBe(400);
  });

  it('string payloads get the reason phrase as error', () => {
    expect(filter.toErrorBody(new HttpException('Calma', 429), '/x')).toEqual(
      expect.objectContaining({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Calma',
      }),
    );
  });

  it('unique and foreign key violations become 409', () => {
    expect(
      filter.toErrorBody(new UniqueConstraintError({}), '/x').statusCode,
    ).toBe(409);
    const fk = new ForeignKeyConstraintError({
      parent: new Error('fk') as never,
    });
    expect(filter.toErrorBody(fk, '/x').statusCode).toBe(409);
  });

  it('a malformed uuid reaching the database becomes 400', () => {
    const error = new DatabaseError(
      Object.assign(new Error('invalid input syntax for type uuid: "abc"'), {
        sql: '',
      }) as never,
    );
    expect(filter.toErrorBody(error, '/x')).toEqual(
      expect.objectContaining({
        statusCode: 400,
        message: 'Identificador inválido',
      }),
    );
  });

  it('anything else is a generic 500 that reveals nothing, and is logged', () => {
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'GET', originalUrl: '/boom' }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new Error('password=hunter2 leaked'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Error interno del servidor',
        path: '/boom',
      }),
    );
    expect(JSON.stringify(json.mock.calls)).not.toContain('hunter2');
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
