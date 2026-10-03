'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  MapPin, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  Navigation,
  CheckCircle,
  AlertCircle
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
  const [currentCoords, setCurrentCoords] = useState<Coordinates>(DEFAULT_CENTER);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState<string>('');
  const [isExactLocation, setIsExactLocation] = useState(false);

  // 1. Kakao Map SDK Dynamic Script Load
  useEffect(() => {
    const kakaoKey =
      process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ||
      process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;

    if (!kakaoKey || kakaoKey === 'your-kakao-map-key') {
      return;
    }

    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        setKakaoLoaded(true);
      });
      return;
    }

    // Check if script is already in document
    const existingScript = document.getElementById('kakao-maps-sdk');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.kakao?.maps) {
          window.kakao.maps.load(() => {
            setKakaoLoaded(true);
          });
        }
      });
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-maps-sdk';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => {
          setKakaoLoaded(true);
        });
      }
    };
    document.head.appendChild(script);
  }, []);

  // 2. Initialize Kakao Map once SDK is loaded
  useEffect(() => {
    if (!kakaoLoaded || !mapContainerRef.current || !window.kakao?.maps) return;

    try {
      if (!mapInstanceRef.current) {
        const centerPos = new window.kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
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
      console.warn('Kakao map init error:', err);
    }
  }, [kakaoLoaded]);

  // 3. Search and relocate map when address changes
  useEffect(() => {
    if (!address || !address.trim()) {
      setIsExactLocation(false);
      return;
    }

    const trimmedAddress = address.trim();
    setIsGeocoding(true);

    const updateLocation = (lat: number, lng: number, isExact: boolean, displayAddr: string) => {
      setCurrentCoords({ lat, lng });
      setIsExactLocation(isExact);
      setGeocodedAddress(displayAddr);
      setIsGeocoding(false);

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

    // If kakao services are available, use Geocoder
    if (kakaoLoaded && window.kakao?.maps?.services) {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(trimmedAddress, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          const exactLat = parseFloat(result[0].y);
          const exactLng = parseFloat(result[0].x);
          const roadAddr = result[0].road_address?.address_name || result[0].address_name || trimmedAddress;
          updateLocation(exactLat, exactLng, true, roadAddr);
        } else {
          // Fallback to local coordinates hash/keyword calculation
          const fallback = getCoordinatesFromAddress(trimmedAddress);
          updateLocation(fallback.lat, fallback.lng, false, trimmedAddress);
        }
      });
    } else {
      // Offline / fallback coordinate calculation
      const fallback = getCoordinatesFromAddress(trimmedAddress);
      updateLocation(fallback.lat, fallback.lng, false, trimmedAddress);
    }
  }, [address, detailAddress, kakaoLoaded]);

  // Zoom helpers
  const handleZoom = (delta: number) => {
    if (mapInstanceRef.current) {
      const currentLevel = mapInstanceRef.current.getLevel();
      mapInstanceRef.current.setLevel(currentLevel + delta);
    }
  };

  const handleCenter = () => {
    if (mapInstanceRef.current && window.kakao?.maps) {
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
        <p className="text-xs font-bold text-slate-700">카카오 지도 실시간 위치 미리보기</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          위 소재지 주소를 입력하시면 해당 위치의 카카오 지도가 자동으로 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100 ${className}`}>
      {/* Top Header Bar with address info & external links */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white text-xs z-10 relative">
        <div className="flex items-center gap-1.5 truncate pr-2">
          <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-bold truncate text-slate-100">
            {geocodedAddress || address} {detailAddress ? `(${detailAddress})` : ''}
          </span>
          {isExactLocation ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-600/90 text-white text-[10px] font-bold rounded-sm shrink-0">
              <CheckCircle className="w-2.5 h-2.5" />
              좌표 일치
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-500/80 text-white text-[10px] font-semibold rounded-sm shrink-0">
              <AlertCircle className="w-2.5 h-2.5" />
              위치 추정
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <a
            href={getKakaoMapUrl(address, currentCoords.lat, currentCoords.lng)}
            target="_blank"
            rel="noopener noreferrer"
            title="카카오맵 새 창 열기"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEE500] text-[#191919] hover:bg-[#FADA0A] transition-colors shadow-2xs"
          >
            <span>🟡 카카오맵</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <a
            href={getNaverMapUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            title="네이버지도 새 창 열기"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#03C75A] text-white hover:bg-[#02b350] transition-colors shadow-2xs"
          >
            <span>🟢 네이버</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Map Canvas */}
      <div 
        ref={mapContainerRef} 
        className={`w-full ${height} relative bg-slate-200`}
      >
        {/* Fallback View when Kakao map is loading or offline */}
        {!kakaoLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-600 p-4">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-xs font-semibold text-slate-700">카카오 지도 로딩 중...</p>
            <p className="text-[11px] text-slate-400 mt-1">좌표: {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}</p>
          </div>
        )}
      </div>

      {/* Floating Control Buttons */}
      <div className="absolute bottom-2.5 right-2.5 flex flex-col gap-1 z-10">
        <button
          type="button"
          onClick={() => handleZoom(-1)}
          title="지도 확대"
          className="p-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-700 shadow-md border border-slate-200 transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(1)}
          title="지도 축소"
          className="p-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-700 shadow-md border border-slate-200 transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCenter}
          title="매물 위치로 중심 이동"
          className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Subtle Coordinate Badge at bottom-left */}
      <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/70 backdrop-blur-xs text-[10px] font-mono text-white/90">
        위도: {currentCoords.lat.toFixed(5)} | 경도: {currentCoords.lng.toFixed(5)}
      </div>
    </div>
  );
};
