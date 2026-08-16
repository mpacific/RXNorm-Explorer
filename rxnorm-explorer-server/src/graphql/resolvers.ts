import { prisma } from '../lib/prisma.js';

export default {
  Query: {
    searchRXNCONSO: (
      _: void,
      args: {
        searchTerm: string;
        page: number;
      }
    ) => {
      const limit = 50;
      const offset = (args.page - 1) * limit;

      return prisma.rXNCONSO.findMany({
        select: {
          id: true,
          TTY: true,
          RXCUI: true,
          STR: true,
          RXNSAT: {
            select: {
              ATV: true,
            },
          },
        },
        where: {
          OR: [
            {
              STR: {
                contains: args.searchTerm,
              },
            },
            {
              RXCUI: args.searchTerm,
            },
            {
              RXNSAT: {
                some: {
                  ATN: 'NDC',
                  ATV: args.searchTerm,
                },
              },
            },
          ],
          TTY: {
            in: ['SBD', 'SCD', 'SBDG', 'SCDG', 'SBDF', 'SCDF'],
          },
        },
        orderBy: [
          {
            id: 'asc',
          },
        ],
        take: limit,
        skip: offset,
      });
    },
  },
};
