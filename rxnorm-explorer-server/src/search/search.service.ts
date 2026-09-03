import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RXNCONSO } from '../db/entities/RXNCONSO.entity';
import { Brackets, Repository } from 'typeorm';
import { SearchResults } from '../../types/searchResults';
import { EXCLUDED_TTYS } from '../shared/excludedTtys';

const SORT_FIELDS = ['STR', 'RXCUI', 'TTY'] as const;
type SortField = (typeof SORT_FIELDS)[number];

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(RXNCONSO)
    private rxnconsoRepository: Repository<RXNCONSO>,
  ) {}

  async searchDrugs(
    searchTerm: string,
    cursor: string,
    cursorId: string,
    sortField: string,
    sortDirection: 'ASC' | 'DESC' | 'desc' | 'asc',
  ): Promise<SearchResults> {
    const limit = 50;
    // sortField is interpolated into the SQL, so it has to come from a fixed list
    const field: SortField = SORT_FIELDS.includes(sortField as SortField)
      ? (sortField as SortField)
      : 'STR';
    const direction = sortDirection?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Every OR group is parenthesised explicitly. TypeORM only wraps clauses
    // added with andWhere/orWhere, never the leading where(), so an unwrapped
    // OR here silently swallows the filters that follow it.
    const matchesSearchTerm = new Brackets((qb) =>
      qb
        .where('rxnconso.STR LIKE :searchTermLike', {
          searchTermLike: `%${searchTerm}%`,
        })
        .orWhere('rxnconso.RXCUI = :searchTermEqual', {
          searchTermEqual: searchTerm,
        })
        .orWhere(
          'EXISTS (SELECT 1 FROM RXNSAT rxnsat where rxnsat.RXAUI = rxnconso.RXAUI AND rxnsat.ATN = :ndc AND rxnsat.ATV = :searchTermEqual)',
          {
            searchTermEqual: searchTerm,
            ndc: 'NDC',
          },
        ),
    );

    const filtered = this.rxnconsoRepository
      .createQueryBuilder('rxnconso')
      .where(matchesSearchTerm)
      .andWhere('rxnconso.TTY NOT IN (:...excludedTtys)', {
        excludedTtys: EXCLUDED_TTYS,
      });

    const page = filtered.clone();

    // Keyset pagination. STR, RXCUI and TTY are all non-unique, so the id
    // breaks ties -- without it a page boundary landing in the middle of a run
    // of equal values skips every remaining row in that run.
    const afterCursor = Number(cursorId);
    if (cursor && Number.isInteger(afterCursor)) {
      const comparison = direction === 'ASC' ? '>' : '<';

      page.andWhere(
        new Brackets((qb) =>
          qb
            .where(`(rxnconso.${field} ${comparison} :cursor)`, { cursor })
            .orWhere(
              `(rxnconso.${field} = :cursor AND rxnconso.id ${comparison} :cursorId)`,
              { cursor, cursorId: afterCursor },
            ),
        ),
      );
    }

    return {
      totalResults: await filtered.getCount(),
      searchResults: await page
        .select([
          'rxnconso.id',
          'rxnconso.TTY',
          'rxnconso.RXCUI',
          'rxnconso.STR',
        ])
        .orderBy(`rxnconso.${field}`, direction)
        .addOrderBy('rxnconso.id', direction)
        .limit(limit)
        .getMany(),
    };
  }
}
