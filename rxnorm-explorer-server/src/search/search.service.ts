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
    cursor: string,
    sortField: string,
    sortDirection: 'ASC' | 'DESC' | 'desc' | 'asc',
  ): Promise<SearchResults> {
    const limit = 50;
    cursor = cursor || '';
    sortField = sortField || 'STR';
    sortDirection = sortDirection === 'desc' ? 'DESC' : 'ASC';

    const returnData: SearchResults = {
      searchResults: [],
      totalResults: 0,
    };

    returnData.searchResults = await this.rxnconsoRepository
      .createQueryBuilder('rxnconso')
      .where(
        `rxnconso.${sortField} ${sortDirection === 'ASC' ? '>' : '<'} :cursor`,
        { cursor },
      )
      .andWhere('rxnconso.TTY NOT IN ("DP", "SU", "TMSY", "SY")')
      .andWhere(
        '(rxnconso.STR LIKE :searchTermLike OR rxnconso.RXCUI = :searchTermEqual)',
        { searchTermLike: `%${searchTerm}%`, searchTermEqual: searchTerm },
      )
      .select(['rxnconso.id', 'rxnconso.TTY', 'rxnconso.RXCUI', 'rxnconso.STR'])
      .orderBy(`rxnconso.${sortField}`, sortDirection)
      .limit(limit)
      .getMany();

    returnData.totalResults = await this.rxnconsoRepository
      .createQueryBuilder('rxnconso')
      .where(
        '(rxnconso.STR LIKE :searchTermLike OR rxnconso.RXCUI = :searchTermEqual)',
        { searchTermLike: `%${searchTerm}%`, searchTermEqual: searchTerm },
      )
      .andWhere('rxnconso.TTY NOT IN ("DP", "SU", "TMSY", "SY")')
      .getCount();

    return returnData;
  }
}
