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
  }

  type RXNREL {
    id: ID!
    RXCUI1: String
    RXAUI1: String
    STYPE1: String
    REL: String
    RXCUI2: String
    RXAUI2: String
    STYPE2: String
    RELA: String
    RUI: String
    SRUI: String
    SAB: String!
    SL: String
    DIR: String
    RG: String
    SUPPRESS: String
    CVF: String
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
  }

  type Query {
    searchRXNCONSO(searchTerm: String!, page: Int!): [RXNCONSO!]!
  }
`;
