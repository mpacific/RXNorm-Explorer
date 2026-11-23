import { type RelatedDrugs } from './relatedDrugs';

export type Drug = {
  id: number;
  TTY: string;
  RXAUI: string;
  RXCUI: string;
  STR: string;
  // Every NDC (package code) for this atom
  NDCs: string[];
  RelatedDrugs?: RelatedDrugs;
};
