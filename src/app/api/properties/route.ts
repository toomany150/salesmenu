// src/app/api/properties/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { INITIAL_PROPERTIES } from '@/lib/mockData';

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

    return NextResponse.json(properties);
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
      detailAddress,
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

    const newProperty = await prisma.property.create({
      data: {
        propertyNumber,
        receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
        propertyType,
        status,
        transactionType,
        address,
        detailAddress,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        direction,
        directionCriteria,
        availableDate: availableDate ? new Date(availableDate) : null,
        price: price ? parseFloat(price) : null,
        deposit: deposit ? parseFloat(deposit) : null,
        monthlyRent: monthlyRent ? parseFloat(monthlyRent) : null,
        consultationNotes,
        landArea: landArea ? parseFloat(landArea) : null,
        totalFloorArea: totalFloorArea ? parseFloat(totalFloorArea) : null,
        approvalDate: approvalDate ? new Date(approvalDate) : null,
        buildingRegisterUse,
        customerId: customerId || null,
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
                  approvalDate: storeDetail.approvalDate ? new Date(storeDetail.approvalDate) : null,
                  parkingCount: storeDetail.parkingCount ? parseInt(storeDetail.parkingCount, 10) : null,
                  monthlyRentVat: !!storeDetail.monthlyRentVat,
                  premium: storeDetail.premium ? parseFloat(storeDetail.premium) : null,
                  maintenanceFee: storeDetail.maintenanceFee ? parseFloat(storeDetail.maintenanceFee) : null,
                  maintenanceFeeVat: !!storeDetail.maintenanceFeeVat,
                  adminActionChecked: storeDetail.adminActionChecked,
                  violationBuilding: storeDetail.violationBuilding,
                  operationPeriod: storeDetail.operationPeriod,
                  contractPeriod: storeDetail.contractPeriod,
                  parkingRequirement: storeDetail.parkingRequirement,
                  businessRegistrationStatus: storeDetail.businessRegistrationStatus,
                  rentIncreaseStatus: storeDetail.rentIncreaseStatus,
                  advertisementStatus: storeDetail.advertisementStatus,
                  tableCountHall: storeDetail.tableCountHall ? parseInt(storeDetail.tableCountHall, 10) : null,
                  tableCountRoom: storeDetail.tableCountRoom ? parseInt(storeDetail.tableCountRoom, 10) : null,
                  employeeCount: storeDetail.employeeCount ? parseInt(storeDetail.employeeCount, 10) : null,
                  dailyRevenue: storeDetail.dailyRevenue ? parseFloat(storeDetail.dailyRevenue) : null,
                  equipmentStatus: storeDetail.equipmentStatus,
                  liquorLoan: storeDetail.liquorLoan,
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
                  approvalDate: officeDetail.approvalDate ? new Date(officeDetail.approvalDate) : null,
                  parkingCount: officeDetail.parkingCount ? parseInt(officeDetail.parkingCount, 10) : null,
                  monthlyRentVat: !!officeDetail.monthlyRentVat,
                  maintenanceFee: officeDetail.maintenanceFee ? parseFloat(officeDetail.maintenanceFee) : null,
                  maintenanceFeeVat: !!officeDetail.maintenanceFeeVat,
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

    return NextResponse.json(newProperty, { status: 201 });
  } catch (error: any) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { error: error.message || '매물 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
