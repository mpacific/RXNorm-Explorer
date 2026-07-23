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
        }
    }
}