import { Module } from '@nestjs/common';
import { DrugController } from './drug.controller';
import { DrugService } from './drug.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RXNCONSO } from '../db/entities/RXNCONSO.entity';
import { RXNREL } from '../db/entities/RXNREL.entity';
import { RXNSAT } from '../db/entities/RXNSAT.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RXNCONSO, RXNREL, RXNSAT])],
  controllers: [DrugController],
  providers: [DrugService],
})
export class DrugModule {}
