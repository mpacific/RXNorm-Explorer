import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchModule } from './search/search.module';
import { DrugModule } from './drug/drug.module';
import { ConfigModule } from '@nestjs/config';
import { dataSourceOptions } from './db/datasource';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    SearchModule,
    DrugModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
