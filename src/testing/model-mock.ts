/** A jest double for a sequelize-typescript model class (static methods only). */
export function modelMock() {
  const mock = {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    destroy: jest.fn(),
    scope: jest.fn(),
  };
  mock.scope.mockReturnValue(mock);
  return mock;
}

/** A jest double for a model instance. */
export function instance<T extends object>(values: T) {
  const row = {
    ...values,
    update: jest.fn(async (changes: object) => ({ ...row, ...changes })),
    destroy: jest.fn(async () => undefined),
  };
  return row;
}

/** Sequelize double whose transaction() runs the callback with a fake transaction. */
export function sequelizeMock() {
  const transaction = { id: 'tx' };
  return {
    transaction: jest.fn(async (work: (t: unknown) => unknown) =>
      work(transaction),
    ),
    transactionObject: transaction,
  };
}

export type ModelMock = ReturnType<typeof modelMock>;
