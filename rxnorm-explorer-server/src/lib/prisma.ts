import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';

const getDatabase = () => {
  const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST!,
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    port: Number(process.env.DATABASE_PORT),
    database: process.env.DATABASE_NAME!,
    allowPublicKeyRetrieval: true,
    logger: {
      error: (error) => {
        console.error('PrismaAdapterError', error);
      },
    },
  });
  return new PrismaClient({
    adapter,
  });
};

export const prisma = getDatabase();
