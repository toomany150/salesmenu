// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { INITIAL_CUSTOMERS } from '@/lib/mockData';
import { maskPhoneNumber, recordAccessLog } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group'); // RECEIVED or SEARCHING
    const search = searchParams.get('search');
    const userRole = request.headers.get('x-user-role') || searchParams.get('role');
    const userId = request.headers.get('x-user-id') || searchParams.get('userId');
    const userName = request.headers.get('x-user-name') || searchParams.get('userName');

    const whereClause: any = {};
    if (group && (group === 'RECEIVED' || group === 'SEARCHING')) {
      whereClause.group = group;
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { memo: { contains: search } },
      ];
    }

    let customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        properties: true,
        demands: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 만약 DB가 비어있으면 초기 목데이터 자동 시딩
    if (customers.length === 0 && !search) {
      for (const c of INITIAL_CUSTOMERS) {
        await prisma.customer.upsert({
          where: { id: c.id },
          update: {},
          create: {
            id: c.id,
            name: c.name,
            carrier: c.carrier,
            phone: c.phone,
            type: c.type,
            group: c.group,
            memo: c.memo,
            managerName: '사무실',
            demands: c.demands
              ? {
                  create: c.demands.map((d) => ({
                    targetPropertyType: d.targetPropertyType,
                    targetTransactionType: d.targetTransactionType,
                    targetRegion: d.targetRegion,
                    minBudget: d.minBudget,
                    maxBudget: d.maxBudget,
                    minDeposit: d.minDeposit,
                    maxDeposit: d.maxDeposit,
                    minMonthlyRent: d.minMonthlyRent,
                    maxMonthlyRent: d.maxMonthlyRent,
                    preferredArea: d.preferredArea,
                    requirements: d.requirements,
                    status: d.status,
                  })),
                }
              : undefined,
          },
        });
      }

      customers = await prisma.customer.findMany({
        where: whereClause,
        include: {
          properties: true,
          demands: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // 소속공인중개사(AGENT)인 경우, 자신이 담당/등록한 고객이 아니면 연락처 마스킹 처리
    if (userRole === 'AGENT' && userName) {
      customers = customers.map((cust) => {
        const isMyCustomer = 
          (cust.managerName && cust.managerName === userName) ||
          (cust.createdById && cust.createdById === userId);

        if (!isMyCustomer) {
          return {
            ...cust,
            phone: maskPhoneNumber(cust.phone),
            isMasked: true,
          };
        }
        return {
          ...cust,
          isMasked: false,
        };
      });
    }

    return NextResponse.json(customers);
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(INITIAL_CUSTOMERS);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      carrier, 
      phone, 
      type, 
      group, 
      memo, 
      demand, 
      managerName, 
      createdById, 
      creatorName,
      currentUser
    } = body;

    if (!name || !phone || !type) {
      return NextResponse.json(
        { error: '이름, 전화번호, 고객구분은 필수 항목입니다.' },
        { status: 400 }
      );
    }

    // 매도/임대인은 통신사 선택 가능, 매수/임차인은 통신사 불필요
    const isSearching = type === 'BUYER' || type === 'LESSEE';
    const finalCarrier = isSearching ? null : (carrier || null);

    // group 결정 (SELLER/LESSOR -> RECEIVED, BUYER/LESSEE -> SEARCHING)
    const finalGroup = group || (!isSearching ? 'RECEIVED' : 'SEARCHING');

    const customer = await prisma.customer.create({
      data: {
        name,
        carrier: finalCarrier,
        phone,
        type,
        group: finalGroup,
        memo,
        managerName: managerName || '사무실',
        createdById: createdById || null,
        creatorName: creatorName || null,
        demands: demand
          ? {
              create: {
                targetPropertyType: demand.targetPropertyType || 'APARTMENT',
                targetTransactionType: demand.targetTransactionType || '매매',
                targetRegion: demand.targetRegion,
                minBudget: demand.minBudget ? parseFloat(demand.minBudget) : undefined,
                maxBudget: demand.maxBudget ? parseFloat(demand.maxBudget) : undefined,
                minDeposit: demand.minDeposit ? parseFloat(demand.minDeposit) : undefined,
                maxDeposit: demand.maxDeposit ? parseFloat(demand.maxDeposit) : undefined,
                minMonthlyRent: demand.minMonthlyRent ? parseFloat(demand.minMonthlyRent) : undefined,
                maxMonthlyRent: demand.maxMonthlyRent ? parseFloat(demand.maxMonthlyRent) : undefined,
                preferredArea: demand.preferredArea ? parseFloat(demand.preferredArea) : undefined,
                requirements: demand.requirements,
                status: 'ACTIVE',
              },
            }
          : undefined,
      },
      include: {
        properties: true,
        demands: true,
      },
    });

    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    await recordAccessLog({
      userId: createdById,
      userName: creatorName || managerName || '익명',
      userRole: currentUser?.role || 'AGENT',
      action: 'CREATE_CUSTOMER',
      targetType: 'CUSTOMER',
      targetId: customer.id,
      details: `${customer.name} (${customer.type}) 신규 고객 등록 [담당: ${customer.managerName}]`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: error.message || '고객 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 고객 수정 (PUT)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, carrier, phone, type, group, memo, managerName, currentUser } = body;

    if (!id) {
      return NextResponse.json({ error: '고객 ID가 필요합니다.' }, { status: 400 });
    }

    const existingCust = await prisma.customer.findUnique({ where: { id } });
    if (!existingCust) {
      return NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 소속공인중개사 권한 확인
    if (currentUser && currentUser.role !== 'ADMIN') {
      const isCreator = existingCust.createdById && existingCust.createdById === currentUser.id;
      const isManager = existingCust.managerName && existingCust.managerName === currentUser.name;
      if (!isCreator && !isManager) {
        return NextResponse.json(
          { error: '해당 고객의 수정 권한이 없습니다. (작성자 또는 대표 관리자만 수정 가능합니다)' },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: name || undefined,
        carrier: carrier !== undefined ? carrier : undefined,
        phone: phone || undefined,
        type: type || undefined,
        group: group || undefined,
        memo: memo !== undefined ? memo : undefined,
        managerName: managerName !== undefined ? managerName : undefined,
      },
      include: {
        properties: true,
        demands: true,
      },
    });

    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    await recordAccessLog({
      userId: currentUser?.id,
      userName: currentUser?.name || updated.managerName || '익명',
      userRole: currentUser?.role || 'AGENT',
      action: 'UPDATE_CUSTOMER',
      targetType: 'CUSTOMER',
      targetId: updated.id,
      details: `${updated.name} 고객 정보 수정 완료`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: error.message || '고객 정보 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 고객 삭제 (DELETE) - 오직 대표(관리자)만 가능!
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userRole = request.headers.get('x-user-role') || searchParams.get('role');
    const userId = request.headers.get('x-user-id') || searchParams.get('userId');
    const userName = request.headers.get('x-user-name') || searchParams.get('userName') || '관리자';

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: '고객 삭제 권한은 프로그램 관리자(대표)에게만 있습니다. 소속공인중개사는 삭제할 수 없습니다.' },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json({ error: '삭제할 고객 ID가 필요합니다.' }, { status: 400 });
    }

    const cust = await prisma.customer.findUnique({ where: { id } });
    if (!cust) {
      return NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 });
    }

    await prisma.customer.delete({ where: { id } });

    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    await recordAccessLog({
      userId: userId || undefined,
      userName,
      userRole: 'ADMIN',
      action: 'DELETE_CUSTOMER',
      targetType: 'CUSTOMER',
      targetId: cust.id,
      details: `${cust.name} (${cust.phone}) 고객 삭제 완료`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, message: '고객이 삭제되었습니다.' });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: error.message || '고객 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
