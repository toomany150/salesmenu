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
    const headerRole = request.headers.get('x-user-role');

    // 관리자(대표) 권한 확인: 헤더 또는 adminUser 정보 확인
    const isAuthorizedAdmin = 
      headerRole === 'ADMIN' || 
      adminUser?.role === 'ADMIN' || 
      adminUser?.name?.includes('개업공인중개사') ||
      adminUser?.name?.includes('대표');

    if (!isAuthorizedAdmin) {
      return NextResponse.json(
        { error: '소속공인중개사 계정 관리 권한은 개업공인중개사(대표)에게만 있습니다.' },
        { status: 403 }
      );
    }

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: '아이디, 비밀번호, 실명은 필수 항목입니다.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();

    // 중복 아이디 사전 검사
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    }).catch(() => null);

    if (existing) {
      return NextResponse.json(
        { 
          error: `이미 등록되어 있는 아이디("${cleanUsername}")입니다. (현재 등록자: "${existing.name}") 중복되지 않는 다른 아이디(예: agent6, agent7 등)를 입력해 주세요.` 
        },
        { status: 400 }
      );
    }

    const created = await prisma.user.create({
      data: {
        username: cleanUsername,
        password: password.trim(),
        name: name.trim(),
        role: role === 'ADMIN' ? 'ADMIN' : 'AGENT',
        phone: phone?.trim() || null,
        isActive: isActive !== false,
      },
    });

    await recordAccessLog({
      userId: adminUser?.id || undefined,
      userName: adminUser?.name || '개업공인중개사 (대표)',
      userRole: 'ADMIN',
      action: 'CREATE_USER',
      targetType: 'AUTH',
      targetId: created.id,
      details: `신규 중개사 계정 등록: ${created.name} (${created.username})`,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('Error creating user:', err);
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: err.message || '사용자 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, password, name, phone, isActive, adminUser } = body;
    const headerRole = request.headers.get('x-user-role');

    const isAuthorizedAdmin = 
      headerRole === 'ADMIN' || 
      adminUser?.role === 'ADMIN' || 
      adminUser?.name?.includes('개업공인중개사') ||
      adminUser?.name?.includes('대표');

    if (!isAuthorizedAdmin) {
      return NextResponse.json(
        { error: '소속공인중개사 계정 관리 권한은 개업공인중개사(대표)에게만 있습니다.' },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json({ error: '수정할 사용자 ID가 필요합니다.' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(password ? { password: password.trim() } : {}),
        ...(phone !== undefined ? { phone: phone ? phone.trim() : null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || '사용자 정보 수정 실패' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: '소속공인중개사 계정 관리 권한은 개업공인중개사(대표)에게만 있습니다.' }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ error: '삭제할 사용자 ID가 필요합니다.' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === 'ADMIN') {
      return NextResponse.json({ error: '대표 관리자 계정은 삭제할 수 없습니다.' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || '사용자 삭제 실패' },
      { status: 500 }
    );
  }
}
