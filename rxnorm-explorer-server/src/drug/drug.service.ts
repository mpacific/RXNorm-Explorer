import { Injectable } from '@nestjs/common';
import { Drug } from '../../types/drug';
import { InjectRepository } from '@nestjs/typeorm';
import { RXNCONSO } from '../db/entities/RXNCONSO.entity';
import { Repository } from 'typeorm';
import { RXNREL } from '../db/entities/RXNREL.entity';
import { EXCLUDED_TTYS } from '../shared/excludedTtys';

@Injectable()
export class DrugService {
  constructor(
    @InjectRepository(RXNCONSO)
    private rxnconsoRepository: Repository<RXNCONSO>,
    @InjectRepository(RXNREL)
    private rxnrelRepository: Repository<RXNREL>,
  ) {}

  async getDrug(id: number): Promise<Drug | null> {
    const drug: Drug | null | undefined = await this.rxnconsoRepository
      .createQueryBuilder('rxnconso')
      .select([
        'rxnconso.id AS id',
        'rxnconso.RXCUI AS RXCUI',
        'rxnconso.TTY AS TTY',
        'rxnconso.STR AS STR',
      ])
      .where('rxnconso.id = :id', { id })
      .leftJoin(
        'RXNSAT',
        'rxnsat',
        'rxnconso.RXAUI = rxnsat.RXAUI AND rxnsat.ATN = "NDC"',
      )
      .addSelect(['GROUP_CONCAT(rxnsat.ATV) AS ATV'])
      .groupBy('rxnconso.id')
      .getRawOne();

    if (!drug) {
      return null;
    }

    drug.RelatedDrugs = await this.rxnrelRepository
      .createQueryBuilder('r')
      .select(['r.id', 'r.RELA', 'r.RXCUI1', 'r.RXCUI2'])
      .innerJoin('RXNCONSO', 'c1', 'r.RXCUI1 = c1.RXCUI')
      .innerJoin('RXNCONSO', 'c2', 'r.RXCUI2 = c2.RXCUI')
      .addSelect(['c1.id', 'c1.RXCUI', 'c1.TTY', 'c1.STR'])
      .addSelect(['c2.id', 'c2.RXCUI', 'c2.TTY', 'c2.STR'])
      .where('r.RELA IS NOT NULL')
      .andWhere(
        'r.RELA NOT IN ("inverse_isa", "ingredient_of", "tradename_of", "dose_form_of", "precise_ingredient_of", "doseformgroup_of", "ingredients_of", "part_of", "boss_of", "form_of")',
      )
      .andWhere('(r.RXCUI1 = :RXCUI OR r.RXCUI2 = :RXCUI)', {
        RXCUI: drug.RXCUI,
      })
      .andWhere('c1.TTY NOT IN (:excludeTtys)', { excludeTtys: EXCLUDED_TTYS })
      .andWhere('c2.TTY NOT IN (:excludeTtys)', { excludeTtys: EXCLUDED_TTYS })
      .orderBy('r.RXCUI1', 'ASC')
      .addOrderBy('r.RXCUI2', 'ASC')
      .getRawMany();

    return drug;
  }
}
