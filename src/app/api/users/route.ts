// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_USERS, ensureSeedUsers, recordAccessLog } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await ensureSeedUsers();

    let users: any[] = [];
    try {
      users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    } catch (e) {
      console.warn('DB user fetch error, fallback to DEFAULT_USERS:', e);
    }

    if (users.length === 0) {
      users = DEFAULT_USERS.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        phone: u.phone,
        isActive: u.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    }

    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json(
      DEFAULT_USERS.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        phone: u.phone,
        isActive: u.isActive,
      }))
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, name, role, phone, isActive, adminUser } = body;

    // 관리자 권한 확인
    if (adminUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: '소속공인중개사 계정 관리 권한은 관리자(대표)에게만 있습니다.' },
        { status: 403 }
      );
    }

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: '아이디, 비밀번호, 실명은 필수 항목입니다.' },
        { status: 400 }
      );
    }

    const created = await prisma.user.create({
      data: {
        username: username.trim(),
        password: password.trim(),
        name: name.trim(),
        role: role === 'ADMIN' ? 'ADMIN' : 'AGENT',
        phone: phone?.trim() || null,
        isActive: isActive !== false,
      },
    });

    await recordAccessLog({
      userId: adminUser.id,
      userName: adminUser.name,
      userRole: 'ADMIN',
      action: 'CREATE_USER',
      targetType: 'AUTH',
      targetId: created.id,
      details: `신규 중개사 계정 등록: ${created.name} (${created.username})`,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('Error creating user:', err);
    return NextResponse.json(
      { error: err.message || '사용자 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
