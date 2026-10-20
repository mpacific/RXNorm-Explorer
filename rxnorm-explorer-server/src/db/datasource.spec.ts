import type { DataSource, DataSourceOptions } from 'typeorm';

// The settings are read when the module loads, so each test loads a fresh
// copy against its own environment. dotenv is stubbed out so a developer's
// .env can't fill in what a test leaves unset.
jest.mock('dotenv/config', () => ({}));

const DATABASE_ENV = {
  DATABASE_HOST: 'db.internal',
  DATABASE_PORT: '3306',
  DATABASE_USER: 'rxnorm_app',
  DATABASE_PASSWORD: 'secret',
  DATABASE_NAME: 'rxnorm',
};

const loadDatasource = (env: Record<string, string | undefined>) => {
  const original = process.env;
  process.env = { ...env };
  try {
    let loaded!: {
      default: DataSource;
      dataSourceOptions: DataSourceOptions;
    };
    jest.isolateModules(() => {
      loaded = jest.requireActual('./datasource');
    });
    return loaded;
  } finally {
    process.env = original;
  }
};

describe('datasource', () => {
  it('connects to MySQL with the configured settings', () => {
    expect(loadDatasource(DATABASE_ENV).dataSourceOptions).toMatchObject({
      type: 'mysql',
      host: 'db.internal',
      port: '3306',
      username: 'rxnorm_app',
      password: 'secret',
      database: 'rxnorm',
    });
  });

  it('never changes the schema on its own', () => {
    const options = loadDatasource(DATABASE_ENV).dataSourceOptions;

    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
    expect(options.migrationsTransactionMode).toBe('all');
  });

  it('maps the three RxNorm tables and finds the migrations', () => {
    const options = loadDatasource(DATABASE_ENV).dataSourceOptions;

    expect(
      (options.entities as { name: string }[]).map((entity) => entity.name),
    ).toEqual(['RXNCONSO', 'RXNREL', 'RXNSAT']);
    expect(options.migrations).toEqual([
      expect.stringMatching(/[\\/]db[\\/]migrations[\\/]\*\*[\\/]\*\.ts$/),
    ]);
  });

  it.each([
    ['development', true],
    ['production', false],
    [undefined, false],
  ])('logs queries only in development (ENV=%p)', (ENV, logging) => {
    const options = loadDatasource({ ...DATABASE_ENV, ENV }).dataSourceOptions;

    expect(options.logging).toBe(logging);
  });

  it('exports a data source for the migration CLI', () => {
    const { default: dataSource, dataSourceOptions } =
      loadDatasource(DATABASE_ENV);

    expect(dataSource.options).toBe(dataSourceOptions);
    expect(dataSource.isInitialized).toBe(false);
  });

  it.each(Object.keys(DATABASE_ENV))('refuses to load without %s', (key) => {
    expect(() => loadDatasource({ ...DATABASE_ENV, [key]: undefined })).toThrow(
      key,
    );
  });
});
