import { RXNCONSO } from '../src/db/entities/RXNCONSO.entity';

export type SearchResults = {
  searchResults: RXNCONSO[];
  totalResults: number;
};
