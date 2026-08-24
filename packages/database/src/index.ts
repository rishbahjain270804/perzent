import { PrismaClient } from '@prisma/client';

declare global {
  var __PERZENT_PRISMA__: PrismaClient | undefined;
}

export const prisma = globalThis.__PERZENT_PRISMA__ ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__PERZENT_PRISMA__ = prisma;
}

export * from '@prisma/client';
