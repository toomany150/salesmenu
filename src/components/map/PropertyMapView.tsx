'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  MapPin, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Navigation, 
  Building2, 
  Phone, 
  MessageSquare,
  X,
  ChevronRight,
  Compass,
  Layers,
  Sparkles
} from 'lucide-react';
import { PropertyItem, PropertyType, PROPERTY_TYPE_LABELS } from '@/lib/types';
import { getCoordinatesFromAddress, getKakaoMapUrl, getNaverMapUrl, DEFAULT_CENTER } from '@/lib/geo';

declare global {
  interface Window {
    kakao?: any;
    L?: any;
  }
}

interface PropertyMapViewProps {
  properties: PropertyItem[];
  selectedPropertyId?: string;
  onSelectProperty: (property: PropertyItem) => void;
  className?: string;
  height?: string;
}

export const PropertyMapView: React.FC<PropertyMapViewProps> = ({
  properties,
  selectedPropertyId,
  onSelectProperty,
  className = '',
  height = 'h-[620px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletMarkersRef = useRef<any[]>([]);
  const kakaoMapRef = useRef<any>(null);
  const kakaoMarkersRef = useRef<any[]>([]);

  // Engine state: 'LEAFLET' (100% interactive tile map, no API key required) or 'KAKAO'
  const [mapEngine, setMapEngine] = useState<'LEAFLET' | 'KAKAO'>('LEAFLET');
  const [kakaoAvailable, setKakaoAvailable] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [activeProperty, setActiveProperty] = useState<(PropertyItem & { coords?: { lat: number; lng: number } }) | null>(null);

  // Filter states
  const [filterType, setFilterType] = useState<string>('ALL');

  // Filter properties
  const displayProperties = useMemo(() => {
    return properties.filter((p) => {
      if (filterType !== 'ALL' && p.propertyType !== filterType) return false;
      return true;
    });
  }, [properties, filterType]);

  // Calculate coordinates for all properties
  const mappedProperties = useMemo(() => {
    return displayProperties.map((p, idx) => {
      const coords = (p.latitude && p.longitude)
        ? { lat: p.latitude, lng: p.longitude }
        : getCoordinatesFromAddress(p.address, idx);
      return {
        ...p,
        coords,
      };
    });
  }, [displayProperties]);

  const getPriceText = (p: PropertyItem) => {
    if (p.transactionType === '매매') {
      return p.price ? `${(p.price / 10000).toFixed(1)}억` : '협의';
    } else if (p.transactionType === '전세') {
      return p.deposit ? `${(p.deposit / 10000).toFixed(1)}억` : '협의';
    } else {
      return `${p.deposit || 0}/${p.monthlyRent || 0}만`;
    }
  };

  const getBadgeColor = (type: PropertyType) => {
    switch (type) {
      case 'APARTMENT': return 'bg-blue-600 text-white border-blue-700';
      case 'HOUSE': return 'bg-emerald-600 text-white border-emerald-700';
      case 'STORE': return 'bg-amber-500 text-white border-amber-600';
      case 'OFFICE': return 'bg-sky-600 text-white border-sky-700';
      case 'FACTORY_WAREHOUSE': return 'bg-indigo-600 text-white border-indigo-700';
      case 'LAND': return 'bg-teal-600 text-white border-teal-700';
      default: return 'bg-slate-700 text-white border-slate-800';
    }
  };

  // 1. Check Kakao Map Availability
  useEffect(() => {
    const checkKakao = () => {
      if (typeof window !== 'undefined' && window.kakao && window.kakao.maps) {
        try {
          window.kakao.maps.load(() => {
            setKakaoAvailable(true);
          });
        } catch (e) {
          if (window.kakao.maps.Map) {
            setKakaoAvailable(true);
          }
        }
      }
    };
    checkKakao();
    const timer = setTimeout(checkKakao, 1500);
    return () => clearTimeout(timer);
  }, []);

  // 2. Initialize Leaflet Map (Real Interactive Zoom/Pan Engine)
  useEffect(() => {
    let isMounted = true;

    const initLeaflet = async () => {
      if (!mapContainerRef.current) return;
      if (mapEngine !== 'LEAFLET') return;

      try {
        const L = (await import('leaflet')).default;
        if (!isMounted || !mapContainerRef.current) return;

        // Cleanup existing map instance if any
        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
        }

        // Determine initial center
        const initialCenter = mappedProperties.length > 0 
          ? [mappedProperties[0].coords.lat, mappedProperties[0].coords.lng]
          : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

        // Create Leaflet Map with smooth zoom & wheel
        const map = L.map(mapContainerRef.current, {
          center: initialCenter as [number, number],
          zoom: 14,
          zoomControl: false, // We render a custom modern zoom controller
          attributionControl: false,
          maxZoom: 19,
          minZoom: 7,
        });

        // Add standard high-res tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        leafletMapRef.current = map;
        setLeafletLoaded(true);

        // Render markers
        renderLeafletMarkers(L, map);
      } catch (err) {
        console.error('Failed to initialize interactive leaflet map:', err);
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

  // Render Leaflet Markers
  const renderLeafletMarkers = (L: any, map: any) => {
    if (!map) return;

    // Clear previous markers
    leafletMarkersRef.current.forEach((m) => m.remove());
    leafletMarkersRef.current = [];

    const bounds: [number, number][] = [];

    mappedProperties.forEach((item) => {
      const lat = item.coords.lat;
      const lng = item.coords.lng;
      bounds.push([lat, lng]);

      const isSelected = activeProperty?.id === item.id;
      const typeLabel = PROPERTY_TYPE_LABELS[item.propertyType] || '매물';
      const priceText = getPriceText(item);
      const badgeClass = getBadgeColor(item.propertyType);

      // Create custom rich HTML pin
      const iconHtml = `
        <div style="transform: translate(-50%, -100%);" class="group relative cursor-pointer select-none">
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-xl border text-xs font-bold transition-all ${badgeClass} ${
            isSelected ? 'ring-4 ring-yellow-400 scale-110' : 'hover:scale-105'
          }">
            <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            <span>${typeLabel}</span>
            <span class="bg-black/35 px-1.5 py-0.5 rounded text-[11px] font-extrabold text-yellow-300">
              ${priceText}
            </span>
          </div>
          <div class="w-2.5 h-2.5 bg-slate-900 rotate-45 mx-auto -mt-1 border-r border-b border-white shadow"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-property-pin',
        html: iconHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        setActiveProperty(item);
        map.panTo([lat, lng], { animate: true, duration: 0.5 });
      });

      leafletMarkersRef.current.push(marker);
    });

    // Auto fit bounds if multiple markers exist
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14, { animate: true });
    }
  };

  // Re-render Leaflet markers on property/filter changes
  useEffect(() => {
    if (mapEngine === 'LEAFLET' && leafletMapRef.current && typeof window !== 'undefined') {
      import('leaflet').then((LModule) => {
        renderLeafletMarkers(LModule.default, leafletMapRef.current);
      });
    }
  }, [mappedProperties, activeProperty?.id, mapEngine]);

  // 3. Initialize Kakao Map if user toggles to Kakao
  useEffect(() => {
    if (mapEngine !== 'KAKAO' || !mapContainerRef.current || !window.kakao?.maps) return;

    try {
      const container = mapContainerRef.current;
      container.innerHTML = '';

      const centerCoords = mappedProperties.length > 0 
        ? new window.kakao.maps.LatLng(mappedProperties[0].coords.lat, mappedProperties[0].coords.lng)
        : new window.kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);

      const options = {
        center: centerCoords,
        level: 4,
      };

      const map = new window.kakao.maps.Map(container, options);
      kakaoMapRef.current = map;

      // Add Zoom Control
      const zoomControl = new window.kakao.maps.ZoomControl();
      map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

      // Add Markers
      kakaoMarkersRef.current = [];
      mappedProperties.forEach((item) => {
        const markerPosition = new window.kakao.maps.LatLng(item.coords.lat, item.coords.lng);
        const marker = new window.kakao.maps.Marker({
          position: markerPosition,
          map: map,
        });

        window.kakao.maps.event.addListener(marker, 'click', () => {
          setActiveProperty(item);
          map.panTo(markerPosition);
        });

        kakaoMarkersRef.current.push(marker);
      });
    } catch (e) {
      console.warn('Kakao map initialization error, falling back to Leaflet:', e);
      setMapEngine('LEAFLET');
    }
  }, [mapEngine, mappedProperties]);

  // Sync selectedPropertyId to activeProperty and focus map
  useEffect(() => {
    if (selectedPropertyId) {
      const found = properties.find((p) => p.id === selectedPropertyId);
      if (found) {
        if (filterType !== 'ALL' && found.propertyType !== filterType) {
          setFilterType('ALL');
        }
        const coords = (found.latitude && found.longitude)
          ? { lat: found.latitude, lng: found.longitude }
          : getCoordinatesFromAddress(found.address);
        setActiveProperty({ ...found, coords } as any);

        if (mapEngine === 'LEAFLET' && leafletMapRef.current && coords) {
          leafletMapRef.current.setView([coords.lat, coords.lng], 15, { animate: true });
        } else if (mapEngine === 'KAKAO' && kakaoMapRef.current && coords && window.kakao?.maps) {
          const pos = new window.kakao.maps.LatLng(coords.lat, coords.lng);
          kakaoMapRef.current.panTo(pos);
        }
      }
    }
  }, [selectedPropertyId, properties, filterType, mapEngine]);

  // Zoom handlers for Leaflet
  const handleZoomIn = () => {
    if (mapEngine === 'LEAFLET' && leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    } else if (mapEngine === 'KAKAO' && kakaoMapRef.current) {
      const currentLevel = kakaoMapRef.current.getLevel();
      kakaoMapRef.current.setLevel(currentLevel - 1);
    }
  };

  const handleZoomOut = () => {
    if (mapEngine === 'LEAFLET' && leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    } else if (mapEngine === 'KAKAO' && kakaoMapRef.current) {
      const currentLevel = kakaoMapRef.current.getLevel();
      kakaoMapRef.current.setLevel(currentLevel + 1);
    }
  };

  const handleResetCenter = () => {
    if (mappedProperties.length === 0) return;
    if (mapEngine === 'LEAFLET' && leafletMapRef.current) {
      if (mappedProperties.length === 1) {
        leafletMapRef.current.setView([mappedProperties[0].coords.lat, mappedProperties[0].coords.lng], 14, { animate: true });
      } else {
        const bounds = mappedProperties.map((p) => [p.coords.lat, p.coords.lng] as [number, number]);
        leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } else if (mapEngine === 'KAKAO' && kakaoMapRef.current && window.kakao?.maps) {
      const centerCoords = new window.kakao.maps.LatLng(mappedProperties[0].coords.lat, mappedProperties[0].coords.lng);
      kakaoMapRef.current.panTo(centerCoords);
    }
  };

  return (
    <div className={`relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-xl ${height} ${className}`}>
      
      {/* Top Map Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-md">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              filterType === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            전체 ({properties.length})
          </button>
          {(['APARTMENT', 'STORE', 'OFFICE', 'HOUSE', 'FACTORY_WAREHOUSE', 'LAND'] as PropertyType[]).map((type) => {
            const count = properties.filter((p) => p.propertyType === type).length;
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => {
                  setFilterType(type);
                  if (activeProperty && activeProperty.propertyType !== type) {
                    setActiveProperty(null);
                  }
                }}
                className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  filterType === type
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {PROPERTY_TYPE_LABELS[type]} ({count})
              </button>
            );
          })}
        </div>

        {/* Engine Switch & Status Indicator */}
        <div className="flex items-center gap-2">
          {kakaoAvailable && (
            <div className="flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-md text-xs">
              <button
                onClick={() => setMapEngine('LEAFLET')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  mapEngine === 'LEAFLET' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                실시간 타일지도
              </button>
              <button
                onClick={() => setMapEngine('KAKAO')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  mapEngine === 'KAKAO' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                카카오 지도
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-slate-200">
              {mapEngine === 'KAKAO' ? '카카오 지도 실시간 연동' : '실시간 인터랙티브 지도 (확대/축소 지원)'}
            </span>
            <span className="text-slate-500">|</span>
            <span className="font-bold text-amber-400">{mappedProperties.length}개 위치 핀</span>
          </div>
        </div>
      </div>

      {/* Real Interactive Map Canvas (Full Tile Rendering, Smooth Pan & Zoom) */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full z-0 bg-[#e4e9ec]"
        style={{ minHeight: '100%' }}
      />

      {/* Floating Zoom & Center Reset Controls */}
      <div className="absolute right-4 bottom-5 z-[1000] flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-300 shadow-xl">
        <button
          onClick={handleZoomIn}
          title="실시간 확대 (마우스 휠 가능)"
          className="p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="실시간 축소 (마우스 휠 가능)"
          className="p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-full h-[1px] bg-slate-200 my-0.5" />
        <button
          onClick={handleResetCenter}
          title="매물 위치 전체 보기 / 초기화"
          className="p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 mb-0.5" />
          <span>초기화</span>
        </button>
      </div>

      {/* Floating Property Detail Card on Pin Click */}
      {activeProperty && (
        <div className="absolute bottom-5 left-4 right-4 sm:left-6 sm:w-96 z-[1000] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-4.5 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${getBadgeColor(activeProperty.propertyType)}`}>
                {PROPERTY_TYPE_LABELS[activeProperty.propertyType]}
              </span>
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                {activeProperty.transactionType}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                #{activeProperty.propertyNumber}
              </span>
            </div>
            <button
              onClick={() => setActiveProperty(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2.5 space-y-1.5">
            <h4 className="font-extrabold text-slate-900 text-sm line-clamp-1">
              {activeProperty.apartmentDetail?.complexName ||
               activeProperty.storeDetail?.storeName ||
               activeProperty.officeDetail?.officeName ||
               activeProperty.factoryWarehouseDetail?.companyName ||
               activeProperty.landDetail?.companyName ||
               activeProperty.address}
            </h4>

            <p className="text-xs text-slate-600 flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{activeProperty.address} {activeProperty.detailAddress || ''}</span>
            </p>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs text-slate-500 font-medium">거래금액:</span>
              <span className="text-lg font-black text-blue-900">
                {activeProperty.transactionType === '매매' ? `${activeProperty.price?.toLocaleString() || '협의'}만원` :
                 activeProperty.transactionType === '전세' ? `${activeProperty.deposit?.toLocaleString() || '협의'}만원` :
                 `${activeProperty.deposit || 0}만 / ${activeProperty.monthlyRent || 0}만원`}
              </span>
            </div>

            {/* External Map Direct Links: 카카오지도 & 네이버지도 */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <a
                href={getKakaoMapUrl(activeProperty.address, activeProperty.apartmentDetail?.complexName || activeProperty.storeDetail?.storeName)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-bold shadow-2xs transition-colors"
              >
                <span>🟡 카카오지도</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href={getNaverMapUrl(activeProperty.address, activeProperty.apartmentDetail?.complexName || activeProperty.storeDetail?.storeName)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-2xs transition-colors"
              >
                <span>🟢 네이버지도</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <button
              onClick={() => {
                onSelectProperty(activeProperty);
                setActiveProperty(null);
              }}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <span>매물 상세정보 / 브리핑 보기</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
