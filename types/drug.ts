import { RelatedDrugs } from "./relatedDrugs";

export type Drug = {
  id: number;
  TTY: string;
  RXCUI: string;
  STR: string;
  RXNSAT?: {
    ATV: string;
  }[];
  RelatedDrugs?: RelatedDrugs;
};
