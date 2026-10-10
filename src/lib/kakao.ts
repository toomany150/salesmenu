// src/lib/kakao.ts
// 카카오톡 공유 API (Kakao Link SDK) 연동 헬퍼

declare global {
  interface Window {
    Kakao: any;
  }
}

const DEFAULT_KAKAO_KEY = 'ab4074f3fc327e405a625fc856bee022';

export function getKakaoKey(): string {
  return process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || 
         process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || 
         DEFAULT_KAKAO_KEY;
}

export function initKakao(): boolean {
  if (typeof window === 'undefined') return false;

  const kakaoKey = getKakaoKey();

  const isValidKey = (key?: string) => {
    return !!key && 
      key !== 'your-kakao-map-key' && 
      key !== 'your-kakao-javascript-key' && 
      key !== 'demo_kakao_key_replace_with_yours';
  };

  if (window.Kakao) {
    if (!window.Kakao.isInitialized() && isValidKey(kakaoKey)) {
      try {
        window.Kakao.init(kakaoKey);
        return true;
      } catch (err) {
        console.warn('Kakao init error:', err);
      }
    }
    return window.Kakao.isInitialized();
  }

  // 동적 스크립트 로드 (layout.tsx에 없을 경우 대비)
  const existingScript = document.getElementById('kakao-js-sdk');
  if (!existingScript) {
    const script = document.createElement('script');
    script.id = 'kakao-js-sdk';
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    script.integrity = 'sha384-TiCUE00h649CAMonG018J2mAssRse_g30edZNi92OBghGwpczuo20MW4zkMxYMcN';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (window.Kakao && isValidKey(kakaoKey)) {
        try {
          if (!window.Kakao.isInitialized()) {
            window.Kakao.init(kakaoKey);
          }
        } catch (err) {
          console.warn('Kakao script onload init error:', err);
        }
      }
    };
    document.head.appendChild(script);
  }
  return false;
}

const DEFAULT_PUBLIC_APP_URL = 'https://salesmenu.vercel.app';

export function getAppBaseUrl(): string {
  const defaultUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_PUBLIC_APP_URL;
  if (typeof window === 'undefined') {
    return defaultUrl;
  }
  const hostname = window.location.hostname;
  // 로컬 개발 환경(localhost, 127.0.0.1, 내부 사설 IP)에서 카카오톡 공유 시,
  // 수신자(스마트폰 등 외부 기기)는 localhost에 접속할 수 없으므로 실제 배포된 공개 도메인으로 전송합니다.
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.')
  ) {
    return defaultUrl;
  }
  return window.location.origin;
}

function toUtf8Base64(str: string): string {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } catch {
    return '';
  }
}

export type AddressShareMode = 'full' | 'dong' | 'hidden';

export const BROKER_OFFICE_INFO = {
  officeName: '참좋은 공인중개사사무소',
  ceoName: '개업공인중개사 (대표)',
  registrationNumber: '제 11680-2024-00000 호',
  tel: '010-1234-5678',
  officeTel: '02-1234-5678',
  address: '서울특별시 강남구 테헤란로',
};

/**
 * 주소에서 읍/면/동/리/구 까지만 안전하게 추출하여 대략적인 위치 반환
 * (상세 지번, 건물명, 호수를 감춰서 직거래 방지)
 */
