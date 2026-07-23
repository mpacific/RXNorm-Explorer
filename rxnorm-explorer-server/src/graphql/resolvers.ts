import { prisma } from "../lib/prisma.js";

export default {
  Query: {
    allRXNCONSO: (_: void, args: {
      page: number
    }) => {
      const limit = 50
      const offset = (args.page - 1) * limit

      return prisma.rXNCONSO.findMany({
        where: {
          TTY: {
            in: ["SBD", "SCD", "SBDG", "SCDG", "SBDF", "SCDF"]
          }
        },
        take: limit,
        skip: offset
      });
    },
    allRXNREL: (_: void, args: {
      page: number
    }) => {
      const limit = 50
      const offset = (args.page - 1) * limit

      return prisma.rXNREL.findMany({
        where: {
          RXCUI1: {
            not: ""
          },
          RXCUI2: {
            not: ""
          }
        },
        take: limit,
        skip: offset
      });

    },
    allRXNSAT: (_: void, args: {
      page: number
    }) => {
      const limit = 50
      const offset = (args.page - 1) * limit

      return prisma.rXNSAT.findMany({
        where: {
          RXCUI: {
            not: ""
          }
        },
        take: limit,
        skip: offset
      });

    }
  }
}