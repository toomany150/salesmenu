// src/app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordAccessLog, ensureSeedUsers, DEFAULT_USERS } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await ensureSeedUsers();

    const body = await request.json();
    const { username, currentPassword, newPassword } = body;

    if (!username || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: '아이디, 현재 비밀번호, 변경할 새 비밀번호를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    if (newPassword.trim().length < 4) {
      return NextResponse.json(
        { error: '새 비밀번호는 최소 4자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // DB에서 사용자 조회
    let user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user) {
      // DEFAULT_USERS fallback
      const defaultUser = DEFAULT_USERS.find((u) => u.username === username.trim());
      if (defaultUser) {
        user = await prisma.user.upsert({
          where: { username: defaultUser.username },
          update: {},
          create: {
            id: defaultUser.id,
            username: defaultUser.username,
            password: defaultUser.password,
            name: defaultUser.name,
            role: defaultUser.role,
            phone: defaultUser.phone,
            isActive: true,
          },
        });
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: '해당 아이디의 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 현재 비밀번호 일치 확인
    if (user.password !== currentPassword.trim()) {
      return NextResponse.json(
        { error: '현재 비밀번호가 일치하지 않습니다. 다시 확인해 주세요.' },
        { status: 400 }
      );
    }

    // 새 비밀번호로 업데이트
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newPassword.trim(),
      },
    });

    // 감사 로그 기록
    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    await recordAccessLog({
      userId: updated.id,
      userName: updated.name,
      userRole: updated.role,
      action: 'UPDATE_PASSWORD',
      targetType: 'AUTH',
      targetId: updated.id,
      details: `${updated.name}(${updated.username}) 비밀번호 변경 완료`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다. 변경된 새 비밀번호로 로그인해 주세요.',
    });
  } catch (err: any) {
    console.error('Password change error:', err);
    return NextResponse.json(
      { error: err.message || '비밀번호 변경 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
