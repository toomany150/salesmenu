// src/lib/address.ts
// 다음/카카오 우편번호 검색 및 도로명 ↔ 지번 상호 자동 변환 유틸리티

declare global {
  interface Window {
    daum?: any;
    kakao?: any;
  }
}

/**
 * 다음 우편번호 서비스 스크립트 동적 로드
 */
export function loadDaumPostcodeScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.daum && window.daum.Postcode) return resolve(true);

    const existing = document.getElementById('daum-postcode-sdk');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'daum-postcode-sdk';
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * 다음 우편번호 검색 팝업 열기
 */
export async function openDaumPostcode(
  onComplete: (result: {
    roadAddress: string;
    jibunAddress: string;
    zonecode: string;
    bname?: string;
    buildingName?: string;
  }) => void
) {
  const loaded = await loadDaumPostcodeScript();
  if (!loaded || !window.daum?.Postcode) {
    alert('우편번호 서비스를 불러올 수 없습니다. 인터넷 연결 상태를 확인해주세요.');
    return;
  }

  new window.daum.Postcode({
    oncomplete: (data: any) => {
      const road = data.roadAddress || data.autoRoadAddress || '';
      const jibun = data.jibunAddress || data.autoJibunAddress || '';
      onComplete({
        roadAddress: road || jibun,
        jibunAddress: jibun || road,
        zonecode: data.zonecode || '',
        bname: data.bname || '',
        buildingName: data.buildingName || '',
      });
    },
  }).open();
}

/**
 * 카카오 지도 및 Services SDK 동적 로드
 */
export function loadKakaoServicesScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.kakao?.maps?.services) return resolve(true);

    const DEFAULT_KAKAO_KEY = 'ab4074f3fc327e405a625fc856bee022';
    const kakaoKey =
      process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ||
      process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ||
      DEFAULT_KAKAO_KEY;

    if (!kakaoKey) {
      return resolve(false);
    }

    if (window.kakao?.maps) {
      window.kakao.maps.load(() => {
        resolve(!!window.kakao?.maps?.services);
      });
      return;
    }

    const existing = document.getElementById('kakao-maps-sdk');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.kakao?.maps) {
          window.kakao.maps.load(() => resolve(!!window.kakao?.maps?.services));
        } else {
          resolve(false);
        }
      });
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-maps-sdk';
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&libraries=services,clusterer&autoload=false`;
    script.onload = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => resolve(!!window.kakao?.maps?.services));
      } else {
        resolve(false);
      }
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * 카카오 Geocoder를 활용하여 도로명주소 ↔ 지번주소 상호 자동 조회 및 변환
 */
export async function convertAddressViaGeocoder(
  inputAddress: string
): Promise<{
  roadAddress: string;
  jibunAddress: string;
  lat: number;
  lng: number;
  buildingName?: string;
} | null> {
  if (!inputAddress || !inputAddress.trim()) {
    return null;
  }

  const loaded = await loadKakaoServicesScript();
  if (!loaded || !window.kakao?.maps?.services) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(inputAddress.trim(), (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK && result && result.length > 0) {
          const item = result[0];
          const road = item.road_address?.address_name || (inputAddress.includes('로') || inputAddress.includes('길') ? inputAddress : '');
          const jibun = item.address?.address_name || (!inputAddress.includes('로') && !inputAddress.includes('길') ? inputAddress : '');
          const lat = parseFloat(item.y);
          const lng = parseFloat(item.x);
          const buildingName = item.road_address?.building_name || item.address?.building_name || '';

          return resolve({
            roadAddress: road || jibun,
            jibunAddress: jibun || road,
            lat,
            lng,
            buildingName: buildingName || undefined,
          });
        }
        return resolve(null);
      });
    } catch (err) {
      console.warn('Geocoder conversion error:', err);
      return resolve(null);
    }
  });
}
