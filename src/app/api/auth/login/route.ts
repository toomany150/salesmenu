// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/prisma';
import { DEFAULT_USERS, ensureSeedUsers, recordAccessLog } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseSchema();
    await ensureSeedUsers();

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();

    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // 1. DB에서 사용자 검색 (정확한 매칭 먼저, 실패시 대소문자 무관 검색)
    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });

      if (!user) {
        // 대소문자 무관 검색
        const allUsers = await prisma.user.findMany();
        user = allUsers.find(
          (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
        ) || null;
      }
    } catch (e) {
      console.warn('DB lookup failed, checking default fallback users:', e);
    }

    // 2. 만약 DB에 없거나 검색 실패 시 DEFAULT_USERS에서 폴백 매칭
    if (!user) {
      const fallback = DEFAULT_USERS.find(
        (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
      );
      if (fallback) {
        user = {
          id: fallback.id,
          username: fallback.username,
          password: fallback.password,
          name: fallback.name,
          role: fallback.role,
          phone: fallback.phone || null,
          isActive: fallback.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

    if (!user) {
      // 실패 로그 기록
      await recordAccessLog({
        userName: cleanUsername,
        userRole: 'UNKNOWN',
        action: 'LOGIN_FAILED',
        targetType: 'AUTH',
        details: '존재하지 않는 아이디로 로그인 시도',
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // 비밀번호 검증 (admin의 경우 초기 기본 비밀번호 1234 및 159753tma# 모두 허용)
    const isPasswordMatched = 
      user.password.trim() === cleanPassword ||
      (user.username.toLowerCase() === 'admin' && (cleanPassword === '1234' || cleanPassword === '159753tma#'));

    if (!isPasswordMatched) {
      await recordAccessLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'LOGIN_FAILED',
        targetType: 'AUTH',
        details: '비밀번호 불일치 로그인 실패',
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: '접근이 비활성화된 계정입니다. 관리자에게 문의하세요.' },
        { status: 403 }
      );
    }

    // 로그인 성공 로그 기록
    await recordAccessLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN_SUCCESS',
      targetType: 'AUTH',
      details: `${user.name} (${user.role === 'ADMIN' ? '대표/관리자' : '소속공인중개사'}) 로그인 성공`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
