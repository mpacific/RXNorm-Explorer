import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import { RXNCONSO } from './entities/RXNCONSO.entity';
import { RXNREL } from './entities/RXNREL.entity';
import { RXNSAT } from './entities/RXNSAT.entity';
import { DataSource } from 'typeorm';

const configService = new ConfigService();

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: configService.getOrThrow<string>('DATABASE_HOST'),
  port: configService.getOrThrow<number>('DATABASE_PORT'),
  username: configService.getOrThrow<string>('DATABASE_USER'),
  password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
  database: configService.getOrThrow<string>('DATABASE_NAME'),
  synchronize: false,
  migrationsRun: false,
  migrationsTransactionMode: 'all',
  migrations: [`${__dirname}/migrations/**/*.ts`],
  entities: [RXNCONSO, RXNREL, RXNSAT],
  logging: process.env.ENV === 'development',
};

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
