import { type Drug } from './drug';

// One row of search results: only the columns the search endpoint selects.
// A plain type rather than the RXNCONSO entity, so the API contract doesn't
// depend on the persistence model (and the client doesn't pull in TypeORM).
export type SearchResult = Pick<Drug, 'RXAUI' | 'RXCUI' | 'TTY' | 'STR'> & {
  // Internal row id, only for building the next page's cursor (cursorId).
  // Link to a drug by RXAUI, which survives a data reload.
  id: number;
};

export type SearchResults = {
  searchResults: SearchResult[];
  // only sent with the first page; later pages keep the first page's total
  totalResults?: number;
};
