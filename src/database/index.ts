import { PrismaClient } from "@prisma/client";

// Serverless reusa o processo entre invocações: sem o cache global, cada
// hot-reload/instância abriria uma conexão nova e estouraria o pooler.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
