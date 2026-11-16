import { PropertyItem, PROPERTY_TYPE_LABELS, STATUS_LABELS } from './types';
import { BROKER_OFFICE_INFO } from './kakao';

export interface PropertySummaryOptions {
  includeFullAddress?: boolean; // true: 전체 주소(도로명/지번/상세), false: 동까지만 공개
  includeBrokerInfo?: boolean; // 중개사무소 정보 포함 여부
}

/**
 * 숫자를 한국어 억/만원 단위로 변환 (예: 15000 -> 1억 5,000만원, 500 -> 500만원)
 */
export function formatKoreanMoney(amountInTenThousand?: number): string {
  if (amountInTenThousand === undefined || amountInTenThousand === null) return '';
  if (amountInTenThousand === 0) return '0원';

  const eok = Math.floor(amountInTenThousand / 10000);
  const man = amountInTenThousand % 10000;

  if (eok > 0 && man > 0) {
    return `${eok}억 ${man.toLocaleString()}만원`;
  } else if (eok > 0) {
    return `${eok}억원`;
  }
  return `${man.toLocaleString()}만원`;
}

/**
 * 1. 매물 기본 요약 (고객 안내 및 브리핑용)
 */
export function generatePropertyTextSummary(
  property: PropertyItem,
  options: PropertySummaryOptions = { includeFullAddress: true, includeBrokerInfo: true }
): string {
  const p = property as any;
  const propType = PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType;
  const txType = property.transactionType || '월세';
  const propNumber = property.propertyNumber || property.id || '';

  // 1. 매물명 결정
  const originalName =
    p.storeDetail?.storeName ||
    p.apartmentDetail?.complexName ||
    p.officeDetail?.officeName ||
    p.factoryWarehouseDetail?.companyName ||
    p.landDetail?.companyName ||
    '';
  const displayName = originalName ? `${originalName}` : `${propType} (${txType})`;

  // 2. 가격 계산
  const priceLines: string[] = [];
  if (txType === '매매') {
    const pVal = property.price ? `${formatKoreanMoney(property.price)} (${property.price.toLocaleString()}만)` : '협의';
    const negPVal = property.negotiablePrice ? ` (조정 희망: ${formatKoreanMoney(property.negotiablePrice)})` : '';
    priceLines.push(`■ 매매가: ${pVal}${negPVal}`);
  } else if (txType === '전세') {
    const depVal = property.deposit ? `${formatKoreanMoney(property.deposit)} (${property.deposit.toLocaleString()}만)` : '협의';
    const negDepVal = property.negotiableDeposit ? ` (조정 희망: ${formatKoreanMoney(property.negotiableDeposit)})` : '';
    priceLines.push(`■ 전세보증금: ${depVal}${negDepVal}`);
  } else {
    // 월세
    const depVal = property.deposit ? `${formatKoreanMoney(property.deposit)}` : '0원';
    const rentVal = property.monthlyRent ? `${formatKoreanMoney(property.monthlyRent)}` : '0원';
    const vat = property.monthlyRentVat || p.storeDetail?.monthlyRentVat || p.officeDetail?.monthlyRentVat ? ' (부가세 별도)' : ' (부가세 포함/면세)';
    priceLines.push(`■ 보증금 / 월세: ${depVal} / ${rentVal}${vat}`);

    if (property.negotiableDeposit || property.negotiableMonthlyRent) {
      const negD = property.negotiableDeposit ? `보 ${formatKoreanMoney(property.negotiableDeposit)}` : '';
      const negR = property.negotiableMonthlyRent ? `월 ${formatKoreanMoney(property.negotiableMonthlyRent)}` : '';
      priceLines.push(`■ 조정 희망 조건: ${[negD, negR].filter(Boolean).join(' / ')}`);
    }
  }

  // 상가 권리금
  if (property.propertyType === 'STORE' || p.storeDetail) {
    const isNoPrem = !!(p.storeDetail?.isNoPremium || property.isNoPremium || (p.storeDetail && p.storeDetail.premium === 0));
    if (isNoPrem) {
      priceLines.push(`■ 권리금: 없음 (무권리 점포)`);
    } else {
      const prem = p.storeDetail?.premium ?? property.premium;
      if (prem !== undefined && prem !== null) {
        const premStr = prem === 0 ? '없음 (무권리)' : `${formatKoreanMoney(prem)}`;
        const negPrem = p.storeDetail?.negotiablePremium ?? property.negotiablePremium;
        const negStr = negPrem ? ` (조정 희망: ${formatKoreanMoney(negPrem)})` : '';
        priceLines.push(`■ 권리금: ${premStr}${negStr}`);
      }
    }
  }

  // 관리비
  if (property.isNoMaintenanceFee) {
    priceLines.push(`■ 관리비: 없음`);
  } else if (property.maintenanceFee) {
    const mFee = `${property.maintenanceFee.toLocaleString()}만원`;
    const details = property.maintenanceFeeDetails ? ` (${property.maintenanceFeeDetails})` : '';
    priceLines.push(`■ 관리비: ${mFee}${details}`);
  }

  // 3. 위치 / 주소
  let addressText = '';
  if (options.includeFullAddress) {
    const rAddr = property.roadAddress || property.address;
    const jAddr = property.jibunAddress ? ` (지번: ${property.jibunAddress})` : '';
    const dAddr = property.detailAddress ? ` ${property.detailAddress}` : '';
    addressText = `${rAddr}${dAddr}${jAddr}`;
  } else {
    // 동까지만 공개
    const full = property.jibunAddress || property.address || '';
    const m = full.match(/([가-힣]+[시|군|구])\s+([가-힣\d]+[동|읍|면|리])/);
    addressText = m ? `${m[1]} ${m[2]} 인근 (유선 상담 시 상세 안내)` : '유선 상담 시 상세 위치 안내';
  }

  // 4. 면적 정보
  const areaLines: string[] = [];
  const actualArea = property.actualArea || p.storeDetail?.actualArea || p.houseDetail?.actualArea || p.officeDetail?.actualArea;
  const actualPy = property.actualAreaPyeong || p.storeDetail?.actualAreaPyeong || p.houseDetail?.actualAreaPyeong || p.officeDetail?.actualAreaPyeong || (actualArea ? +(actualArea * 0.3025).toFixed(1) : undefined);
  const bldArea = property.buildingArea || p.storeDetail?.buildingArea || p.houseDetail?.buildingArea || p.officeDetail?.buildingArea;
  const bldPy = bldArea ? +(bldArea * 0.3025).toFixed(1) : undefined;
  const landArea = property.landArea || p.houseDetail?.landArea || p.landDetail?.landArea;
  const landPy = landArea ? +(landArea * 0.3025).toFixed(1) : undefined;
  const totFloorArea = property.totalFloorArea || p.houseDetail?.totalFloorArea;
  const totFloorPy = totFloorArea ? +(totFloorArea * 0.3025).toFixed(1) : undefined;

  if (actualArea) {
    areaLines.push(`전용(실평수): ${actualArea}㎡ (${actualPy}평)`);
  }
  if (bldArea && bldArea !== actualArea) {
    areaLines.push(`공용/대장면적: ${bldArea}㎡ (${bldPy}평)`);
  }
  if (landArea) {
    areaLines.push(`대지면적: ${landArea}㎡ (${landPy}평)`);
  }
  if (totFloorArea && totFloorArea !== bldArea) {
    areaLines.push(`연면적: ${totFloorArea}㎡ (${totFloorPy}평)`);
  }

  // 5. 층수
  const curFloor = property.floorText || p.storeDetail?.currentFloor || p.houseDetail?.currentFloor || p.officeDetail?.currentFloor || (p.floorCount ? `지상 ${p.floorCount}층` : '');
  const totFloors = p.storeDetail?.totalFloors || p.houseDetail?.totalFloors || p.officeDetail?.totalFloors || p.floorCount;
  const floorLine = curFloor ? (totFloors ? `${curFloor} (총 ${totFloors}층)` : curFloor) : (totFloors ? `총 ${totFloors}층` : '');

  // 6. 공적장부 스펙 (용도지역, 주용도, 주구조, 사용승인일)
  const zoning = property.zoningArea || p.storeDetail?.zoningArea || p.houseDetail?.zoningArea || p.officeDetail?.zoningArea || p.landDetail?.zoningArea;
  const use = property.buildingRegisterUse || p.storeDetail?.buildingUse || p.houseDetail?.buildingUse || p.officeDetail?.buildingUse;
  const structure = property.structureName || p.storeDetail?.structure || p.houseDetail?.structure || p.officeDetail?.structure;
  const approvalDate = property.approvalDate || p.storeDetail?.approvalDate || p.houseDetail?.approvalDate || p.officeDetail?.approvalDate;

  // 7. 시설/옵션/특징
  const features: string[] = [];
  if (property.direction) features.push(`방향: ${property.direction}`);
  if (property.availableDate || property.isImmediateAvailable) {
    features.push(`입주: ${property.isImmediateAvailable ? '즉시입주 가능' : property.availableDate}`);
  }
  if (p.storeDetail?.currentBusiness) features.push(`현재업종: ${p.storeDetail.currentBusiness}`);
  if (p.storeDetail?.recommendedBusiness) features.push(`추천업종: ${p.storeDetail.recommendedBusiness}`);
  if (p.storeDetail?.tableCount) features.push(`테이블수: ${p.storeDetail.tableCount}개`);
  if (p.storeDetail?.parkingDetails) features.push(`주차: ${p.storeDetail.parkingDetails}`);
  if (p.storeDetail?.toiletDetails) features.push(`화장실: ${p.storeDetail.toiletDetails}`);
  if (p.storeDetail?.facilitiesSummary) features.push(`내부시설: ${p.storeDetail.facilitiesSummary}`);
  if (p.apartmentDetail?.roomCount || p.houseDetail?.roomCount) {
    const rc = p.apartmentDetail?.roomCount || p.houseDetail?.roomCount;
    const bc = p.apartmentDetail?.bathroomCount || p.houseDetail?.bathroomCount;
    features.push(`구조: 방 ${rc}개 / 욕실 ${bc || 1}개`);
  }
  if (p.apartmentDetail?.parkingPerHousehold) features.push(`세대당 주차: ${p.apartmentDetail.parkingPerHousehold}`);

  // 8. 임대차 현황 (상가주택/다가구 매매 등)
  const leaseList = p.houseDetail?.leaseStatusList || p.storeDetail?.leaseStatusList || [];
  const leaseSummaries: string[] = [];
  if (Array.isArray(leaseList) && leaseList.length > 0) {
    leaseList.forEach((it: any) => {
      if (it.floorHo) {
        const rentInfo = it.isVacant ? '공실' : `보${it.deposit || 0}만/월${it.monthlyRent || 0}만`;
        leaseSummaries.push(` · ${it.floorHo}: ${rentInfo}`);
      }
    });
  }

  // 조립하기
  const lines: string[] = [
    `[${BROKER_OFFICE_INFO.officeName} 매물 요약]`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `■ 매물번호: #${propNumber}`,
    `■ 접수일자: ${property.receiptDate ? property.receiptDate.substring(0, 10) : '최근'}`,
    `■ 매물명: ${displayName}`,
    `■ 매물구분: ${propType} (${txType})`,
    ...priceLines,
    `■ 소재지: ${addressText}`,
  ];

  if (areaLines.length > 0) {
    lines.push(`■ 면적: ${areaLines.join(' / ')}`);
  }
  if (floorLine) {
    lines.push(`■ 해당층/총층: ${floorLine}`);
  }
  if (use) {
    lines.push(`■ 대장상 주용도: ${use}`);
  }
  if (zoning) {
    lines.push(`■ 용도지역: ${zoning}`);
  }
  if (structure) {
    lines.push(`■ 건축물 주구조: ${structure}`);
  }
  if (approvalDate) {
    lines.push(`■ 사용승인일: ${approvalDate.substring(0, 10)}`);
  }
  if (features.length > 0) {
    lines.push(`■ 매물 주요정보: ${features.join(' · ')}`);
  }
  if (leaseSummaries.length > 0) {
    lines.push(`■ 층별 임대차 현황:`);
    lines.push(...leaseSummaries);
  }
  if (property.consultationNotes) {
    lines.push(`■ 특이사항: ${property.consultationNotes}`);
  }

  if (options.includeBrokerInfo) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`☎ 문의처: ${BROKER_OFFICE_INFO.officeName}`);
    lines.push(`📞 대표전화: ${BROKER_OFFICE_INFO.tel} (${BROKER_OFFICE_INFO.officeTel || ''})`);
    lines.push(`🏢 사무소 위치: ${BROKER_OFFICE_INFO.address}`);
    lines.push(`문의주시면 친절하고 정확하게 상담해 드리겠습니다.`);
  }

  return lines.join('\n');
}