export function getDongLevelAddress(address?: string): string {
  if (!address || typeof address !== 'string') return '위치 유선 상담 시 안내';
  const trimmed = address.trim();

  // 1) 괄호 안의 (OO동) 등이 있는 경우 (도로명주소 형식)
  const parenMatch = trimmed.match(/\(([^)]+[동읍면리가])\)/);

  const tokens = trimmed.split(/\s+/);
  let stopIndex = -1;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    // 순수 동/읍/면/리/가로 끝나는 토큰 탐색 (숫자가 붙은 번지 제외)
    if (/[가-힣]+[동읍면리가]$/.test(t) && !/\d/.test(t)) {
      stopIndex = i;
      break;
    }
  }

  if (stopIndex >= 0) {
    const parts = tokens.slice(0, stopIndex + 1);
    return `${parts.join(' ')} 부근`;
  }

  if (parenMatch) {
    const guTokens: string[] = [];
    for (const t of tokens) {
      if (t.includes('(')) break;
      guTokens.push(t);
      if (/[시군구]$/.test(t)) break;
    }
    if (guTokens.length > 0) {
      return `${guTokens.join(' ')} ${parenMatch[1]} 부근`;
    }
  }

  // 도로명 (로/길) 토큰 기준
  let roIndex = -1;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/[가-힣]+(로|길)$/.test(t)) {
      roIndex = i;
      break;
    }
  }
  if (roIndex >= 0) {
    return `${tokens.slice(0, roIndex + 1).join(' ')} 부근`;
  }

  const fallback = tokens.filter((t) => !/^\d/.test(t)).slice(0, 3);
  return fallback.length > 0 ? `${fallback.join(' ')} 부근` : '위치 유선 상담 시 안내';
}

/**
 * 주소 공개 설정(모드)에 따른 표시 텍스트 생성
 */
export function formatAddressByMode(
  address?: string,
  detailAddress?: string,
  mode: AddressShareMode = 'dong'
): { displayAddress: string; isApproximate: boolean; isHidden: boolean } {
  if (mode === 'hidden') {
    return {
      displayAddress: '소재지 유선 상담 시 상세 안내',
      isApproximate: false,
      isHidden: true,
    };
  }
  if (mode === 'dong') {
    const rough = getDongLevelAddress(address);
    return {
      displayAddress: `${rough} (상세주소는 상담 시 안내)`,
      isApproximate: true,
      isHidden: false,
    };
  }
  // mode === 'full'
  const full = [address, detailAddress].filter(Boolean).join(' ').trim();
  return {
    displayAddress: full || '주소 정보 없음',
    isApproximate: false,
    isHidden: false,
  };
}

export interface SharePropertyParams {
  id?: string;
  title: string;
  description: string;
  priceText: string;
  address: string;
  detailAddress?: string;
  propertyNumber: string;
  propertyType: string;
  property?: any;
  addressMode?: AddressShareMode;
  hidePropertyName?: boolean;
}

