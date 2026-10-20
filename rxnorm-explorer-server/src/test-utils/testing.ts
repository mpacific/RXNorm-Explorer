const CHAIN_METHODS = [
  'select',
  'addSelect',
  'innerJoin',
  'where',
  'andWhere',
  'orWhere',
  'setParameters',
  'orderBy',
  'addOrderBy',
  'limit',
] as const;

type ChainMethod = (typeof CHAIN_METHODS)[number];

export type MockQueryBuilder = { [K in ChainMethod]: jest.Mock } & {
  clone: jest.Mock;
  getRawOne: jest.Mock;
  getRawMany: jest.Mock;
  getMany: jest.Mock;
  getCount: jest.Mock;
};

// A stand-in for TypeORM's SelectQueryBuilder: every builder method records its
// call and returns the same builder, and the methods that run the query return
// whatever the test sets up. clone() returns `cloneTarget` so a test can tell
// the original and the copy apart.
export function createMockQueryBuilder(
  cloneTarget?: MockQueryBuilder,
): MockQueryBuilder {
  const qb = {
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    getMany: jest.fn(),
    getCount: jest.fn(),
  } as unknown as MockQueryBuilder;

  for (const method of CHAIN_METHODS) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.clone = jest.fn().mockReturnValue(cloneTarget ?? qb);

  return qb;
}

// Resolves to what the promise rejected with, and fails the test if it
// resolved instead, so a test can inspect the error.
export async function rejectionOf<E = unknown>(
  promise: Promise<unknown>,
): Promise<E> {
  try {
    await promise;
  } catch (error) {
    return error as E;
  }
  throw new Error('Expected the promise to reject, but it resolved');
}
