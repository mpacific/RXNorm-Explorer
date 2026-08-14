import { prisma } from "../lib/prisma.js";

export default {
  Query: {
    searchRXNCONSO: (_: void, args: {
      searchTerm: string,
      page: number
    }) => {
      const limit = 50
      const offset = (args.page - 1) * limit

      return prisma.rXNCONSO.findMany({
        select: {
          id: true,
          RXCUI: true,
          TTY: true,
          STR: true
        },
        where: {
          OR: [
            {
              STR: {
                contains: args.searchTerm
              }
            },
            {
              RXCUI: args.searchTerm
            }
          ],
          TTY: {
            in: ["SBD", "SCD", "SBDG", "SCDG", "SBDF", "SCDF"]
          }
        },
        take: limit,
        skip: offset
      })
    }
  }
}