// src/app/api/public-data/search-address/route.ts
// 전국 토지 지번(농지, 임야, 산 번지 포함) 및 도로명 정밀 검색 API

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim() || '';

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const kakaoKey =
    process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ||
    process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ||
    'ab4074f3fc327e405a625fc856bee022';

  const headers = {
    Authorization: `KakaoAK ${kakaoKey}`,
    KA: 'sdk/1.0.0 os/javascript lang/ko device/web origin/https://salesmenu.vercel.app',
    Origin: 'https://salesmenu.vercel.app',
  };

  try {
    // 1. 카카오 주소 검색 (지번, 도로명, 산 번지)
    const addrUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=15`;
    const addrRes = await fetch(addrUrl, { headers });
    let addrResults: any[] = [];
    if (addrRes.ok) {
      const data = await addrRes.json();
      addrResults = data?.documents || [];
    }

    // 2. 만약 결과가 없거나 적으면 키워드 검색도 병행 (특정 산, 지명, 리 단위 검색 보강)
    let keywordResults: any[] = [];
    if (addrResults.length < 5) {
      const kwUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=10`;
      const kwRes = await fetch(kwUrl, { headers });
      if (kwRes.ok) {
        const data = await kwRes.json();
        keywordResults = data?.documents || [];
      }
    }

    // 3. 통합 및 정규화
    const combined: any[] = [];
    const seen = new Set<string>();

    for (const doc of addrResults) {
      const jibun = doc.address?.address_name || '';
      const road = doc.road_address?.address_name || '';
      const key = jibun || road;
      if (!key || seen.has(key)) continue;
      seen.add(key);

      const bCode = doc.address?.b_code || '';
      const isMountain = doc.address?.mountain_yn === 'Y';
      const mainBun = (doc.address?.main_address_no || '0').padStart(4, '0');
      const subJi = (doc.address?.sub_address_no || '0').padStart(4, '0');
      const pnu = bCode && bCode.length >= 10 ? `${bCode.substring(0, 10)}${isMountain ? '2' : '1'}${mainBun}${subJi}` : '';

      combined.push({
        jibunAddress: jibun || road,
        roadAddress: road || jibun,
        buildingName: doc.road_address?.building_name || '',
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
        isMountain,
        pnu,
        region1: doc.address?.region_1depth_name || '',
        region2: doc.address?.region_2depth_name || '',
        region3: doc.address?.region_3depth_name || '',
        placeName: doc.road_address?.building_name || (isMountain ? `[산번지] ${jibun}` : jibun),
        source: 'ADDRESS',
      });
    }

    for (const doc of keywordResults) {
      const jibun = doc.address_name || '';
      const road = doc.road_address_name || '';
      const key = jibun || road;
      if (!key || seen.has(key)) continue;
      seen.add(key);

      combined.push({
        jibunAddress: jibun || road,
        roadAddress: road || jibun,
        buildingName: doc.place_name || '',
        lat: parseFloat(doc.y),
        lng: parseFloat(doc.x),
        isMountain: jibun.includes('산'),
        placeName: doc.place_name,
        source: 'KEYWORD',
      });
    }

    return NextResponse.json({ results: combined });
  } catch (err: any) {
    console.error('Search address error:', err);
    return NextResponse.json({ results: [], error: err.message }, { status: 500 });
  }
}

