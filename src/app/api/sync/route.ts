// src/app/api/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDatabaseSchema } from '@/lib/prisma';
import { PropertyItem, CustomerItem } from '@/lib/types';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Vercel Serverless 및 로컬 OS 독립적인 임시 캐시 파일 경로
const TMP_SYNC_FILE = path.join(os.tmpdir(), 'broker_sync_bundle.json');

// Vercel Serverless 인스턴스 간 메모리 캐시
let inMemorySyncStore: {
  properties: PropertyItem[];
  customers: CustomerItem[];
  updatedAt: string;
} = {
  properties: [],
  customers: [],
  updatedAt: new Date().toISOString(),
};

// 매물 데이터 출력 안전 포맷팅 (JSON 문자열 파싱)
function formatPropertyOutput(p: any): PropertyItem {
  if (!p) return p;
  let parsedImages: string[] = [];
  if (p.images) {
    if (Array.isArray(p.images)) {
      parsedImages = p.images;
    } else {
      try {
        const parsed = JSON.parse(p.images);
        parsedImages = Array.isArray(parsed) ? parsed : [];
      } catch {
        parsedImages = [];
      }
    }
  }
  let parsedAssignedAgents: string[] = [];
  if (p.assignedAgents) {
    if (Array.isArray(p.assignedAgents)) {
      parsedAssignedAgents = p.assignedAgents;
    } else {
      try {
        const parsed = JSON.parse(p.assignedAgents);
        parsedAssignedAgents = Array.isArray(parsed) ? parsed : [];
      } catch {
        parsedAssignedAgents = p.assignedAgents ? String(p.assignedAgents).split(',').map((s: string) => s.trim()) : [];
      }
    }
  }
  return {
    ...p,
    images: parsedImages,
    assignedAgents: parsedAssignedAgents,
  };
}

// /tmp 파일에서 데이터 로드 시도
function readTmpSyncFile(): { properties: PropertyItem[]; customers: CustomerItem[] } {
  try {
    if (fs.existsSync(TMP_SYNC_FILE)) {
      const raw = fs.readFileSync(TMP_SYNC_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        properties: Array.isArray(parsed.properties) ? parsed.properties : [],
        customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      };
    }
  } catch (e) {
    console.warn('Failed to read /tmp sync file:', e);
  }
  return { properties: [], customers: [] };
}

