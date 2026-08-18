export default `
  type RXNCONSO {
    id: ID!
    RXCUI: String!
    LAT: String!
    TS: String
    LUI: String
    STT: String
    SUI: String
    ISPREF: String
    RXAUI: String!
    SAUI: String
    SCUI: String
    SDUI: String
    SAB: String!
    TTY: String!
    CODE: String!
    STR: String!
    SRL: String
    SUPPRESS: String
    CVF: String
    RXNSAT: [RXNSAT]
    RelatedDrugs: [RelatedDrugs]
  }

  type RelatedDrugs {
    r_id: Int!
    r_RELA: String!
    r_RXCUI1: String!
    r_RXCUI2: String!
    c1_id: Int!
    c1_RXCUI: String!
    c1_TTY: String!
    c1_STR: String!
    c2_id: Int!
    c2_RXCUI: String!
    c2_TTY: String!
    c2_STR: String!
  }

  type RXNSAT {
    id: ID!
    RXCUI: String
    LUI: String
    SUI: String
    RXAUI: String
    STYPE: String
    CODE: String
    ATUI: String
    SATUI: String
    ATN: String!
    SAB: String!
    ATV: String
    SUPPRESS: String
    CVF: String
    RXNCONSO: RXNCONSO
  }

  type searchRXNCONSOResult {
    rows: [RXNCONSO]!
    totalCount: Int!
  }

  type Query {
    searchRXNCONSO(searchTerm: String!, cursor: Int): searchRXNCONSOResult!
    getRXNCONSO(id: Int!): RXNCONSO!
  }
`;
