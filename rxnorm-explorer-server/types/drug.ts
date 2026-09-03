import { type RelatedDrugs } from './relatedDrugs';

export type Drug = {
  id: number;
  TTY: string;
  RXCUI: string;
  STR: string;
  ATV: string;
  RelatedDrugs?: RelatedDrugs;
};
