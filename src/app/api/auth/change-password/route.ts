// src/app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_USERS, recordAccessLog } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, oldPassword, newPassword } = body;

    if (!username || !oldPassword || !newPassword) {
      return NextResponse.json(
        { error: '아이디, 현재 비밀번호, 새 비밀번호를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 2) {
      return NextResponse.json(
        { error: '새 비밀번호는 2자리 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // 1. 사용자 찾기 (DB 또는 fallback)
    let user = null;
    let isDbUser = false;

    try {
      user = await prisma.user.findUnique({
        where: { username },
      });
      if (user) isDbUser = true;
    } catch (e) {
      console.warn('DB lookup failed, checking default fallback:', e);
    }

    if (!user) {
      const fallback = DEFAULT_USERS.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );
      if (fallback) {
        user = { ...fallback };
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: '존재하지 않는 사용자입니다.' },
        { status: 404 }
      );
    }

    // 2. 현재 비밀번호 검증
    if (user.password !== oldPassword) {
      return NextResponse.json(
        { error: '현재 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // 3. 비밀번호 업데이트 (DB 및 fallback 동기화)
    if (isDbUser) {
      try {
        await prisma.user.update({
          where: { username },
          data: { password: newPassword },
        });
      } catch (err) {
        console.warn('DB password update failed, fallback:', err);
      }
    }

    // DEFAULT_USERS 메모리 객체도 동기화
    const fallbackIdx = DEFAULT_USERS.findIndex(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
    if (fallbackIdx >= 0) {
      DEFAULT_USERS[fallbackIdx].password = newPassword;
    }

    // 4. 감사 로그 기록
    await recordAccessLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'PASSWORD_CHANGED',
      targetType: 'AUTH',
      details: `${user.name}(${username}) 비밀번호 변경 완료`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.',
    });
  } catch (err: any) {
    console.error('Password change error:', err);
    return NextResponse.json(
      { error: err.message || '비밀번호 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
