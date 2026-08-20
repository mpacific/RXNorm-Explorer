import { GraphQLError } from 'graphql';
import { prisma } from '../lib/prisma.js';
import type { RelatedDrugs } from '../../../types/relatedDrugs.js';
import type { Drug } from '../../../types/drug.js';

const excludeTtyList = ['DP', 'SU', 'TMSY', 'SY'];

export default {
  Query: {
    getRXNCONSO: async (
      _: void,
      args: {
        id: number;
      }
    ) => {
      const drugId = args.id;

      // Prisma is unable to do a join here to RXNREL the way
      // that was needed, so I am breaking that into its own query.
      const drug: Drug | null = await prisma.rXNCONSO.findUnique({
        select: {
          id: true,
          RXCUI: true,
          TTY: true,
          STR: true,
          RXNSAT: {
            select: {
              ATV: true,
              RXNCONSO: {
                select: {
                  id: true,
                  TTY: true,
                  RXCUI: true,
                  STR: true,
                },
              },
            },
            where: {
              ATN: 'NDC',
            },
          },
        },
        where: {
          id: drugId,
          TTY: {
            notIn: excludeTtyList,
          },
        },
      });

      if (!drug) {
        throw new GraphQLError('Drug not found', {
          extensions: {
            code: 'NOT_FOUND',
            http: {
              status: 404,
            },
          },
        });
      }

      const rxnrelQuery: RelatedDrugs = await prisma.$queryRaw`
        SELECT r.id AS r_id, r.RELA AS r_RELA, r.RXCUI1 AS r_RXCUI1, r.RXCUI2 AS r_RXCUI2, 
        c1.id AS c1_id, c1.RXCUI AS c1_RXCUI, c1.TTY AS c1_TTY, c1.STR AS c1_STR,
        c2.id AS c2_id, c2.RXCUI AS c2_RXCUI, c2.TTY AS c2_TTY, c2.STR AS c2_STR
        FROM RXNREL AS r
        JOIN RXNCONSO AS c1 ON r.RXCUI1 = c1.RXCUI
        JOIN RXNCONSO AS c2 ON r.RXCUI2 = c2.RXCUI
        WHERE r.RELA IS NOT null 
        AND r.RELA NOT IN ('inverse_isa', 'ingredient_of', 'tradename_of', 'dose_form_of', 'precise_ingredient_of', 'doseformgroup_of', 'ingredients_of', 'part_of', 'boss_of', 'form_of')
        AND (r.RXCUI1 = ${drug.RXCUI} OR r.RXCUI2 = ${drug.RXCUI})
        AND c1.TTY NOT IN ('DP', 'SU', 'TMSY', 'SY')
        AND c2.TTY NOT IN ('DP', 'SU', 'TMSY', 'SY')
        ORDER BY r.RXCUI1, r.RXCUI2
      `;
      drug.RelatedDrugs = rxnrelQuery;

      return drug;
    },
    searchRXNCONSO: async (
      _: void,
      args: {
        searchTerm: string;
        cursor: number;
        sortField: string;
        sortDirection: string;
      }
    ) => {
      const limit = 50;
      const cursor = args.cursor || 0;
      const sortField = args.sortField || 'STR';
      const sortDirection = args.sortDirection === 'desc' ? 'desc' : 'asc';

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
          notIn: excludeTtyList,
        },
      };

      const rows = await prisma.rXNCONSO.findMany({
        select: {
          id: true,
          TTY: true,
          RXCUI: true,
          STR: true,
          RXNSAT: {
            where: {
              ATN: 'NDC',
            },
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
            [sortField]: sortDirection,
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
