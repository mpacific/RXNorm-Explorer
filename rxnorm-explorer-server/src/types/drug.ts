import { type RelatedDrugs } from './relatedDrugs';

// Drugs are identified by RXAUI, RxNorm's own atom id, which stays the same
// across monthly releases. The surrogate RXNCONSO.id is renumbered whenever
// the data is reloaded, so it never leaves the API except inside a search
// cursor.
export type Drug = {
  RXAUI: string;
  TTY: string;
  RXCUI: string;
  STR: string;
  // Every NDC (package code) for this atom
  NDCs: string[];
  RelatedDrugs?: RelatedDrugs;
};