// /tmp 파일에 데이터 저장
function writeTmpSyncFile(data: { properties: PropertyItem[]; customers: CustomerItem[] }) {
  try {
    const dir = path.dirname(TMP_SYNC_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TMP_SYNC_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to write /tmp sync file:', e);
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseSchema().catch(() => {});

    // 1. DB에서 매물 및 고객 조회
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

    // 2. /tmp 파일 데이터 불러오기
    const tmpData = readTmpSyncFile();

    // 3. 매물 3중 병합 (DB + /tmp 파일 + 인메모리)
    const propMap = new Map<string, any>();
    dbProperties.forEach((p) => {
      const key = p.propertyNumber || p.id;
      if (key) propMap.set(key, p);
    });
    tmpData.properties.forEach((p) => {
      const key = p.propertyNumber || p.id;
      if (key && !propMap.has(key)) {
        propMap.set(key, p);
      }
    });
    inMemorySyncStore.properties.forEach((p) => {
      const key = p.propertyNumber || p.id;
      if (key && !propMap.has(key)) {
        propMap.set(key, p);
      }
    });

    // 4. 고객 3중 병합
    const custMap = new Map<string, any>();
    dbCustomers.forEach((c) => {
      if (c.id) custMap.set(c.id, c);
    });
    tmpData.customers.forEach((c) => {
      if (c.id && !custMap.has(c.id)) {
        custMap.set(c.id, c);
      }
    });
    inMemorySyncStore.customers.forEach((c) => {
      if (c.id && !custMap.has(c.id)) {
        custMap.set(c.id, c);
      }
    });

    const formattedProperties = Array.from(propMap.values()).map(formatPropertyOutput);
    const resultCustomers = Array.from(custMap.values());

    return NextResponse.json({
      success: true,
      updatedAt: inMemorySyncStore.updatedAt,
      properties: formattedProperties,
      customers: resultCustomers,
      count: {
        properties: formattedProperties.length,
        customers: resultCustomers.length,
      },
      hasData: formattedProperties.length > 0 || resultCustomers.length > 0,
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

    // 1. 인메모리 스토어 업데이트
    const propMap = new Map<string, PropertyItem>();
    inMemorySyncStore.properties.forEach((p) => {
      const key = p.propertyNumber || p.id;
      if (key) propMap.set(key, p);
    });
    incomingProps.forEach((p) => {
      const key = p.propertyNumber || p.id;
      if (key) propMap.set(key, { ...propMap.get(key), ...p });
    });
    inMemorySyncStore.properties = Array.from(propMap.values());

    const custMap = new Map<string, CustomerItem>();
    inMemorySyncStore.customers.forEach((c) => {
      if (c.id) custMap.set(c.id, c);
    });
    incomingCusts.forEach((c) => {
      if (c.id) custMap.set(c.id, { ...custMap.get(c.id), ...c });
    });
    inMemorySyncStore.customers = Array.from(custMap.values());
    inMemorySyncStore.updatedAt = new Date().toISOString();

    // 2. /tmp 캐시 파일에 즉시 영구 기록 (서버리스 컨테이너 간 공유용)
    writeTmpSyncFile({
      properties: inMemorySyncStore.properties,
      customers: inMemorySyncStore.customers,
    });

    // 3. DB에 고객 일괄 Upsert
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
            price: cust.price !== undefined ? cust.price : null,
            deposit: cust.deposit !== undefined ? cust.deposit : null,
            monthlyRent: cust.monthlyRent !== undefined ? cust.monthlyRent : null,
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
            price: cust.price !== undefined ? cust.price : null,
            deposit: cust.deposit !== undefined ? cust.deposit : null,
            monthlyRent: cust.monthlyRent !== undefined ? cust.monthlyRent : null,
          },
        }).catch((err) => console.warn('Sync customer upsert error:', err));
      }
    } catch (dbCustErr) {
      console.warn('Sync DB customers upsert notice:', dbCustErr);
    }

    // 4. DB에 매물 일괄 Upsert (★ 핵심: 매물 저장 누락 완전 해결!)
    try {
      await ensureDatabaseSchema().catch(() => {});
      for (const prop of incomingProps) {
        const propNum = prop.propertyNumber || prop.id;
        if (!propNum || !prop.address) continue;

        const propDataToSave: any = {
          propertyNumber: propNum,
          receiptDate: prop.receiptDate ? new Date(prop.receiptDate) : new Date(),
          propertyType: prop.propertyType || 'STORE',
          status: prop.status || 'AVAILABLE',
          transactionType: prop.transactionType || '월세',
          address: prop.address,
          roadAddress: prop.roadAddress || null,
          jibunAddress: prop.jibunAddress || null,
          detailAddress: prop.detailAddress || null,
          images: prop.images ? (Array.isArray(prop.images) ? JSON.stringify(prop.images) : String(prop.images)) : null,
          latitude: prop.latitude ? parseFloat(String(prop.latitude)) : null,
          longitude: prop.longitude ? parseFloat(String(prop.longitude)) : null,
          direction: prop.direction || null,
          directionCriteria: prop.directionCriteria || null,
          availableDate: prop.availableDate ? new Date(prop.availableDate) : null,
          isImmediateAvailable: !!prop.isImmediateAvailable,
          price: prop.price !== undefined && prop.price !== null ? parseFloat(String(prop.price)) : null,
          negotiablePrice: prop.negotiablePrice !== undefined && prop.negotiablePrice !== null ? parseFloat(String(prop.negotiablePrice)) : null,
          deposit: prop.deposit !== undefined && prop.deposit !== null ? parseFloat(String(prop.deposit)) : null,
          negotiableDeposit: prop.negotiableDeposit !== undefined && prop.negotiableDeposit !== null ? parseFloat(String(prop.negotiableDeposit)) : null,
          monthlyRent: prop.monthlyRent !== undefined && prop.monthlyRent !== null ? parseFloat(String(prop.monthlyRent)) : null,
          negotiableMonthlyRent: prop.negotiableMonthlyRent !== undefined && prop.negotiableMonthlyRent !== null ? parseFloat(String(prop.negotiableMonthlyRent)) : null,
          isNoMaintenanceFee: !!prop.isNoMaintenanceFee,
          consultationNotes: prop.consultationNotes || null,
          landArea: prop.landArea !== undefined && prop.landArea !== null ? parseFloat(String(prop.landArea)) : null,
          totalFloorArea: prop.totalFloorArea !== undefined && prop.totalFloorArea !== null ? parseFloat(String(prop.totalFloorArea)) : null,
          approvalDate: prop.approvalDate ? new Date(prop.approvalDate) : null,
          buildingRegisterUse: prop.buildingRegisterUse || null,
          customerId: prop.customerId || null,
          managerName: prop.managerName || '사무실',
          assignedAgents: prop.assignedAgents ? (Array.isArray(prop.assignedAgents) ? JSON.stringify(prop.assignedAgents) : String(prop.assignedAgents)) : null,
          createdById: prop.createdById || null,
          creatorName: prop.creatorName || null,
        };

        const savedProp = await prisma.property.upsert({
          where: { propertyNumber: propNum },
          update: propDataToSave,
          create: {
            id: prop.id || `prop-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            ...propDataToSave,
          },
        }).catch((err) => {
          console.warn('Sync property upsert error:', err);
          return null;
        });

        if (savedProp && prop.propertyType === 'STORE' && prop.storeDetail) {
          const sd = prop.storeDetail;
          await prisma.storeDetail.upsert({
            where: { propertyId: savedProp.id },
            update: {
              storeName: sd.storeName || null,
              businessType: sd.businessType || null,
              totalFloors: sd.totalFloors ? parseInt(String(sd.totalFloors)) : null,
              currentFloor: sd.currentFloor || null,
              landArea: sd.landArea !== undefined && sd.landArea !== null ? parseFloat(String(sd.landArea)) : null,
              buildingArea: sd.buildingArea !== undefined && sd.buildingArea !== null ? parseFloat(String(sd.buildingArea)) : null,
              buildingUse: sd.buildingUse || null,
              actualArea: sd.actualArea !== undefined && sd.actualArea !== null ? parseFloat(String(sd.actualArea)) : null,
              roomCount: sd.roomCount ? parseInt(String(sd.roomCount)) : null,
              bathroomCount: sd.bathroomCount ? parseInt(String(sd.bathroomCount)) : null,
              toiletGenderType: sd.toiletGenderType || null,
              approvalDate: sd.approvalDate ? new Date(sd.approvalDate) : null,
              parkingCount: sd.parkingCount ? parseInt(String(sd.parkingCount)) : null,
              isParkingImpossible: !!sd.isParkingImpossible,
              electricityCapacity: sd.electricityCapacity || null,
              electricityType: sd.electricityType || null,
              waterType: sd.waterType || null,
              gasType: sd.gasType || null,
              monthlyRentVat: !!sd.monthlyRentVat,
              premium: sd.premium !== undefined && sd.premium !== null ? parseFloat(String(sd.premium)) : null,
              maintenanceFee: sd.maintenanceFee !== undefined && sd.maintenanceFee !== null ? parseFloat(String(sd.maintenanceFee)) : null,
              isNoMaintenanceFee: !!sd.isNoMaintenanceFee,
              maintenanceFeeVat: !!sd.maintenanceFeeVat,
              tableCount: sd.tableCount ? parseInt(String(sd.tableCount)) : null,
              tableCountHall: sd.tableCountHall ? parseInt(String(sd.tableCountHall)) : null,
              tableCountRoom: sd.tableCountRoom ? parseInt(String(sd.tableCountRoom)) : null,
              employeeCount: sd.employeeCount ? parseInt(String(sd.employeeCount)) : null,
              operationPeriod: sd.operationPeriod || null,
              contractYear: sd.contractYear || null,
              renewalPeriodRemain: sd.renewalPeriodRemain || null,
              violationBuilding: sd.violationBuilding || null,
              businessRegistrationStatus: sd.businessRegistrationStatus || null,
              operatorContractorMatch: sd.operatorContractorMatch || null,
              liquorLoan: sd.liquorLoan || null,
              rentIncreaseCondition: sd.rentIncreaseCondition || null,
              storeAdStatus: sd.storeAdStatus || null,
              otherAgencyAdStatus: sd.otherAgencyAdStatus || null,
              restorationTerms: sd.restorationTerms || null,
            },
            create: {
              propertyId: savedProp.id,
              storeName: sd.storeName || null,
              businessType: sd.businessType || null,
              totalFloors: sd.totalFloors ? parseInt(String(sd.totalFloors)) : null,
              currentFloor: sd.currentFloor || null,
              landArea: sd.landArea !== undefined && sd.landArea !== null ? parseFloat(String(sd.landArea)) : null,
              buildingArea: sd.buildingArea !== undefined && sd.buildingArea !== null ? parseFloat(String(sd.buildingArea)) : null,
              buildingUse: sd.buildingUse || null,
              actualArea: sd.actualArea !== undefined && sd.actualArea !== null ? parseFloat(String(sd.actualArea)) : null,
              roomCount: sd.roomCount ? parseInt(String(sd.roomCount)) : null,
              bathroomCount: sd.bathroomCount ? parseInt(String(sd.bathroomCount)) : null,
              toiletGenderType: sd.toiletGenderType || null,
              approvalDate: sd.approvalDate ? new Date(sd.approvalDate) : null,
              parkingCount: sd.parkingCount ? parseInt(String(sd.parkingCount)) : null,
              isParkingImpossible: !!sd.isParkingImpossible,
              electricityCapacity: sd.electricityCapacity || null,
              electricityType: sd.electricityType || null,
              waterType: sd.waterType || null,
              gasType: sd.gasType || null,
              monthlyRentVat: !!sd.monthlyRentVat,
              premium: sd.premium !== undefined && sd.premium !== null ? parseFloat(String(sd.premium)) : null,
              maintenanceFee: sd.maintenanceFee !== undefined && sd.maintenanceFee !== null ? parseFloat(String(sd.maintenanceFee)) : null,
              isNoMaintenanceFee: !!sd.isNoMaintenanceFee,
              maintenanceFeeVat: !!sd.maintenanceFeeVat,
              tableCount: sd.tableCount ? parseInt(String(sd.tableCount)) : null,
              tableCountHall: sd.tableCountHall ? parseInt(String(sd.tableCountHall)) : null,
              tableCountRoom: sd.tableCountRoom ? parseInt(String(sd.tableCountRoom)) : null,
              employeeCount: sd.employeeCount ? parseInt(String(sd.employeeCount)) : null,
              operationPeriod: sd.operationPeriod || null,
              contractYear: sd.contractYear || null,
              renewalPeriodRemain: sd.renewalPeriodRemain || null,
              violationBuilding: sd.violationBuilding || null,
              businessRegistrationStatus: sd.businessRegistrationStatus || null,
              operatorContractorMatch: sd.operatorContractorMatch || null,
              liquorLoan: sd.liquorLoan || null,
              rentIncreaseCondition: sd.rentIncreaseCondition || null,
              storeAdStatus: sd.storeAdStatus || null,
              otherAgencyAdStatus: sd.otherAgencyAdStatus || null,
              restorationTerms: sd.restorationTerms || null,
            },
          }).catch((err) => console.warn('Sync storeDetail upsert error:', err));
        }
      }
    } catch (dbPropErr) {
      console.warn('Sync DB properties upsert notice:', dbPropErr);
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
