// src/lib/geo.ts
// 주소 좌표 변환 및 지도 연동 유틸리티

export interface Coordinates {
  lat: number;
  lng: number;
}

// 대한민국 주요 거점 기본 좌표 (서울 강남/테헤란로 중심)
export const DEFAULT_CENTER: Coordinates = {
  lat: 37.4998,
  lng: 127.0345,
};

// 주요 지역 키워드 기반 스마트 좌표 매핑 (오프라인 / API 키 미등록 시 즉시 가동)
const DISTRICT_COORDINATES: Record<string, Coordinates> = {
  '역삼': { lat: 37.5006, lng: 127.0364 },
  '서초': { lat: 37.4932, lng: 127.0145 },
  '강남': { lat: 37.4979, lng: 127.0276 },
  '테헤란': { lat: 37.5034, lng: 127.0498 },
  '삼성': { lat: 37.5088, lng: 127.0631 },
  '선릉': { lat: 37.5045, lng: 127.0490 },
  '잠실': { lat: 37.5133, lng: 127.1001 },
  '송파': { lat: 37.5048, lng: 127.1145 },
  '마포': { lat: 37.5538, lng: 126.9200 },
  '여의도': { lat: 37.5219, lng: 126.9242 },
  '영등포': { lat: 37.5256, lng: 126.8966 },
  '판교': { lat: 37.3948, lng: 127.1119 },
  '분당': { lat: 37.3827, lng: 127.1189 },
  '화성': { lat: 37.1995, lng: 126.8315 },
  '수원': { lat: 37.2636, lng: 127.0286 },
  '용인': { lat: 37.2411, lng: 127.1776 },
  '양평': { lat: 37.4913, lng: 127.4875 },
};

/**
 * 주소 텍스트를 기반으로 위도/경도 좌표를 추출하거나 추정합니다.
 */
export function getCoordinatesFromAddress(address: string, fallbackSeed = 0): Coordinates {
  if (!address) return DEFAULT_CENTER;

  // 1. 등록된 지역 키워드 매칭
  for (const [key, coords] of Object.entries(DISTRICT_COORDINATES)) {
    if (address.includes(key)) {
      // 동일 지역 내 미세한 위치 분산을 주어 마커가 겹치지 않게 함
      const offsetLat = ((fallbackSeed % 7) - 3) * 0.0015;
      const offsetLng = (((fallbackSeed * 3) % 7) - 3) * 0.0018;
      return {
        lat: coords.lat + offsetLat,
        lng: coords.lng + offsetLng,
      };
    }
  }

  // 2. 기본 서울 중심 기반 해시 분산
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 100) / 100 - 0.5) * 0.04;
  const lngOffset = ((Math.abs(hash >> 3) % 100) / 100 - 0.5) * 0.05;

  return {
    lat: DEFAULT_CENTER.lat + latOffset,
    lng: DEFAULT_CENTER.lng + lngOffset,
  };
}

/**
 * 카카오맵 웹 바로가기 URL 생성 (좌표 또는 검색어 기반)
 */
export function getKakaoMapUrl(address: string, latOrName?: number | string, lng?: number): string {
  if (typeof latOrName === 'number' && typeof lng === 'number') {
    return `https://map.kakao.com/link/map/${encodeURIComponent(address)},${latOrName},${lng}`;
  }
  const query = encodeURIComponent(latOrName ? `${address} ${latOrName}` : address);
  return `https://map.kakao.com/link/search/${query}`;
}

/**
 * 네이버지도 웹 바로가기 URL 생성
 */
export function getNaverMapUrl(address: string, name?: string): string {
  const query = encodeURIComponent(name ? `${address} ${name}` : address);
  return `https://map.naver.com/v5/search/${query}`;
}

