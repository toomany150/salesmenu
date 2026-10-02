// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { INITIAL_CUSTOMERS } from '@/lib/mockData';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group'); // RECEIVED or SEARCHING
    const search = searchParams.get('search');

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

    return NextResponse.json(customers);
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    // Fallback to mock data on DB issue
    return NextResponse.json(INITIAL_CUSTOMERS);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, carrier, phone, type, group, memo, demand } = body;

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

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: error.message || '고객 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
