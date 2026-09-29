import { RXNCONSO } from '../src/db/entities/RXNCONSO.entity';

export type SearchResults = {
  searchResults: RXNCONSO[];
  // only sent with the first page; later pages keep the first page's total
  totalResults?: number;
};
