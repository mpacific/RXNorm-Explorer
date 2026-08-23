import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchModule } from './search/search.module';
import { DrugService } from './drug/drug.service';
import { DrugController } from './drug/drug.controller';
import { DrugModule } from './drug/drug.module';
import { ConfigModule } from '@nestjs/config';
import { dataSourceOptions } from './db/datasource';
import { SearchController } from './search/search.controller';
import { SearchService } from './search/search.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    SearchModule,
    DrugModule,
  ],
  controllers: [AppController, DrugController, SearchController],
  providers: [AppService, DrugService, SearchService],
})
export class AppModule {}
