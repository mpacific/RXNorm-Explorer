import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RXNCONSO } from '../db/entities/RXNCONSO.entity';
import { RXNREL } from '../db/entities/RXNREL.entity';
import { RXNSAT } from '../db/entities/RXNSAT.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RXNCONSO, RXNREL, RXNSAT])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
