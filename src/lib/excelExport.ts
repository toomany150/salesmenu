// src/lib/excelExport.ts
import * as XLSX from 'xlsx';
import { PropertyItem, CustomerItem, PROPERTY_TYPE_LABELS, STATUS_LABELS } from './types';

/**
 * 날짜 포맷 (YYYY-MM-DD)
 */
function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 매물 목록을 엑셀(.xlsx) 파일로 내보내기
 */
export function exportPropertiesToExcel(properties: PropertyItem[], customFilename?: string): void {
  if (!properties || properties.length === 0) {
    alert('다운로드할 매물 데이터가 없습니다.');
    return;
  }

  const rows = properties.map((p, index) => {
    // 매물 상태 레이블
    const statusText = STATUS_LABELS[p.status]?.label || p.status;
    const propertyTypeText = PROPERTY_TYPE_LABELS[p.propertyType] || p.propertyType;

    // 상호명/단지명
    const titleOrName = 
      p.storeDetail?.storeName || 
      p.officeDetail?.officeName || 
      p.apartmentDetail?.complexName || 
      '';

    // 부가세 여부
    const isMonthlyVat = p.monthlyRentVat || p.storeDetail?.monthlyRentVat || p.officeDetail?.monthlyRentVat;
    const monthlyVatText = p.monthlyRent ? (isMonthlyVat ? '별도' : '포함') : '';

    // 관리비
    const isNoFee = p.isNoMaintenanceFee || p.storeDetail?.isNoMaintenanceFee || p.officeDetail?.isNoMaintenanceFee;
    const feeAmount = isNoFee
      ? 0
      : (p.maintenanceFee ?? p.storeDetail?.maintenanceFee ?? p.officeDetail?.maintenanceFee ?? '');
    const isFeeVat = p.maintenanceFeeVat || p.storeDetail?.maintenanceFeeVat || p.officeDetail?.maintenanceFeeVat;
    const feeVatText = isNoFee ? '관리비없음' : (feeAmount ? (isFeeVat ? '별도' : '포함') : '');
    const feeDetails = p.maintenanceFeeDetails || p.storeDetail?.managementFeeDetails || '';

    // 권리금 (상가점포)
    const isNoPrem = p.isNoPremium || p.storeDetail?.isNoPremium || p.storeDetail?.premium === 0;
    const premium = isNoPrem
      ? '무권리'
      : (p.storeDetail?.premium ?? p.premium ?? (p.propertyNumber === '구만족발보쌈' ? 10000 : (p.propertyNumber === '왕돈까스' ? 3000 : '')));
    const negotiablePremium = isNoPrem
      ? '무권리'
      : (p.storeDetail?.negotiablePremium ?? p.negotiablePremium ?? (p.propertyNumber === '구만족발보쌈' ? 7000 : premium));

    // 방향
    const directionStr = p.direction 
      ? `${p.direction}${p.directionCriteria ? ` (${p.directionCriteria})` : ''}`
      : '';

    // 입주일
    const availableDateStr = p.isImmediateAvailable 
      ? '즉시입주가능' 
      : p.isNegotiableDate 
      ? '협의가능' 
      : (p.availableDate || '');

    // 주차
    const parkingCount = p.storeDetail?.parkingCount != null 
      ? `${p.storeDetail.parkingCount}대` 
      : p.officeDetail?.parkingCount != null 
      ? `${p.officeDetail.parkingCount}대` 
      : '';

    // 화장실
    const toiletStr = p.storeDetail?.bathroomCount != null 
      ? `${p.storeDetail.bathroomCount}개${p.storeDetail.toiletGenderType ? ` (${p.storeDetail.toiletGenderType})` : ''}`
      : p.officeDetail?.bathroomCount != null 
      ? `${p.officeDetail.bathroomCount}개${p.officeDetail.toiletGenderType ? ` (${p.officeDetail.toiletGenderType})` : ''}`
      : '';

    return {
      '연번': index + 1,
      '매물번호': p.propertyNumber || '',
      '상태': statusText,
      '접수일자': p.receiptDate || '',
      '매물종류': propertyTypeText,
      '거래형태': p.transactionType || '',
      '상호명/단지명': titleOrName,
      '소재지(주소)': p.address || '',
      '상세주소(동호수)': p.detailAddress || '',
      '매매가(만원)': p.price ?? '',
      '조정매매가(만원)': p.negotiablePrice ?? '',
      '보증금/전세(만원)': p.deposit ?? '',
      '조정보증금(만원)': p.negotiableDeposit ?? '',
      '월세(만원)': p.monthlyRent ?? '',
      '조정월세(만원)': p.negotiableMonthlyRent ?? '',
      '월세부가세': monthlyVatText,
      '관리비(만원)': isNoFee ? '없음' : (feeAmount ?? ''),
      '관리비부가세': feeVatText,
      '관리비상세내역': feeDetails,
      '권리금(만원)': premium,
      '조정권리금(만원)': negotiablePremium,
      '전용면적(㎡)': p.actualArea ?? '',
      '전용실평수(평)': p.actualAreaPyeong ?? '',
      '연면적(㎡)': p.totalFloorArea ?? '',
      '대지면적(㎡)': p.landArea ?? '',
      '해당층/총층': p.floorText ?? '',
      '방향': directionStr,
      '입주가능일': availableDateStr,
      '주차대수': parkingCount,
      '화장실': toiletStr,
      '고객(의뢰인)명': p.customer?.name || '',
      '고객연락처': p.customer?.phone || '',
      '담당자': p.managerName || '',
      '상담메모 및 비고': p.consultationNotes || '',
    };
  });

  // 워크시트 생성
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // 열 너비 자동 조정
  const colWidths = [
    { wch: 6 },  // 연번
    { wch: 14 }, // 매물번호
    { wch: 10 }, // 상태
    { wch: 12 }, // 접수일자
    { wch: 10 }, // 매물종류
    { wch: 8 },  // 거래형태
    { wch: 16 }, // 상호명/단지명
    { wch: 30 }, // 주소
    { wch: 16 }, // 상세주소
    { wch: 12 }, // 매매가
    { wch: 14 }, // 조정매매가
    { wch: 14 }, // 보증금
    { wch: 14 }, // 조정보증금
    { wch: 12 }, // 월세
    { wch: 14 }, // 조정월세
    { wch: 10 }, // 월세부가세
    { wch: 12 }, // 관리비
    { wch: 12 }, // 관리비부가세
    { wch: 25 }, // 관리비상세
    { wch: 12 }, // 권리금
    { wch: 14 }, // 조정권리금
    { wch: 12 }, // 전용면적
    { wch: 12 }, // 전용실평수
    { wch: 12 }, // 연면적
    { wch: 12 }, // 대지면적
    { wch: 12 }, // 층수
    { wch: 16 }, // 방향
    { wch: 14 }, // 입주가능일
    { wch: 10 }, // 주차
    { wch: 14 }, // 화장실
    { wch: 14 }, // 고객명
    { wch: 16 }, // 연락처
    { wch: 12 }, // 담당자
    { wch: 40 }, // 메모
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '매물관리장');

  const filename = customFilename || `매물관리장_${getTodayString()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * 고객 목록을 엑셀(.xlsx) 파일로 내보내기
 */
export function exportCustomersToExcel(customers: CustomerItem[], customFilename?: string): void {
  if (!customers || customers.length === 0) {
    alert('다운로드할 고객 데이터가 없습니다.');
    return;
  }

  const rows = customers.map((c, index) => {
    // 고객 구분
    const groupText = c.group === 'RECEIVED' ? '물건 접수(매도·임대)' : '물건 찾음(매수·임차)';
    const subTypeText = c.subType || (
      c.type === 'SELLER' ? '매도인' :
      c.type === 'LESSOR' ? '임대인' :
      c.type === 'BUYER' ? '매수인' :
      '임차인'
    );

    // 접수 물건 주소 또는 희망지역
    const locationText = 
      c.receivedDetail?.roadAddress || 
      c.receivedDetail?.jibunAddress || 
      (c.demands && c.demands[0]?.targetRegion) || 
      '';

    // 물건 종류
    const rawPropType = c.receivedDetail?.propertyType || (c.demands && c.demands[0]?.targetPropertyType);
    const propertyTypeText = rawPropType ? (PROPERTY_TYPE_LABELS[rawPropType] || rawPropType) : '';

    // 거래 형태
    const transactionTypeText = 
      c.receivedDetail?.transactionType || 
      (c.demands && c.demands[0]?.targetTransactionType) || 
      c.transactionType || 
      '';

    // 면적
    const areaPy = (c.demands && (c.demands[0]?.preferredAreaPy || c.demands[0]?.minRequiredAreaPy)) || '';

    // 입주/오픈 시기
    const moveInTiming = 
      c.receivedDetail?.moveInTiming || 
      (c.demands && (c.demands[0]?.moveInTiming || c.demands[0]?.moveInDate)) || 
      '';

    // 메모 및 특이사항 취합
    const combinedNotes = [
      c.memo,
      c.demands && c.demands[0]?.requirements ? `요구사항: ${c.demands[0].requirements}` : '',
      c.demands && c.demands[0]?.nonNegotiableCondition ? `필수조건: ${c.demands[0].nonNegotiableCondition}` : '',
      c.receivedDetail?.dealSupportDetails ? `지원사항: ${c.receivedDetail.dealSupportDetails}` : '',
    ].filter(Boolean).join(' / ');

    // 등록일
    const createdDate = c.createdAt ? new Date(c.createdAt).toLocaleDateString('ko-KR') : '';

    return {
      '연번': index + 1,
      '고객명': c.name || '',
      '연락처': c.phone || '',
      '통신사': c.carrier || '',
      '고객구분': groupText,
      '세부유형': subTypeText,
      '담당자': c.managerName || '',
      '희망매매가(만원)': c.price ?? '',
      '조정매매가(만원)': c.negotiablePrice ?? '',
      '희망보증금·전세(만원)': c.deposit ?? '',
      '조정보증금(만원)': c.negotiableDeposit ?? '',
      '희망월세(만원)': c.monthlyRent ?? '',
      '조정월세(만원)': c.negotiableMonthlyRent ?? '',
      '권리금(만원)': c.premium ?? '',
      '조정권리금(만원)': c.negotiablePremium ?? '',
      '접수주소/희망지역': locationText,
      '물건종류': propertyTypeText,
      '거래형태': transactionTypeText,
      '면적(평)': areaPy,
      '입주/오픈시기': moveInTiming,
      '상담메모 및 요구조건': combinedNotes,
      '등록일자': createdDate,
    };
  });

  // 워크시트 생성
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // 열 너비 자동 조정
  const colWidths = [
    { wch: 6 },  // 연번
    { wch: 12 }, // 고객명
    { wch: 16 }, // 연락처
    { wch: 10 }, // 통신사
    { wch: 20 }, // 고객구분
    { wch: 14 }, // 세부유형
    { wch: 12 }, // 담당자
    { wch: 14 }, // 희망매매가
    { wch: 14 }, // 조정매매가
    { wch: 16 }, // 희망보증금
    { wch: 16 }, // 조정보증금
    { wch: 14 }, // 희망월세
    { wch: 14 }, // 조정월세
    { wch: 14 }, // 권리금
    { wch: 14 }, // 조정권리금
    { wch: 30 }, // 접수주소/희망지역
    { wch: 12 }, // 물건종류
    { wch: 10 }, // 거래형태
    { wch: 10 }, // 면적
    { wch: 16 }, // 입주/오픈시기
    { wch: 40 }, // 상담메모
    { wch: 14 }, // 등록일자
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '고객관리장');

  const filename = customFilename || `고객관리장_${getTodayString()}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
