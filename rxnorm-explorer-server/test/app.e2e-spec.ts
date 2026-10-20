import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/main';
import { EXCLUDED_TTYS } from './../src/shared/excludedTtys';
import type { SearchResults } from './../types/searchResults';
import type { Drug } from './../types/drug';

// Runs against the database in .env, with whatever RxNorm release is loaded,
// so the fixtures are looked up rather than hard-coded and expectations are
// checked against SQL written independently of the service.
describe('RxNorm Explorer API (e2e)', () => {
  let app: INestApplication<App>;
  let db: DataSource;

  // An ingredient with plenty of products, and an atom that has an NDC
  let ingredient: { id: number; RXCUI: string; STR: string };
  let withNdc: { id: number; RXCUI: string; NDC: string };

  const excluded = EXCLUDED_TTYS.map((tty) => `'${tty}'`).join(', ');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(moduleFixture.createNestApplication());
    await app.init();
    db = app.get(DataSource);

    [ingredient] = await db.query(
      "SELECT id, RXCUI, STR FROM RXNCONSO WHERE STR = 'acetaminophen' AND TTY = 'IN' LIMIT 1",
    );
    [withNdc] = await db.query(
      `SELECT c.id, c.RXCUI, s.ATV AS NDC
       FROM RXNSAT s JOIN RXNCONSO c ON c.RXAUI = s.RXAUI
       WHERE s.ATN = 'NDC' AND c.TTY NOT IN (${excluded})
       ORDER BY c.id LIMIT 1`,
    );
    expect(ingredient).toBeDefined();
    expect(withNdc).toBeDefined();
  });

  afterAll(async () => {
    await app?.close();
  });

  const search = (query: Record<string, string>) =>
    request(app.getHttpServer()).get('/search').query(query);

  // Ids of every name match, in the order the API should page through them
  const expectedIds = async (
    term: string,
    field: 'STR' | 'RXCUI' | 'TTY',
    direction: 'ASC' | 'DESC',
  ): Promise<number[]> => {
    const rows: { id: number }[] = await db.query(
      `SELECT id FROM RXNCONSO
       WHERE STR LIKE ? AND TTY NOT IN (${excluded})
       ORDER BY ${field} ${direction}, id ${direction}`,
      [`%${term}%`],
    );
    return rows.map((row) => Number(row.id));
  };

  // Follows the cursor from the first page to the last, the way the client does
  const pageThrough = async (
    searchTerm: string,
    sortField: 'STR' | 'RXCUI' | 'TTY',
    sortDirection: 'asc' | 'desc',
  ) => {
    const ids: number[] = [];
    let cursor: { cursor: string; cursorId: string } | undefined;
    let totalResults: number | undefined;

    for (let pages = 0; pages < 1000; pages++) {
      const { body } = (await search({
        searchTerm,
        sortField,
        sortDirection,
        ...cursor,
      }).expect(200)) as { body: SearchResults };

      if (!cursor) {
        totalResults = body.totalResults;
      } else {
        expect(body.totalResults).toBeUndefined();
      }

      ids.push(...body.searchResults.map((row) => Number(row.id)));
      if (body.searchResults.length < 50) {
        break;
      }

      const last = body.searchResults[body.searchResults.length - 1];
      cursor = { cursor: String(last[sortField]), cursorId: String(last.id) };
    }

    return { ids, totalResults };
  };

  describe('GET /', () => {
    it('responds', () =>
      request(app.getHttpServer()).get('/').expect(200).expect('Hello World!'));
  });

  describe('middleware', () => {
    it('sets security headers', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('allows the configured origin', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
    });

    it('does not allow other origins', async () => {
      const response = await request(app.getHttpServer())
        .get('/')
        .set('Origin', 'https://evil.example');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('GET /search', () => {
    it.each<Record<string, string>>([
      {},
      { searchTerm: '' },
      { searchTerm: '   ' },
    ])('rejects a request with no search term: %p', (query) =>
      search(query).expect(400).expect({
        statusCode: 400,
        message: 'Search term is required',
      }),
    );

    it('returns the first 50 name matches and how many there are in all', async () => {
      const expected = await expectedIds('acetaminophen', 'STR', 'ASC');
      const { body } = (await search({ searchTerm: 'acetaminophen' }).expect(
        200,
      )) as { body: SearchResults };

      expect(body.totalResults).toBe(expected.length);
      expect(body.searchResults.map((row) => Number(row.id))).toEqual(
        expected.slice(0, 50),
      );
      expect(Object.keys(body.searchResults[0]).sort()).toEqual([
        'RXCUI',
        'STR',
        'TTY',
        'id',
      ]);
    });

    // TTY has long runs of equal values, so it is the sort most likely to
    // skip or repeat rows at a page boundary if the id tie-breaker is wrong.
    it.each([
      ['STR', 'asc'],
      ['STR', 'desc'],
      ['RXCUI', 'asc'],
      ['RXCUI', 'desc'],
      ['TTY', 'asc'],
      ['TTY', 'desc'],
    ] as const)(
      'pages through every match by %s %s with nothing skipped or repeated',
      async (field, direction) => {
        const expected = await expectedIds(
          'acetaminophen',
          field,
          direction.toUpperCase() as 'ASC' | 'DESC',
        );
        expect(expected.length).toBeGreaterThan(100); // several pages

        const { ids, totalResults } = await pageThrough(
          'acetaminophen',
          field,
          direction,
        );

        expect(totalResults).toBe(expected.length);
        expect(ids).toEqual(expected);
      },
    );

    it('never returns excluded term types', async () => {
      const { ids } = await pageThrough('acetaminophen', 'TTY', 'asc');
      const ttys: { TTY: string }[] = await db.query(
        'SELECT DISTINCT TTY FROM RXNCONSO WHERE id IN (?)',
        [ids],
      );

      for (const { TTY } of ttys) {
        expect(EXCLUDED_TTYS).not.toContain(TTY);
      }
    });

    it('matches every word, in any order', async () => {
      const forward = (await search({
        searchTerm: 'acetaminophen tablet',
      }).expect(200)) as { body: SearchResults };
      const reversed = (await search({
        searchTerm: 'TABLET   Acetaminophen',
      }).expect(200)) as { body: SearchResults };

      expect(forward.body.totalResults).toBeGreaterThan(0);
      expect(reversed.body).toEqual(forward.body);
      for (const { STR } of forward.body.searchResults) {
        expect(STR.toLowerCase()).toContain('acetaminophen');
        expect(STR.toLowerCase()).toContain('tablet');
      }
    });

    it('finds a concept by RXCUI', async () => {
      const { body } = (await search({ searchTerm: ingredient.RXCUI }).expect(
        200,
      )) as { body: SearchResults };

      expect(body.searchResults.map((row) => Number(row.id))).toContain(
        Number(ingredient.id),
      );
      for (const row of body.searchResults) {
        expect(
          row.RXCUI === ingredient.RXCUI || row.STR.includes(ingredient.RXCUI),
        ).toBe(true);
      }
    });

    it('finds a drug by NDC', async () => {
      const { body } = (await search({ searchTerm: withNdc.NDC }).expect(
        200,
      )) as { body: SearchResults };

      expect(body.searchResults.map((row) => Number(row.id))).toContain(
        Number(withNdc.id),
      );
    });

    it.each(['%', '_'])(
      'matches %p literally rather than as a wildcard',
      async (wildcard) => {
        const { body } = (await search({ searchTerm: wildcard }).expect(
          200,
        )) as { body: SearchResults };

        for (const { STR } of body.searchResults) {
          expect(STR).toContain(wildcard);
        }
      },
    );

    it('returns nothing, not an error, when nothing matches', () =>
      search({ searchTerm: 'zzqxnotadrugzzqx' })
        .expect(200)
        .expect({ totalResults: 0, searchResults: [] }));

    it('sorts by name when asked to sort by a column it does not allow', async () => {
      const byName = await search({ searchTerm: 'acetaminophen' });
      const byId = await search({
        searchTerm: 'acetaminophen',
        sortField: 'id',
      }).expect(200);

      expect(byId.body).toEqual(byName.body);
    });
  });

  describe('GET /drug/:id', () => {
    it('returns the drug, its NDCs and its related drugs', async () => {
      const { body } = (await request(app.getHttpServer())
        .get(`/drug/${ingredient.id}`)
        .expect(200)) as { body: Drug };

      expect(body).toMatchObject({
        id: Number(ingredient.id),
        RXCUI: ingredient.RXCUI,
        STR: 'acetaminophen',
        TTY: 'IN',
      });
      expect(typeof body.ATV).toBe('string');
      expect(body.RelatedDrugs?.length).toBeGreaterThan(0);
    });

    it('relates only to this concept, without inverse links or excluded types', async () => {
      const { body } = (await request(app.getHttpServer())
        .get(`/drug/${ingredient.id}`)
        .expect(200)) as { body: Drug };

      for (const related of body.RelatedDrugs ?? []) {
        expect([related.r_RXCUI1, related.r_RXCUI2]).toContain(
          ingredient.RXCUI,
        );
        expect(related.c1_RXCUI).toBe(related.r_RXCUI1);
        expect(related.c2_RXCUI).toBe(related.r_RXCUI2);
        expect(related.r_RELA).not.toMatch(/_of$|^inverse_/);
        expect(EXCLUDED_TTYS).not.toContain(related.c1_TTY);
        expect(EXCLUDED_TTYS).not.toContain(related.c2_TTY);
      }
    });

    it("lists the drug's NDCs", async () => {
      const { body } = (await request(app.getHttpServer())
        .get(`/drug/${withNdc.id}`)
        .expect(200)) as { body: Drug };

      expect(body.ATV.split(', ')).toContain(withNdc.NDC);
    });

    it('returns a 404 for a drug that does not exist', () =>
      request(app.getHttpServer())
        .get('/drug/999999999')
        .expect(404)
        .expect({ statusCode: 404, message: 'Drug not found' }));
  });
});
