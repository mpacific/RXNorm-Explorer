import { type Drug } from '../../../rxnorm-explorer-server/types/drug';

// One row of search results: only the columns the search endpoint selects, so
// none of the NDCs or related drugs a full Drug carries.
export type SearchResult = Pick<Drug, 'id' | 'RXCUI' | 'TTY' | 'STR'>;
