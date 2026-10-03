// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

function ensureDatabaseUrl(): string {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const currentUrl = process.env.DATABASE_URL?.trim();

  // If a PostgreSQL / remote database URL is explicitly configured, use it
  if (currentUrl && !currentUrl.startsWith('file:')) {
    return currentUrl;
  }

  // Running on Vercel Serverless environment:
  // Root directory is read-only, so SQLite database must reside in /tmp
  if (isVercel) {
    const tmpDbPath = '/tmp/dev.db';
    try {
      // Dynamic require on Node.js server to prevent client bundle errors
      const fs = eval("require('fs')");
      const path = eval("require('path')");
      if (!fs.existsSync(tmpDbPath)) {
        const candidates = [
          path.join(process.cwd(), 'prisma', 'seed.db'),
          path.join(process.cwd(), 'prisma', 'dev.db'),
        ];
        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            fs.copyFileSync(candidate, tmpDbPath);
            break;
          }
        }
      }
    } catch (e) {
      console.warn('Notice: Could not copy seed DB to /tmp:', e);
    }
    const vercelDbUrl = `file:${tmpDbPath}`;
    process.env.DATABASE_URL = vercelDbUrl;
    return vercelDbUrl;
  }

  // Local development: ensure local dev.db exists from seed.db if missing
  try {
    const fs = eval("require('fs')");
    const path = eval("require('path')");
    const localDevDb = path.join(process.cwd(), 'prisma', 'dev.db');
    if (!fs.existsSync(localDevDb)) {
      const seedPath = path.join(process.cwd(), 'prisma', 'seed.db');
      if (fs.existsSync(seedPath)) {
        fs.copyFileSync(seedPath, localDevDb);
      }
    }
  } catch (e) {}

  const localUrl = currentUrl || 'file:./dev.db';
  process.env.DATABASE_URL = localUrl;
  return localUrl;
}

const activeDbUrl = ensureDatabaseUrl();

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: activeDbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
