// src/app/api/properties/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { INITIAL_PROPERTIES } from '@/lib/mockData';

function formatPropertyOutput(p: any) {
  if (!p) return p;
  let parsedImages: string[] = [];
  if (p.images) {
    try {
      const parsed = JSON.parse(p.images);
      parsedImages = Array.isArray(parsed) ? parsed : [];
    } catch {
      parsedImages = [];
    }
  }
  return {
    ...p,
    images: parsedImages,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyType = searchParams.get('propertyType');
    const transactionType = searchParams.get('transactionType');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const whereClause: any = {};
    if (propertyType && propertyType !== 'ALL') {
      whereClause.propertyType = propertyType;
    }
    if (transactionType && transactionType !== 'ALL') {
      whereClause.transactionType = transactionType;
    }
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (search) {
      whereClause.OR = [
        { propertyNumber: { contains: search } },
        { address: { contains: search } },
        { detailAddress: { contains: search } },
        { consultationNotes: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    let properties = await prisma.property.findMany({
      where: whereClause,
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

    // 만약 DB가 비어있으면 초기 목데이터 자동 시딩
    if (properties.length === 0 && !search) {
      for (const p of INITIAL_PROPERTIES) {
        await prisma.property.upsert({
          where: { propertyNumber: p.propertyNumber },
          update: {},
          create: {
            id: p.id,
            propertyNumber: p.propertyNumber,
            receiptDate: new Date(p.receiptDate),
            propertyType: p.propertyType,
            status: p.status,
            transactionType: p.transactionType,
            address: p.address,
            detailAddress: p.detailAddress,
            latitude: p.latitude,
            longitude: p.longitude,
            direction: p.direction,
            directionCriteria: p.directionCriteria,
            availableDate: p.availableDate ? new Date(p.availableDate) : null,
            price: p.price,
            deposit: p.deposit,
            monthlyRent: p.monthlyRent,
            consultationNotes: p.consultationNotes,
            landArea: p.landArea,
            totalFloorArea: p.totalFloorArea,
            approvalDate: p.approvalDate ? new Date(p.approvalDate) : null,
            buildingRegisterUse: p.buildingRegisterUse,
            customerId: p.customerId,
            apartmentDetail: p.apartmentDetail ? { 
              create: {
                ...p.apartmentDetail,
                approvalDate: p.apartmentDetail.approvalDate ? new Date(p.apartmentDetail.approvalDate) : null,
              } 
            } : undefined,
            houseDetail: p.houseDetail ? { 
              create: {
                ...p.houseDetail,
                approvalDate: p.houseDetail.approvalDate ? new Date(p.houseDetail.approvalDate) : null,
              } 
            } : undefined,
            storeDetail: p.storeDetail ? { 
              create: {
                ...p.storeDetail,
                approvalDate: p.storeDetail.approvalDate ? new Date(p.storeDetail.approvalDate) : null,
              } 
            } : undefined,
            officeDetail: p.officeDetail ? { 
              create: {
                ...p.officeDetail,
                approvalDate: p.officeDetail.approvalDate ? new Date(p.officeDetail.approvalDate) : null,
              } 
            } : undefined,
            factoryWarehouseDetail: p.factoryWarehouseDetail ? { 
              create: {
                ...p.factoryWarehouseDetail,
                approvalDate: p.factoryWarehouseDetail.approvalDate ? new Date(p.factoryWarehouseDetail.approvalDate) : null,
              } 
            } : undefined,
            landDetail: p.landDetail ? { create: p.landDetail } : undefined,
          },
        });
      }

      properties = await prisma.property.findMany({
        where: whereClause,
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
    }

    return NextResponse.json(properties.map(formatPropertyOutput));
  } catch (error: any) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(INITIAL_PROPERTIES);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      propertyNumber,
      receiptDate,
      propertyType,
      transactionType,
      status = 'AVAILABLE',
      address,
      roadAddress,
      jibunAddress,
      detailAddress,
      images,
      latitude,
      longitude,
      direction,
      directionCriteria,
      availableDate,
      price,
      deposit,
      monthlyRent,
      consultationNotes,
      landArea,
      totalFloorArea,
      approvalDate,
      buildingRegisterUse,
      customerId,
      // 7가지 세부 스펙
      apartmentDetail,
      houseDetail,
      storeDetail,
      officeDetail,
      factoryWarehouseDetail,
      landDetail,
      customerInput,
    } = body;

    if (!propertyNumber || !propertyType || !transactionType || !address) {
      return NextResponse.json(
        { error: '매물번호, 매물종류, 거래유형, 소재지 주소는 필수 입력값입니다.' },
        { status: 400 }
      );
    }

    // 중복 매물번호 검사
    const existing = await prisma.property.findUnique({
      where: { propertyNumber },
    });
    if (existing) {
      return NextResponse.json(
        { error: `이미 등록된 매물번호(${propertyNumber})입니다. 다른 번호를 입력해주세요.` },
        { status: 400 }
      );
    }

    // 접수 고객 직접 입력 시 고객 DB 자동 등록/연동
    let finalCustomerId = customerId || null;
    if (!finalCustomerId && customerInput && (customerInput.name?.trim() || customerInput.phone?.trim())) {
      const custName = customerInput.name?.trim() || '접수 의뢰고객';
      const custPhone = customerInput.phone?.trim() || '010-0000-0000';
      const custCarrier = customerInput.carrier?.trim() || null;
      const custType = transactionType === '매매' ? 'SELLER' : 'LESSOR';

      if (customerInput.phone?.trim()) {
        const existingCust = await prisma.customer.findFirst({
          where: { phone: customerInput.phone.trim() },
        });
        if (existingCust) {
          if (custCarrier && !existingCust.carrier) {
            await prisma.customer.update({
              where: { id: existingCust.id },
              data: { carrier: custCarrier },
            });
          }
          finalCustomerId = existingCust.id;
        } else {
          const newCust = await prisma.customer.create({
            data: {
              name: custName,
              phone: custPhone,
              carrier: custCarrier,
              type: custType,
              group: 'RECEIVED',
              memo: `매물 #${propertyNumber} (${address}) 접수 고객으로 자동 등록됨`,
            },
          });
          finalCustomerId = newCust.id;
        }
      } else {
        const newCust = await prisma.customer.create({
          data: {
            name: custName,
            phone: custPhone,
            carrier: custCarrier,
            type: custType,
            group: 'RECEIVED',
            memo: `매물 #${propertyNumber} (${address}) 접수 고객으로 자동 등록됨`,
          },
        });
        finalCustomerId = newCust.id;
      }
    }

    const newProperty = await prisma.property.create({
      data: {
        propertyNumber,
        receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
        propertyType,
        status,
        transactionType,
        address,
        roadAddress: roadAddress || null,
        jibunAddress: jibunAddress || null,
        images: images ? (Array.isArray(images) ? JSON.stringify(images) : images) : null,
        detailAddress,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        direction,
        directionCriteria,
        availableDate: availableDate ? new Date(availableDate) : null,
        isImmediateAvailable: !!body.isImmediateAvailable,
        price: price ? parseFloat(price) : null,
        deposit: deposit ? parseFloat(deposit) : null,
        monthlyRent: monthlyRent ? parseFloat(monthlyRent) : null,
        isNoMaintenanceFee: !!body.isNoMaintenanceFee,
        consultationNotes,
        landArea: landArea ? parseFloat(landArea) : null,
        totalFloorArea: totalFloorArea ? parseFloat(totalFloorArea) : null,
        approvalDate: approvalDate ? new Date(approvalDate) : null,
        buildingRegisterUse,
        customerId: finalCustomerId,
        // 종류별 관계 생성
        apartmentDetail:
          propertyType === 'APARTMENT' && apartmentDetail
            ? {
                create: {
                  complexName: apartmentDetail.complexName || address,
                  buildingNo: apartmentDetail.buildingNo,
                  unitNo: apartmentDetail.unitNo,
                  supplyArea: apartmentDetail.supplyArea ? parseFloat(apartmentDetail.supplyArea) : null,
                  pyeongType: apartmentDetail.pyeongType,
                  exclusiveArea: apartmentDetail.exclusiveArea ? parseFloat(apartmentDetail.exclusiveArea) : null,
                  roomCount: apartmentDetail.roomCount ? parseInt(apartmentDetail.roomCount, 10) : null,
                  bathroomCount: apartmentDetail.bathroomCount ? parseInt(apartmentDetail.bathroomCount, 10) : null,
                  approvalDate: apartmentDetail.approvalDate ? new Date(apartmentDetail.approvalDate) : null,
                  elevatorCount: apartmentDetail.elevatorCount ? parseInt(apartmentDetail.elevatorCount, 10) : null,
                  maintenanceFee: apartmentDetail.maintenanceFee ? parseFloat(apartmentDetail.maintenanceFee) : null,
                  heatingType: apartmentDetail.heatingType,
                  systemAircon: !!apartmentDetail.systemAircon,
                  roomLivingOption: apartmentDetail.roomLivingOption,
                  heatExchanger: !!apartmentDetail.heatExchanger,
                  induction: !!apartmentDetail.induction,
                  otherOptions: apartmentDetail.otherOptions,
                },
              }
            : undefined,
        houseDetail:
          propertyType === 'HOUSE' && houseDetail
            ? {
                create: {
                  totalFloors: houseDetail.totalFloors ? parseInt(houseDetail.totalFloors, 10) : null,
                  currentFloor: houseDetail.currentFloor,
                  landArea: houseDetail.landArea ? parseFloat(houseDetail.landArea) : null,
                  totalFloorArea: houseDetail.totalFloorArea ? parseFloat(houseDetail.totalFloorArea) : null,
                  buildingArea: houseDetail.buildingArea ? parseFloat(houseDetail.buildingArea) : null,
                  buildingUse: houseDetail.buildingUse,
                  approvalDate: houseDetail.approvalDate ? new Date(houseDetail.approvalDate) : null,
                  roomCount: houseDetail.roomCount ? parseInt(houseDetail.roomCount, 10) : null,
                  bathroomCount: houseDetail.bathroomCount ? parseInt(houseDetail.bathroomCount, 10) : null,
                  currentLeaseStatus: houseDetail.currentLeaseStatus,
                  parkingCount: houseDetail.parkingCount ? parseInt(houseDetail.parkingCount, 10) : null,
                  maintenanceFeeCommon: houseDetail.maintenanceFeeCommon ? parseFloat(houseDetail.maintenanceFeeCommon) : null,
                  maintenanceFeeWater: houseDetail.maintenanceFeeWater ? parseFloat(houseDetail.maintenanceFeeWater) : null,
                  maintenanceFeeElectricity: houseDetail.maintenanceFeeElectricity ? parseFloat(houseDetail.maintenanceFeeElectricity) : null,
                  maintenanceFeeGas: houseDetail.maintenanceFeeGas ? parseFloat(houseDetail.maintenanceFeeGas) : null,
                  heatingType: houseDetail.heatingType,
                  options: houseDetail.options,
                },
              }
            : undefined,
        storeDetail:
          propertyType === 'STORE' && storeDetail
            ? {
                create: {
                  storeName: storeDetail.storeName,
                  businessType: storeDetail.businessType,
                  totalFloors: storeDetail.totalFloors ? parseInt(storeDetail.totalFloors, 10) : null,
                  currentFloor: storeDetail.currentFloor,
                  landArea: storeDetail.landArea ? parseFloat(storeDetail.landArea) : null,
                  buildingArea: storeDetail.buildingArea ? parseFloat(storeDetail.buildingArea) : null,
                  buildingUse: storeDetail.buildingUse,
                  actualArea: storeDetail.actualArea ? parseFloat(storeDetail.actualArea) : null,
                  roomCount: storeDetail.roomCount ? parseInt(storeDetail.roomCount, 10) : null,
                  bathroomCount: storeDetail.bathroomCount ? parseInt(storeDetail.bathroomCount, 10) : null,
                  toiletGenderType: storeDetail.toiletGenderType,
                  approvalDate: storeDetail.approvalDate ? new Date(storeDetail.approvalDate) : null,
                  parkingCount: storeDetail.parkingCount ? parseInt(storeDetail.parkingCount, 10) : null,
                  isParkingImpossible: !!storeDetail.isParkingImpossible,
                  // 설비
                  electricityCapacity: storeDetail.electricityCapacity,
                  electricityType: storeDetail.electricityType,
                  waterType: storeDetail.waterType,
                  gasType: storeDetail.gasType,
                  // 금액
                  monthlyRentVat: !!storeDetail.monthlyRentVat,
                  premium: storeDetail.premium ? parseFloat(storeDetail.premium) : null,
                  maintenanceFee: storeDetail.maintenanceFee ? parseFloat(storeDetail.maintenanceFee) : null,
                  isNoMaintenanceFee: !!storeDetail.isNoMaintenanceFee,
                  maintenanceFeeVat: !!storeDetail.maintenanceFeeVat,
                  // 운영 및 계약
                  tableCount: storeDetail.tableCount ? parseInt(storeDetail.tableCount, 10) : null,
                  tableCountHall: storeDetail.tableCountHall ? parseInt(storeDetail.tableCountHall, 10) : null,
                  tableCountRoom: storeDetail.tableCountRoom ? parseInt(storeDetail.tableCountRoom, 10) : null,
                  employeeCount: storeDetail.employeeCount ? parseInt(storeDetail.employeeCount, 10) : null,
                  operationPeriod: storeDetail.operationPeriod,
                  contractYear: storeDetail.contractYear,
                  renewalPeriodRemain: storeDetail.renewalPeriodRemain,
                  violationBuilding: storeDetail.violationBuilding,
                  businessRegistrationStatus: storeDetail.businessRegistrationStatus,
                  operatorContractorMatch: storeDetail.operatorContractorMatch,
                  liquorLoan: storeDetail.liquorLoan,
                  rentIncreaseCondition: storeDetail.rentIncreaseCondition,
                  storeAdStatus: storeDetail.storeAdStatus,
                  otherAgencyAdStatus: storeDetail.otherAgencyAdStatus,
                  restorationTerms: storeDetail.restorationTerms,
                  // 체크리스트
                  adminActionChecked: storeDetail.adminActionChecked,
                  contractPeriod: storeDetail.contractPeriod,
                  parkingRequirement: storeDetail.parkingRequirement,
                  rentIncreaseStatus: storeDetail.rentIncreaseStatus,
                  advertisementStatus: storeDetail.advertisementStatus,
                  dailyRevenue: storeDetail.dailyRevenue ? parseFloat(storeDetail.dailyRevenue) : null,
                  equipmentStatus: storeDetail.equipmentStatus,
                  fireInspectionCert: storeDetail.fireInspectionCert,
                },
              }
            : undefined,
        officeDetail:
          propertyType === 'OFFICE' && officeDetail
            ? {
                create: {
                  officeName: officeDetail.officeName,
                  totalFloors: officeDetail.totalFloors ? parseInt(officeDetail.totalFloors, 10) : null,
                  currentFloor: officeDetail.currentFloor,
                  landArea: officeDetail.landArea ? parseFloat(officeDetail.landArea) : null,
                  buildingArea: officeDetail.buildingArea ? parseFloat(officeDetail.buildingArea) : null,
                  buildingUse: officeDetail.buildingUse,
                  actualArea: officeDetail.actualArea ? parseFloat(officeDetail.actualArea) : null,
                  roomCount: officeDetail.roomCount ? parseInt(officeDetail.roomCount, 10) : null,
                  bathroomCount: officeDetail.bathroomCount ? parseInt(officeDetail.bathroomCount, 10) : null,
                  toiletGenderType: officeDetail.toiletGenderType,
                  approvalDate: officeDetail.approvalDate ? new Date(officeDetail.approvalDate) : null,
                  parkingCount: officeDetail.parkingCount ? parseInt(officeDetail.parkingCount, 10) : null,
                  isParkingImpossible: !!officeDetail.isParkingImpossible,
                  // 설비
                  electricityCapacity: officeDetail.electricityCapacity,
                  electricityType: officeDetail.electricityType,
                  waterType: officeDetail.waterType,
                  gasType: officeDetail.gasType,
                  monthlyRentVat: !!officeDetail.monthlyRentVat,
                  maintenanceFee: officeDetail.maintenanceFee ? parseFloat(officeDetail.maintenanceFee) : null,
                  isNoMaintenanceFee: !!officeDetail.isNoMaintenanceFee,
                  maintenanceFeeVat: !!officeDetail.maintenanceFeeVat,
                  // 계약 및 운영
                  contractYear: officeDetail.contractYear,
                  renewalPeriodRemain: officeDetail.renewalPeriodRemain,
                  operatorContractorMatch: officeDetail.operatorContractorMatch,
                  storeAdStatus: officeDetail.storeAdStatus,
                  otherAgencyAdStatus: officeDetail.otherAgencyAdStatus,
                  rentIncreaseCondition: officeDetail.rentIncreaseCondition,
                  restorationTerms: officeDetail.restorationTerms,
                  // 체크리스트
                  violationBuilding: officeDetail.violationBuilding,
                  parkingAndFee: officeDetail.parkingAndFee,
                  rentIncreaseStatus: officeDetail.rentIncreaseStatus,
                  advertisementStatus: officeDetail.advertisementStatus,
                  prosAndCons: officeDetail.prosAndCons,
                  hvacSystem: officeDetail.hvacSystem,
                  elevator: officeDetail.elevator,
                  security: officeDetail.security,
                  restorationScope: officeDetail.restorationScope,
                  electricityExpansion: officeDetail.electricityExpansion,
                  specialTerms: officeDetail.specialTerms,
                  totalOfficeCount: officeDetail.totalOfficeCount ? parseInt(officeDetail.totalOfficeCount, 10) : null,
                },
              }
            : undefined,
        factoryWarehouseDetail:
          propertyType === 'FACTORY_WAREHOUSE' && factoryWarehouseDetail
            ? {
                create: {
                  companyName: factoryWarehouseDetail.companyName,
                  businessType: factoryWarehouseDetail.businessType,
                  totalFloors: factoryWarehouseDetail.totalFloors ? parseInt(factoryWarehouseDetail.totalFloors, 10) : null,
                  currentFloor: factoryWarehouseDetail.currentFloor,
                  structure: factoryWarehouseDetail.structure,
                  approvalDate: factoryWarehouseDetail.approvalDate ? new Date(factoryWarehouseDetail.approvalDate) : null,
                  landArea: factoryWarehouseDetail.landArea ? parseFloat(factoryWarehouseDetail.landArea) : null,
                  totalFloorArea: factoryWarehouseDetail.totalFloorArea ? parseFloat(factoryWarehouseDetail.totalFloorArea) : null,
                  buildingArea: factoryWarehouseDetail.buildingArea ? parseFloat(factoryWarehouseDetail.buildingArea) : null,
                  buildingUse: factoryWarehouseDetail.buildingUse,
                  zoningArea: factoryWarehouseDetail.zoningArea,
                  landCategory: factoryWarehouseDetail.landCategory,
                  roadAccessWidth: factoryWarehouseDetail.roadAccessWidth,
                  ceilingHeight: factoryWarehouseDetail.ceilingHeight ? parseFloat(factoryWarehouseDetail.ceilingHeight) : null,
                  hoistCapacity: factoryWarehouseDetail.hoistCapacity,
                  incomingElectricity: factoryWarehouseDetail.incomingElectricity,
                  operatingElectricity: factoryWarehouseDetail.operatingElectricity,
                  parkingCount: factoryWarehouseDetail.parkingCount ? parseInt(factoryWarehouseDetail.parkingCount, 10) : null,
                  rentPerPyeong: factoryWarehouseDetail.rentPerPyeong ? parseFloat(factoryWarehouseDetail.rentPerPyeong) : null,
                  wastewater: factoryWarehouseDetail.wastewater,
                  airPollution: factoryWarehouseDetail.airPollution,
                  noiseLevel: factoryWarehouseDetail.noiseLevel,
                  allowedBusinessTypes: factoryWarehouseDetail.allowedBusinessTypes,
                  sewageDirectConnection: factoryWarehouseDetail.sewageDirectConnection,
                },
              }
            : undefined,
        landDetail:
          propertyType === 'LAND' && landDetail
            ? {
                create: {
                  companyName: landDetail.companyName,
                  businessType: landDetail.businessType,
                  landArea: landDetail.landArea ? parseFloat(landDetail.landArea) : null,
                  rentPerPyeong: landDetail.rentPerPyeong ? parseFloat(landDetail.rentPerPyeong) : null,
                  zoningArea: landDetail.zoningArea,
                  landCategory: landDetail.landCategory,
                  roadAccess: landDetail.roadAccess,
                  ordinancePermitted: landDetail.ordinancePermitted,
                  roadAccessConfirmed: landDetail.roadAccessConfirmed,
                  surfaceRights: landDetail.surfaceRights,
                  easementRights: landDetail.easementRights,
                  farmlandsCert: landDetail.farmlandsCert,
                  landPermitZone: landDetail.landPermitZone,
                  greenBeltZone: landDetail.greenBeltZone,
                  unauthorizedStructures: landDetail.unauthorizedStructures,
                  infrastructure: landDetail.infrastructure,
                  waterSewageConnection: landDetail.waterSewageConnection,
                },
              }
            : undefined,
      },
      include: {
        customer: true,
        apartmentDetail: true,
        houseDetail: true,
        storeDetail: true,
        officeDetail: true,
        factoryWarehouseDetail: true,
        landDetail: true,
      },
    });

    return NextResponse.json(formatPropertyOutput(newProperty), { status: 201 });
  } catch (error: any) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { error: error.message || '매물 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 매물 수정 (PUT)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      propertyNumber,
      receiptDate,
      propertyType,
      transactionType,
      status,
      address,
      roadAddress,
      jibunAddress,
      detailAddress,
      images,
      latitude,
      longitude,
      direction,
      directionCriteria,
      availableDate,
      price,
      deposit,
      monthlyRent,
      consultationNotes,
      landArea,
      totalFloorArea,
      approvalDate,
      buildingRegisterUse,
      customerId,
      customerInput,
      apartmentDetail,
      houseDetail,
      storeDetail,
      officeDetail,
      factoryWarehouseDetail,
      landDetail,
    } = body;

    if (!id && !propertyNumber) {
      return NextResponse.json(
        { error: '수정할 매물의 ID 또는 매물번호가 필요합니다.' },
        { status: 400 }
      );
    }

    const existingProp = id
      ? await prisma.property.findUnique({ where: { id } })
      : await prisma.property.findUnique({ where: { propertyNumber } });

    if (!existingProp) {
      return NextResponse.json(
        { error: '수정할 매물을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const targetId = existingProp.id;

    // 접수 고객 직접 입력 시 처리
    let finalCustomerId = customerId !== undefined ? customerId : existingProp.customerId;
    if (customerInput && (customerInput.name?.trim() || customerInput.phone?.trim())) {
      const custName = customerInput.name?.trim() || '접수 의뢰고객';
      const custPhone = customerInput.phone?.trim() || '010-0000-0000';
      const custCarrier = customerInput.carrier?.trim() || null;
      const custType = transactionType === '매매' ? 'SELLER' : 'LESSOR';

      if (customerInput.phone?.trim()) {
        const existingCust = await prisma.customer.findFirst({
          where: { phone: customerInput.phone.trim() },
        });
        if (existingCust) {
          if (custCarrier && !existingCust.carrier) {
            await prisma.customer.update({
              where: { id: existingCust.id },
              data: { carrier: custCarrier },
            });
          }
          finalCustomerId = existingCust.id;
        } else {
          const newCust = await prisma.customer.create({
            data: {
              name: custName,
              phone: custPhone,
              carrier: custCarrier,
              type: custType,
              group: 'RECEIVED',
              memo: `매물 #${propertyNumber || existingProp.propertyNumber} 접수 고객으로 등록됨`,
            },
          });
          finalCustomerId = newCust.id;
        }
      }
    }

    const updatedProperty = await prisma.property.update({
      where: { id: targetId },
      data: {
        propertyNumber: propertyNumber || undefined,
        receiptDate: receiptDate ? new Date(receiptDate) : undefined,
        propertyType: propertyType || undefined,
        status: status || undefined,
        transactionType: transactionType || undefined,
        address: address || undefined,
        roadAddress: roadAddress !== undefined ? roadAddress : undefined,
        jibunAddress: jibunAddress !== undefined ? jibunAddress : undefined,
        images: images !== undefined ? (Array.isArray(images) ? JSON.stringify(images) : images) : undefined,
        detailAddress: detailAddress !== undefined ? detailAddress : undefined,
        latitude: latitude !== undefined ? (latitude ? parseFloat(latitude) : null) : undefined,
        longitude: longitude !== undefined ? (longitude ? parseFloat(longitude) : null) : undefined,
        direction: direction !== undefined ? direction : undefined,
        directionCriteria: directionCriteria !== undefined ? directionCriteria : undefined,
        availableDate: availableDate !== undefined ? (availableDate ? new Date(availableDate) : null) : undefined,
        isImmediateAvailable: body.isImmediateAvailable !== undefined ? !!body.isImmediateAvailable : undefined,
        price: price !== undefined ? (price ? parseFloat(price) : null) : undefined,
        deposit: deposit !== undefined ? (deposit ? parseFloat(deposit) : null) : undefined,
        monthlyRent: monthlyRent !== undefined ? (monthlyRent ? parseFloat(monthlyRent) : null) : undefined,
        isNoMaintenanceFee: body.isNoMaintenanceFee !== undefined ? !!body.isNoMaintenanceFee : undefined,
        consultationNotes: consultationNotes !== undefined ? consultationNotes : undefined,
        landArea: landArea !== undefined ? (landArea ? parseFloat(landArea) : null) : undefined,
        totalFloorArea: totalFloorArea !== undefined ? (totalFloorArea ? parseFloat(totalFloorArea) : null) : undefined,
        approvalDate: approvalDate !== undefined ? (approvalDate ? new Date(approvalDate) : null) : undefined,
        buildingRegisterUse: buildingRegisterUse !== undefined ? buildingRegisterUse : undefined,
        customerId: finalCustomerId,

        // 서브 데이터 업서트
        apartmentDetail:
          propertyType === 'APARTMENT' && apartmentDetail
            ? {
                upsert: {
                  create: {
                    complexName: apartmentDetail.complexName || address || existingProp.address,
                    buildingNo: apartmentDetail.buildingNo,
                    unitNo: apartmentDetail.unitNo,
                    supplyArea: apartmentDetail.supplyArea ? parseFloat(apartmentDetail.supplyArea) : null,
                    pyeongType: apartmentDetail.pyeongType,
                    exclusiveArea: apartmentDetail.exclusiveArea ? parseFloat(apartmentDetail.exclusiveArea) : null,
                    roomCount: apartmentDetail.roomCount ? parseInt(apartmentDetail.roomCount, 10) : null,
                    bathroomCount: apartmentDetail.bathroomCount ? parseInt(apartmentDetail.bathroomCount, 10) : null,
                    approvalDate: apartmentDetail.approvalDate ? new Date(apartmentDetail.approvalDate) : null,
                    elevatorCount: apartmentDetail.elevatorCount ? parseInt(apartmentDetail.elevatorCount, 10) : null,
                    maintenanceFee: apartmentDetail.maintenanceFee ? parseFloat(apartmentDetail.maintenanceFee) : null,
                    heatingType: apartmentDetail.heatingType,
                    systemAircon: !!apartmentDetail.systemAircon,
                    roomLivingOption: apartmentDetail.roomLivingOption,
                    heatExchanger: !!apartmentDetail.heatExchanger,
                    induction: !!apartmentDetail.induction,
                    otherOptions: apartmentDetail.otherOptions,
                  },
                  update: {
                    complexName: apartmentDetail.complexName || address || existingProp.address,
                    buildingNo: apartmentDetail.buildingNo,
                    unitNo: apartmentDetail.unitNo,
                    supplyArea: apartmentDetail.supplyArea ? parseFloat(apartmentDetail.supplyArea) : null,
                    pyeongType: apartmentDetail.pyeongType,
                    exclusiveArea: apartmentDetail.exclusiveArea ? parseFloat(apartmentDetail.exclusiveArea) : null,
                    roomCount: apartmentDetail.roomCount ? parseInt(apartmentDetail.roomCount, 10) : null,
                    bathroomCount: apartmentDetail.bathroomCount ? parseInt(apartmentDetail.bathroomCount, 10) : null,
                    approvalDate: apartmentDetail.approvalDate ? new Date(apartmentDetail.approvalDate) : null,
                    elevatorCount: apartmentDetail.elevatorCount ? parseInt(apartmentDetail.elevatorCount, 10) : null,
                    maintenanceFee: apartmentDetail.maintenanceFee ? parseFloat(apartmentDetail.maintenanceFee) : null,
                    heatingType: apartmentDetail.heatingType,
                    systemAircon: !!apartmentDetail.systemAircon,
                    roomLivingOption: apartmentDetail.roomLivingOption,
                    heatExchanger: !!apartmentDetail.heatExchanger,
                    induction: !!apartmentDetail.induction,
                    otherOptions: apartmentDetail.otherOptions,
                  },
                },
              }
            : undefined,

        houseDetail:
          propertyType === 'HOUSE' && houseDetail
            ? {
                upsert: {
                  create: {
                    totalFloors: houseDetail.totalFloors ? parseInt(houseDetail.totalFloors, 10) : null,
                    currentFloor: houseDetail.currentFloor,
                    landArea: houseDetail.landArea ? parseFloat(houseDetail.landArea) : null,
                    totalFloorArea: houseDetail.totalFloorArea ? parseFloat(houseDetail.totalFloorArea) : null,
                    buildingArea: houseDetail.buildingArea ? parseFloat(houseDetail.buildingArea) : null,
                    buildingUse: houseDetail.buildingUse,
                    approvalDate: houseDetail.approvalDate ? new Date(houseDetail.approvalDate) : null,
                    roomCount: houseDetail.roomCount ? parseInt(houseDetail.roomCount, 10) : null,
                    bathroomCount: houseDetail.bathroomCount ? parseInt(houseDetail.bathroomCount, 10) : null,
                    currentLeaseStatus: houseDetail.currentLeaseStatus,
                    parkingCount: houseDetail.parkingCount ? parseInt(houseDetail.parkingCount, 10) : null,
                    maintenanceFeeCommon: houseDetail.maintenanceFeeCommon ? parseFloat(houseDetail.maintenanceFeeCommon) : null,
                    maintenanceFeeWater: houseDetail.maintenanceFeeWater ? parseFloat(houseDetail.maintenanceFeeWater) : null,
                    maintenanceFeeElectricity: houseDetail.maintenanceFeeElectricity ? parseFloat(houseDetail.maintenanceFeeElectricity) : null,
                    maintenanceFeeGas: houseDetail.maintenanceFeeGas ? parseFloat(houseDetail.maintenanceFeeGas) : null,
                    heatingType: houseDetail.heatingType,
                    options: houseDetail.options,
                  },
                  update: {
                    totalFloors: houseDetail.totalFloors ? parseInt(houseDetail.totalFloors, 10) : null,
                    currentFloor: houseDetail.currentFloor,
                    landArea: houseDetail.landArea ? parseFloat(houseDetail.landArea) : null,
                    totalFloorArea: houseDetail.totalFloorArea ? parseFloat(houseDetail.totalFloorArea) : null,
                    buildingArea: houseDetail.buildingArea ? parseFloat(houseDetail.buildingArea) : null,
                    buildingUse: houseDetail.buildingUse,
                    approvalDate: houseDetail.approvalDate ? new Date(houseDetail.approvalDate) : null,
                    roomCount: houseDetail.roomCount ? parseInt(houseDetail.roomCount, 10) : null,
                    bathroomCount: houseDetail.bathroomCount ? parseInt(houseDetail.bathroomCount, 10) : null,
                    currentLeaseStatus: houseDetail.currentLeaseStatus,
                    parkingCount: houseDetail.parkingCount ? parseInt(houseDetail.parkingCount, 10) : null,
                    maintenanceFeeCommon: houseDetail.maintenanceFeeCommon ? parseFloat(houseDetail.maintenanceFeeCommon) : null,
                    maintenanceFeeWater: houseDetail.maintenanceFeeWater ? parseFloat(houseDetail.maintenanceFeeWater) : null,
                    maintenanceFeeElectricity: houseDetail.maintenanceFeeElectricity ? parseFloat(houseDetail.maintenanceFeeElectricity) : null,
                    maintenanceFeeGas: houseDetail.maintenanceFeeGas ? parseFloat(houseDetail.maintenanceFeeGas) : null,
                    heatingType: houseDetail.heatingType,
                    options: houseDetail.options,
                  },
                },
              }
            : undefined,

        storeDetail:
          propertyType === 'STORE' && storeDetail
            ? {
                upsert: {
                  create: {
                    storeName: storeDetail.storeName,
                    businessType: storeDetail.businessType,
                    totalFloors: storeDetail.totalFloors ? parseInt(storeDetail.totalFloors, 10) : null,
                    currentFloor: storeDetail.currentFloor,
                    landArea: storeDetail.landArea ? parseFloat(storeDetail.landArea) : null,
                    buildingArea: storeDetail.buildingArea ? parseFloat(storeDetail.buildingArea) : null,
                    buildingUse: storeDetail.buildingUse,
                    actualArea: storeDetail.actualArea ? parseFloat(storeDetail.actualArea) : null,
                    roomCount: storeDetail.roomCount ? parseInt(storeDetail.roomCount, 10) : null,
                    bathroomCount: storeDetail.bathroomCount ? parseInt(storeDetail.bathroomCount, 10) : null,
                    toiletGenderType: storeDetail.toiletGenderType,
                    approvalDate: storeDetail.approvalDate ? new Date(storeDetail.approvalDate) : null,
                    parkingCount: storeDetail.parkingCount ? parseInt(storeDetail.parkingCount, 10) : null,
                    isParkingImpossible: !!storeDetail.isParkingImpossible,
                    // 설비
                    electricityCapacity: storeDetail.electricityCapacity,
                    electricityType: storeDetail.electricityType,
                    waterType: storeDetail.waterType,
                    gasType: storeDetail.gasType,
                    // 금액
                    monthlyRentVat: !!storeDetail.monthlyRentVat,
                    premium: storeDetail.premium ? parseFloat(storeDetail.premium) : null,
                    maintenanceFee: storeDetail.maintenanceFee ? parseFloat(storeDetail.maintenanceFee) : null,
                    isNoMaintenanceFee: !!storeDetail.isNoMaintenanceFee,
                    maintenanceFeeVat: !!storeDetail.maintenanceFeeVat,
                    // 운영 및 계약
                    tableCount: storeDetail.tableCount ? parseInt(storeDetail.tableCount, 10) : null,
                    tableCountHall: storeDetail.tableCountHall ? parseInt(storeDetail.tableCountHall, 10) : null,
                    tableCountRoom: storeDetail.tableCountRoom ? parseInt(storeDetail.tableCountRoom, 10) : null,
                    employeeCount: storeDetail.employeeCount ? parseInt(storeDetail.employeeCount, 10) : null,
                    operationPeriod: storeDetail.operationPeriod,
                    contractYear: storeDetail.contractYear,
                    renewalPeriodRemain: storeDetail.renewalPeriodRemain,
                    violationBuilding: storeDetail.violationBuilding,
                    businessRegistrationStatus: storeDetail.businessRegistrationStatus,
                    operatorContractorMatch: storeDetail.operatorContractorMatch,
                    liquorLoan: storeDetail.liquorLoan,
                    rentIncreaseCondition: storeDetail.rentIncreaseCondition,
                    storeAdStatus: storeDetail.storeAdStatus,
                    otherAgencyAdStatus: storeDetail.otherAgencyAdStatus,
                    restorationTerms: storeDetail.restorationTerms,
                    // 체크리스트
                    adminActionChecked: storeDetail.adminActionChecked,
                    contractPeriod: storeDetail.contractPeriod,
                    parkingRequirement: storeDetail.parkingRequirement,
                    rentIncreaseStatus: storeDetail.rentIncreaseStatus,
                    advertisementStatus: storeDetail.advertisementStatus,
                    dailyRevenue: storeDetail.dailyRevenue ? parseFloat(storeDetail.dailyRevenue) : null,
                    equipmentStatus: storeDetail.equipmentStatus,
                    fireInspectionCert: storeDetail.fireInspectionCert,
                  },
                  update: {
                    storeName: storeDetail.storeName,
                    businessType: storeDetail.businessType,
                    totalFloors: storeDetail.totalFloors ? parseInt(storeDetail.totalFloors, 10) : null,
                    currentFloor: storeDetail.currentFloor,
                    landArea: storeDetail.landArea ? parseFloat(storeDetail.landArea) : null,
                    buildingArea: storeDetail.buildingArea ? parseFloat(storeDetail.buildingArea) : null,
                    buildingUse: storeDetail.buildingUse,
                    actualArea: storeDetail.actualArea ? parseFloat(storeDetail.actualArea) : null,
                    roomCount: storeDetail.roomCount ? parseInt(storeDetail.roomCount, 10) : null,
                    bathroomCount: storeDetail.bathroomCount ? parseInt(storeDetail.bathroomCount, 10) : null,
                    toiletGenderType: storeDetail.toiletGenderType,
                    approvalDate: storeDetail.approvalDate ? new Date(storeDetail.approvalDate) : null,
                    parkingCount: storeDetail.parkingCount ? parseInt(storeDetail.parkingCount, 10) : null,
                    isParkingImpossible: !!storeDetail.isParkingImpossible,
                    // 설비
                    electricityCapacity: storeDetail.electricityCapacity,
                    electricityType: storeDetail.electricityType,
                    waterType: storeDetail.waterType,
                    gasType: storeDetail.gasType,
                    // 금액
                    monthlyRentVat: !!storeDetail.monthlyRentVat,
                    premium: storeDetail.premium ? parseFloat(storeDetail.premium) : null,
                    maintenanceFee: storeDetail.maintenanceFee ? parseFloat(storeDetail.maintenanceFee) : null,
                    isNoMaintenanceFee: !!storeDetail.isNoMaintenanceFee,
                    maintenanceFeeVat: !!storeDetail.maintenanceFeeVat,
                    // 운영 및 계약
                    tableCount: storeDetail.tableCount ? parseInt(storeDetail.tableCount, 10) : null,
                    tableCountHall: storeDetail.tableCountHall ? parseInt(storeDetail.tableCountHall, 10) : null,
                    tableCountRoom: storeDetail.tableCountRoom ? parseInt(storeDetail.tableCountRoom, 10) : null,
                    employeeCount: storeDetail.employeeCount ? parseInt(storeDetail.employeeCount, 10) : null,
                    operationPeriod: storeDetail.operationPeriod,
                    contractYear: storeDetail.contractYear,
                    renewalPeriodRemain: storeDetail.renewalPeriodRemain,
                    violationBuilding: storeDetail.violationBuilding,
                    businessRegistrationStatus: storeDetail.businessRegistrationStatus,
                    operatorContractorMatch: storeDetail.operatorContractorMatch,
                    liquorLoan: storeDetail.liquorLoan,
                    rentIncreaseCondition: storeDetail.rentIncreaseCondition,
                    storeAdStatus: storeDetail.storeAdStatus,
                    otherAgencyAdStatus: storeDetail.otherAgencyAdStatus,
                    restorationTerms: storeDetail.restorationTerms,
                    // 체크리스트
                    adminActionChecked: storeDetail.adminActionChecked,
                    contractPeriod: storeDetail.contractPeriod,
                    parkingRequirement: storeDetail.parkingRequirement,
                    rentIncreaseStatus: storeDetail.rentIncreaseStatus,
                    advertisementStatus: storeDetail.advertisementStatus,
                    dailyRevenue: storeDetail.dailyRevenue ? parseFloat(storeDetail.dailyRevenue) : null,
                    equipmentStatus: storeDetail.equipmentStatus,
                    fireInspectionCert: storeDetail.fireInspectionCert,
                  },
                },
              }
            : undefined,

        officeDetail:
          propertyType === 'OFFICE' && officeDetail
            ? {
                upsert: {
                  create: {
                    officeName: officeDetail.officeName,
                    totalFloors: officeDetail.totalFloors ? parseInt(officeDetail.totalFloors, 10) : null,
                    currentFloor: officeDetail.currentFloor,
                    landArea: officeDetail.landArea ? parseFloat(officeDetail.landArea) : null,
                    buildingArea: officeDetail.buildingArea ? parseFloat(officeDetail.buildingArea) : null,
                    buildingUse: officeDetail.buildingUse,
                    actualArea: officeDetail.actualArea ? parseFloat(officeDetail.actualArea) : null,
                    roomCount: officeDetail.roomCount ? parseInt(officeDetail.roomCount, 10) : null,
                    bathroomCount: officeDetail.bathroomCount ? parseInt(officeDetail.bathroomCount, 10) : null,
                    toiletGenderType: officeDetail.toiletGenderType,
                    approvalDate: officeDetail.approvalDate ? new Date(officeDetail.approvalDate) : null,
                    parkingCount: officeDetail.parkingCount ? parseInt(officeDetail.parkingCount, 10) : null,
                    isParkingImpossible: !!officeDetail.isParkingImpossible,
                    // 설비
                    electricityCapacity: officeDetail.electricityCapacity,
                    electricityType: officeDetail.electricityType,
                    waterType: officeDetail.waterType,
                    gasType: officeDetail.gasType,
                    monthlyRentVat: !!officeDetail.monthlyRentVat,
                    maintenanceFee: officeDetail.maintenanceFee ? parseFloat(officeDetail.maintenanceFee) : null,
                    isNoMaintenanceFee: !!officeDetail.isNoMaintenanceFee,
                    maintenanceFeeVat: !!officeDetail.maintenanceFeeVat,
                    // 계약 및 운영
                    contractYear: officeDetail.contractYear,
                    renewalPeriodRemain: officeDetail.renewalPeriodRemain,
                    operatorContractorMatch: officeDetail.operatorContractorMatch,
                    storeAdStatus: officeDetail.storeAdStatus,
                    otherAgencyAdStatus: officeDetail.otherAgencyAdStatus,
                    rentIncreaseCondition: officeDetail.rentIncreaseCondition,
                    restorationTerms: officeDetail.restorationTerms,
                    // 체크리스트
                    violationBuilding: officeDetail.violationBuilding,
                    parkingAndFee: officeDetail.parkingAndFee,
                    rentIncreaseStatus: officeDetail.rentIncreaseStatus,
                    advertisementStatus: officeDetail.advertisementStatus,
                    prosAndCons: officeDetail.prosAndCons,
                    hvacSystem: officeDetail.hvacSystem,
                    elevator: officeDetail.elevator,
                    security: officeDetail.security,
                    restorationScope: officeDetail.restorationScope,
                    electricityExpansion: officeDetail.electricityExpansion,
                    specialTerms: officeDetail.specialTerms,
                    totalOfficeCount: officeDetail.totalOfficeCount ? parseInt(officeDetail.totalOfficeCount, 10) : null,
                  },
                  update: {
                    officeName: officeDetail.officeName,
                    totalFloors: officeDetail.totalFloors ? parseInt(officeDetail.totalFloors, 10) : null,
                    currentFloor: officeDetail.currentFloor,
                    landArea: officeDetail.landArea ? parseFloat(officeDetail.landArea) : null,
                    buildingArea: officeDetail.buildingArea ? parseFloat(officeDetail.buildingArea) : null,
                    buildingUse: officeDetail.buildingUse,
                    actualArea: officeDetail.actualArea ? parseFloat(officeDetail.actualArea) : null,
                    roomCount: officeDetail.roomCount ? parseInt(officeDetail.roomCount, 10) : null,
                    bathroomCount: officeDetail.bathroomCount ? parseInt(officeDetail.bathroomCount, 10) : null,
                    toiletGenderType: officeDetail.toiletGenderType,
                    approvalDate: officeDetail.approvalDate ? new Date(officeDetail.approvalDate) : null,
                    parkingCount: officeDetail.parkingCount ? parseInt(officeDetail.parkingCount, 10) : null,
                    isParkingImpossible: !!officeDetail.isParkingImpossible,
                    // 설비
                    electricityCapacity: officeDetail.electricityCapacity,
                    electricityType: officeDetail.electricityType,
                    waterType: officeDetail.waterType,
                    gasType: officeDetail.gasType,
                    monthlyRentVat: !!officeDetail.monthlyRentVat,
                    maintenanceFee: officeDetail.maintenanceFee ? parseFloat(officeDetail.maintenanceFee) : null,
                    isNoMaintenanceFee: !!officeDetail.isNoMaintenanceFee,
                    maintenanceFeeVat: !!officeDetail.maintenanceFeeVat,
                    // 계약 및 운영
                    contractYear: officeDetail.contractYear,
                    renewalPeriodRemain: officeDetail.renewalPeriodRemain,
                    operatorContractorMatch: officeDetail.operatorContractorMatch,
                    storeAdStatus: officeDetail.storeAdStatus,
                    otherAgencyAdStatus: officeDetail.otherAgencyAdStatus,
                    rentIncreaseCondition: officeDetail.rentIncreaseCondition,
                    restorationTerms: officeDetail.restorationTerms,
                    // 체크리스트
                    violationBuilding: officeDetail.violationBuilding,
                    parkingAndFee: officeDetail.parkingAndFee,
                    rentIncreaseStatus: officeDetail.rentIncreaseStatus,
                    advertisementStatus: officeDetail.advertisementStatus,
                    prosAndCons: officeDetail.prosAndCons,
                    hvacSystem: officeDetail.hvacSystem,
                    elevator: officeDetail.elevator,
                    security: officeDetail.security,
                    restorationScope: officeDetail.restorationScope,
                    electricityExpansion: officeDetail.electricityExpansion,
                    specialTerms: officeDetail.specialTerms,
                    totalOfficeCount: officeDetail.totalOfficeCount ? parseInt(officeDetail.totalOfficeCount, 10) : null,
                  },
                },
              }
            : undefined,

        factoryWarehouseDetail:
          propertyType === 'FACTORY_WAREHOUSE' && factoryWarehouseDetail
            ? {
                upsert: {
                  create: {
                    companyName: factoryWarehouseDetail.companyName,
                    businessType: factoryWarehouseDetail.businessType,
                    totalFloors: factoryWarehouseDetail.totalFloors ? parseInt(factoryWarehouseDetail.totalFloors, 10) : null,
                    currentFloor: factoryWarehouseDetail.currentFloor,
                    structure: factoryWarehouseDetail.structure,
                    approvalDate: factoryWarehouseDetail.approvalDate ? new Date(factoryWarehouseDetail.approvalDate) : null,
                    landArea: factoryWarehouseDetail.landArea ? parseFloat(factoryWarehouseDetail.landArea) : null,
                    totalFloorArea: factoryWarehouseDetail.totalFloorArea ? parseFloat(factoryWarehouseDetail.totalFloorArea) : null,
                    buildingArea: factoryWarehouseDetail.buildingArea ? parseFloat(factoryWarehouseDetail.buildingArea) : null,
                    buildingUse: factoryWarehouseDetail.buildingUse,
                    zoningArea: factoryWarehouseDetail.zoningArea,
                    landCategory: factoryWarehouseDetail.landCategory,
                    roadAccessWidth: factoryWarehouseDetail.roadAccessWidth,
                    ceilingHeight: factoryWarehouseDetail.ceilingHeight ? parseFloat(factoryWarehouseDetail.ceilingHeight) : null,
                    hoistCapacity: factoryWarehouseDetail.hoistCapacity,
                    incomingElectricity: factoryWarehouseDetail.incomingElectricity,
                    operatingElectricity: factoryWarehouseDetail.operatingElectricity,
                    parkingCount: factoryWarehouseDetail.parkingCount ? parseInt(factoryWarehouseDetail.parkingCount, 10) : null,
                    rentPerPyeong: factoryWarehouseDetail.rentPerPyeong ? parseFloat(factoryWarehouseDetail.rentPerPyeong) : null,
                    wastewater: factoryWarehouseDetail.wastewater,
                    airPollution: factoryWarehouseDetail.airPollution,
                    noiseLevel: factoryWarehouseDetail.noiseLevel,
                    allowedBusinessTypes: factoryWarehouseDetail.allowedBusinessTypes,
                    sewageDirectConnection: factoryWarehouseDetail.sewageDirectConnection,
                  },
                  update: {
                    companyName: factoryWarehouseDetail.companyName,
                    businessType: factoryWarehouseDetail.businessType,
                    totalFloors: factoryWarehouseDetail.totalFloors ? parseInt(factoryWarehouseDetail.totalFloors, 10) : null,
                    currentFloor: factoryWarehouseDetail.currentFloor,
                    structure: factoryWarehouseDetail.structure,
                    approvalDate: factoryWarehouseDetail.approvalDate ? new Date(factoryWarehouseDetail.approvalDate) : null,
                    landArea: factoryWarehouseDetail.landArea ? parseFloat(factoryWarehouseDetail.landArea) : null,
                    totalFloorArea: factoryWarehouseDetail.totalFloorArea ? parseFloat(factoryWarehouseDetail.totalFloorArea) : null,
                    buildingArea: factoryWarehouseDetail.buildingArea ? parseFloat(factoryWarehouseDetail.buildingArea) : null,
                    buildingUse: factoryWarehouseDetail.buildingUse,
                    zoningArea: factoryWarehouseDetail.zoningArea,
                    landCategory: factoryWarehouseDetail.landCategory,
                    roadAccessWidth: factoryWarehouseDetail.roadAccessWidth,
                    ceilingHeight: factoryWarehouseDetail.ceilingHeight ? parseFloat(factoryWarehouseDetail.ceilingHeight) : null,
                    hoistCapacity: factoryWarehouseDetail.hoistCapacity,
                    incomingElectricity: factoryWarehouseDetail.incomingElectricity,
                    operatingElectricity: factoryWarehouseDetail.operatingElectricity,
                    parkingCount: factoryWarehouseDetail.parkingCount ? parseInt(factoryWarehouseDetail.parkingCount, 10) : null,
                    rentPerPyeong: factoryWarehouseDetail.rentPerPyeong ? parseFloat(factoryWarehouseDetail.rentPerPyeong) : null,
                    wastewater: factoryWarehouseDetail.wastewater,
                    airPollution: factoryWarehouseDetail.airPollution,
                    noiseLevel: factoryWarehouseDetail.noiseLevel,
                    allowedBusinessTypes: factoryWarehouseDetail.allowedBusinessTypes,
                    sewageDirectConnection: factoryWarehouseDetail.sewageDirectConnection,
                  },
                },
              }
            : undefined,

        landDetail:
          propertyType === 'LAND' && landDetail
            ? {
                upsert: {
                  create: {
                    companyName: landDetail.companyName,
                    businessType: landDetail.businessType,
                    landArea: landDetail.landArea ? parseFloat(landDetail.landArea) : null,
                    rentPerPyeong: landDetail.rentPerPyeong ? parseFloat(landDetail.rentPerPyeong) : null,
                    zoningArea: landDetail.zoningArea,
                    landCategory: landDetail.landCategory,
                    roadAccess: landDetail.roadAccess,
                    ordinancePermitted: landDetail.ordinancePermitted,
                    roadAccessConfirmed: landDetail.roadAccessConfirmed,
                    surfaceRights: landDetail.surfaceRights,
                    easementRights: landDetail.easementRights,
                    farmlandsCert: landDetail.farmlandsCert,
                    landPermitZone: landDetail.landPermitZone,
                    greenBeltZone: landDetail.greenBeltZone,
                    unauthorizedStructures: landDetail.unauthorizedStructures,
                    infrastructure: landDetail.infrastructure,
                    waterSewageConnection: landDetail.waterSewageConnection,
                  },
                  update: {
                    companyName: landDetail.companyName,
                    businessType: landDetail.businessType,
                    landArea: landDetail.landArea ? parseFloat(landDetail.landArea) : null,
                    rentPerPyeong: landDetail.rentPerPyeong ? parseFloat(landDetail.rentPerPyeong) : null,
                    zoningArea: landDetail.zoningArea,
                    landCategory: landDetail.landCategory,
                    roadAccess: landDetail.roadAccess,
                    ordinancePermitted: landDetail.ordinancePermitted,
                    roadAccessConfirmed: landDetail.roadAccessConfirmed,
                    surfaceRights: landDetail.surfaceRights,
                    easementRights: landDetail.easementRights,
                    farmlandsCert: landDetail.farmlandsCert,
                    landPermitZone: landDetail.landPermitZone,
                    greenBeltZone: landDetail.greenBeltZone,
                    unauthorizedStructures: landDetail.unauthorizedStructures,
                    infrastructure: landDetail.infrastructure,
                    waterSewageConnection: landDetail.waterSewageConnection,
                  },
                },
              }
            : undefined,
      },
      include: {
        customer: true,
        apartmentDetail: true,
        houseDetail: true,
        storeDetail: true,
        officeDetail: true,
        factoryWarehouseDetail: true,
        landDetail: true,
      },
    });

    return NextResponse.json(formatPropertyOutput(updatedProperty));
  } catch (error: any) {
    console.error('Error updating property:', error);
    return NextResponse.json(
      { error: error.message || '매물 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

