import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Brackets } from 'typeorm';
import { SearchService } from './search.service';
import { RXNCONSO } from '../db/entities/RXNCONSO.entity';
import { EXCLUDED_TTYS } from '../shared/excludedTtys';
import {
  createMockQueryBuilder,
  MockQueryBuilder,
  rejectionOf,
} from '../test-utils/testing';

describe('SearchService', () => {
  let service: SearchService;
  // `filtered` is the builder the service creates; `page` is its clone, which
  // gets the cursor condition and runs the page query.
  let filtered: MockQueryBuilder;
  let page: MockQueryBuilder;
  let repository: { createQueryBuilder: jest.Mock };

  const results = [{ id: 1, TTY: 'SCD', RXCUI: '161', STR: 'acetaminophen' }];

  beforeEach(async () => {
    page = createMockQueryBuilder();
    filtered = createMockQueryBuilder(page);
    page.getMany.mockResolvedValue(results);
    filtered.getCount.mockResolvedValue(123);
    repository = { createQueryBuilder: jest.fn().mockReturnValue(filtered) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getRepositoryToken(RXNCONSO), useValue: repository },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  // Spread rather than default parameters, so a test can pass `undefined`
  // through to the service the way a missing query parameter would.
  const search = (
    searchTerm: string,
    overrides: {
      cursor?: string;
      cursorId?: string;
      sortField?: string;
      sortDirection?: 'ASC' | 'DESC' | 'asc' | 'desc';
    } = {},
  ) => {
    const { cursor, cursorId, sortField, sortDirection } = {
      cursor: '',
      cursorId: '',
      sortField: 'STR',
      sortDirection: 'asc' as const,
      ...overrides,
    };
    return service.searchDrugs(
      searchTerm,
      cursor,
      cursorId,
      sortField,
      sortDirection,
    );
  };

  // The UNION subquery joined in as `matches`
  const matchesSql = (): string => filtered.innerJoin.mock.calls[0][0];
  const parameters = (): Record<string, string> =>
    filtered.setParameters.mock.calls[0][0];

  describe('search term', () => {
    it.each([undefined, null, '', '   ', '\t\n'])(
      'rejects %p with a 400',
      async (term) => {
        const error = await rejectionOf<HttpException>(search(term as string));

        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.message).toBe('Search term is required');
        expect(repository.createQueryBuilder).not.toHaveBeenCalled();
      },
    );

    it('trims the term before matching it', async () => {
      await search('  161  ');

      expect(parameters().term).toBe('161');
    });
  });

  describe('matchers', () => {
    it('unions name, RXCUI and NDC lookups and joins them on id', async () => {
      await search('acetaminophen');

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('rxnconso');
      expect(matchesSql()).toBe(
        '(' +
          'SELECT id FROM RXNCONSO WHERE STR LIKE :word0' +
          ' UNION SELECT id FROM RXNCONSO WHERE RXCUI = :term' +
          " UNION SELECT c.id FROM RXNSAT s JOIN RXNCONSO c ON c.RXAUI = s.RXAUI WHERE s.ATN = 'NDC' AND s.ATV = :term" +
          ')',
      );
      expect(filtered.innerJoin).toHaveBeenCalledWith(
        expect.any(String),
        'matches',
        'matches.id = rxnconso.id',
      );
    });

    it('needs every word somewhere in the name, in any order', async () => {
      await search('tablet  oral\tacetaminophen');

      expect(matchesSql()).toContain(
        'STR LIKE :word0 AND STR LIKE :word1 AND STR LIKE :word2',
      );
      expect(parameters()).toEqual({
        term: 'tablet  oral\tacetaminophen',
        word0: '%tablet%',
        word1: '%oral%',
        word2: '%acetaminophen%',
      });
    });

    it('drops words past the tenth rather than rejecting the search', async () => {
      const words = Array.from({ length: 15 }, (_, i) => `w${i}`);
      await search(words.join(' '));

      expect(matchesSql()).toContain('STR LIKE :word9');
      expect(matchesSql()).not.toContain(':word10');
      expect(Object.keys(parameters())).toHaveLength(11); // term + 10 words
    });

    it.each([
      ['100%', '%100\\%%'],
      ['a_b', '%a\\_b%'],
      ['back\\slash', '%back\\\\slash%'],
      ['%_\\', '%\\%\\_\\\\%'],
    ])('escapes LIKE wildcards in %p', async (word, pattern) => {
      await search(word);

      expect(parameters().word0).toBe(pattern);
    });

    it('leaves out excluded term types', async () => {
      await search('acetaminophen');

      expect(filtered.where).toHaveBeenCalledWith(
        'rxnconso.TTY NOT IN (:...excludedTtys)',
        { excludedTtys: EXCLUDED_TTYS },
      );
    });
  });

  describe('sorting', () => {
    it.each(['STR', 'RXCUI', 'TTY'])(
      'sorts by %s when asked',
      async (field) => {
        await search('a', { sortField: field });

        expect(page.orderBy).toHaveBeenCalledWith(`rxnconso.${field}`, 'ASC');
        expect(page.addOrderBy).toHaveBeenCalledWith('rxnconso.id', 'ASC');
      },
    );

    it.each([
      'id',
      'str',
      'STR; DROP TABLE RXNCONSO',
      '',
      undefined,
      ['STR', 'TTY'],
    ])(
      'falls back to STR for a field that is not allowed: %p',
      async (field) => {
        await search('a', { sortField: field as unknown as string });

        expect(page.orderBy).toHaveBeenCalledWith('rxnconso.STR', 'ASC');
      },
    );

    it.each([
      ['desc', 'DESC'],
      ['DESC', 'DESC'],
      ['asc', 'ASC'],
      ['ASC', 'ASC'],
      ['sideways', 'ASC'],
      [undefined, 'ASC'],
    ])('reads direction %p as %s', async (sortDirection, expected) => {
      await search('a', {
        sortDirection: sortDirection as 'asc' | 'desc',
      });

      expect(page.orderBy).toHaveBeenCalledWith('rxnconso.STR', expected);
      expect(page.addOrderBy).toHaveBeenCalledWith('rxnconso.id', expected);
    });

    it('selects only the columns the results list shows, 50 at a time', async () => {
      await search('a');

      expect(page.select).toHaveBeenCalledWith([
        'rxnconso.id',
        'rxnconso.TTY',
        'rxnconso.RXCUI',
        'rxnconso.STR',
      ]);
      expect(page.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('first page', () => {
    it('counts the results alongside the page and returns both', async () => {
      await expect(search('a')).resolves.toEqual({
        totalResults: 123,
        searchResults: results,
      });

      expect(filtered.clone).toHaveBeenCalledTimes(1);
      // The count runs on the original builder, so the cursor can't narrow it
      expect(filtered.getCount).toHaveBeenCalledTimes(1);
      expect(page.getCount).not.toHaveBeenCalled();
      expect(page.andWhere).not.toHaveBeenCalled();
    });

    it.each([
      ['no cursor', '', '5'],
      ['a missing cursor', undefined, '5'],
      ['a missing cursor id', 'aspirin', undefined],
      ['a cursor id that is not a number', 'aspirin', 'abc'],
      ['a cursor id that is not an integer', 'aspirin', '1.5'],
      ['an empty cursor id', 'aspirin', ''],
      ['a blank cursor id', 'aspirin', '  '],
      ['a negative cursor id', 'aspirin', '-1'],
      ['a cursor id in exponent form', 'aspirin', '1e3'],
    ])('treats %s as the first page', async (_, cursor, cursorId) => {
      const response = await search('a', { cursor, cursorId });

      expect(response.totalResults).toBe(123);
      expect(page.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('later pages', () => {
    // Runs the Brackets callback the service passed to andWhere against a
    // fresh builder, so we can see the conditions it adds.
    const cursorConditions = () => {
      const brackets: Brackets = page.andWhere.mock.calls[0][0];
      expect(brackets).toBeInstanceOf(Brackets);

      const inner = createMockQueryBuilder();
      brackets.whereFactory(inner as never);
      return inner;
    };

    it('does not count again', async () => {
      const response = await search('a', { cursor: 'aspirin', cursorId: '42' });

      expect(response).toEqual({
        totalResults: undefined,
        searchResults: results,
      });
      expect(filtered.getCount).not.toHaveBeenCalled();
    });

    it('starts after the cursor, breaking ties on id, going up', async () => {
      await search('a', {
        cursor: 'aspirin',
        cursorId: '42',
        sortField: 'TTY',
        sortDirection: 'asc',
      });

      const inner = cursorConditions();
      expect(inner.where).toHaveBeenCalledWith('(rxnconso.TTY > :cursor)', {
        cursor: 'aspirin',
      });
      expect(inner.orWhere).toHaveBeenCalledWith(
        '(rxnconso.TTY = :cursor AND rxnconso.id > :cursorId)',
        { cursor: 'aspirin', cursorId: 42 },
      );
    });

    it('starts after the cursor, breaking ties on id, going down', async () => {
      await search('a', {
        cursor: '161',
        cursorId: '7',
        sortField: 'RXCUI',
        sortDirection: 'desc',
      });

      const inner = cursorConditions();
      expect(inner.where).toHaveBeenCalledWith('(rxnconso.RXCUI < :cursor)', {
        cursor: '161',
      });
      expect(inner.orWhere).toHaveBeenCalledWith(
        '(rxnconso.RXCUI = :cursor AND rxnconso.id < :cursorId)',
        { cursor: '161', cursorId: 7 },
      );
    });

    it('never puts the cursor value itself into the SQL', async () => {
      await search('a', { cursor: "x' OR 1=1 --", cursorId: '1' });

      const inner = cursorConditions();
      const sql = [...inner.where.mock.calls, ...inner.orWhere.mock.calls].map(
        ([condition]) => condition as string,
      );
      expect(sql.join(' ')).not.toContain('OR 1=1');
    });
  });
});
