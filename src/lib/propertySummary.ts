import { PropertyItem, PROPERTY_TYPE_LABELS } from './types';
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
 * 매물 정보를 고객 및 중개사용 텍스트 브리핑 형식으로 생성
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