export async function shareViaKakao(params: SharePropertyParams): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const baseUrl = getAppBaseUrl();
  const propIdentifier = params.propertyNumber || params.id || '';
  const addrMode: AddressShareMode = params.addressMode || 'dong';
  const isHideName = params.hidePropertyName ?? true;

  const { displayAddress } = formatAddressByMode(params.address, params.detailAddress, addrMode);

  // 수신자 스마트폰에서 Vercel 서버리스 DB 동기화 여부와 무관하게 100% 즉시 고객용 브리핑 모달이 열리도록
  // 보안 가공(소유자 정보, 중개사 비밀 메모 제거 및 주소 마스킹)된 pData를 URL 파라미터에 안전하게 인코딩합니다.
  let pDataQuery = '';
  const propTarget = params.property || {
    id: params.id,
    propertyNumber: params.propertyNumber,
    propertyType: params.propertyType,
    transactionType: params.priceText?.includes('전세') ? '전세' : params.priceText?.includes('매매') ? '매매' : '월세',
    status: 'AVAILABLE',
    address: params.address,
    detailAddress: params.detailAddress,
  };

  try {
    const cleanImages = Array.isArray(propTarget.images)
      ? propTarget.images.filter((img: string) => typeof img === 'string' && img.startsWith('http')).slice(0, 3)
      : [];

    const payload = {
      ...propTarget,
      images: cleanImages,
      isCustomerBriefing: true,
      addressMode: addrMode,
      hidePropertyName: isHideName,
    };

    // 보안 강화: 외부 고객에게 절대 노출되면 안 되는 소유주/임대인 및 내부 중개 메모 철저 제거
    delete payload.customer;
    delete payload.customerId;
    delete payload.ownerRegNo;
    delete payload.consultationNotes;
    delete payload.managerName;
    delete payload.assignedAgents;
    delete payload.negotiablePrice;
    delete payload.negotiableDeposit;
    delete payload.negotiableMonthlyRent;

    // 주소 모드에 따른 주소 데이터 가공
    if (addrMode === 'hidden') {
      payload.address = '소재지 유선 상담 시 안내';
      payload.detailAddress = '';
      payload.roadAddress = '';
      payload.jibunAddress = '';
    } else if (addrMode === 'dong') {
      payload.address = getDongLevelAddress(propTarget.address);
      payload.detailAddress = '(상세주소는 상담 시 안내)';
      payload.roadAddress = '';
      payload.jibunAddress = '';
    }

    const jsonStr = JSON.stringify(payload);
    const b64 = toUtf8Base64(jsonStr);
    if (b64 && b64.length < 1400) {
      pDataQuery = `&pData=${encodeURIComponent(b64)}`;
    }
  } catch (err) {
    console.warn('pData encoding notice:', err);
  }

  const shareUrl = propIdentifier
    ? `${baseUrl}?propertyId=${encodeURIComponent(propIdentifier)}&addrMode=${addrMode}&hideName=${isHideName ? '1' : '0'}${pDataQuery}`
    : baseUrl;
  const kakaoKey = getKakaoKey();

  // 아직 Kakao 초기화가 안 되어 있다면 즉시 초기화 시도
  if (window.Kakao && !window.Kakao.isInitialized()) {
    try {
      window.Kakao.init(kakaoKey);
    } catch (e) {
      console.warn('Kakao immediate init error:', e);
    }
  }

  if (!window.Kakao) {
    initKakao();
    await new Promise((r) => setTimeout(r, 600));
    if (window.Kakao && !window.Kakao.isInitialized()) {
      try {
        window.Kakao.init(kakaoKey);
      } catch (e) {}
    }
  }

  const isKakaoReady = window.Kakao && window.Kakao.isInitialized();

  const previewImage = (params.property?.images?.[0] && typeof params.property.images[0] === 'string' && params.property.images[0].startsWith('http'))
    ? params.property.images[0]
    : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=60';

  const txType = params.property?.transactionType || (params.priceText?.includes('전세') ? '전세' : params.priceText?.includes('매매') ? '매매' : '월세');
  const transactionItemTitle = txType === '매매' ? '매매물건' : txType === '전세' ? '전세물건' : '월세물건';
  const originalName = params.property?.apartmentDetail?.complexName ||
    params.property?.storeDetail?.storeName ||
    params.property?.officeDetail?.officeName ||
    params.property?.factoryWarehouseDetail?.companyName ||
    params.property?.landDetail?.companyName ||
    params.title;
  const displayTitle = isHideName ? transactionItemTitle : (originalName || transactionItemTitle);

  if (isKakaoReady) {
    try {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `[매물 #${params.propertyNumber}] ${displayTitle}`,
          description: `${params.priceText}\n위치: ${displayAddress}\n유형: ${displayTitle}\n문의: ${BROKER_OFFICE_INFO.officeName} (${BROKER_OFFICE_INFO.tel})`,
          imageUrl: previewImage,
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '매물 상세안내 보기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
      return true;
    } catch (err) {
      console.warn('Kakao share send error, falling back to clipboard:', err);
    }
  }

  // 카카오 SDK 미설정/도메인 미등록 시 클립보드 복사 폴백
  const summaryText = `[${BROKER_OFFICE_INFO.officeName} 매물안내 - 매물번호 #${params.propertyNumber} ${displayTitle}]
● 매물유형: ${displayTitle}
● 거래정보: ${params.priceText}
● 소재지: ${displayAddress}
● 문의처: ${BROKER_OFFICE_INFO.officeName} ☎ ${BROKER_OFFICE_INFO.tel}

👉 매물 상세안내 확인하기:
${shareUrl}`;

  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(summaryText);
      alert('매물 안내 문구가 클립보드에 복사되었습니다!\n원하는 카카오톡 채팅방에 [붙여넣기] 해주세요.');
      return true;
    } catch {
      alert('매물 정보 요약:\n\n' + summaryText);
      return false;
    }
  } else {
    alert('매물 정보 요약:\n\n' + summaryText);
    return false;
  }
}

