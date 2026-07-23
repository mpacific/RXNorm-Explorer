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

    type Query {
        allRXNCONSO(page: Int!): [RXNCONSO!]!
    }
`