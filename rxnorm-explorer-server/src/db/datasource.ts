// Entry point for the TypeORM migration CLI (npm run migration:*). The API
// doesn't import this file; it builds its options from the validated config.
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './dataSourceOptions';

const configService = new ConfigService();

export const dataSourceOptions = buildDataSourceOptions(configService);

// The migration CLI changes the schema, so it can connect as a separate
// account with ALTER/INDEX/REFERENCES while the API's own account only has
// SELECT. Falls back to the API's account when no migration account is set.
const migrationUser = configService.get<string>('MIGRATION_DATABASE_USER');
const dataSource = new DataSource(
  migrationUser
    ? {
        ...dataSourceOptions,
        username: migrationUser,
        password: configService.getOrThrow<string>(
          'MIGRATION_DATABASE_PASSWORD',
        ),
      }
    : dataSourceOptions,
);

export default dataSource;
