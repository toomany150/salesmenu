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
 * 매물 및 고객 정보 열람 권한 판별
 * - 다른 사람(개업공인중개사 / 타계정 추가자)이 등록한 정보도 기본 물건 스펙/가격/메모 등은 열람 가능 ("다른 것은 열람 가능하나")
 * - 비로그인 상태에서는 사무실 공용 정보만 열람 가능
 */
export function canAccessItem(
  user: { id: string; name: string; role: UserRole } | null,
  item: { managerName?: string; assignedAgents?: string[]; createdById?: string } | null | undefined
): boolean {
  if (!item) return false;

  // 로그인 상태인 사용자는 모든 매물 및 고객의 기본 정보(스펙, 가격, 메모 등) 열람 가능
  if (user) {
    return true;
  }

  // 비로그인 상태에서는 사무실(공용) 정보만 열람 가능
  const isOfficeShared = 
    item.managerName === '사무실' ||
    item.managerName === '사무실 (공용)' ||
    item.managerName === '사무실 (공용/워크인)' ||
    Boolean(item.managerName?.includes('사무실')) ||
    (Array.isArray(item.assignedAgents) && (item.assignedAgents.includes('사무실') || item.assignedAgents.includes('사무실 (공용)')));

  return isOfficeShared;
}

/**
 * 고객 연락처 열람 권한 판별 (사용자 지정 보안 규칙)
 * 1. 개업공인중개사(대표): 모든 매물 및 고객등록장의 고객 연락처 열람 가능
 * 2. 소속공인중개사(계정 추가자):
 *    - 자기가 등록한 매물 고객연락처와 고객등록장의 고객 연락처 열람 가능
 *    - 사무실로 분류된 연락처만 열람 가능
 * 3. 이외 다른 사람(개업공인중개사/타계정추가한자)이 등록한 연락처는 열람 불가능 (마스킹 처리 및 통화버튼 제한)
 */
export function canViewCustomerContact(
  user: { id: string; name: string; role: UserRole } | null,
  item: { managerName?: string; assignedAgents?: string[]; createdById?: string; [key: string]: any } | null | undefined
): boolean {
  if (!user || !item) return false;

  // 1. 개업공인중개사 (대표) / 관리자는 모든 고객 연락처 열람 가능
  if (user.role === 'ADMIN' || user.name.includes('개업공인중개사') || user.name.includes('대표')) {
    return true;
  }

  // 2. 사무실로 분류된 연락처는 모든 직원이 열람 가능
  const isOffice = 
    item.managerName === '사무실' ||
    item.managerName === '사무실 (공용)' ||
    item.managerName === '사무실 (공용/워크인)' ||
    Boolean(item.managerName?.includes('사무실')) ||
    (Array.isArray(item.assignedAgents) && (item.assignedAgents.includes('사무실') || item.assignedAgents.includes('사무실 (공용)')));

  if (isOffice) {
    return true;
  }

  // 3. 자기가 등록한 매물 및 고객 (createdById 일치)
  if (item.createdById && item.createdById === user.id) {
    return true;
  }

  // 4. 본인이 주 담당권한자인 경우 (managerName 일치)
  if (item.managerName && (item.managerName === user.name || item.managerName.includes(user.name))) {
    return true;
  }

  // 5. 함께 관리할 추가 권한자에 본인이 포함된 경우
  if (Array.isArray(item.assignedAgents) && item.assignedAgents.includes(user.name)) {
    return true;
  }

  // 그 외: 다른 사람(개업공인중개사 / 타계정추가한자)이 등록한 연락처는 열람 불가능
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
