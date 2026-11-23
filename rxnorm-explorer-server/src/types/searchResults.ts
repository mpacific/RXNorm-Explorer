import { type Drug } from './drug';

// One row of search results: only the columns the search endpoint selects.
// A plain type rather than the RXNCONSO entity, so the API contract doesn't
// depend on the persistence model (and the client doesn't pull in TypeORM).
export type SearchResult = Pick<Drug, 'id' | 'RXCUI' | 'TTY' | 'STR'>;

export type SearchResults = {
  searchResults: SearchResult[];
  // only sent with the first page; later pages keep the first page's total
  totalResults?: number;
};
