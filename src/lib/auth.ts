// src/lib/auth.ts
// 참좋은 공인중개사사무소 계정 인증 및 접근 제어 모듈
import { UserItem, UserRole } from './types';

// 기본 사전 등록 계정 목록 (개발자/대표 관리자 1명 + 소속공인중개사 5명)
export const DEFAULT_USERS: Array<Omit<UserItem, 'createdAt' | 'updatedAt'> & { password: string }> = [
  {
    id: 'usr-admin',
    username: 'admin',
    password: 'admin123!',
    name: '대표 공인중개사 (관리자)',
    role: 'ADMIN',
    phone: '010-1234-5678',
    isActive: true,
  },
  {
    id: 'usr-agent1',
    username: 'agent1',
    password: '1234',
    name: '김소공 실장',
    role: 'AGENT',
    phone: '010-2345-6789',
    isActive: true,
  },
  {
    id: 'usr-agent2',
    username: 'agent2',
    password: '1234',
    name: '이소공 실장',
    role: 'AGENT',
    phone: '010-3456-7890',
    isActive: true,
  },
  {
    id: 'usr-agent3',
    username: 'agent3',
    password: '1234',
    name: '박소공 실장',
    role: 'AGENT',
    phone: '010-4567-8901',
    isActive: true,
  },
  {
    id: 'usr-agent4',
    username: 'agent4',
    password: '1234',
    name: '최소공 실장',
    role: 'AGENT',
    phone: '010-5678-9012',
    isActive: true,
  },
  {
    id: 'usr-agent5',
    username: 'agent5',
    password: '1234',
    name: '정소공 실장',
    role: 'AGENT',
    phone: '010-6789-0123',
    isActive: true,
  },
];

// DB에 기본 계정이 없을 시 자동 시딩
export async function ensureSeedUsers() {
  try {
    const { prisma } = await import('./prisma');
    const count = await prisma.user.count();
    if (count === 0) {
      for (const u of DEFAULT_USERS) {
        await prisma.user.upsert({
          where: { username: u.username },
          update: {},
          create: {
            id: u.id,
            username: u.username,
            password: u.password,
            name: u.name,
            role: u.role,
            phone: u.phone,
            isActive: u.isActive,
          },
        });
      }
    }
  } catch (err) {
    console.warn('[ensureSeedUsers] DB connection notice, fallback available:', err);
  }
}

// 접속 감사 로그 생성 헬퍼
export async function recordAccessLog(params: {
  userId?: string;
  userName: string;
  userRole: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const { prisma } = await import('./prisma');
    await prisma.accessLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: params.details,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    console.warn('[recordAccessLog] Could not record log to DB:', err);
  }
}

/**
 * 전화번호 마스킹 유틸리티
 * 010-1234-5678 -> 010-****-5678
 * 02-123-4567 -> 02-***-4567
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '연락처 없음';
  const clean = phone.trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-****-${parts[2]}`;
  }
  if (clean.length >= 7) {
    const head = clean.slice(0, 3);
    const tail = clean.slice(-4);
    return `${head}-****-${tail}`;
  }
  return '***-****-****';
}

/**
 * 고객 연락처 열람 권한 판별
 * - 관리자(ADMIN): 항상 모든 고객 연락처 열람 가능
 * - 소속공인중개사(AGENT): 본인이 등록/담당한 고객(managerName === user.name 또는 createdById === user.id)만 열람 가능
 */
export function canViewCustomerContact(
  user: { id: string; name: string; role: UserRole } | null,
  customer: { managerName?: string; createdById?: string }
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (customer.managerName && customer.managerName === user.name) return true;
  if (customer.createdById && customer.createdById === user.id) return true;
  return false;
}

/**
 * 수정 권한 판별
 * - 관리자(ADMIN): 모든 매물/고객 수정 가능
 * - 소속공인중개사(AGENT): 본인이 등록한 항목(managerName === user.name 또는 createdById === user.id)만 수정 가능
 */
export function canEditItem(
  user: { id: string; name: string; role: UserRole } | null,
  item: { managerName?: string; createdById?: string }
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (item.managerName && item.managerName === user.name) return true;
  if (item.createdById && item.createdById === user.id) return true;
  return false;
}

/**
 * 삭제 권한 판별
 * - 오직 관리자(ADMIN)만 삭제 가능
 */
export function canDeleteItem(
  user: { role: UserRole } | null
): boolean {
  return !!user && user.role === 'ADMIN';
}
