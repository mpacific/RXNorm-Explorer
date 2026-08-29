import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RXNCONSO } from '../db/entities/RXNCONSO.entity';
import { Repository } from 'typeorm';
import { SearchResults } from '../../types/searchResults';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(RXNCONSO)
    private rxnconsoRepository: Repository<RXNCONSO>,
  ) {}

  async searchDrugs(
    searchTerm: string,
    cursor: number,
    sortField: string,
    sortDirection: 'ASC' | 'DESC' | 'desc' | 'asc',
  ): Promise<SearchResults> {
    const limit = 50;
    cursor = cursor || 0;
    sortField = sortField || 'STR';
    sortDirection = sortDirection === 'desc' ? 'DESC' : 'ASC';

    const returnData: SearchResults = {
      searchResults: [],
      totalResults: 0,
    };

    returnData.searchResults = await this.rxnconsoRepository
      .createQueryBuilder('rxnconso')
      .leftJoinAndSelect('rxnconso.RXNSAT', 'rxnsat', 'rxnsat.ATN = "NDC"')
      .where('rxnconso.id > :cursor', { cursor })
      .andWhere(
        'rxnconso.STR LIKE :searchTermLike OR rxnconso.RXCUI = :searchTermEqual OR rxnsat.ATV = :searchTermEqual',
        { searchTermLike: `%${searchTerm}%`, searchTermEqual: searchTerm },
      )
      .andWhere('rxnconso.TTY NOT IN ("DP", "SU", "TMSY", "SY")')
      .andWhere('rxnsat.ATN = "NDC"')
      .select(['rxnconso.id', 'rxnconso.TTY', 'rxnconso.RXCUI', 'rxnconso.STR'])
      .orderBy(sortField, sortDirection)
      .groupBy('rxnconso.id')
      .limit(limit)
      .getMany();

    returnData.totalResults = await this.rxnconsoRepository
      .createQueryBuilder('rxnconso')
      .leftJoinAndSelect('rxnconso.RXNSAT', 'rxnsat')
      .where(
        'rxnconso.STR LIKE :searchTermLike OR rxnconso.RXCUI = :searchTermEqual OR rxnsat.ATV = :searchTermEqual',
        { searchTermLike: `%${searchTerm}%`, searchTermEqual: searchTerm },
      )
      .andWhere('rxnconso.TTY NOT IN ("DP", "SU", "TMSY", "SY")')
      .andWhere('rxnsat.ATN = "NDC"')
      .groupBy('rxnconso.id')
      .getCount();

    return returnData;
  }
}
