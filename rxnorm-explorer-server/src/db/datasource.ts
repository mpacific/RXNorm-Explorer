import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import { RXNCONSO } from './entities/RXNCONSO.entity';
import { RXNREL } from './entities/RXNREL.entity';
import { RXNSAT } from './entities/RXNSAT.entity';
import { DataSource } from 'typeorm/browser';

const configService = new ConfigService();

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: configService.getOrThrow<string>('DATABASE_HOST'),
  port: configService.getOrThrow<number>('DATABASE_PORT'),
  username: configService.getOrThrow<string>('DATABASE_USER'),
  password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
  database: configService.getOrThrow<string>('DATABASE_NAME'),
  synchronize: false,
  entities: [RXNCONSO, RXNREL, RXNSAT],
  logging: process.env.ENV !== 'production',
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
