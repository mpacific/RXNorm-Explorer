export type RelatedDrug = {
  r_id: number;
  r_RELA: string;
  r_RXCUI1: string;
  r_RXCUI2: string;
  c1_RXAUI: string;
  c1_RXCUI: string;
  c1_TTY: string;
  c1_STR: string;
  c2_RXAUI: string;
  c2_RXCUI: string;
  c2_TTY: string;
  c2_STR: string;
};

export type RelatedDrugs = RelatedDrug[];