/**
 * 2. 매물 전부 요약 (등록했던 모든 내용 + 의뢰인/소유자 + 상담내용 포함)
 */
export function generateFullPropertyDetailsSummary(
  property: PropertyItem,
  options: PropertySummaryOptions = { includeFullAddress: true, includeBrokerInfo: true }
): string {
  const p = property as any;
  const propType = PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType;
  const txType = property.transactionType || '월세';
  const propNumber = property.propertyNumber || property.id || '';
  const lines: string[] = [];

  const originalName =
    p.storeDetail?.storeName ||
    p.apartmentDetail?.complexName ||
    p.officeDetail?.officeName ||
    p.factoryWarehouseDetail?.companyName ||
    p.landDetail?.companyName ||
    '';
  const displayName = originalName ? `${originalName}` : `${propType} (${txType})`;

  lines.push(`========================================`);
  lines.push(`[${BROKER_OFFICE_INFO.officeName} 매물 전체 등록 대장 (전부 요약)]`);
  lines.push(`========================================`);

  // 1. 기본 접수 정보
  lines.push(`【1. 기본 접수 정보】`);
  lines.push(` · 관리 매물번호: #${propNumber}`);
  lines.push(` · 매물명: ${displayName}`);
  lines.push(` · 접수일자: ${property.receiptDate ? property.receiptDate.substring(0, 10) : '미지정'}`);
  lines.push(` · 매물종류: ${propType}`);
  lines.push(` · 거래유형: ${txType}`);
  lines.push(` · 진행상태: ${STATUS_LABELS[property.status]?.label || property.status || '접수/진행중'}`);
  if (property.inflowPath) lines.push(` · 접수경로: ${property.inflowPath}`);
  if (property.managerName) lines.push(` · 담당 매니저: ${property.managerName}`);
  if (property.assignedAgents && property.assignedAgents.length > 0) {
    lines.push(` · 공동 지정 권한자: ${property.assignedAgents.join(', ')}`);
  }

  // 2. 의뢰 고객 및 등기부상 소유자 정보
  lines.push(``);
  lines.push(`【2. 의뢰인 및 등기부상 소유자 정보】`);
  if (property.customer) {
    const custCarrier = property.customer.carrier ? ` (${property.customer.carrier})` : '';
    const custType = property.customer.type ? ` [${property.customer.type}]` : '';
    lines.push(` · 접수 의뢰고객: ${property.customer.name || '미등록'} / 연락처: ${property.customer.phone || '없음'}${custCarrier}${custType}`);
  } else if (p.customerName || p.customerPhone) {
    lines.push(` · 접수 의뢰고객: ${p.customerName || '미등록'} / 연락처: ${p.customerPhone || '없음'}`);
  } else {
    lines.push(` · 접수 의뢰고객: 기본 등록 고객`);
  }

  if (property.ownerName || property.ownerPhone) {
    const ownerCarrier = property.ownerCarrier ? ` (${property.ownerCarrier})` : '';
    lines.push(` · 등기부상 소유자: ${property.ownerName || '미등록'} / 연락처: ${property.ownerPhone || '없음'}${ownerCarrier}`);
  } else if (property.ownerSameAsCustomer) {
    lines.push(` · 등기부상 소유자: 의뢰 고객과 동일`);
  }

  // 3. 소재지 및 위치
  lines.push(``);
  lines.push(`【3. 소재지 및 위치 정보】`);
  if (options.includeFullAddress) {
    if (property.roadAddress) lines.push(` · 도로명 주소: ${property.roadAddress}`);
    if (property.jibunAddress) lines.push(` · 지번 주소: ${property.jibunAddress}`);
    if (property.detailAddress) lines.push(` · 상세 주소: ${property.detailAddress}`);
    if (!property.roadAddress && !property.jibunAddress) lines.push(` · 주소: ${property.address}`);
  } else {
    const full = property.jibunAddress || property.address || '';
    const m = full.match(/([가-힣]+[시|군|구])\s+([가-힣\d]+[동|읍|면|리])/);
    lines.push(` · 주소: ${m ? `${m[1]} ${m[2]} 인근 (보안 모드)` : '동까지만 표시'}`);
  }

  // 4. 가격 조건 및 금융 / 권리분석
  lines.push(``);
  lines.push(`【4. 가격 조건 및 금융 / 권리분석】`);
  if (txType === '매매') {
    lines.push(` · 매매가: ${property.price ? `${formatKoreanMoney(property.price)} (${property.price.toLocaleString()}만원)` : '협의'}`);
    if (property.negotiablePrice) {
      lines.push(` · 조정 희망 매매가: ${formatKoreanMoney(property.negotiablePrice)} (${property.negotiablePrice.toLocaleString()}만원)`);
    }
  } else if (txType === '전세') {
    lines.push(` · 전세보증금: ${property.deposit ? `${formatKoreanMoney(property.deposit)} (${property.deposit.toLocaleString()}만원)` : '협의'}`);
    if (property.negotiableDeposit) {
      lines.push(` · 조정 희망 전세금: ${formatKoreanMoney(property.negotiableDeposit)} (${property.negotiableDeposit.toLocaleString()}만원)`);
    }
  } else {
    // 월세
    const dep = property.deposit ? `${formatKoreanMoney(property.deposit)}` : '0원';
    const rent = property.monthlyRent ? `${formatKoreanMoney(property.monthlyRent)}` : '0원';
    const vat = (property.monthlyRentVat || p.storeDetail?.monthlyRentVat || p.officeDetail?.monthlyRentVat) ? ' (부가세 별도)' : ' (부가세 포함/면세)';
    lines.push(` · 보증금 / 월세: ${dep} / ${rent}${vat}`);
    if (property.negotiableDeposit || property.negotiableMonthlyRent) {
      lines.push(` · 조정 희망 조건: 보증금 ${property.negotiableDeposit ? formatKoreanMoney(property.negotiableDeposit) : '협의'} / 월세 ${property.negotiableMonthlyRent ? formatKoreanMoney(property.negotiableMonthlyRent) : '협의'}`);
    }
  }

  // 상가 권리금
  const prem = p.storeDetail?.premium ?? property.premium;
  const isNoPrem = !!(p.storeDetail?.isNoPremium || property.isNoPremium || (prem === 0));
  if (isNoPrem) {
    lines.push(` · 권리금: 없음 (무권리 점포)`);
  } else if (prem !== undefined && prem !== null) {
    const negPrem = p.storeDetail?.negotiablePremium ?? property.negotiablePremium;
    const negPremStr = negPrem ? ` (조정 희망: ${formatKoreanMoney(negPrem)})` : '';
    lines.push(` · 권리금: ${formatKoreanMoney(prem)}${negPremStr}`);
  }

  // 관리비
  if (property.isNoMaintenanceFee || p.storeDetail?.isNoMaintenanceFee || p.officeDetail?.isNoMaintenanceFee) {
    lines.push(` · 관리비: 없음`);
  } else if (property.maintenanceFee || p.storeDetail?.maintenanceFee || p.officeDetail?.maintenanceFee) {
    const mFee = (property.maintenanceFee || p.storeDetail?.maintenanceFee || p.officeDetail?.maintenanceFee || 0).toLocaleString();
    const details = property.maintenanceFeeDetails || p.storeDetail?.managementFeeDetails || '';
    const vat = (property.maintenanceFeeVat || p.storeDetail?.maintenanceFeeVat || p.officeDetail?.maintenanceFeeVat) ? ' (부가세 별도)' : '';
    lines.push(` · 관리비: ${mFee}만원${vat}${details ? ` (세부내역: ${details})` : ''}`);
  }

  // 시세 및 대출/근저당
  const collateral = property.collateral || p.storeDetail?.collateral;
  const purchasePrice = property.purchasePrice || p.storeDetail?.purchasePrice;
  const curMarket = property.currentMarketPrice || p.storeDetail?.currentMarketPrice;
  const marketBasis = property.marketPriceBasis || p.storeDetail?.marketPriceBasis;
  if (collateral) lines.push(` · 대출/근저당: ${collateral}`);
  if (purchasePrice) lines.push(` · 매수가액: ${purchasePrice}`);
  if (curMarket) lines.push(` · 현시세: ${curMarket}`);
  if (marketBasis) lines.push(` · 현시세 산정기준: ${marketBasis}`);

  // 5. 면적 및 층수 / 건물 스펙
  lines.push(``);
  lines.push(`【5. 면적 및 층수 스펙】`);
  const actualArea = property.actualArea || p.storeDetail?.actualArea || p.houseDetail?.actualArea || p.officeDetail?.actualArea;
  const actualPy = property.actualAreaPyeong || p.storeDetail?.actualAreaPyeong || p.houseDetail?.actualAreaPyeong || p.officeDetail?.actualAreaPyeong || (actualArea ? +(actualArea * 0.3025).toFixed(1) : undefined);
  const bldArea = property.buildingArea || p.storeDetail?.buildingArea || p.houseDetail?.buildingArea || p.officeDetail?.buildingArea;
  const bldPy = bldArea ? +(bldArea * 0.3025).toFixed(1) : undefined;
  const landArea = property.landArea || p.houseDetail?.landArea || p.landDetail?.landArea;
  const landPy = landArea ? +(landArea * 0.3025).toFixed(1) : undefined;
  const totFloorArea = property.totalFloorArea || p.houseDetail?.totalFloorArea;
  const totFloorPy = totFloorArea ? +(totFloorArea * 0.3025).toFixed(1) : undefined;

  if (actualArea) lines.push(` · 실평수 (전용면적): ${actualArea}㎡ (${actualPy}평)`);
  if (bldArea) lines.push(` · 대장상 면적 (공용/건축): ${bldArea}㎡ (${bldPy}평)`);
  if (landArea) lines.push(` · 대지면적: ${landArea}㎡ (${landPy}평)`);
  if (totFloorArea) lines.push(` · 연면적: ${totFloorArea}㎡ (${totFloorPy}평)`);

  const curFloor = property.floorText || p.storeDetail?.currentFloor || p.houseDetail?.currentFloor || p.officeDetail?.currentFloor || (p.floorCount ? `지상 ${p.floorCount}층` : '');
  const totFloors = p.storeDetail?.totalFloors || p.houseDetail?.totalFloors || p.officeDetail?.totalFloors || p.floorCount;
  const underFloors = p.underFloorCount ? ` / 지하 ${p.underFloorCount}층` : '';
  lines.push(` · 층수: 해당층 ${curFloor || '미지정'} (총 ${totFloors || 0}층${underFloors})`);

  if (property.direction) {
    const dirCrit = property.directionCriteria ? ` (${property.directionCriteria})` : '';
    lines.push(` · 방향: ${property.direction}${dirCrit}`);
  }
  if (property.availableDate || property.isImmediateAvailable || property.isNegotiableDate) {
    const avail = property.isImmediateAvailable ? '즉시입주 가능' : (property.availableDate || '협의');
    const nego = property.isNegotiableDate ? ' (입주일 협의 가능)' : '';
    lines.push(` · 입주가능일: ${avail}${nego}`);
  }

  // 6. 건축물대장 및 공적장부
  lines.push(``);
  lines.push(`【6. 건축물대장 및 공적장부 정보】`);
  const zoning = property.zoningArea || p.storeDetail?.zoningArea || p.houseDetail?.zoningArea || p.officeDetail?.zoningArea || p.landDetail?.zoningArea;
  const use = property.buildingRegisterUse || p.storeDetail?.buildingUse || p.houseDetail?.buildingUse || p.officeDetail?.buildingUse;
  const structure = property.structureName || p.storeDetail?.structure || p.houseDetail?.structure || p.officeDetail?.structure;
  const approvalDate = property.approvalDate || p.storeDetail?.approvalDate || p.houseDetail?.approvalDate || p.officeDetail?.approvalDate;

  if (use) lines.push(` · 대장상 주용도: ${use}`);
  if (zoning) lines.push(` · 용도지역: ${zoning}`);
  if (structure) lines.push(` · 건축물 주구조: ${structure}`);
  if (approvalDate) lines.push(` · 사용승인일: ${approvalDate.substring(0, 10)}`);

  const parking = p.parkingCount ?? p.storeDetail?.parkingCount ?? p.houseDetail?.parkingCount ?? p.officeDetail?.parkingCount;
  const isNoParking = p.storeDetail?.isParkingImpossible || p.officeDetail?.isParkingImpossible;
  if (isNoParking) {
    lines.push(` · 주차: 주차 불가`);
  } else if (parking !== undefined && parking !== null) {
    const perHouse = p.apartmentDetail?.parkingPerHousehold ? ` (세대당 ${p.apartmentDetail.parkingPerHousehold})` : '';
    lines.push(` · 주차대수: 총 ${parking}대${perHouse}`);
  }

  const elevator = p.officeDetail?.hasElevator || p.apartmentDetail?.elevatorCount;
  if (elevator) {
    const passCount = p.officeDetail?.elevatorPassengerCount ? `승객용 ${p.officeDetail.elevatorPassengerCount}대` : '';
    const freightCount = p.officeDetail?.elevatorFreightCount ? `화물용 ${p.officeDetail.elevatorFreightCount}대` : '';
    const elevInfo = [passCount, freightCount].filter(Boolean).join(', ') || '있음';
    lines.push(` · 엘리베이터: ${elevInfo}`);
  }

  const roomCount = p.apartmentDetail?.roomCount || p.houseDetail?.roomCount || p.storeDetail?.roomCount || p.officeDetail?.roomCount;
  const bathCount = p.apartmentDetail?.bathroomCount || p.houseDetail?.bathroomCount || p.storeDetail?.bathroomCount || p.officeDetail?.bathroomCount;
  const toiletGender = p.storeDetail?.toiletGenderType || p.officeDetail?.toiletGenderType;
  if (roomCount || bathCount || toiletGender) {
    const rInfo = roomCount ? `방 ${roomCount}개` : '';
    const bInfo = bathCount ? `욕실 ${bathCount}개` : '';
    const tInfo = toiletGender ? `화장실 (${toiletGender})` : '';
    lines.push(` · 내부 공간: ${[rInfo, bInfo, tInfo].filter(Boolean).join(' / ')}`);
  }

  const heating = p.heatingType || p.apartmentDetail?.heatingType || p.houseDetail?.heatingType;
  if (heating) lines.push(` · 난방방식: ${heating}`);

  // 7. 업종별 특화 상세 및 운영 조건
  if (property.propertyType === 'STORE' || p.storeDetail) {
    const sd = p.storeDetail || {};
    lines.push(``);
    lines.push(`【7. 상가점포 세부 운영 및 점검 내역】`);
    if (sd.storeName) lines.push(` · 상호명: ${sd.storeName}`);
    if (sd.currentBusiness) lines.push(` · 현재업종: ${sd.currentBusiness}`);
    if (sd.recommendedBusiness) lines.push(` · 추천업종: ${sd.recommendedBusiness}`);
    if (sd.restrictedBusinessTypes) lines.push(` · 입점제한/안되는 업종: ${sd.restrictedBusinessTypes}`);
    if (sd.tableCount) lines.push(` · 테이블수: 총 ${sd.tableCount}개 (홀 ${sd.tableCountHall || 0} / 룸 ${sd.tableCountRoom || 0})`);
    if (sd.employeeCount) lines.push(` · 종업원수: ${sd.employeeCount}명`);
    if (sd.operationPeriod) lines.push(` · 영업기간: ${sd.operationPeriod}`);
    if (sd.contractYear) lines.push(` · 계약년도: ${sd.contractYear}`);
    if (sd.renewalPeriodRemain) lines.push(` · 계약갱신권 잔여: ${sd.renewalPeriodRemain}`);
    if (sd.violationBuilding) lines.push(` · 위반건축물 여부: ${sd.violationBuilding}`);
    if (sd.businessRegistrationStatus) lines.push(` · 사업자등록 여부: ${sd.businessRegistrationStatus}`);
    if (sd.operatorContractorMatch) lines.push(` · 명의일치 여부: ${sd.operatorContractorMatch}`);
    if (sd.liquorLoan) lines.push(` · 주류대출 여부: ${sd.liquorLoan}`);
    if (sd.administrativeDisposition) lines.push(` · 행정처분 이력: ${sd.administrativeDisposition}`);
    if (sd.electricityCapacity) lines.push(` · 전기용량: ${sd.electricityCapacity}kW (${sd.electricityType || '개별'})`);
    if (sd.waterType) lines.push(` · 수도: ${sd.waterType}`);
    if (sd.gasType) lines.push(` · 가스: ${sd.gasType}`);
    if (sd.isVacantStore) lines.push(` · 공실 점포 여부: 공실 상태`);
    if (sd.previousTenantLicenseRevoked) lines.push(` · 전세입자 영업허가 말소: ${sd.previousTenantLicenseRevoked}`);
    if (sd.previousTenantBizRegRevoked) lines.push(` · 전세입자 사업자등록 말소: ${sd.previousTenantBizRegRevoked}`);
    if (sd.rentIncreaseCondition) lines.push(` · 임대료 인상조건: ${sd.rentIncreaseCondition}`);
    if (sd.rentArrearsStatus) lines.push(` · 월세 연체 여부: ${sd.rentArrearsStatus}`);
    if (sd.storeAdStatus) lines.push(` · 점포 자체 광고여부: ${sd.storeAdStatus}`);
    if (sd.otherAgencyAdStatus) lines.push(` · 타부동산 광고여부: ${sd.otherAgencyAdStatus}`);
    if (sd.restorationTerms) lines.push(` · 원상복구 특약: ${sd.restorationTerms}`);
    if (sd.businessLicenseTransfer) lines.push(` · 인허가 승계: ${sd.businessLicenseTransfer}`);
    if (sd.equipmentRentalTransfer) lines.push(` · 비품/렌탈 승계: ${sd.equipmentRentalTransfer}`);
    if (sd.equipmentList) lines.push(` · 비품 목록: ${sd.equipmentList}`);
    if (sd.rentalList) lines.push(` · 렌탈 품목: ${sd.rentalList}`);
    if (sd.dailyRevenue || sd.monthlyRevenue) {
      lines.push(` · 매출 현황: 일매출 ${sd.dailyRevenue ? formatKoreanMoney(sd.dailyRevenue) : '-'} / 월매출 ${sd.monthlyRevenue ? formatKoreanMoney(sd.monthlyRevenue) : '-'}`);
    }
  }

  // 주택/아파트 옵션
  const opts = p.apartmentDetail?.optionsList || p.houseDetail?.optionsList || (p.apartmentDetail?.otherOptions ? [p.apartmentDetail.otherOptions] : []);
  if (opts.length > 0) {
    lines.push(``);
    lines.push(`【옵션 및 가전/설비 내역】`);
    lines.push(` · 옵션 목록: ${opts.join(', ')}`);
  }

  // 8. 층별/호수별 임대차 상세 현황
  const leaseList: any[] = p.houseDetail?.leaseStatusList || p.storeDetail?.leaseStatusList || [];
  if (Array.isArray(leaseList) && leaseList.length > 0) {
    lines.push(``);
    lines.push(`【8. 층별/호수별 임대차 상세 현황】`);
    leaseList.forEach((it, idx) => {
      const parts: string[] = [];
      if (it.floorHo) parts.push(`호실/층: ${it.floorHo}`);
      if (it.tenantName) parts.push(`상호/임차인: ${it.tenantName}`);
      parts.push(it.isVacant ? '공실' : `보증금 ${it.deposit || 0}만 / 월세 ${it.monthlyRent || 0}만`);
      if (it.contractStartDate) parts.push(`계약시작: ${it.contractStartDate}`);
      if (it.evictionPossible) parts.push(`명도여부: ${it.evictionPossible}`);
      lines.push(` · [${idx + 1}] ${parts.join(' | ')}`);
    });
  }

  // 9. 🔒 상담내용 및 매물 메모 (가장 중요한 요청 사항!)
  lines.push(``);
  lines.push(`【9. 🔒 상담내용 및 매물 메모 (비공개 특이사항)】`);
  if (property.consultationNotes && property.consultationNotes.trim()) {
    lines.push(property.consultationNotes.trim());
  } else {
    lines.push(`(등록된 상담내용 및 특이사항 메모가 없습니다)`);
  }

  // 10. 중개사무소 정보
  if (options.includeBrokerInfo) {
    lines.push(``);
    lines.push(`========================================`);
    lines.push(`■ 중개업소: ${BROKER_OFFICE_INFO.officeName} (대표: ${BROKER_OFFICE_INFO.ceoName})`);
    lines.push(`■ 대표전화: ${BROKER_OFFICE_INFO.tel} (${BROKER_OFFICE_INFO.officeTel || ''})`);
    lines.push(`■ 등록번호: ${BROKER_OFFICE_INFO.registrationNumber}`);
    lines.push(`■ 사무소 주소: ${BROKER_OFFICE_INFO.address}`);
    lines.push(`========================================`);
  }

  return lines.join('\n');
}
