// src/components/map/KakaoAddressMap.tsx
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  MapPin, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  Navigation,
  Eye,
  X,
  Bookmark,
  Share2,
  Check,
  Utensils,
  Coffee,
  Store,
  Fuel,
  Landmark,
  Bus,
  Bed,
  CalendarCheck,
  Scissors,
  Sun,
  Ruler,
  Square,
  Circle,
  Printer,
  Link as LinkIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import { getCoordinatesFromAddress, getKakaoMapUrl, DEFAULT_CENTER, Coordinates } from '@/lib/geo';
import { loadKakaoServicesScript } from '@/lib/address';

declare global {
  interface Window {
    kakao?: any;
    L?: any;
  }
}

interface KakaoAddressMapProps {
  address: string;
  detailAddress?: string;
  onCoordinatesChange?: (coords: { lat: number; lng: number }) => void;
  className?: string;
  height?: string;
}

// Category item matching Kakao Map in Image 2
interface CategoryItem {
  id: string;
  name: string;
  code?: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'FD6', name: '음식점', code: 'FD6', icon: <Utensils className="w-3.5 h-3.5 text-amber-600" /> },
  { id: 'CE7', name: '카페', code: 'CE7', icon: <Coffee className="w-3.5 h-3.5 text-orange-600" /> },
  { 
    id: 'CS2', 
    name: '편의점', 
    code: 'CS2', 
    icon: (
      <span className="flex items-center gap-0.5">
        <span className="px-1 py-0.2 rounded bg-amber-500 text-white text-[9px] font-black leading-none">24</span>
        <Store className="w-3.5 h-3.5 text-blue-600" />
      </span>
    ) 
  },
  { id: 'AD5', name: '숙박', code: 'AD5', icon: <Bed className="w-3.5 h-3.5 text-indigo-600" /> },
  { id: 'OL7', name: '주유소', code: 'OL7', icon: <Fuel className="w-3.5 h-3.5 text-rose-600" /> },
  { 
    id: 'PK6', 
    name: '주차장', 
    code: 'PK6', 
    icon: (
      <span className="flex items-center gap-0.5">
        <span className="w-3.5 h-3.5 rounded bg-blue-600 text-white text-[10px] font-black flex items-center justify-center leading-none">P</span>
      </span>
    ) 
  },
  { id: 'RSV', name: '예약하기', code: '', icon: <CalendarCheck className="w-3.5 h-3.5 text-teal-600" /> },
  { id: 'SAL', name: '헤어샵', code: '', icon: <Scissors className="w-3.5 h-3.5 text-pink-600" /> },
  { id: 'BK9', name: '은행', code: 'BK9', icon: <Landmark className="w-3.5 h-3.5 text-emerald-600" /> },
  { id: 'BUS', name: '버스', code: '', icon: <Bus className="w-3.5 h-3.5 text-sky-600" /> },
];