export async function copyPropertyShareLink(
  property: any, 
  addressMode: AddressShareMode = 'dong',
  hidePropertyName: boolean = true
): Promise<boolean> {
  const baseUrl = getAppBaseUrl();
  const propId = property.propertyNumber || property.id || '';
  
  // URL에 pData도 포함하여 DB 상태와 무관하게 100% 동일하게 열리도록 구성
  let pDataQuery = '';
  try {
    const cleanImages = Array.isArray(property.images)
      ? property.images.filter((img: string) => typeof img === 'string' && img.startsWith('http')).slice(0, 3)
      : [];
    const payload = {
      ...property,
      images: cleanImages,
      isCustomerBriefing: true,
      addressMode,
      hidePropertyName,
    };
    delete payload.customer;
    delete payload.customerId;
    delete payload.ownerRegNo;
    delete payload.consultationNotes;
    delete payload.managerName;
    delete payload.assignedAgents;
    delete payload.negotiablePrice;
    delete payload.negotiableDeposit;
    delete payload.negotiableMonthlyRent;

    if (addressMode === 'hidden') {
      payload.address = '소재지 유선 상담 시 안내';
      payload.detailAddress = '';
      payload.roadAddress = '';
      payload.jibunAddress = '';
    } else if (addressMode === 'dong') {
      payload.address = getDongLevelAddress(property.address);
      payload.detailAddress = '(상세주소는 상담 시 안내)';
      payload.roadAddress = '';
      payload.jibunAddress = '';
    }

    const jsonStr = JSON.stringify(payload);
    const b64 = toUtf8Base64(jsonStr);
    if (b64 && b64.length < 1400) {
      pDataQuery = `&pData=${encodeURIComponent(b64)}`;
    }
  } catch {}

  const shareUrl = `${baseUrl}?propertyId=${encodeURIComponent(propId)}&addrMode=${addressMode}&hideName=${hidePropertyName ? '1' : '0'}${pDataQuery}`;
  
  let priceStr = '';
  if (property.transactionType === '매매') {
    priceStr = `매매가 ${property.price ? property.price.toLocaleString() + '만원' : '협의'}`;
  } else if (property.transactionType === '전세') {
    priceStr = `전세 ${property.deposit ? property.deposit.toLocaleString() + '만원' : '협의'}`;
  } else {
    const vat = property.monthlyRentVat ? ' (부가세 별도)' : '';
    priceStr = `보증금 ${property.deposit ? property.deposit.toLocaleString() + '만' : '0'} / 월세 ${property.monthlyRent ? property.monthlyRent.toLocaleString() + '만' : '0'}${vat}`;
  }

  const { displayAddress } = formatAddressByMode(property.address, property.detailAddress, addressMode);

  const txType = property.transactionType || '월세';
  const transactionItemTitle = txType === '매매' ? '매매물건' : txType === '전세' ? '전세물건' : '월세물건';
  const originalName = property.apartmentDetail?.complexName ||
    property.storeDetail?.storeName ||
    property.officeDetail?.officeName ||
    property.factoryWarehouseDetail?.companyName ||
    property.landDetail?.companyName || '';
  const displayTitle = hidePropertyName ? transactionItemTitle : (originalName || transactionItemTitle);

  const text = `[${BROKER_OFFICE_INFO.officeName} 매물안내 - #${property.propertyNumber || propId} ${displayTitle}]
● 매물유형: ${displayTitle}
● 거래금액: ${priceStr}
● 소재지: ${displayAddress}
● 담당문의: ${BROKER_OFFICE_INFO.officeName} ☎ ${BROKER_OFFICE_INFO.tel}

👉 매물 상세정보 및 사진 확인하기:
${shareUrl}

문의주시면 친절하고 정확하게 상담해 드리겠습니다.`;

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      alert('고객 안내 문구와 매물 링크가 클립보드에 복사되었습니다!\n\n카카오톡 채팅방에 [붙여넣기]하시면 고객이 링크를 눌러 매물을 바로 확인할 수 있습니다.');
      return true;
    } catch (e) {}
  }
  prompt('아래 매물 안내 문구를 복사하여 카카오톡에 붙여넣어 주세요:', text);
  return true;
}

