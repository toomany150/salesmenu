// src/components/map/KakaoAddressMap.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  MapPin, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  Navigation,
  CheckCircle,
  Eye,
  Compass,
  Layers,
  Sparkles
} from 'lucide-react';
import { getCoordinatesFromAddress, getKakaoMapUrl, getNaverMapUrl, DEFAULT_CENTER, Coordinates } from '@/lib/geo';

declare global {
  interface Window {
    kakao?: any;
  }
}

interface KakaoAddressMapProps {
  address: string;
  detailAddress?: string;
  onCoordinatesChange?: (coords: { lat: number; lng: number }) => void;
  className?: string;
  height?: string;
}

const DEFAULT_KAKAO_KEY = 'ab4074f3fc327e405a625fc856bee022';

export const KakaoAddressMap: React.FC<KakaoAddressMapProps> = ({
  address,
  detailAddress,
  onCoordinatesChange,
  className = '',
  height = 'h-64',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  const [kakaoLoaded, setKakaoLoaded] = useState(false);

  // Coordinates & Address state
  const [currentCoords, setCurrentCoords] = useState<Coordinates>(() => getCoordinatesFromAddress(address));
  const [isExactLocation, setIsExactLocation] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState<string>('');

  // 1. Try loading Kakao Map SDK in the background
  useEffect(() => {
    const kakaoKey =
      process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ||
      process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ||
      DEFAULT_KAKAO_KEY;

    if (!kakaoKey || kakaoKey === 'your-kakao-map-key') {
      return;
    }

    if (window.kakao && window.kakao.maps) {
      try {
        window.kakao.maps.load(() => {
          setKakaoLoaded(true);
        });
      } catch (e) {
        setKakaoLoaded(true);
      }
      return;
    }

    let script = document.getElementById('kakao-maps-sdk') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'kakao-maps-sdk';
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false&libraries=services`;
      script.async = true;
      document.head.appendChild(script);
    }

    const handleLoad = () => {
      if (window.kakao?.maps) {
        try {
          window.kakao.maps.load(() => {
            setKakaoLoaded(true);
          });
        } catch (e) {
          setKakaoLoaded(true);
        }
      }
    };

    script.addEventListener('load', handleLoad);

    return () => {
      script?.removeEventListener('load', handleLoad);
    };
  }, []);

  // 2. Initialize Kakao Map once SDK is verified
  useEffect(() => {
    if (!kakaoLoaded || !mapContainerRef.current || !window.kakao?.maps) return;

    try {
      if (!mapInstanceRef.current) {
        const centerPos = new window.kakao.maps.LatLng(currentCoords.lat, currentCoords.lng);
        const map = new window.kakao.maps.Map(mapContainerRef.current, {
          center: centerPos,
          level: 3,
        });

        // Add Zoom Control
        const zoomControl = new window.kakao.maps.ZoomControl();
        map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

        // Marker
        const marker = new window.kakao.maps.Marker({
          position: centerPos,
          map: map,
        });

        // InfoWindow
        const infoWindow = new window.kakao.maps.InfoWindow({
          removable: false,
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        infoWindowRef.current = infoWindow;

        const forceRelayout = () => {
          if (map) {
            map.relayout();
            map.setCenter(centerPos);
          }
        };

        setTimeout(forceRelayout, 50);
        setTimeout(forceRelayout, 200);
        setTimeout(forceRelayout, 600);
      }
    } catch (err) {
      console.warn('Kakao map init warning:', err);
    }

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      ro = new ResizeObserver(() => {
        if (mapInstanceRef.current && window.kakao?.maps) {
          mapInstanceRef.current.relayout();
        }
      });
      ro.observe(mapContainerRef.current);
    }

    return () => {
      ro?.disconnect();
    };
  }, [kakaoLoaded]);

  // 3. Search and relocate map when address changes
  useEffect(() => {
    if (!address || !address.trim()) {
      setIsExactLocation(false);
      return;
    }

    const trimmedAddress = address.trim();

    const updateLocation = (lat: number, lng: number, isExact: boolean, displayAddr: string) => {
      setCurrentCoords({ lat, lng });
      setIsExactLocation(isExact);
      setGeocodedAddress(displayAddr);

      if (onCoordinatesChange) {
        onCoordinatesChange({ lat, lng });
      }

      if (mapInstanceRef.current && window.kakao?.maps) {
        mapInstanceRef.current.relayout();
        const moveLatLon = new window.kakao.maps.LatLng(lat, lng);
        mapInstanceRef.current.setCenter(moveLatLon);

        if (markerRef.current) {
          markerRef.current.setPosition(moveLatLon);
          markerRef.current.setMap(mapInstanceRef.current);
        }

        if (infoWindowRef.current) {
          const content = `
            <div style="padding: 6px 10px; font-size: 11px; font-family: sans-serif; font-weight: bold; color: #1e293b; background: #fff; border-radius: 6px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
              📍 ${displayAddr} ${detailAddress ? `<span style="color: #2563eb;">${detailAddress}</span>` : ''}
            </div>
          `;
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(mapInstanceRef.current, markerRef.current);
        }
      }
    };

    // If Kakao services are available, use Geocoder
    if (kakaoLoaded && window.kakao?.maps?.services) {
      try {
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(trimmedAddress, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            const exactLat = parseFloat(result[0].y);
            const exactLng = parseFloat(result[0].x);
            const roadAddr = result[0].road_address?.address_name || result[0].address_name || trimmedAddress;
            updateLocation(exactLat, exactLng, true, roadAddr);
          } else {
            const fallback = getCoordinatesFromAddress(trimmedAddress);
            updateLocation(fallback.lat, fallback.lng, false, trimmedAddress);
          }
        });
      } catch (e) {
        const fallback = getCoordinatesFromAddress(trimmedAddress);
        updateLocation(fallback.lat, fallback.lng, false, trimmedAddress);
      }
    } else {
      const fallback = getCoordinatesFromAddress(trimmedAddress);
      updateLocation(fallback.lat, fallback.lng, false, trimmedAddress);
    }
  }, [address, detailAddress, kakaoLoaded]);

  // Zoom helpers for SDK
  const handleZoom = (delta: number) => {
    if (mapInstanceRef.current && window.kakao?.maps) {
      mapInstanceRef.current.relayout();
      const currentLevel = mapInstanceRef.current.getLevel();
      mapInstanceRef.current.setLevel(currentLevel + delta);
    }
  };

  const handleCenter = () => {
    if (mapInstanceRef.current && window.kakao?.maps) {
      mapInstanceRef.current.relayout();
      const moveLatLon = new window.kakao.maps.LatLng(currentCoords.lat, currentCoords.lng);
      mapInstanceRef.current.setCenter(moveLatLon);
    }
  };

  if (!address || !address.trim()) {
    return (
      <div className={`w-full ${height} bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-4 text-center ${className}`}>
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2 shadow-xs">
          <MapPin className="w-5 h-5 animate-bounce" />
        </div>
        <p className="text-xs font-bold text-slate-700">실시간 위치 카카오 지도 미리보기</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          위 소재지 주소를 입력하시면 해당 위치의 카카오 지도가 자동으로 표시됩니다.
        </p>
      </div>
    );
  }

  const kakaoDirectionsUrl = `https://map.kakao.com/link/to/${encodeURIComponent(address)},${currentCoords.lat},${currentCoords.lng}`;
  const kakaoRoadviewUrl = `https://map.kakao.com/link/roadview/${currentCoords.lat},${currentCoords.lng}`;

  return (
    <div className={`relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100 ${className}`}>
      
      {/* 1. Top Header Bar: Location info & External Quick Links */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white text-xs z-10 relative flex-wrap gap-2">
        <div className="flex items-center gap-1.5 truncate pr-2">
          <MapPin className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <span className="font-bold truncate text-slate-100">
            {geocodedAddress || address} {detailAddress ? `(${detailAddress})` : ''}
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-600/90 text-white text-[10px] font-bold rounded-sm shrink-0">
            <CheckCircle className="w-2.5 h-2.5" />
            {isExactLocation ? '정밀좌표' : '위치 연동'}
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-blue-600 text-white text-[10px] font-bold rounded-sm shrink-0 shadow-2xs">
            <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
            위치 표시
          </span>
        </div>

        {/* Action Buttons: Direct Links */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <a
            href={kakaoDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="카카오 길찾기"
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
          >
            <span>길찾기</span>
            <Navigation className="w-2.5 h-2.5" />
          </a>
          <a
            href={kakaoRoadviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="카카오 로드뷰 보기"
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[11px] font-bold bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors shadow-2xs cursor-pointer"
          >
            <span>로드뷰</span>
            <Eye className="w-2.5 h-2.5" />
          </a>
          <a
            href={getKakaoMapUrl(address, currentCoords.lat, currentCoords.lng)}
            target="_blank"
            rel="noopener noreferrer"
            title="카카오맵에서 크게 보기"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-black bg-[#FEE500] text-[#191919] hover:bg-[#FADA0A] transition-colors shadow-2xs cursor-pointer"
          >
            <span>🟡 카카오맵</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <a
            href={getNaverMapUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            title="네이버지도에서 크게 보기"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-[#03C75A] text-white hover:bg-[#02b350] transition-colors shadow-2xs cursor-pointer"
          >
            <span>🟢 네이버</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* 2. Pure Map Canvas (No search bar, no portal header, clean pin only) */}
      <div 
        className={`w-full ${height} relative bg-slate-200 overflow-hidden`}
        style={{ minHeight: '300px' }}
      >
        {/* Pure Kakao Map Native SDK Canvas */}
        <div 
          ref={mapContainerRef} 
          className="w-full h-full block"
          style={{ width: '100%', height: '100%', minHeight: '300px' }}
        />

        {/* Floating Controls */}
        <div className="absolute bottom-2.5 right-2.5 flex flex-col gap-1 z-10">
          <button
            type="button"
            onClick={() => handleZoom(-1)}
            title="지도 확대"
            className="p-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-700 shadow-md border border-slate-200 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(1)}
            title="지도 축소"
            className="p-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-700 shadow-md border border-slate-200 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCenter}
            title="매물 위치로 중심 이동"
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Coordinate Badge at bottom-left */}
      <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-xs text-[10px] font-mono text-white/90 shadow-2xs flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span>위도: {currentCoords.lat.toFixed(5)}</span>
        <span>|</span>
        <span>경도: {currentCoords.lng.toFixed(5)}</span>
      </div>
    </div>
  );
};