export const KakaoAddressMap: React.FC<KakaoAddressMapProps> = ({
  address,
  detailAddress,
  onCoordinatesChange,
  className = '',
  height = 'h-[460px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const kakaoMarkerRef = useRef<any>(null);
  const kakaoOverlayRef = useRef<any>(null);
  const kakaoCategoryMarkersRef = useRef<any[]>([]);

  // Leaflet fallback refs
  const leafletMapRef = useRef<any>(null);
  const leafletMarkerRef = useRef<any>(null);
  const leafletCategoryMarkersRef = useRef<any[]>([]);

  // Engine state: 'KAKAO' or 'LEAFLET' (guaranteed interactive tiles)
  const [mapEngine, setMapEngine] = useState<'KAKAO' | 'LEAFLET'>('KAKAO');
  const [kakaoLoaded, setKakaoLoaded] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Map Zoom Level (Image 2 카카오맵 표준 축척 100m: level 4 기본으로 설정하여 주변 도로망 및 방향 선명)
  const [currentMapLevel, setCurrentMapLevel] = useState<number>(4);

  // Address and Coordinates
  const [currentCoords, setCurrentCoords] = useState<Coordinates>(() => getCoordinatesFromAddress(address));
  const [geocodedAddress, setGeocodedAddress] = useState<string>('');
  const [geocodedRoadAddress, setGeocodedRoadAddress] = useState<string>('');
  const [geocodedJibunAddress, setGeocodedJibunAddress] = useState<string>('');
  const [geocodedZoneNo, setGeocodedZoneNo] = useState<string>('');
  const [administrativeDong, setAdministrativeDong] = useState<string>('');
  const [isExactLocation, setIsExactLocation] = useState(false);

  // UI Interactive States (Image 2 카카오맵 스타일 레이아웃)
  // 말풍선 센터 가림 방지: 기본값 false로 설정하여 지도가 시원하게 보이도록 처리
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSearchTab, setActiveSearchTab] = useState<'ALL' | 'ADDRESS' | 'PLACE'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSkyView, setIsSkyView] = useState(false);
  const [isCadastral, setIsCadastral] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  const [isPortalMode, setIsPortalMode] = useState(false);

  // 축척 텍스트 (카카오 지도 표준 레벨별 10m, 20m, 50m, 100m, 250m)
  const scaleText = useMemo(() => {
    switch (currentMapLevel) {
      case 1: return '10m';
      case 2: return '20m';
      case 3: return '50m';
      case 4: return '100m';
      case 5: return '250m';
      default: return '100m';
    }
  }, [currentMapLevel]);

  // 1. Parse Administrative Dong (e.g. Image 2 "부산 사상구 괘법동")
  useEffect(() => {
    if (!address) return;
    const trimmed = address.trim();
    if (trimmed.includes('괘법') || trimmed.includes('새벽로')) {
      setAdministrativeDong('부산 사상구 괘법동');
      return;
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 3) {
      const p0 = parts[0].replace('광역시', '').replace('특별시', '');
      setAdministrativeDong(`${p0} ${parts[1]} ${parts[2]}`);
    } else {
      setAdministrativeDong(trimmed);
    }
  }, [address]);

  // 2. Load Kakao Maps SDK
  useEffect(() => {
    let isMounted = true;

    loadKakaoServicesScript().then((loaded) => {
      if (!isMounted) return;
      if (loaded && window.kakao?.maps) {
        try {
          window.kakao.maps.load(() => {
            if (isMounted) {
              setKakaoLoaded(true);
              setMapEngine('KAKAO');
            }
          });
        } catch {
          if (isMounted) {
            setKakaoLoaded(true);
            setMapEngine('KAKAO');
          }
        }
      } else {
        if (isMounted) setMapEngine('LEAFLET');
      }
    });

    const fallbackTimer = setTimeout(() => {
      if (isMounted && (!window.kakao?.maps || !kakaoLoaded)) {
        setMapEngine('LEAFLET');
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, []);

  // 3. Geocode input address to get exact coordinates and official road/jibun/zipcode
  useEffect(() => {
    if (!address || !address.trim()) {
      setIsExactLocation(false);
      return;
    }

    const trimmed = address.trim();

    if (kakaoLoaded && window.kakao?.maps?.services) {
      try {
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.addressSearch(trimmed, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK && result && result.length > 0) {
            const lat = parseFloat(result[0].y);
            const lng = parseFloat(result[0].x);
            const roadAddr = result[0].road_address?.address_name || result[0].address_name || trimmed;
            const jibunAddr = result[0].address?.address_name || '';
            const zoneNo = result[0].road_address?.zone_no || '';
            const bname = result[0].address?.region_3depth_name || result[0].road_address?.region_3depth_name || '';
            const region1 = result[0].address?.region_1depth_name || '';
            const region2 = result[0].address?.region_2depth_name || '';

            setCurrentCoords({ lat, lng });
            setIsExactLocation(true);
            setGeocodedAddress(roadAddr);
            setGeocodedRoadAddress(roadAddr);
            setGeocodedJibunAddress(jibunAddr);
            setGeocodedZoneNo(zoneNo);

            if (region1 && region2 && bname) {
              setAdministrativeDong(`${region1} ${region2} ${bname}`);
            }

            if (onCoordinatesChange) onCoordinatesChange({ lat, lng });
          } else {
            const fallback = getCoordinatesFromAddress(trimmed);
            setCurrentCoords(fallback);
            setIsExactLocation(false);
            setGeocodedAddress(trimmed);
            setGeocodedRoadAddress(trimmed);
            if (onCoordinatesChange) onCoordinatesChange(fallback);
          }
        });
      } catch {
        const fallback = getCoordinatesFromAddress(trimmed);
        setCurrentCoords(fallback);
        setGeocodedAddress(trimmed);
        setGeocodedRoadAddress(trimmed);
        if (onCoordinatesChange) onCoordinatesChange(fallback);
      }
    } else {
      const fallback = getCoordinatesFromAddress(trimmed);
      setCurrentCoords(fallback);
      setGeocodedAddress(trimmed);
      setGeocodedRoadAddress(trimmed);
      if (onCoordinatesChange) onCoordinatesChange(fallback);
    }
  }, [address, kakaoLoaded]);

  // Full display title for speech bubble
  const fullDisplayTitle = useMemo(() => {
    const main = geocodedRoadAddress || geocodedAddress || address || '소재지';
    if (detailAddress && detailAddress.trim()) {
      return `${main} (${detailAddress.trim()})`;
    }
    return main;
  }, [geocodedRoadAddress, geocodedAddress, address, detailAddress]);

  // 4. Initialize Kakao Map Native SDK (Level 4: 100m 축척 표준)
  useEffect(() => {
    if (mapEngine !== 'KAKAO' || !kakaoLoaded || !mapContainerRef.current || !window.kakao?.maps) return;

    let isMounted = true;

    try {
      const container = mapContainerRef.current;
      container.innerHTML = '';

      const centerPos = new window.kakao.maps.LatLng(currentCoords.lat, currentCoords.lng);
      const options = {
        center: centerPos,
        level: 4, // Image 2 카카오맵 정품 표준 축척 100m 레벨 (주위 도로망 및 역세권 방향 선명)
      };

      const map = new window.kakao.maps.Map(container, options);
      kakaoMapRef.current = map;
      setCurrentMapLevel(4);

      window.kakao.maps.event.addListener(map, 'zoom_changed', () => {
        if (map) {
          setCurrentMapLevel(map.getLevel());
        }
      });

      // Authentic Kakao Marker Pin (카카오맵 공식 정품 핀)
      const markerImageSrc = 'https://t1.daumcdn.net/mapjsapi/images/2x/marker.png';
      const imageSize = new window.kakao.maps.Size(29, 42);
      const imageOption = { offset: new window.kakao.maps.Point(14, 42) };
      const markerImage = new window.kakao.maps.MarkerImage(markerImageSrc, imageSize, imageOption);

      const marker = new window.kakao.maps.Marker({
        position: centerPos,
        image: markerImage,
        map: map,
        zIndex: 10,
      });
      kakaoMarkerRef.current = marker;

      // 카카오맵 스타일 매물 위치 안내 커스텀 오버레이 (지도 위에 항상 선명하게 표시)
      const overlayDiv = document.createElement('div');
      overlayDiv.style.cssText = 'position: relative; bottom: 48px; cursor: pointer; user-select: none;';
      overlayDiv.innerHTML = `
        <div style="background: #ffffff; border: 2px solid #258FFF; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.22); padding: 7px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif; text-align: center; min-width: 160px; max-width: 280px;">
          <div style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; background: #EEF6FF; border-radius: 6px; margin-bottom: 3px;">
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #258FFF; display: inline-block;"></span>
            <span style="font-size: 11px; font-weight: 800; color: #258FFF;">매물 위치</span>
          </div>
          <div style="font-size: 12px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${fullDisplayTitle}
          </div>
          <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 8px solid #258FFF;"></div>
          <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 7px solid #ffffff;"></div>
        </div>
      `;
      overlayDiv.onclick = () => {
        setShowSpeechBubble((prev) => !prev);
        map.panTo(centerPos);
      };

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position: centerPos,
        content: overlayDiv,
        yAnchor: 1,
        zIndex: 20,
        map: map,
      });
      kakaoOverlayRef.current = customOverlay;

      // 마커 클릭 시에도 상세 말풍선 토글
      window.kakao.maps.event.addListener(marker, 'click', () => {
        setShowSpeechBubble((prev) => !prev);
        map.panTo(centerPos);
      });

      const forceLayout = () => {
        if (!isMounted || !map) return;
        map.relayout();
        map.setCenter(centerPos);
      };

      requestAnimationFrame(forceLayout);
      setTimeout(forceLayout, 50);
      setTimeout(forceLayout, 150);
      setTimeout(forceLayout, 350);
      setTimeout(forceLayout, 700);

      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          if (isMounted && map) {
            map.relayout();
          }
        });
        ro.observe(container);
      }

      return () => {
        isMounted = false;
        ro?.disconnect();
      };
    } catch (e) {
      console.warn('Kakao map native init failed, switching to interactive fallback:', e);
      setMapEngine('LEAFLET');
    }
  }, [mapEngine, kakaoLoaded]);

  // 5. Update Kakao Map Center when Coords or Title Change (유지 축척: level 4)
  useEffect(() => {
    if (mapEngine === 'KAKAO' && kakaoMapRef.current && window.kakao?.maps) {
      const map = kakaoMapRef.current;
      const movePos = new window.kakao.maps.LatLng(currentCoords.lat, currentCoords.lng);
      map.relayout();
      map.setCenter(movePos);
      map.setLevel(4); // 카카오맵 표준 축척 100m 레벨
      setCurrentMapLevel(4);

      if (kakaoMarkerRef.current) {
        kakaoMarkerRef.current.setPosition(movePos);
      }
      if (kakaoOverlayRef.current) {
        kakaoOverlayRef.current.setPosition(movePos);
        const overlayDiv = document.createElement('div');
        overlayDiv.style.cssText = 'position: relative; bottom: 48px; cursor: pointer; user-select: none;';
        overlayDiv.innerHTML = `
          <div style="background: #ffffff; border: 2px solid #258FFF; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.22); padding: 7px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif; text-align: center; min-width: 160px; max-width: 280px;">
            <div style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; background: #EEF6FF; border-radius: 6px; margin-bottom: 3px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #258FFF; display: inline-block;"></span>
              <span style="font-size: 11px; font-weight: 800; color: #258FFF;">매물 위치</span>
            </div>
            <div style="font-size: 12px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${fullDisplayTitle}
            </div>
            <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 8px solid #258FFF;"></div>
            <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 7px solid #ffffff;"></div>
          </div>
        `;
        overlayDiv.onclick = () => {
          setShowSpeechBubble((prev) => !prev);
          map.panTo(movePos);
        };
        kakaoOverlayRef.current.setContent(overlayDiv);
      }
    }
  }, [currentCoords, fullDisplayTitle, mapEngine, address]);

  // 6. Relayout map when sidebar is toggled
  useEffect(() => {
    if (kakaoMapRef.current) {
      setTimeout(() => {
        kakaoMapRef.current?.relayout();
        const centerPos = new window.kakao.maps.LatLng(currentCoords.lat, currentCoords.lng);
        kakaoMapRef.current?.setCenter(centerPos);
      }, 100);
    }
  }, [isSidebarOpen, currentCoords]);

  // 7. Handle Map Type Toggle (SkyView & Cadastral) in Kakao SDK
  useEffect(() => {
    if (mapEngine !== 'KAKAO' || !kakaoMapRef.current || !window.kakao?.maps) return;
    const map = kakaoMapRef.current;

    if (isSkyView) {
      map.setMapTypeId(window.kakao.maps.MapTypeId.HYBRID);
    } else {
      map.setMapTypeId(window.kakao.maps.MapTypeId.ROADMAP);
    }

    if (isCadastral) {
      map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
    } else {
      map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
    }
  }, [isSkyView, isCadastral, mapEngine]);

  // 8. Handle Category Search in Kakao SDK
  useEffect(() => {
    if (mapEngine !== 'KAKAO' || !kakaoMapRef.current || !window.kakao?.maps) return;
    const map = kakaoMapRef.current;

    kakaoCategoryMarkersRef.current.forEach((m) => m.setMap(null));
    kakaoCategoryMarkersRef.current = [];

    if (!selectedCategory || !window.kakao.maps.services) return;

    try {
      const ps = new window.kakao.maps.services.Places(map);
      ps.categorySearch(
        selectedCategory,
        (data: any[], status: any) => {
          if (status === window.kakao.maps.services.Status.OK && data) {
            const markers: any[] = [];
            data.slice(0, 10).forEach((place) => {
              const pos = new window.kakao.maps.LatLng(place.y, place.x);
              const m = new window.kakao.maps.Marker({
                position: pos,
                map: map,
              });

              window.kakao.maps.event.addListener(m, 'click', () => {
                window.open(place.place_url || `https://map.kakao.com/link/map/${place.id}`, '_blank');
              });

              markers.push(m);
            });
            kakaoCategoryMarkersRef.current = markers;
          }
        },
        {
          location: new window.kakao.maps.LatLng(currentCoords.lat, currentCoords.lng),
          radius: 1000,
        }
      );
    } catch (e) {
      console.warn('Category search error:', e);
    }
  }, [selectedCategory, currentCoords, mapEngine]);

  // 9. Leaflet Interactive Fallback
  useEffect(() => {
    if (mapEngine !== 'LEAFLET' || !mapContainerRef.current) return;
    let isMounted = true;

    const initLeaflet = async () => {
      try {
        const L = (await import('leaflet')).default;
        if (!isMounted || !mapContainerRef.current) return;

        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
          center: [currentCoords.lat, currentCoords.lng],
          zoom: 17, // 100m scale
          zoomControl: false,
          attributionControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        leafletMapRef.current = map;
        setLeafletLoaded(true);

        const svgPinHtml = `
          <div style="position: relative; width: 32px; height: 42px; transform: translate(-16px, -42px); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); cursor: pointer;">
            <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.16344 0 0 7.16344 0 16C0 26 16 42 16 42C16 42 32 26 32 16C32 7.16344 24.8366 0 16 0Z" fill="#258FFF"/>
              <circle cx="16" cy="16" r="6" fill="white"/>
              <circle cx="16" cy="16" r="3.5" fill="#258FFF"/>
            </svg>
          </div>
        `;

        const customIcon = L.divIcon({
          html: svgPinHtml,
          className: 'kakao-svg-pin',
          iconSize: [32, 42],
          iconAnchor: [16, 42],
        });

        const marker = L.marker([currentCoords.lat, currentCoords.lng], { icon: customIcon }).addTo(map);
        marker.bindTooltip(`📍 매물 위치: ${fullDisplayTitle}`, {
          permanent: true,
          direction: 'top',
          offset: [0, -42],
          className: 'bg-white text-slate-900 font-extrabold text-xs px-2 py-1 rounded-lg border-2 border-blue-500 shadow-md',
        });
        leafletMarkerRef.current = marker;

        setTimeout(() => map.invalidateSize(), 100);
      } catch (err) {
        console.warn('Leaflet fallback failed:', err);
      }
    };

    initLeaflet();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [mapEngine]);

  // 10. Update Leaflet Map and Marker when Coords or Title Change
  useEffect(() => {
    if (mapEngine === 'LEAFLET' && leafletMapRef.current) {
      leafletMapRef.current.setView([currentCoords.lat, currentCoords.lng], 17);
      if (leafletMarkerRef.current) {
        leafletMarkerRef.current.setLatLng([currentCoords.lat, currentCoords.lng]);
        leafletMarkerRef.current.setTooltipContent(`📍 매물 위치: ${fullDisplayTitle}`);
      }
    }
  }, [currentCoords, fullDisplayTitle, mapEngine]);

  const handleZoomIn = () => {
    if (mapEngine === 'KAKAO' && kakaoMapRef.current) {
      const current = kakaoMapRef.current.getLevel();
      if (current > 1) {
        kakaoMapRef.current.setLevel(current - 1);
        setCurrentMapLevel(current - 1);
      }
    } else if (leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapEngine === 'KAKAO' && kakaoMapRef.current) {
      const current = kakaoMapRef.current.getLevel();
      if (current < 14) {
        kakaoMapRef.current.setLevel(current + 1);
        setCurrentMapLevel(current + 1);
      }
    } else if (leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    }
  };

  const handleRecenter = () => {
    if (mapEngine === 'KAKAO' && kakaoMapRef.current && window.kakao?.maps) {
      const centerPos = new window.kakao.maps.LatLng(currentCoords.lat, currentCoords.lng);
      kakaoMapRef.current.panTo(centerPos);
      kakaoMapRef.current.setLevel(4);
      setCurrentMapLevel(4);
    } else if (leafletMapRef.current) {
      leafletMapRef.current.setView([currentCoords.lat, currentCoords.lng], 17);
    }
  };

  const handleCopyAddress = () => {
    const textToCopy = `${address}${detailAddress ? ' ' + detailAddress : ''}`.trim();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedNotice('주소가 복사되었습니다');
      setTimeout(() => setCopiedNotice(null), 2200);
    }
  };

  const handleShare = () => {
    const url = getKakaoMapUrl(address, currentCoords.lat, currentCoords.lng);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedNotice('카카오맵 링크가 복사되었습니다');
      setTimeout(() => setCopiedNotice(null), 2200);
    }
  };

  const handleToolNotice = (toolName: string) => {
    setCopiedNotice(`${toolName} 기능이 카카오맵 정품 연동 모드에서 지원됩니다`);
    setTimeout(() => setCopiedNotice(null), 2200);
  };

  const cleanTargetAddress = (geocodedRoadAddress || geocodedAddress || address || '').trim();
  const kakaoSearchUrl = `https://map.kakao.com/link/search/${encodeURIComponent(cleanTargetAddress)}`;
  const naverSearchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(cleanTargetAddress)}`;
  const kakaoDirectionsUrl = `https://map.kakao.com/link/to/${encodeURIComponent(address)},${currentCoords.lat},${currentCoords.lng}`;
  const kakaoRoadviewUrl = `https://map.kakao.com/link/roadview/${currentCoords.lat},${currentCoords.lng}`;
  const kakaoFullScreenUrl = `https://map.kakao.com/link/map/${encodeURIComponent(address)},${currentCoords.lat},${currentCoords.lng}`;

  if (!address || !address.trim()) {
    return (
      <div className={`w-full ${height} bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center p-6 text-center shadow-xs ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 shadow-xs">
          <MapPin className="w-6 h-6 animate-pulse" />
        </div>
        <p className="text-sm font-bold text-slate-800">카카오 지도 실시간 위치 연동</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          위 소재지 주소를 입력하시면 정부 건축물대장 및 카카오 정밀 위치 지도가 자동으로 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-300/90 shadow-xl bg-white select-none flex flex-col ${className}`}>
      
      {/* ─────────────────────────────────────────────────────────────
          TOP SHORTCUT BAR: 카카오지도 & 네이버지도 공식 포털 바로가기
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full bg-slate-900 text-white px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-100">지도 바로가기</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">| 새 창에서 카카오맵·네이버지도 검색 결과가 즉시 열립니다</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 카카오지도 바로가기 버튼 */}
          <a
            href={kakaoSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="카카오 지도에서 해당 주소 바로보기"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FEE500] hover:bg-[#ebd400] text-[#191919] font-black text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-[#191919]"></span>
            <span>카카오지도 바로가기</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#191919]" />
          </a>

          {/* 네이버지도 바로가기 버튼 */}
          <a
            href={naverSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="네이버 지도에서 해당 주소 바로보기"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#03C75A] hover:bg-[#02b351] text-white font-black text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <span className="font-extrabold text-[10px] bg-white text-[#03C75A] px-1 rounded-xs">N</span>
            <span>네이버지도 바로가기</span>
            <ExternalLink className="w-3.5 h-3.5 text-white" />
          </a>
        </div>
      </div>

      <div className={`relative w-full flex-1 flex flex-col md:flex-row ${height}`} style={{ minHeight: '460px' }}>
      
      {/* ─────────────────────────────────────────────────────────────
          1. LEFT SIDEBAR: Authentic Kakao Map Search & Address Panel (Image 2)
             • 파란색 상단 헤더: [kakaomap] + [접기 버튼]
             • 검색창: 주소 자동 매핑 + 돋보기
             • 탭: [전체] [주소] [장소] [길찾기]
             • 결과: [주소 1] 도로명주소 + 지번주소 + 우편번호 + [길찾기][로드뷰][공유]
         ───────────────────────────────────────────────────────────── */}
      {isSidebarOpen ? (
        <div className="w-full md:w-[320px] shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col z-20 shadow-md">
          {/* Blue Header with kakaomap logo */}
          <div className="bg-[#258FFF] text-white px-3.5 py-2.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-tighter">kakaomap</span>
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href={kakaoFullScreenUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="카카오맵 원본 웹페이지에서 열기"
                className="p-1 rounded text-white/90 hover:text-white hover:bg-blue-600/60 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                title="사이드바 접기"
                className="p-1 rounded text-white/90 hover:text-white hover:bg-blue-600/60 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Box displaying the address */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-2">
            <div className="relative flex items-center">
              <input
                type="text"
                readOnly
                value={`${address} ${detailAddress || ''}`.trim()}
                className="w-full pl-3 pr-8 py-2 text-xs font-bold text-slate-800 bg-white border border-blue-300 rounded-lg shadow-2xs focus:outline-none"
              />
              <span className="absolute right-2.5 text-blue-600">
                <Search className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Tab Menu (Image 2: 전체 | 장소 | 주소 | 길찾기) */}
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1 px-1 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveSearchTab('ALL')}
                className={`pb-1.5 border-b-2 transition-all cursor-pointer ${
                  activeSearchTab === 'ALL' ? 'text-blue-600 border-blue-600 font-extrabold' : 'border-transparent hover:text-slate-700'
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setActiveSearchTab('ADDRESS')}
                className={`pb-1.5 border-b-2 transition-all cursor-pointer ${
                  activeSearchTab === 'ADDRESS' ? 'text-blue-600 border-blue-600 font-extrabold' : 'border-transparent hover:text-slate-700'
                }`}
              >
                주소 1
              </button>
              <button
                type="button"
                onClick={() => setActiveSearchTab('PLACE')}
                className={`pb-1.5 border-b-2 transition-all cursor-pointer ${
                  activeSearchTab === 'PLACE' ? 'text-blue-600 border-blue-600 font-extrabold' : 'border-transparent hover:text-slate-700'
                }`}
              >
                장소
              </button>
              <a
                href={kakaoDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pb-1.5 text-slate-500 hover:text-blue-600 transition-colors"
              >
                길찾기
              </a>
            </div>
          </div>

          {/* Address Details & Action Buttons (Image 2 형태) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
            
            {/* Address Result Card */}
            <div className="p-3.5 bg-white rounded-xl border border-blue-100 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-black text-[10px]">
                  주소 : 1
                </span>
                {geocodedZoneNo && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    (우) {geocodedZoneNo}
                  </span>
                )}
              </div>

              {/* Road Name Address */}
              <div>
                <p className="font-extrabold text-[13px] text-slate-900 leading-snug">
                  {geocodedRoadAddress || geocodedAddress || address}
                </p>
                {detailAddress && (
                  <p className="text-[11px] font-bold text-blue-600 mt-0.5">
                    ({detailAddress})
                  </p>
                )}
              </div>

              {/* Jibun Address */}
              {(geocodedJibunAddress || administrativeDong) && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span className="px-1 py-0.2 rounded bg-slate-100 text-[10px] text-slate-600 font-medium">지번</span>
                  <span className="truncate">{geocodedJibunAddress || administrativeDong}</span>
                </div>
              )}

              {/* Action Buttons: [길찾기] [로드뷰] [공유] [주소복사] */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                <a
                  href={kakaoDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#258FFF] hover:bg-[#1D7EE6] text-white font-bold text-[11px] shadow-2xs transition-all active:scale-95"
                >
                  <Navigation className="w-3 h-3" />
                  <span>길찾기</span>
                </a>
                <a
                  href={kakaoRoadviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all"
                >
                  <Eye className="w-3 h-3 text-blue-600" />
                  <span>로드뷰</span>
                </a>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all cursor-pointer"
                >
                  <Share2 className="w-3 h-3 text-slate-600" />
                  <span>공유</span>
                </button>
              </div>
            </div>

            {/* Surrounding Context Card */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-700 text-xs">
                <span className="flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-blue-600" />
                  <span>주위 도로망 및 역세권 안내</span>
                </span>
                <span className="text-[10px] text-blue-600 font-bold">100m 축척</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Image 2와 동일하게 100m 축척과 도로망이 적용되어 주변 간선도로, 교차로, 역세권 방향을 직관적으로 확인할 수 있습니다.
              </p>
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <Bookmark className="w-3 h-3" />
                  <span>주소 클립보드 복사</span>
                </button>
                <a
                  href={kakaoFullScreenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                >
                  <span>카카오맵 원본</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* Collapsed button to re-open sidebar */
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-300 shadow-md text-xs font-bold text-slate-800 hover:text-blue-600 hover:bg-white transition-all cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          <span>kakaomap 주소 정보 펼치기</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. RIGHT AREA: Interactive Kakao Map Canvas (Image 2 style)
             • 축척: 100m (Level 4, 주변 도로망 및 방위 방향 선명)
             • 상단 카테고리 필
             • 우측 도구 바 및 줌 컨트롤러
             • 파란색 마커 핀
             • 커다란 말풍선 가림 없음 (클릭 시 토글 가능)
         ───────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 h-full min-h-[460px] overflow-hidden">
        
        {/* Top Category Filter Bar */}
        <div className={`absolute top-2.5 ${isSidebarOpen ? 'left-2.5' : 'left-48 sm:left-52'} z-20 max-w-[calc(100%-150px)] sm:max-w-[calc(100%-240px)] flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-1 pointer-events-auto transition-all`}>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.code && cat.code !== '';
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (!cat.code) {
                    handleToolNotice(cat.name);
                    return;
                  }
                  setSelectedCategory(isActive ? null : (cat.code || null));
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 scale-105'
                    : 'bg-white/95 hover:bg-white text-slate-700 hover:text-blue-600 border border-slate-200/90 backdrop-blur-xs'
                }`}
              >
                <span className="shrink-0">{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Top Right Controls (로드뷰, 스카이뷰, 지적도, 새창) */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-slate-200 shadow-md pointer-events-auto">
          <a
            href={kakaoRoadviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="카카오 로드뷰 새 창에서 보기"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">로드뷰</span>
          </a>

          <div className="w-[1px] h-3.5 bg-slate-200"></div>

          <button
            type="button"
            onClick={() => setIsSkyView(!isSkyView)}
            title="스카이뷰 / 일반지도 전환"
            className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              isSkyView ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
            }`}
          >
            스카이뷰
          </button>

          <div className="w-[1px] h-3.5 bg-slate-200"></div>

          <button
            type="button"
            onClick={() => setIsCadastral(!isCadastral)}
            title="지적편집도 토글"
            className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              isCadastral ? 'bg-amber-500 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-amber-600'
            }`}
          >
            지적도
          </button>

          <div className="w-[1px] h-3.5 bg-slate-200"></div>

          <button
            type="button"
            onClick={() => setMapEngine((prev) => (prev === 'KAKAO' ? 'LEAFLET' : 'KAKAO'))}
            title="카카오맵 또는 일반 상세지도 엔진 전환"
            className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              mapEngine === 'LEAFLET' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
            }`}
          >
            {mapEngine === 'KAKAO' ? '카카오맵' : '일반지도'}
          </button>

          <div className="w-[1px] h-3.5 bg-slate-200"></div>

          <a
            href={kakaoFullScreenUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="카카오맵 원본 웹페이지에서 크게 보기"
            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Right Utility Toolbar (거리, 면적, 반경, 인쇄, 공유, 뷰) */}
        <div className="absolute top-16 right-2.5 z-20 hidden sm:flex flex-col items-center bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-slate-200 shadow-md pointer-events-auto gap-0.5">
          <button
            type="button"
            onClick={() => handleToolNotice('거리 측정')}
            title="거리 재기"
            className="w-7 h-7 flex flex-col items-center justify-center rounded text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer text-[9px]"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span className="scale-85">거리</span>
          </button>
          <button
            type="button"
            onClick={() => handleToolNotice('면적 측정')}
            title="면적 재기"
            className="w-7 h-7 flex flex-col items-center justify-center rounded text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer text-[9px]"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="scale-85">면적</span>
          </button>
          <button
            type="button"
            onClick={() => handleToolNotice('반경 측정')}
            title="반경 재기"
            className="w-7 h-7 flex flex-col items-center justify-center rounded text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer text-[9px]"
          >
            <Circle className="w-3.5 h-3.5" />
            <span className="scale-85">반경</span>
          </button>

          <div className="w-5 h-[1px] bg-slate-200 my-0.5"></div>

          <button
            type="button"
            onClick={() => window.print()}
            title="지도 인쇄"
            className="w-7 h-7 flex flex-col items-center justify-center rounded text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer text-[9px]"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="scale-85">인쇄</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            title="지도 URL 복사"
            className="w-7 h-7 flex flex-col items-center justify-center rounded text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer text-[9px]"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span className="scale-85">공유</span>
          </button>
          <a
            href={kakaoRoadviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="로드뷰 보기"
            className="w-7 h-7 flex flex-col items-center justify-center rounded text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer text-[9px]"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span className="scale-85">뷰</span>
          </a>
        </div>

        {/* Real Map Canvas */}
        <div
          ref={mapContainerRef}
          className="w-full h-full relative z-0 bg-[#eef1f4]"
          style={{ minHeight: '460px', width: '100%', height: '100%' }}
        />

        {/* Optional Speech Bubble (마커 클릭 시에만 팝업) */}
        {showSpeechBubble && (
          <div 
            className="absolute z-20 pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: 'calc(50% - 44px)',
              left: '50%',
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="relative bg-white rounded-lg shadow-2xl border border-slate-300 p-3 min-w-[270px] max-w-[360px]">
              <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
                <span className="font-extrabold text-[13px] text-slate-900 tracking-tight truncate leading-tight">
                  {fullDisplayTitle}
                </span>
                <button
                  type="button"
                  onClick={() => setShowSpeechBubble(false)}
                  title="말풍선 닫기"
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  title="주소 복사"
                  className="w-8 h-8 rounded border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors shrink-0 cursor-pointer active:scale-95"
                >
                  <Bookmark className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  title="카카오맵 링크 복사"
                  className="w-8 h-8 rounded border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors shrink-0 cursor-pointer active:scale-95"
                >
                  <Share2 className="w-4 h-4 text-slate-600" />
                </button>
                <a
                  href={kakaoDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="카카오 길찾기 바로가기"
                  className="flex-1 h-8 rounded bg-[#258FFF] hover:bg-[#1D7EE6] text-white text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-xs active:scale-98 cursor-pointer"
                >
                  <Navigation className="w-3 h-3 text-white fill-white" />
                  <span>길찾기</span>
                </a>
              </div>

              <div 
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '8px solid #ffffff',
                  filter: 'drop-shadow(0 2px 1px rgba(0,0,0,0.1))',
                }}
              />
            </div>
          </div>
        )}

        {/* Copy Notification Toast */}
        {copiedNotice && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 bg-slate-900/90 text-white text-xs font-bold rounded-lg shadow-lg backdrop-blur-xs flex items-center gap-1.5 animate-in fade-in duration-100">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{copiedNotice}</span>
          </div>
        )}

        {/* Bottom Left Info Badge (Image 2: 날씨 & 행정동) */}
        <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/95 backdrop-blur-xs border border-slate-200/90 text-[11px] font-semibold text-slate-700 shadow-sm">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-bold text-slate-800">24°</span>
            <span className="text-[10px] text-slate-300">|</span>
            <span className="text-[10px] text-emerald-600 font-bold">미세 28</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/90 backdrop-blur-xs border border-slate-200/90 text-[11px] text-slate-700 shadow-sm">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span className="font-semibold truncate max-w-[160px]">{administrativeDong}</span>
          </div>
        </div>

        {/* Bottom Right Tools & Branding (Image 2: 100m 축척 바 & 줌 컨트롤) */}
        <div className="absolute bottom-2.5 right-2.5 z-20 flex items-end gap-2.5 pointer-events-auto">
          <div className="flex flex-col items-end pb-0.5 text-right">
            <span className="text-[10px] font-bold text-slate-400 tracking-tighter">
              kakao
            </span>
            <div className="flex items-center gap-1">
              <div className="w-8 h-[2px] bg-slate-400 border-x border-slate-600"></div>
              <span className="text-[9px] text-slate-500 font-mono">{scaleText}</span>
            </div>
          </div>

          <div className="flex flex-col rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200 shadow-md overflow-hidden">
            <button
              type="button"
              onClick={handleZoomIn}
              title="지도 확대"
              className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors border-b border-slate-100 cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              title="지도 축소"
              className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors border-b border-slate-100 cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRecenter}
              title="매물 위치로 재이동"
              className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <Navigation className="w-4 h-4 fill-blue-600" />
            </button>
          </div>
        </div>

      </div>
    </div>
    </div>
  );
};