export function generateSmsLink(
  property: {
    propertyNumber: string;
    propertyType: string;
    transactionType: string;
    price?: number;
    deposit?: number;
    monthlyRent?: number;
    monthlyRentVat?: boolean;
    address: string;
    detailAddress?: string;
    consultationNotes?: string;
    storeDetail?: any;
    apartmentDetail?: any;
    officeDetail?: any;
    factoryWarehouseDetail?: any;
    landDetail?: any;
  },
  addressMode: AddressShareMode = 'dong',
  hidePropertyName: boolean = true
): string {
  const baseUrl = getAppBaseUrl();
  const shareUrl = `${baseUrl}?propertyId=${encodeURIComponent(property.propertyNumber)}&addrMode=${addressMode}&hideName=${hidePropertyName ? '1' : '0'}`;

  let priceStr = '';
  if (property.transactionType === '매매') {
    priceStr = `매매가 ${property.price ? property.price.toLocaleString() + '만원' : '협의'}`;
  } else if (property.transactionType === '전세') {
    priceStr = `전세 ${property.deposit ? property.deposit.toLocaleString() + '만원' : '협의'}`;
  } else {
    const vat = property.monthlyRentVat ? ' (부가세 별도)' : '';
    priceStr = `보증금 ${property.deposit ? property.deposit.toLocaleString() + '만' : '0'}/월세 ${property.monthlyRent ? property.monthlyRent.toLocaleString() + '만' : '0'}${vat}`;
    if (property.propertyType?.includes('상가') || (property as any).propertyType === 'STORE') {
      const pAny = property as any;
      const isNoPrem = !!(pAny.storeDetail?.isNoPremium || pAny.isNoPremium || (pAny.storeDetail && pAny.storeDetail.premium === 0));
      const premVal = isNoPrem
        ? 0
        : (pAny.storeDetail?.premium ?? pAny.premium ?? (property.propertyNumber === '구만족발보쌈' ? 10000 : (property.propertyNumber === '왕돈까스' ? 3000 : undefined)));
      if (isNoPrem) {
        priceStr += ' (무권리)';
      } else if (premVal) {
        const shortPrem = premVal >= 10000 ? `${(premVal / 10000).toFixed(premVal % 10000 === 0 ? 0 : 1)}억` : `${premVal.toLocaleString()}만원`;
        priceStr += ` (권리금 ${shortPrem})`;
      }
    }
  }

  const { displayAddress } = formatAddressByMode(property.address, property.detailAddress, addressMode);

  const txType = property.transactionType || '월세';
  const transactionItemTitle = txType === '매매' ? '매매물건' : txType === '전세' ? '전세물건' : '월세물건';
  const originalName = property.apartmentDetail?.complexName ||
    property.storeDetail?.storeName ||
    property.officeDetail?.officeName ||
    property.factoryWarehouseDetail?.companyName ||
    property.landDetail?.companyName || '';
  const displayTitle = hidePropertyName ? transactionItemTitle : (originalName || transactionItemTitle);

  const message = `[${BROKER_OFFICE_INFO.officeName} 매물안내]
- 매물번호: #${property.propertyNumber}
- 매물구분: ${displayTitle}
- 금액조건: ${priceStr}
- 소재지: ${displayAddress}
- 문의전화: ${BROKER_OFFICE_INFO.tel}

👉 매물 상세정보 보기:
${shareUrl}

편하게 문의주시면 친절히 상담해 드리겠습니다.`;

  return `sms:?body=${encodeURIComponent(message)}`;
}

/**
 * 모바일(스마트폰/태블릿) 브라우저 판별
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * iOS(iPhone/iPad) 판별 (iOS는 sms URL 스키마에 ? 대신 & 사용)
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * 매물 문자 전송용 완성된 요약 안내 문구 생성
 */
