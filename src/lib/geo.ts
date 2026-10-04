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
  // 서울
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
  '용산': { lat: 37.5326, lng: 126.9900 },
  '종로': { lat: 37.5730, lng: 126.9794 },
  '중구': { lat: 37.5641, lng: 126.9979 },
  '성동': { lat: 37.5633, lng: 127.0371 },
  '광진': { lat: 37.5385, lng: 127.0823 },
  '동대문': { lat: 37.5744, lng: 127.0400 },
  '노원': { lat: 37.6542, lng: 127.0568 },
  '강서': { lat: 37.5509, lng: 126.8495 },
  '양천': { lat: 37.5169, lng: 126.8665 },
  '구로': { lat: 37.4954, lng: 126.8874 },
  '관악': { lat: 37.4784, lng: 126.9516 },
  '동작': { lat: 37.5124, lng: 126.9393 },
  '강동': { lat: 37.5301, lng: 127.1238 },

  // 부산
  '사상': { lat: 35.1528, lng: 128.9912 },
  '덕포': { lat: 35.1708, lng: 128.9868 },
  '해운대': { lat: 35.1631, lng: 129.1636 },
  '서면': { lat: 35.1578, lng: 129.0592 },
  '부산진구': { lat: 35.1629, lng: 129.0531 },
  '수영': { lat: 35.1456, lng: 129.1132 },
  '동래': { lat: 35.2048, lng: 129.0836 },
  '남포': { lat: 35.0979, lng: 129.0349 },
  '연제': { lat: 35.1762, lng: 129.0797 },
  '부산': { lat: 35.1796, lng: 129.0756 },

  // 대구 / 인천 / 광주 / 대전 / 울산 / 세종
  '대구': { lat: 35.8714, lng: 128.6014 },
  '수성': { lat: 35.8580, lng: 128.6306 },
  '인천': { lat: 37.4563, lng: 126.7052 },
  '송도': { lat: 37.3888, lng: 126.6548 },
  '청라': { lat: 37.5317, lng: 126.6508 },
  '광주': { lat: 35.1595, lng: 126.8526 },
  '상무': { lat: 35.1517, lng: 126.8509 },
  '대전': { lat: 36.3504, lng: 127.3845 },
  '둔산': { lat: 36.3551, lng: 127.3837 },
  '유성': { lat: 36.3622, lng: 127.3563 },
  '울산': { lat: 35.5384, lng: 129.3114 },
  '세종': { lat: 36.4800, lng: 127.2890 },

  // 경기
  '오산': { lat: 37.1498, lng: 127.0772 },
  '원동': { lat: 37.1432, lng: 127.0789 },
  '궐동': { lat: 37.1648, lng: 127.0601 },
  '수청': { lat: 37.1678, lng: 127.0673 },
  '세교': { lat: 37.1782, lng: 127.0392 },
  '오산동': { lat: 37.1455, lng: 127.0715 },
  '동탄': { lat: 37.2001, lng: 127.1065 },
  '화성': { lat: 37.1995, lng: 126.8315 },
  '평택': { lat: 36.9921, lng: 127.1129 },
  '고덕': { lat: 37.0425, lng: 127.0482 },
  '판교': { lat: 37.3948, lng: 127.1119 },
  '분당': { lat: 37.3827, lng: 127.1189 },
  '성남': { lat: 37.4201, lng: 127.1265 },
  '수원': { lat: 37.2636, lng: 127.0286 },
  '영통': { lat: 37.2520, lng: 127.0710 },
  '광교': { lat: 37.2982, lng: 127.0478 },
  '용인': { lat: 37.2411, lng: 127.1776 },
  '수지': { lat: 37.3224, lng: 127.0978 },
  '고양': { lat: 37.6584, lng: 126.8320 },
  '일산': { lat: 37.6583, lng: 126.7700 },
  '부천': { lat: 37.5034, lng: 126.7660 },
  '안양': { lat: 37.3943, lng: 126.9568 },
  '평촌': { lat: 37.3908, lng: 126.9631 },
  '남양주': { lat: 37.6360, lng: 127.2165 },
  '하남': { lat: 37.5393, lng: 127.2148 },
  '미사': { lat: 37.5583, lng: 127.1925 },
  '양평': { lat: 37.4913, lng: 127.4875 },
  '제주': { lat: 33.4996, lng: 126.5312 },
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

