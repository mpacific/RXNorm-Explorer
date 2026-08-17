import { prisma } from '../lib/prisma.js';

export default {
  Query: {
    searchRXNCONSO: async (
      _: void,
      args: {
        searchTerm: string;
        cursor: number;
      }
    ) => {
      const limit = 50;
      const cursor = args.cursor || 0;

      const criteria = {
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
      };

      const rows = await prisma.rXNCONSO.findMany({
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
          ...criteria,
          id: {
            gt: cursor,
          },
        },
        orderBy: [
          {
            id: 'asc',
          },
        ],
        take: limit,
      });

      const totalCount = await prisma.rXNCONSO.count({
        where: criteria,
      });

      return {
        rows,
        totalCount,
      };
    },
  },
};