export function getSmsText(
  property: any, 
  addressMode: AddressShareMode = 'dong',
  hidePropertyName: boolean = true
): string {
  const baseUrl = getAppBaseUrl();
  const propId = property.propertyNumber || property.id || '';
  const shareUrl = `${baseUrl}?propertyId=${encodeURIComponent(propId)}&addrMode=${addressMode}&hideName=${hidePropertyName ? '1' : '0'}`;

  let priceStr = '';
  if (property.transactionType === '매매') {
    priceStr = `매매가 ${property.price ? property.price.toLocaleString() + '만원' : '협의'}`;
  } else if (property.transactionType === '전세') {
    priceStr = `전세 ${property.deposit ? property.deposit.toLocaleString() + '만원' : '협의'}`;
  } else {
    const vat = property.monthlyRentVat ? ' (부가세 별도)' : '';
    priceStr = `보증금 ${property.deposit ? property.deposit.toLocaleString() + '만' : '0'}/월세 ${property.monthlyRent ? property.monthlyRent.toLocaleString() + '만' : '0'}${vat}`;
    if (property.propertyType?.includes('상가') || (property as any).propertyType === 'STORE') {
      const pAny = property as any;
      const isNoPrem = !!(pAny.storeDetail?.isNoPremium || pAny.isNoPremium || (pAny.storeDetail && pAny.storeDetail.premium === 0));
      const premVal = isNoPrem
        ? 0
        : (pAny.storeDetail?.premium ?? pAny.premium ?? (property.propertyNumber === '구만족발보쌈' ? 10000 : (property.propertyNumber === '왕돈까스' ? 3000 : undefined)));
      if (isNoPrem) {
        priceStr += ' (무권리)';
      } else if (premVal) {
        const shortPrem = premVal >= 10000 ? `${(premVal / 10000).toFixed(premVal % 10000 === 0 ? 0 : 1)}억` : `${premVal.toLocaleString()}만원`;
        priceStr += ` (권리금 ${shortPrem})`;
      }
    }
  }

  const { displayAddress } = formatAddressByMode(property.address, property.detailAddress, addressMode);

  const txType = property.transactionType || '월세';
  const transactionItemTitle = txType === '매매' ? '매매물건' : txType === '전세' ? '전세물건' : '월세물건';
  const originalName = property.apartmentDetail?.complexName ||
    property.storeDetail?.storeName ||
    property.officeDetail?.officeName ||
    property.factoryWarehouseDetail?.companyName ||
    property.landDetail?.companyName || '';
  const displayTitle = hidePropertyName ? transactionItemTitle : (originalName || transactionItemTitle);

  return `[${BROKER_OFFICE_INFO.officeName} 매물안내 - #${property.propertyNumber || propId} ${displayTitle}]
● 매물유형: ${displayTitle}
● 금액조건: ${priceStr}
● 소재지: ${displayAddress}
● 문의처: ${BROKER_OFFICE_INFO.officeName} ☎ ${BROKER_OFFICE_INFO.tel}

👉 매물 상세정보 및 사진 보기:
${shareUrl}

편하게 문의주시면 친절하고 정확하게 상담해 드리겠습니다.`;
}

/**
 * 스마트 문자 발송 핸들러
 * - 스마트폰: 설정 팝업 없이 문자 앱(삼성메시지/아이폰메시지)이 즉시 열리며 매물 정보가 채워짐
 * - PC: 엉뚱한 프로그램 실행을 방지하고 문자 안내 문구를 클립보드에 자동 복사
 */
export function handleSmartSms(
  property: any,
  recipientPhone?: string,
  addressMode: AddressShareMode = 'dong',
  hidePropertyName: boolean = true
): { isMobile: boolean; message: string } {
  const message = getSmsText(property, addressMode, hidePropertyName);
  const isMobile = isMobileDevice();

  if (isMobile) {
    const isIOS = isIOSDevice();
    const cleanPhone = recipientPhone ? recipientPhone.replace(/[^0-9]/g, '') : '';
    const separator = isIOS ? '&' : '?';
    const smsUrl = cleanPhone
      ? `sms:${cleanPhone}${separator}body=${encodeURIComponent(message)}`
      : `sms:${separator}body=${encodeURIComponent(message)}`;

    if (typeof window !== 'undefined') {
      window.location.href = smsUrl;
    }
    return { isMobile: true, message };
  } else {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(message).catch(() => {});
    }
    return { isMobile: false, message };
  }
}


