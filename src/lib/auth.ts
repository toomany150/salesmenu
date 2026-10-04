// src/lib/auth.ts
// 참좋은 공인중개사사무소 계정 인증 및 접근 제어 모듈
import { UserItem, UserRole } from './types';

// 기본 사전 등록 계정 목록 (대표 공인중개사)
export const DEFAULT_USERS: Array<Omit<UserItem, 'createdAt' | 'updatedAt'> & { password: string }> = [
  {
    id: 'usr-admin',
    username: 'admin',
    password: '1234',
    name: '개업공인중개사 (대표)',
    role: 'ADMIN',
    phone: '010-1234-5678',
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
 * - 관리자(ADMIN) 또는 개업공인중개사(대표): 항상 모든 고객 연락처 열람 가능
 * - 소속 권한자: 주 담당자, 추가 지정 권한자(assignedAgents), 공용 매물, 본인 등록 항목 열람 가능
 */
export function canViewCustomerContact(
  user: { id: string; name: string; role: UserRole } | null,
  customer: { managerName?: string; assignedAgents?: string[]; createdById?: string }
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.name.includes('개업공인중개사') || user.name.includes('대표')) return true;
  if (customer.managerName && customer.managerName === user.name) return true;
  if (customer.createdById && customer.createdById === user.id) return true;
  if (Array.isArray(customer.assignedAgents)) {
    if (customer.assignedAgents.includes(user.name)) return true;
    if (customer.assignedAgents.includes('사무실(공용)') || customer.assignedAgents.includes('사무실')) return true;
  }
  return false;
}

/**
 * 수정 권한 판별
 * - 개업공인중개사(대표) / 관리자(ADMIN): 모든 매물/고객 수정 가능
 * - 권한을 부여받은 사람:
 *   1) 주 담당자(managerName === user.name)
 *   2) 추가 지정 권한자 목록에 포함된 사람(assignedAgents.includes(user.name))
 *   3) 사무실(공용)으로 지정되어 있는 경우
 *   4) 본인이 직접 등록한 경우(createdById === user.id)
 * - 그 외 사용자: 수정 불가 (조회만 가능)
 */
export function canEditItem(
  user: { id: string; name: string; role: UserRole } | null,
  item: { managerName?: string; assignedAgents?: string[]; createdById?: string } | null | undefined
): boolean {
  if (!user || !item) return false;
  // 1. 개업공인중개사(대표) 및 관리자
  if (user.role === 'ADMIN' || user.name.includes('개업공인중개사') || user.name.includes('대표')) {
    return true;
  }
  // 2. 주 담당자
  if (item.managerName && item.managerName === user.name) {
    return true;
  }
  // 3. 추가 지정 권한자 목록
  if (Array.isArray(item.assignedAgents)) {
    if (item.assignedAgents.includes(user.name)) return true;
    if (item.assignedAgents.includes('사무실(공용)') || item.assignedAgents.includes('사무실')) return true;
  }
  // 4. 본인 등록 항목
  if (item.createdById && item.createdById === user.id) {
    return true;
  }
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
