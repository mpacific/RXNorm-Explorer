import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RXNCONSO } from '../db/entities/RXNCONSO.entity';
import { Brackets, Repository } from 'typeorm';
import { SearchResults } from '../../types/searchResults';
import { EXCLUDED_TTYS } from '../shared/excludedTtys';

const SORT_FIELDS = ['STR', 'RXCUI', 'TTY'] as const;
// Each word adds a LIKE to a scan of the whole table, so the cost grows with
// every word (~2s at 300). Extra words are dropped rather than rejected so a
// pasted long drug name still finds that drug.
const MAX_SEARCH_WORDS = 10;
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

    const term = (searchTerm ?? '').trim();

    // Each way a row can match is its own lookup, UNIONed into a set of ids
    // that the TTY filter, sort and paging then run against. Keep them apart:
    // OR-ing them in one WHERE makes MySQL run the NDC subquery once for every
    // row of RXNCONSO (~2s for a common term), and `id IN (... UNION ...)` is
    // rewritten into that same per-row form.
    const matchers = [
      'SELECT id FROM RXNCONSO WHERE RXCUI = :term',
      "SELECT c.id FROM RXNSAT s JOIN RXNCONSO c ON c.RXAUI = s.RXAUI WHERE s.ATN = 'NDC' AND s.ATV = :term",
    ];
    const params: Record<string, string> = { term };

    // Every word has to appear somewhere in the name, in any order, mid-word
    // included. The LIKE can't use an index, but one scan of STR is cheap; it
    // was the per-row subquery that made search slow.
    const words = term.split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_WORDS);
    if (words.length) {
      matchers.unshift(
        'SELECT id FROM RXNCONSO WHERE ' +
          words
            .map((word, i) => {
              // escape LIKE wildcards so a typed % or _ is matched literally
              params[`word${i}`] = `%${word.replace(/[\\%_]/g, '\\$&')}%`;
              return `STR LIKE :word${i}`;
            })
            .join(' AND '),
      );
    }

    const filtered = this.rxnconsoRepository
      .createQueryBuilder('rxnconso')
      .innerJoin(
        `(${matchers.join(' UNION ')})`,
        'matches',
        'matches.id = rxnconso.id',
      )
      .where('rxnconso.TTY NOT IN (:...excludedTtys)', {
        excludedTtys: EXCLUDED_TTYS,
      })
      .setParameters(params);

    const page = filtered.clone();

    // Keyset pagination. STR, RXCUI and TTY are all non-unique, so the id
    // breaks ties -- without it a page boundary landing in the middle of a run
    // of equal values skips every remaining row in that run.
    const afterCursor = Number(cursorId);
    const isFirstPage = !(cursor && Number.isInteger(afterCursor));
    if (!isFirstPage) {
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

    // Paging on doesn't change the total, so it's only counted for the first
    // page (the client keeps it from there) and alongside that page's query
    // rather than after it.
    const [totalResults, searchResults] = await Promise.all([
      isFirstPage ? filtered.getCount() : undefined,
      page
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
    ]);

    return { totalResults, searchResults };
  }
}
