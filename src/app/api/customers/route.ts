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
    const rawUserName = request.headers.get('x-user-name') || searchParams.get('userName');
    let userName = rawUserName || undefined;
    if (userName) {
      try { userName = decodeURIComponent(userName); } catch (e) {}
    }

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

    // assignedAgents JSON 파싱
    customers = customers.map((c: any) => {
      let parsedAssignedAgents: string[] = [];
      if (c.assignedAgents) {
        try {
          const p = JSON.parse(c.assignedAgents);
          parsedAssignedAgents = Array.isArray(p) ? p : [];
        } catch {
          parsedAssignedAgents = c.assignedAgents ? c.assignedAgents.split(',').map((s: string) => s.trim()) : [];
        }
      }
      return {
        ...c,
        assignedAgents: parsedAssignedAgents,
      };
    });

    // 소속공인중개사(AGENT)인 경우, 자신이 담당/등록/추가지정된 고객이 아니면 연락처 마스킹 처리
    if (userRole === 'AGENT' && userName && !userName.includes('개업공인중개사')) {
      customers = customers.map((cust) => {
        const isMyCustomer = 
          (cust.managerName && (cust.managerName === userName || cust.managerName.includes(userName))) ||
          (cust.createdById && cust.createdById === userId) ||
          (cust.managerName && cust.managerName.includes('사무실')) ||
          (Array.isArray(cust.assignedAgents) && (cust.assignedAgents.includes(userName) || cust.assignedAgents.includes('사무실(공용)') || cust.assignedAgents.includes('사무실')));

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
      subType,
      group, 
      memo, 
      price,
      negotiablePrice,
      deposit,
      negotiableDeposit,
      monthlyRent,
      negotiableMonthlyRent,
      premium,
      negotiablePremium,
      transactionType,
      receivedDetail,
      demand, 
      managerName, 
      assignedAgents,
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

    const finalSubType = subType || (receivedDetail ? (receivedDetail.transactionType === '매매' ? '매도인' : '임대인') : (type === 'SELLER' ? '매도인' : type === 'BUYER' ? '매수인' : '임대인'));
    const finalPrice = price !== undefined && price !== null ? parseFloat(price) : (receivedDetail?.price ? parseFloat(receivedDetail.price) : null);
    const finalNegoPrice = negotiablePrice !== undefined && negotiablePrice !== null ? parseFloat(negotiablePrice) : (receivedDetail?.negotiablePrice ? parseFloat(receivedDetail.negotiablePrice) : null);
    const finalDeposit = deposit !== undefined && deposit !== null ? parseFloat(deposit) : (receivedDetail?.deposit ? parseFloat(receivedDetail.deposit) : (receivedDetail?.jeonse ? parseFloat(receivedDetail.jeonse) : null));
    const finalNegoDeposit = negotiableDeposit !== undefined && negotiableDeposit !== null ? parseFloat(negotiableDeposit) : (receivedDetail?.negotiableDeposit ? parseFloat(receivedDetail.negotiableDeposit) : (receivedDetail?.negotiableJeonse ? parseFloat(receivedDetail.negotiableJeonse) : null));
    const finalMonthlyRent = monthlyRent !== undefined && monthlyRent !== null ? parseFloat(monthlyRent) : (receivedDetail?.monthlyRent ? parseFloat(receivedDetail.monthlyRent) : null);
    const finalNegoMonthlyRent = negotiableMonthlyRent !== undefined && negotiableMonthlyRent !== null ? parseFloat(negotiableMonthlyRent) : (receivedDetail?.negotiableMonthlyRent ? parseFloat(receivedDetail.negotiableMonthlyRent) : null);
    const finalPremium = premium !== undefined && premium !== null ? parseFloat(premium) : (receivedDetail?.premium ? parseFloat(receivedDetail.premium) : null);
    const finalNegoPremium = negotiablePremium !== undefined && negotiablePremium !== null ? parseFloat(negotiablePremium) : (receivedDetail?.negotiablePremium ? parseFloat(receivedDetail.negotiablePremium) : null);
    const finalTxType = transactionType || receivedDetail?.transactionType || null;

    const customer = await prisma.customer.create({
      data: {
        name,
        carrier: finalCarrier,
        phone,
        type,
        subType: finalSubType,
        group: finalGroup,
        memo,
        price: finalPrice,
        negotiablePrice: finalNegoPrice,
        deposit: finalDeposit,
        negotiableDeposit: finalNegoDeposit,
        monthlyRent: finalMonthlyRent,
        negotiableMonthlyRent: finalNegoMonthlyRent,
        premium: finalPremium,
        negotiablePremium: finalNegoPremium,
        transactionType: finalTxType,
        managerName: managerName || '사무실',
        assignedAgents: assignedAgents !== undefined ? (Array.isArray(assignedAgents) ? JSON.stringify(assignedAgents) : (assignedAgents || null)) : null,
        createdById: createdById || null,
        creatorName: creatorName || null,
        demands: demand
          ? {
              create: {
                targetPropertyType: demand.targetPropertyType || 'APARTMENT',
                targetTransactionType: demand.targetTransactionType || '매매',
                targetRegion: demand.targetRegion?.trim() || null,
                regionReason: demand.regionReason?.trim() || null,
                minBudget: demand.minBudget ? parseFloat(demand.minBudget) : null,
                maxBudget: demand.maxBudget ? parseFloat(demand.maxBudget) : null,
                targetPrice: demand.targetPrice ? parseFloat(demand.targetPrice) : null,
                targetJeonse: demand.targetJeonse ? parseFloat(demand.targetJeonse) : null,
                minDeposit: demand.minDeposit ? parseFloat(demand.minDeposit) : null,
                maxDeposit: demand.maxDeposit ? parseFloat(demand.maxDeposit) : null,
                minMonthlyRent: demand.minMonthlyRent ? parseFloat(demand.minMonthlyRent) : null,
                maxMonthlyRent: demand.maxMonthlyRent ? parseFloat(demand.maxMonthlyRent) : null,
                preferredFloor: demand.preferredFloor?.trim() || null,
                preferredArea: demand.preferredArea ? parseFloat(demand.preferredArea) : null,
                preferredAreaPy: demand.preferredAreaPy ? parseFloat(demand.preferredAreaPy) : null,
                parkingRequirement: demand.parkingRequirement?.trim() || null,
                moveInTiming: demand.moveInTiming?.trim() || null,
                moveInReason: demand.moveInReason?.trim() || null,
                nonNegotiableCondition: demand.nonNegotiableCondition?.trim() || null,
                negotiableCondition: demand.negotiableCondition?.trim() || null,
                premiumLimit: demand.premiumLimit ? parseFloat(demand.premiumLimit) : null,
                premiumReason: demand.premiumReason?.trim() || null,
                minRequiredArea: demand.minRequiredArea ? parseFloat(demand.minRequiredArea) : null,
                minRequiredAreaPy: demand.minRequiredAreaPy ? parseFloat(demand.minRequiredAreaPy) : null,
                minAreaReason: demand.minAreaReason?.trim() || null,
                previousVisitedProps: demand.previousVisitedProps?.trim() || null,
                requirements: demand.requirements?.trim() || null,
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
    const { 
      id, 
      name, 
      carrier, 
      phone, 
      type, 
      subType,
      group, 
      memo, 
      price,
      negotiablePrice,
      deposit,
      negotiableDeposit,
      monthlyRent,
      negotiableMonthlyRent,
      premium,
      negotiablePremium,
      transactionType,
      managerName, 
      assignedAgents, 
      currentUser 
    } = body;

    if (!id) {
      return NextResponse.json({ error: '고객 ID가 필요합니다.' }, { status: 400 });
    }

    const existingCust = await prisma.customer.findUnique({ where: { id } });
    if (!existingCust) {
      return NextResponse.json({ error: '고객을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 권한 확인: 개업공인중개사(대표) 및 관리자(ADMIN)는 전체 수정 가능
    // 그 외 사용자는 본인이 작성/주담당이거나 추가지정 권한자(assignedAgents)에 포함되어야 함.
    if (currentUser && currentUser.role !== 'ADMIN' && !currentUser.name?.includes('개업공인중개사')) {
      const isCreator = existingCust.createdById && existingCust.createdById === currentUser.id;
      const isManager = existingCust.managerName && existingCust.managerName === currentUser.name;
      let isAssigned = false;
      if (existingCust.assignedAgents) {
        try {
          const parsed = JSON.parse(existingCust.assignedAgents);
          if (Array.isArray(parsed) && (parsed.includes(currentUser.name) || parsed.includes('사무실(공용)') || parsed.includes('사무실'))) {
            isAssigned = true;
          }
        } catch {
          if (existingCust.assignedAgents.includes(currentUser.name) || existingCust.assignedAgents.includes('사무실(공용)')) {
            isAssigned = true;
          }
        }
      }
      if (!isCreator && !isManager && !isAssigned) {
        return NextResponse.json(
          { error: '해당 고객의 수정 권한이 없습니다. (개업공인중개사(대표) 또는 지정된 권한자만 수정 가능합니다)' },
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
        subType: subType !== undefined ? subType : undefined,
        group: group || undefined,
        memo: memo !== undefined ? memo : undefined,
        price: price !== undefined ? (price !== null ? parseFloat(price) : null) : undefined,
        negotiablePrice: negotiablePrice !== undefined ? (negotiablePrice !== null ? parseFloat(negotiablePrice) : null) : undefined,
        deposit: deposit !== undefined ? (deposit !== null ? parseFloat(deposit) : null) : undefined,
        negotiableDeposit: negotiableDeposit !== undefined ? (negotiableDeposit !== null ? parseFloat(negotiableDeposit) : null) : undefined,
        monthlyRent: monthlyRent !== undefined ? (monthlyRent !== null ? parseFloat(monthlyRent) : null) : undefined,
        negotiableMonthlyRent: negotiableMonthlyRent !== undefined ? (negotiableMonthlyRent !== null ? parseFloat(negotiableMonthlyRent) : null) : undefined,
        premium: premium !== undefined ? (premium !== null ? parseFloat(premium) : null) : undefined,
        negotiablePremium: negotiablePremium !== undefined ? (negotiablePremium !== null ? parseFloat(negotiablePremium) : null) : undefined,
        transactionType: transactionType !== undefined ? transactionType : undefined,
        managerName: managerName !== undefined ? managerName : undefined,
        assignedAgents: assignedAgents !== undefined ? (Array.isArray(assignedAgents) ? JSON.stringify(assignedAgents) : (assignedAgents || null)) : undefined,
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

    let parsedAssignedAgents: string[] = [];
    if (updated.assignedAgents) {
      try {
        const p = JSON.parse(updated.assignedAgents);
        parsedAssignedAgents = Array.isArray(p) ? p : [];
      } catch {
        parsedAssignedAgents = updated.assignedAgents.split(',').map((s: string) => s.trim());
      }
    }

    return NextResponse.json({ ...updated, assignedAgents: parsedAssignedAgents });
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
    const rawUserName = request.headers.get('x-user-name') || searchParams.get('userName') || '관리자';
    let userName = rawUserName;
    try {
      userName = decodeURIComponent(rawUserName);
    } catch (e) {}

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: '고객 삭제 권한은 개업공인중개사(대표)에게만 있습니다. 소속공인중개사는 삭제할 수 없습니다.' },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json({ error: '삭제할 고객 ID가 필요합니다.' }, { status: 400 });
    }

    let deletedCustName = '';
    let deletedCustPhone = '';

    try {
      const cust = await prisma.customer.findUnique({ where: { id } }).catch(() => null);
      if (cust) {
        deletedCustName = cust.name;
        deletedCustPhone = cust.phone;
        await prisma.customer.delete({ where: { id: cust.id } }).catch(() => null);
      }
    } catch (dbErr) {
      console.warn('DB delete warning, proceeding with success for client cleanup:', dbErr);
    }

    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    try {
      await recordAccessLog({
        userId: userId || undefined,
        userName,
        userRole: 'ADMIN',
        action: 'DELETE_CUSTOMER',
        targetType: 'CUSTOMER',
        targetId: id,
        details: deletedCustName 
          ? `${deletedCustName} (${deletedCustPhone}) 고객 삭제 완료` 
          : `고객 (ID: ${id}) 삭제 완료`,
        ipAddress,
        userAgent,
      });
    } catch (logErr) {}

    return NextResponse.json({ success: true, message: '고객이 정상적으로 삭제되었습니다.' });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: error.message || '고객 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
