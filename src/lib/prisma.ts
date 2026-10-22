// src/lib/prisma.ts

// 1. Prisma 클라이언트 로드 전 DATABASE_URL 환경변수 기본값 사전 보장
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
  process.env.DATABASE_URL = 'file:./prisma/dev.db';
}

import { PrismaClient } from '@prisma/client';

function ensureDatabaseUrl(): string {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const currentUrl = process.env.DATABASE_URL?.trim();

  // 원격 PostgreSQL / MySQL 등의 URL이 명시되어 있는 경우
  if (currentUrl && !currentUrl.startsWith('file:')) {
    let optimizedUrl = currentUrl;
    // Supabase Pooler 최적화: 5432 포트(세션 모드)는 최대 15개 연결 제한으로 EMAXCONNSESSION 발생 위험이 있으므로
    // 트랜잭션 풀러 포트인 6543 및 pgbouncer=true, connection_limit=1로 자동 보정하여 무제한 안전 접속 보장
    if (optimizedUrl.includes('pooler.supabase.com:5432')) {
      optimizedUrl = optimizedUrl.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543');
    }
    if (optimizedUrl.includes('pooler.supabase.com:6543')) {
      if (!optimizedUrl.includes('pgbouncer=true')) {
        optimizedUrl += optimizedUrl.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true';
      }
      if (!optimizedUrl.includes('connection_limit=')) {
        optimizedUrl += '&connection_limit=10';
      }
      if (!optimizedUrl.includes('pool_timeout=')) {
        optimizedUrl += '&pool_timeout=20';
      }
    }
    process.env.DATABASE_URL = optimizedUrl;
    return optimizedUrl;
  }

  // Vercel Serverless 환경: 루트 파일시스템은 읽기 전용이므로 /tmp에 SQLite 복사 및 탑재
  if (isVercel) {
    const tmpDbPath = '/tmp/dev.db';
    try {
      const fs = eval("require('fs')");
      const path = eval("require('path')");
      if (!fs.existsSync(tmpDbPath)) {
        const candidates = [
          path.join(process.cwd(), 'prisma', 'dev.db'),
          path.join(process.cwd(), 'prisma', 'seed.db'),
          path.resolve('./prisma/dev.db'),
          path.resolve('./prisma/seed.db'),
        ];
        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            try {
              fs.copyFileSync(candidate, tmpDbPath);
              break;
            } catch (copyErr) {
              console.warn('Failed to copy candidate db:', candidate, copyErr);
            }
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

  // 로컬 개발 환경: prisma/dev.db 가 없으면 prisma/seed.db 에서 복사 및 절대 경로 반환
  try {
    const fs = eval("require('fs')");
    const path = eval("require('path')");
    const localDevDb = path.join(process.cwd(), 'prisma', 'dev.db');
    if (!fs.existsSync(localDevDb)) {
      const seedPath = path.join(process.cwd(), 'prisma', 'seed.db');
      if (fs.existsSync(seedPath)) {
        try {
          fs.copyFileSync(seedPath, localDevDb);
        } catch (copyErr) {
          console.warn('Failed to copy seed.db:', copyErr);
        }
      }
    }
    const absoluteDbUrl = `file:${localDevDb.replace(/\\/g, '/')}`;
    process.env.DATABASE_URL = absoluteDbUrl;
    return absoluteDbUrl;
  } catch (e) {}

  const localUrl = currentUrl || 'file:./dev.db';
  process.env.DATABASE_URL = localUrl;
  return localUrl;
}

const activeDbUrl = ensureDatabaseUrl();

const globalForPrisma = global as unknown as { prisma: PrismaClient; dbInitialized?: boolean };

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

/**
 * SQLite 데이터베이스 자가 치유(Self-healing) 및 누락 테이블/컬럼 자동 생성 함수
 * 어떤 환경(Vercel 서버리스 /tmp, 로컬 신규 환경 등)에서도
 * 'The table main.User does not exist' 오류를 원천 차단합니다.
 */
let isInitializingSchema = false;

export async function ensureDatabaseSchema(): Promise<void> {
  // PostgreSQL (Supabase 클라우드)는 이미 모든 스키마/컬럼이 완벽하게 구축되어 있습니다.
  // DDL(ALTER TABLE) 실행 시 테이블에 AccessExclusiveLock이 걸려 쿼리가 수 분간 멈추는 현상을 원천 차단합니다.
  if (!activeDbUrl.startsWith('file:')) {
    globalForPrisma.dbInitialized = true;
    return;
  }

  if (globalForPrisma.dbInitialized || isInitializingSchema) {
    return;
  }
  isInitializingSchema = true;

  try {
    // SQLite DB인지 확인
    if (activeDbUrl.startsWith('file:')) {
      // 1. User 테이블 존재 여부 확인
      const userTableCheck = await prisma.$queryRawUnsafe<any[]>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='User';"
      ).catch(() => []);

      if (!userTableCheck || userTableCheck.length === 0) {
        console.log('[DB Init] User 테이블이 없어 자동 생성을 시작합니다...');
        // User 테이블 생성
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "User" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "username" TEXT NOT NULL,
            "password" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "role" TEXT NOT NULL DEFAULT 'AGENT',
            "phone" TEXT,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
        `);
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
        `);

        // 기본 관리자 및 소공 계정 자동 생성
        await prisma.$executeRawUnsafe(`
          INSERT OR IGNORE INTO "User" ("id", "username", "password", "name", "role", "phone", "isActive", "createdAt", "updatedAt")
          VALUES 
            ('usr-admin', 'admin', '159753tma#', '개업공인중개사 (대표)', 'ADMIN', '010-1234-5678', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('usr-agent1', 'agent1', '1234', '김소공 실장', 'AGENT', '010-2345-6789', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('usr-agent2', 'agent2', '1234', '이소공 실장', 'AGENT', '010-3456-7890', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        `);
      }

      // 1-1. User 테이블 canAccessAllData 컬럼 자동 보정
      try {
        const userCols = await prisma.$queryRawUnsafe<any[]>(`PRAGMA table_info("User");`).catch(() => []);
        const existingUserCols = new Set(userCols ? userCols.map((c: any) => c.name) : []);
        if (!existingUserCols.has('canAccessAllData')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "canAccessAllData" BOOLEAN DEFAULT 0;`);
        }
      } catch (userColErr) {}
      const logTableCheck = await prisma.$queryRawUnsafe<any[]>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='AccessLog';"
      ).catch(() => []);

      if (!logTableCheck || logTableCheck.length === 0) {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "AccessLog" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "userId" TEXT,
            "userName" TEXT NOT NULL,
            "userRole" TEXT NOT NULL,
            "action" TEXT NOT NULL,
            "targetType" TEXT,
            "targetId" TEXT,
            "details" TEXT,
            "ipAddress" TEXT,
            "userAgent" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "AccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
          );
        `);
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "AccessLog_userId_idx" ON "AccessLog"("userId");
        `);
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "AccessLog_action_idx" ON "AccessLog"("action");
        `);
      }

      // 3. Customer & Property 테이블의 추가 컬럼 자동 보정
      try {
        const custCols = await prisma.$queryRawUnsafe<any[]>(`PRAGMA table_info("Customer");`).catch(() => []);
        const existingCustCols = new Set(custCols ? custCols.map((c: any) => c.name) : []);
        if (!existingCustCols.has('assignedAgents')) await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "assignedAgents" TEXT;`);
        if (!existingCustCols.has('subType')) await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "subType" TEXT;`);
        if (!existingCustCols.has('price')) await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "price" REAL;`);
        if (!existingCustCols.has('negotiablePrice')) await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "negotiablePrice" REAL;`);
        if (!existingCustCols.has('deposit')) await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "deposit" REAL;`);
        if (!existingCustCols.has('negotiableDeposit')) await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "negotiableDeposit" REAL;`);
        if (!existingCustCols.has('monthlyRent')) await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "monthlyRent" REAL;`);
        if (!existingCustCols.has('negotiableMonthlyRent')) await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "negotiableMonthlyRent" REAL;`);
        if (!existingCustCols.has('premium')) await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "premium" REAL;`);
        if (!existingCustCols.has('negotiablePremium')) await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "negotiablePremium" REAL;`);
        if (!existingCustCols.has('transactionType')) await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "transactionType" TEXT;`);
        if (!existingCustCols.has('isPinned')) await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN "isPinned" BOOLEAN DEFAULT false;`);
      } catch (colErr) {}

      try {
        const propCols = await prisma.$queryRawUnsafe<any[]>(`PRAGMA table_info("Property");`).catch(() => []);
        const existingPropCols = new Set(propCols ? propCols.map((c: any) => c.name) : []);
        if (!existingPropCols.has('assignedAgents')) await prisma.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN "assignedAgents" TEXT;`);
        if (!existingPropCols.has('negotiablePrice')) await prisma.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN "negotiablePrice" REAL;`);
        if (!existingPropCols.has('negotiableDeposit')) await prisma.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN "negotiableDeposit" REAL;`);
        if (!existingPropCols.has('negotiableMonthlyRent')) await prisma.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN "negotiableMonthlyRent" REAL;`);
        if (!existingPropCols.has('collateral')) await prisma.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN "collateral" TEXT;`);
        if (!existingPropCols.has('purchasePrice')) await prisma.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN "purchasePrice" TEXT;`);
        if (!existingPropCols.has('currentMarketPrice')) await prisma.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN "currentMarketPrice" TEXT;`);
        if (!existingPropCols.has('marketPriceBasis')) await prisma.$executeRawUnsafe(`ALTER TABLE "Property" ADD COLUMN "marketPriceBasis" TEXT;`);
      } catch (colErr) {}

      try {
        const storeCols = await prisma.$queryRawUnsafe<any[]>(`PRAGMA table_info("StoreDetail");`).catch(() => []);
        const existingStoreCols = new Set(storeCols ? storeCols.map((c: any) => c.name) : []);
        if (!existingStoreCols.has('isVacantStore')) await prisma.$executeRawUnsafe(`ALTER TABLE "StoreDetail" ADD COLUMN "isVacantStore" BOOLEAN DEFAULT false;`);
        if (!existingStoreCols.has('previousTenantLicenseRevoked')) await prisma.$executeRawUnsafe(`ALTER TABLE "StoreDetail" ADD COLUMN "previousTenantLicenseRevoked" TEXT;`);
        if (!existingStoreCols.has('previousTenantBizRegRevoked')) await prisma.$executeRawUnsafe(`ALTER TABLE "StoreDetail" ADD COLUMN "previousTenantBizRegRevoked" TEXT;`);
        if (!existingStoreCols.has('monthlyRevenue')) await prisma.$executeRawUnsafe(`ALTER TABLE "StoreDetail" ADD COLUMN "monthlyRevenue" REAL;`);
      } catch (colErr) {}

      try {
        const demandCols = await prisma.$queryRawUnsafe<any[]>(`PRAGMA table_info("CustomerDemand");`).catch(() => []);
        const existingDemandCols = new Set(demandCols ? demandCols.map((c: any) => c.name) : []);
        if (!existingDemandCols.has('residenceType')) await prisma.$executeRawUnsafe(`ALTER TABLE "CustomerDemand" ADD COLUMN "residenceType" TEXT;`);
        if (!existingDemandCols.has('moveOutPlanDate')) await prisma.$executeRawUnsafe(`ALTER TABLE "CustomerDemand" ADD COLUMN "moveOutPlanDate" TEXT;`);
        if (!existingDemandCols.has('jeonseContractPeriod')) await prisma.$executeRawUnsafe(`ALTER TABLE "CustomerDemand" ADD COLUMN "jeonseContractPeriod" TEXT;`);
        if (!existingDemandCols.has('jeonseRemainingPeriod')) await prisma.$executeRawUnsafe(`ALTER TABLE "CustomerDemand" ADD COLUMN "jeonseRemainingPeriod" TEXT;`);
        if (!existingDemandCols.has('jeonseRenewalClaimUsed')) await prisma.$executeRawUnsafe(`ALTER TABLE "CustomerDemand" ADD COLUMN "jeonseRenewalClaimUsed" TEXT;`);
        if (!existingDemandCols.has('monthlyContractPeriod')) await prisma.$executeRawUnsafe(`ALTER TABLE "CustomerDemand" ADD COLUMN "monthlyContractPeriod" TEXT;`);
        if (!existingDemandCols.has('monthlyRemainingPeriod')) await prisma.$executeRawUnsafe(`ALTER TABLE "CustomerDemand" ADD COLUMN "monthlyRemainingPeriod" TEXT;`);
        if (!existingDemandCols.has('monthlyRenewalClaimUsed')) await prisma.$executeRawUnsafe(`ALTER TABLE "CustomerDemand" ADD COLUMN "monthlyRenewalClaimUsed" TEXT;`);
        if (!existingDemandCols.has('loanRequirement')) await prisma.$executeRawUnsafe(`ALTER TABLE "CustomerDemand" ADD COLUMN "loanRequirement" TEXT;`);
      } catch (colErr) {}
    } else {
      // 4. PostgreSQL (Supabase / Production) 환경 누락 컬럼 개별 안전 보정
      const pgQueries = [
        `ALTER TABLE "StoreDetail" ADD COLUMN IF NOT EXISTS "isVacantStore" BOOLEAN DEFAULT false;`,
        `ALTER TABLE "StoreDetail" ADD COLUMN IF NOT EXISTS "previousTenantLicenseRevoked" TEXT;`,
        `ALTER TABLE "StoreDetail" ADD COLUMN IF NOT EXISTS "previousTenantBizRegRevoked" TEXT;`,
        `ALTER TABLE "StoreDetail" ADD COLUMN IF NOT EXISTS "monthlyRevenue" DOUBLE PRECISION;`,
        `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canAccessAllData" BOOLEAN DEFAULT false;`,
        `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN DEFAULT false;`,
        `ALTER TABLE "CustomerDemand" ADD COLUMN IF NOT EXISTS "residenceType" TEXT;`,
        `ALTER TABLE "CustomerDemand" ADD COLUMN IF NOT EXISTS "moveOutPlanDate" TEXT;`,
        `ALTER TABLE "CustomerDemand" ADD COLUMN IF NOT EXISTS "jeonseContractPeriod" TEXT;`,
        `ALTER TABLE "CustomerDemand" ADD COLUMN IF NOT EXISTS "jeonseRemainingPeriod" TEXT;`,
        `ALTER TABLE "CustomerDemand" ADD COLUMN IF NOT EXISTS "jeonseRenewalClaimUsed" TEXT;`,
        `ALTER TABLE "CustomerDemand" ADD COLUMN IF NOT EXISTS "monthlyContractPeriod" TEXT;`,
        `ALTER TABLE "CustomerDemand" ADD COLUMN IF NOT EXISTS "monthlyRemainingPeriod" TEXT;`,
        `ALTER TABLE "CustomerDemand" ADD COLUMN IF NOT EXISTS "monthlyRenewalClaimUsed" TEXT;`,
        `ALTER TABLE "CustomerDemand" ADD COLUMN IF NOT EXISTS "loanRequirement" TEXT;`,
        `ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "collateral" TEXT;`,
        `ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "purchasePrice" TEXT;`,
        `ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "currentMarketPrice" TEXT;`,
        `ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "marketPriceBasis" TEXT;`,
      ];
      for (const q of pgQueries) {
        try {
          await prisma.$executeRawUnsafe(q);
        } catch (e) {}
      }
    }

    globalForPrisma.dbInitialized = true;
  } catch (err) {
    console.error('[DB Init Error] 자동 스키마 점검 중 오류 (무시 가능):', err);
  } finally {
    isInitializingSchema = false;
  }
}

// 최초 임포트 시 비동기 1회 보정 실행
ensureDatabaseSchema().catch(() => {});
