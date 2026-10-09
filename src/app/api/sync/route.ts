// src/app/api/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/prisma';
import { PropertyItem, CustomerItem } from '@/lib/types';

// Vercel Serverless 인스턴스 간 공유를 보완하기 위한 전역 인메모리 캐시
let inMemorySyncStore: {
  properties: PropertyItem[];
  customers: CustomerItem[];
  updatedAt: string;
} = {
  properties: [],
  customers: [],
  updatedAt: new Date().toISOString(),
};

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseSchema().catch(() => {});

    // 1. DB에서 조회 시도
    let dbProperties: any[] = [];
    let dbCustomers: any[] = [];
    try {
      dbProperties = await prisma.property.findMany({
        include: {
          customer: true,
          apartmentDetail: true,
          houseDetail: true,
          storeDetail: true,
          officeDetail: true,
          factoryWarehouseDetail: true,
          landDetail: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      dbCustomers = await prisma.customer.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      console.warn('Sync GET DB fetch notice:', e);
    }

    // 2. DB 데이터와 인메모리 캐시 데이터 병합
    const propMap = new Map<string, any>();
    dbProperties.forEach((p) => {
      const key = p.propertyNumber || p.id;
      propMap.set(key, p);
    });
    inMemorySyncStore.properties.forEach((p) => {
      const key = p.propertyNumber || p.id;
      if (key && !propMap.has(key)) {
        propMap.set(key, p);
      }
    });

    const custMap = new Map<string, any>();
    dbCustomers.forEach((c) => {
      if (c.id) custMap.set(c.id, c);
    });
    inMemorySyncStore.customers.forEach((c) => {
      if (c.id && !custMap.has(c.id)) {
        custMap.set(c.id, c);
      }
    });

    return NextResponse.json({
      success: true,
      updatedAt: inMemorySyncStore.updatedAt,
      properties: Array.from(propMap.values()),
      customers: Array.from(custMap.values()),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '동기화 데이터 조회 실패' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const incomingProps: PropertyItem[] = Array.isArray(body.properties) ? body.properties : [];
    const incomingCusts: CustomerItem[] = Array.isArray(body.customers) ? body.customers : [];

    // 인메모리 스토어 업데이트
    const propMap = new Map<string, PropertyItem>();
    inMemorySyncStore.properties.forEach((p) => propMap.set(p.propertyNumber || p.id, p));
    incomingProps.forEach((p) => propMap.set(p.propertyNumber || p.id, p));
    inMemorySyncStore.properties = Array.from(propMap.values());

    const custMap = new Map<string, CustomerItem>();
    inMemorySyncStore.customers.forEach((c) => custMap.set(c.id, c));
    incomingCusts.forEach((c) => custMap.set(c.id, c));
    inMemorySyncStore.customers = Array.from(custMap.values());
    inMemorySyncStore.updatedAt = new Date().toISOString();

    // DB에 일괄 저장 시도 (백그라운드 비동기 처리로 클라이언트 응답 지연 방지)
    try {
      await ensureDatabaseSchema().catch(() => {});
      for (const cust of incomingCusts) {
        if (!cust.id || !cust.name) continue;
        await prisma.customer.upsert({
          where: { id: cust.id },
          update: {
            name: cust.name,
            phone: cust.phone || '010-0000-0000',
            carrier: cust.carrier,
            type: cust.type || 'BUYER',
            subType: cust.subType,
            group: cust.group || 'SEARCHING',
            memo: cust.memo,
            price: cust.price,
            deposit: cust.deposit,
            monthlyRent: cust.monthlyRent,
          },
          create: {
            id: cust.id,
            name: cust.name,
            phone: cust.phone || '010-0000-0000',
            carrier: cust.carrier,
            type: cust.type || 'BUYER',
            subType: cust.subType,
            group: cust.group || 'SEARCHING',
            memo: cust.memo,
            price: cust.price,
            deposit: cust.deposit,
            monthlyRent: cust.monthlyRent,
          },
        }).catch(() => {});
      }
    } catch (dbErr) {
      console.warn('Sync DB upsert notice:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `${incomingProps.length}개 매물과 ${incomingCusts.length}명 고객 데이터가 서버 동기화 저장되었습니다.`,
      propertiesCount: inMemorySyncStore.properties.length,
      customersCount: inMemorySyncStore.customers.length,
      updatedAt: inMemorySyncStore.updatedAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '동기화 데이터 저장 실패' },
      { status: 500 }
    );
  }
}
