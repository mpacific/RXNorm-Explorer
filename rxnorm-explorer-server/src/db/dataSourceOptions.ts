import type { ConfigService } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';
import { RXNCONSO } from './entities/RXNCONSO.entity';
import { RXNREL } from './entities/RXNREL.entity';
import { RXNSAT } from './entities/RXNSAT.entity';

type MysqlDataSourceOptions = Extract<
  DataSourceOptions,
  { type: 'mysql' | 'mariadb' }
>;

// Shared by the API (given the validated ConfigService) and the migration CLI
// (given one that reads process.env directly).
export function buildDataSourceOptions(
  config: ConfigService,
): MysqlDataSourceOptions {
  return {
    type: 'mysql',
    host: config.getOrThrow<string>('DATABASE_HOST'),
    // Number() because the CLI's ConfigService returns the raw string
    port: Number(config.getOrThrow<number | string>('DATABASE_PORT')),
    username: config.getOrThrow<string>('DATABASE_USER'),
    password: config.getOrThrow<string>('DATABASE_PASSWORD'),
    database: config.getOrThrow<string>('DATABASE_NAME'),
    synchronize: false,
    migrationsRun: false,
    // MySQL commits DDL implicitly, so a transaction can't undo a migration
    // that fails partway. 'each' at least records every migration as soon
    // as it finishes; with 'all', a failure would roll back the records of
    // earlier migrations whose changes had already been committed, and the
    // next run would try to apply them again. Keep migrations small for the
    // same reason.
    migrationsTransactionMode: 'each',
    migrations: [`${__dirname}/migrations/**/*.ts`],
    entities: [RXNCONSO, RXNREL, RXNSAT],
    logging: config.get<string>('ENV') === 'development',
  };
}
