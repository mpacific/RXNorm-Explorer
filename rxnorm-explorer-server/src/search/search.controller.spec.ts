import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchResults } from '../types/searchResults';
import { createValidationPipe } from '../config/validation-pipe';

describe('SearchController', () => {
  let app: INestApplication<App>;
  const searchService = { searchDrugs: jest.fn() };

  const results = {
    totalResults: 1,
    searchResults: [{ id: 1, TTY: 'IN', RXCUI: '161', STR: 'acetaminophen' }],
  } as SearchResults;

  beforeEach(async () => {
    searchService.searchDrugs.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: searchService }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('passes the query parameters to the search and returns its results', async () => {
    searchService.searchDrugs.mockResolvedValue(results);

    await request(app.getHttpServer())
      .get('/search')
      .query({
        searchTerm: 'acetaminophen',
        cursor: 'aspirin',
        cursorId: '42',
        sortField: 'RXCUI',
        sortDirection: 'desc',
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(results);

    expect(searchService.searchDrugs).toHaveBeenCalledWith(
      'acetaminophen',
      'aspirin',
      '42',
      'RXCUI',
      'desc',
    );
  });

  it('passes missing parameters through as undefined', async () => {
    searchService.searchDrugs.mockResolvedValue(results);

    await request(app.getHttpServer())
      .get('/search?searchTerm=161')
      .expect(200);

    expect(searchService.searchDrugs).toHaveBeenCalledWith(
      '161',
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('lets results be cached for an hour, but not errors', async () => {
    searchService.searchDrugs.mockResolvedValue(results);
    await request(app.getHttpServer())
      .get('/search?searchTerm=161')
      .expect(200)
      .expect('Cache-Control', 'public, max-age=3600');

    const rejected = await request(app.getHttpServer())
      .get('/search?searchTerm=161&sortField=id')
      .expect(400);
    expect(rejected.headers['cache-control']).toBeUndefined();
  });

  it('decodes an encoded cursor', async () => {
    searchService.searchDrugs.mockResolvedValue(results);

    await request(app.getHttpServer())
      .get('/search?searchTerm=a&cursor=a%20%26%20b%2Fc&cursorId=1')
      .expect(200);

    expect(searchService.searchDrugs.mock.calls[0][1]).toBe('a & b/c');
  });

  it("passes on the search's own errors", async () => {
    searchService.searchDrugs.mockRejectedValue(
      new HttpException('Search term is required', HttpStatus.BAD_REQUEST),
    );

    await request(app.getHttpServer()).get('/search').expect(400).expect({
      statusCode: 400,
      message: 'Search term is required',
    });
  });

  // Express parses a repeated key into an array, which used to reach the
  // service and fail there with a 500
  it.each([
    ['a repeated searchTerm', 'searchTerm=a&searchTerm=b'],
    [
      'a repeated sortDirection',
      'searchTerm=a&sortDirection=asc&sortDirection=desc',
    ],
    ['a repeated cursor', 'searchTerm=a&cursor=a&cursor=b&cursorId=1'],
    ['an unknown sortField', 'searchTerm=a&sortField=id'],
    ['an unknown sortDirection', 'searchTerm=a&sortDirection=sideways'],
    ['a non-numeric cursorId', 'searchTerm=a&cursor=a&cursorId=1e3'],
    ['an over-long searchTerm', `searchTerm=${'a'.repeat(201)}`],
  ])('rejects %s with a 400', async (_, query) => {
    const response = await request(app.getHttpServer())
      .get(`/search?${query}`)
      .expect(400);

    expect(response.body).toMatchObject({ statusCode: 400 });
    expect(searchService.searchDrugs).not.toHaveBeenCalled();
  });

  it('ignores query parameters it does not know', async () => {
    searchService.searchDrugs.mockResolvedValue(results);

    await request(app.getHttpServer())
      .get('/search?searchTerm=161&limit=100000')
      .expect(200);

    expect(searchService.searchDrugs).toHaveBeenCalledWith(
      '161',
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });
});
