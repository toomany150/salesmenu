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
  AlertCircle,
  Copy,
  Info,
  Check
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

export const KakaoAddressMap: React.FC<KakaoAddressMapProps> = ({
  address,
  detailAddress,
  onCoordinatesChange,
  className = '',
  height = 'h-56',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  const [kakaoLoaded, setKakaoLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Coordinates & Address state
  const [currentCoords, setCurrentCoords] = useState<Coordinates>(() => getCoordinatesFromAddress(address));
  const [isExactLocation, setIsExactLocation] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState<string>('');

  // Fallback Interactive Map (OpenStreetMap tile) Zoom & Pan
  const [fallbackZoom, setFallbackZoom] = useState(16);

  // 1. Kakao Map SDK Dynamic Script Load with Timeout & Error handling
  useEffect(() => {
    const kakaoKey =
      process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ||
      process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;

    if (!kakaoKey || kakaoKey === 'your-kakao-map-key') {
      setLoadError('카카오 지도 키가 설정되지 않았습니다.');
      return;
    }

    // If window.kakao is already loaded
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

    // Check existing script tag
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
            setLoadError(null);
          });
        } catch (e) {
          setKakaoLoaded(true);
        }
      }
    };

    const handleError = () => {
      setLoadError('카카오 개발자 콘솔 Web 도메인 미등록 (401)');
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    // 2-second timeout: If Kakao SDK blocked by domain mismatch (HTTP 401), switch to smart fallback view
    const timer = setTimeout(() => {
      if (!window.kakao?.maps) {
        setLoadError('카카오 개발자 콘솔 Web 도메인 미등록');
      }
    }, 1800);

    return () => {
      clearTimeout(timer);
      script?.removeEventListener('load', handleLoad);
      script?.removeEventListener('error', handleError);
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
      }
    } catch (err) {
      console.warn('Kakao map init warning:', err);
    }
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
        const moveLatLon = new window.kakao.maps.LatLng(lat, lng);
        mapInstanceRef.current.panTo(moveLatLon);

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
      // Fast nationwide keyword/hash based coordinate lookup
      const fallback = getCoordinatesFromAddress(trimmedAddress);
      updateLocation(fallback.lat, fallback.lng, false, trimmedAddress);
    }
  }, [address, detailAddress, kakaoLoaded]);

  // Zoom helpers
  const handleZoom = (delta: number) => {
    if (mapInstanceRef.current && window.kakao?.maps) {
      const currentLevel = mapInstanceRef.current.getLevel();
      mapInstanceRef.current.setLevel(currentLevel + delta);
    } else {
      setFallbackZoom((prev) => Math.min(18, Math.max(12, prev - delta)));
    }
  };

  const handleCenter = () => {
    if (mapInstanceRef.current && window.kakao?.maps) {
      const moveLatLon = new window.kakao.maps.LatLng(currentCoords.lat, currentCoords.lng);
      mapInstanceRef.current.setCenter(moveLatLon);
    }
  };

  const copyDomain = () => {
    if (typeof window !== 'undefined') {
      const currentDomain = window.location.origin;
      navigator.clipboard.writeText(currentDomain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!address || !address.trim()) {
    return (
      <div className={`w-full ${height} bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-4 text-center ${className}`}>
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2 shadow-xs">
          <MapPin className="w-5 h-5 animate-bounce" />
        </div>
        <p className="text-xs font-bold text-slate-700">카카오 지도 실시간 위치 미리보기</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          위 소재지 주소를 입력하시면 해당 위치의 지도가 자동으로 표시됩니다.
        </p>
      </div>
    );
  }

  // Calculate bounding box for static tile preview
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  return (
    <div className={`relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100 ${className}`}>
      
      {/* 1. Top Header Bar with address info & external links */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white text-xs z-10 relative">
        <div className="flex items-center gap-1.5 truncate pr-2">
          <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-bold truncate text-slate-100">
            {geocodedAddress || address} {detailAddress ? `(${detailAddress})` : ''}
          </span>
          {isExactLocation ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-600/90 text-white text-[10px] font-bold rounded-sm shrink-0">
              <CheckCircle className="w-2.5 h-2.5" />
              정밀좌표
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-blue-600/90 text-white text-[10px] font-bold rounded-sm shrink-0">
              위치 연동
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <a
            href={getKakaoMapUrl(address, currentCoords.lat, currentCoords.lng)}
            target="_blank"
            rel="noopener noreferrer"
            title="카카오맵에서 큰 화면으로 보기"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-black bg-[#FEE500] text-[#191919] hover:bg-[#FADA0A] transition-colors shadow-2xs"
          >
            <span>🟡 카카오맵</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <a
            href={getNaverMapUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            title="네이버지도에서 큰 화면으로 보기"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-black bg-[#03C75A] text-white hover:bg-[#02b350] transition-colors shadow-2xs"
          >
            <span>🟢 네이버</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* 2. Map Canvas (Kakao Map or Interactive Open Map Fallback) */}
      <div 
        ref={mapContainerRef} 
        className={`w-full ${height} relative bg-slate-200 overflow-hidden`}
      >
        {/* If Kakao Map is NOT loaded yet (e.g. domain not yet added to Kakao developers console) */}
        {!kakaoLoaded && (
          <div className="absolute inset-0 z-0">
            {/* Real Interactive Map Canvas using high-resolution OpenStreetMap tile */}
            <iframe
              title="위치 지도"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentCoords.lng - 0.005}%2C${currentCoords.lat - 0.003}%2C${currentCoords.lng + 0.005}%2C${currentCoords.lat + 0.003}&layer=mapnik&marker=${currentCoords.lat}%2C${currentCoords.lng}`}
              className="w-full h-full border-0 pointer-events-auto"
              loading="lazy"
            />

            {/* Smart Notice Bar when Kakao Domain registration is needed */}
            {loadError && (
              <div className="absolute top-2 left-2 right-12 z-20 bg-slate-900/90 backdrop-blur-md text-white px-3 py-2 rounded-xl border border-slate-700 shadow-lg text-[11px] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">
                    카카오 공식 지도를 띄우려면 카카오 개발자에 <strong>{currentOrigin}</strong> 등록이 필요합니다.
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={copyDomain}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold shadow-2xs transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? '복사됨!' : '도메인 복사'}</span>
                  </button>
                  <a
                    href="https://developers.kakao.com/console/app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded text-[10px] shadow-2xs transition-colors"
                  >
                    <span>개발자 콘솔</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Floating Control Buttons */}
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

      {/* 4. Subtle Coordinate Badge at bottom-left */}
      <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-xs text-[10px] font-mono text-white/90 shadow-2xs">
        위도: {currentCoords.lat.toFixed(5)} | 경도: {currentCoords.lng.toFixed(5)}
      </div>
    </div>
  );
};
