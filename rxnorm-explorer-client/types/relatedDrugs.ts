export type RelatedDrug = {
  r_id: number;
  r_RELA: string;
  r_RXCUI1: string;
  r_RXCUI2: string;
  c1_id: number;
  c1_RXCUI: string;
  c1_TTY: string;
  c1_STR: string;
  c2_id: number;
  c2_RXCUI: string;
  c2_TTY: string;
  c2_STR: string;
};

export type RelatedDrugs = RelatedDrug[];
