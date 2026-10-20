import { MODULE_METADATA } from '@nestjs/common/constants';
import type { DynamicModule, Provider } from '@nestjs/common';

// AppModule reads its settings when it loads, so each test loads a fresh copy
// against its own environment. Nothing here connects to a database.
jest.mock('dotenv/config', () => ({}));

const ENV = {
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '3306',
  DATABASE_USER: 'rxnorm_app',
  DATABASE_PASSWORD: 'secret',
  DATABASE_NAME: 'rxnorm',
  THROTTLE_MS: '5000',
  THROTTLE_LIMIT: '10',
};

// Everything the tests compare against comes from the same fresh module
// registry as AppModule, since a class from another copy of a package isn't
// equal to it.
const loadAppModule = (env: Record<string, string>) => {
  const original = process.env;
  process.env = { ...env };
  try {
    let loaded!: Record<string, object>;
    jest.isolateModules(() => {
      const load = (path: string) => jest.requireActual<object>(path);
      loaded = {
        ...load('./app.module'),
        ...load('./app.controller'),
        ...load('./app.service'),
        ...load('./search/search.module'),
        ...load('./drug/drug.module'),
        ...load('@nestjs/config'),
        ...load('@nestjs/typeorm'),
        ...load('@nestjs/throttler'),
        ...load('@nestjs/core'),
      };
    });
    return loaded;
  } finally {
    process.env = original;
  }
};

const metadata = <T>(target: object, key: string): T =>
  Reflect.getMetadata(key, target) as T;

// ConfigModule.forRoot() hands back a promise of its module, so wait for each
// import before reading it.
const importsOf = (AppModule: object) =>
  Promise.all(
    metadata<(DynamicModule | object | Promise<DynamicModule>)[]>(
      AppModule,
      MODULE_METADATA.IMPORTS,
    ).map((imported) => Promise.resolve(imported)),
  );

describe('AppModule', () => {
  it('wires up config, the database, throttling and both features', async () => {
    const {
      AppModule,
      ConfigModule,
      TypeOrmModule,
      ThrottlerModule,
      SearchModule,
      DrugModule,
    } = loadAppModule(ENV);

    const importedModules = (await importsOf(AppModule)).map((imported) =>
      'module' in imported ? imported.module : imported,
    );

    expect(importedModules).toEqual([
      ConfigModule,
      TypeOrmModule,
      ThrottlerModule,
      SearchModule,
      DrugModule,
    ]);
  });

  it('throttles every route with the configured window and limit', async () => {
    const { AppModule, ThrottlerModule, ThrottlerGuard, APP_GUARD } =
      loadAppModule({ ...ENV, THROTTLE_MS: '60000', THROTTLE_LIMIT: '25' });

    const throttler = (await importsOf(AppModule)).find(
      (imported): imported is DynamicModule =>
        'module' in imported && imported.module === ThrottlerModule,
    );
    const options = (
      throttler?.providers as { useValue?: { throttlers?: unknown[] } }[]
    ).find((provider) => provider.useValue?.throttlers)?.useValue;

    expect(options?.throttlers).toEqual([{ ttl: 60000, limit: 25 }]);
    expect(
      metadata<Provider[]>(AppModule, MODULE_METADATA.PROVIDERS),
    ).toContainEqual({ provide: APP_GUARD, useClass: ThrottlerGuard });
  });

  it('serves the root route', () => {
    const { AppModule, AppController, AppService } = loadAppModule(ENV);

    expect(metadata(AppModule, MODULE_METADATA.CONTROLLERS)).toEqual([
      AppController,
    ]);
    expect(
      metadata<Provider[]>(AppModule, MODULE_METADATA.PROVIDERS),
    ).toContain(AppService);
  });
});
