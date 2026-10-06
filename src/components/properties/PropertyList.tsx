'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Share2, 
  PlusCircle, 
  ChevronRight,
  Map as MapIcon,
  LayoutGrid,
  Columns,
  Edit3,
  Camera,
  ImageIcon,
  Copy
} from 'lucide-react';
import { 
  PropertyItem, 
  CustomerItem,
  PROPERTY_TYPE_LABELS, 
  STATUS_LABELS 
} from '@/lib/types';
import { shareViaKakao, generateSmsLink, copyPropertyShareLink } from '@/lib/kakao';
import { PropertyMapView } from '../map/PropertyMapView';
import { PropertyFilterPanel } from './PropertyFilterPanel';
import { SharePropertyModal } from './SharePropertyModal';
import { useAuth } from '../auth/AuthContext';
import { canEditItem } from '@/lib/auth';

interface PropertyListProps {
  properties: PropertyItem[];
  customers?: CustomerItem[];
  onSelectProperty: (property: PropertyItem) => void;
  onOpenNewProperty: () => void;
  onEditProperty?: (property: PropertyItem) => void;
}

export const PropertyList: React.FC<PropertyListProps> = ({
  properties,
  customers = [],
  onSelectProperty,
  onOpenNewProperty,
  onEditProperty,
}) => {
  const { currentUser } = useAuth();
  const [filtered, setFiltered] = useState<PropertyItem[]>(properties);
  const [viewMode, setViewMode] = useState<'SPLIT' | 'GRID' | 'MAP'>('SPLIT');
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<string | undefined>();
  const [sharingProperty, setSharingProperty] = useState<PropertyItem | null>(null);

  // Sync when properties changes externally
  useEffect(() => {
    setFiltered(properties);
  }, [properties]);

  const getPriceDisplay = (p: PropertyItem) => {
    if (p.transactionType === '매매') {
      const base = p.price ? `${p.price.toLocaleString()} 만원` : '협의';
      return p.negotiablePrice ? `${base} (조정: ${p.negotiablePrice.toLocaleString()}만)` : base;
    } else if (p.transactionType === '전세') {
      const base = p.deposit ? `${p.deposit.toLocaleString()} 만원` : '협의';
      return p.negotiableDeposit ? `${base} (조정: ${p.negotiableDeposit.toLocaleString()}만)` : base;
    } else {
      const isVat = p.monthlyRentVat || p.storeDetail?.monthlyRentVat || p.officeDetail?.monthlyRentVat;
      const vatText = isVat ? ' (부가세 별도)' : '';
      const base = `${p.deposit ? p.deposit.toLocaleString() + '만' : '0'} / ${p.monthlyRent ? p.monthlyRent.toLocaleString() + '만' : '0'}${vatText}`;
      if (p.negotiableDeposit || p.negotiableMonthlyRent) {
        return `${base} (조정: ${p.negotiableDeposit || 0}만/${p.negotiableMonthlyRent || 0}만)`;
      }
      return base;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* 1. 종합 필터 조건란 (물건 찾기 & 고객 조건 매칭 & 매물구분/매매전세월세/가격/평수 등) */}
      <PropertyFilterPanel
        properties={properties}
        customers={customers}
        onFilterChange={(newFiltered) => setFiltered(newFiltered)}
        onOpenNewProperty={onOpenNewProperty}
      />

      {/* 2. 보기 모드 전환 및 결과 요약 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800">
            검색 결과: <span className="text-blue-600 font-extrabold">{filtered.length}</span>건
          </span>
          <span className="text-xs text-slate-300">|</span>
          <span className="text-xs text-slate-500">
            (전체 {properties.length}개 매물)
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle: [🔲 분할 뷰] [🗺️ 지도 뷰] [📋 카드 뷰] */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('SPLIT')}
              title="목록 + 지도 분할 뷰"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-bold transition-all ${
                viewMode === 'SPLIT'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden md:inline">분할 뷰</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('MAP')}
              title="지도 전체 뷰"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-bold transition-all ${
                viewMode === 'MAP'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>지도 뷰</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              title="카드 그리드 뷰"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-bold transition-all ${
                viewMode === 'GRID'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>카드 뷰</span>
            </button>
          </div>

          <button
            onClick={onOpenNewProperty}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>새 매물 등록</span>
          </button>
        </div>
      </div>

      {/* Main View Area: Depends on viewMode */}

      {/* 1) MAP ONLY VIEW */}
      {viewMode === 'MAP' && (
        <PropertyMapView
          properties={filtered}
          selectedPropertyId={highlightedPropertyId}
          onSelectProperty={onSelectProperty}
          height="h-[680px]"
        />
      )}

      {/* 2) SPLIT VIEW (List on Left with Photos, Map on Right) */}
      {viewMode === 'SPLIT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Property Cards with Photo Thumbnails */}
          <div className="lg:col-span-6 space-y-3 max-h-[680px] overflow-y-auto pr-1">
            {filtered.length > 0 ? (
              filtered.map((property) => {
                const statusInfo = STATUS_LABELS[property.status] || { label: property.status, color: 'bg-slate-100 text-slate-800' };
                const isSelected = highlightedPropertyId === property.id;
                const hasImages = property.images && property.images.length > 0;

                return (
                  <div
                    key={property.id}
                    onClick={() => {
                      setHighlightedPropertyId(property.id);
                      onSelectProperty(property);
                    }}
                    className={`bg-white rounded-xl border p-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-blue-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Photo Thumbnail */}
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center">
                        {hasImages ? (
                          <>
                            <img
                              src={property.images![0]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                              <Camera className="w-2.5 h-2.5" />
                              {property.images!.length}
                            </span>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                            <span className="text-[10px] mt-0.5 font-medium">사진없음</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-600 text-white">
                                {PROPERTY_TYPE_LABELS[property.propertyType]}
                              </span>
                              <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-800">
                                {property.transactionType}
                              </span>
                            </div>
                            <span className="text-sm font-black text-blue-900 truncate">
                              {getPriceDisplay(property)}
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">
                            {property.apartmentDetail?.complexName ||
                             property.storeDetail?.storeName ||
                             property.officeDetail?.officeName ||
                             property.factoryWarehouseDetail?.companyName ||
                             property.landDetail?.companyName ||
                             property.address}
                          </h4>

                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {property.roadAddress ? `[도로명] ${property.roadAddress}` : property.address}
                              {property.detailAddress ? ` ${property.detailAddress}` : ''}
                            </span>
                          </p>
                          {property.jibunAddress && (
                            <p className="text-[10px] text-amber-700 truncate pl-4">
                              지번: {property.jibunAddress}
                            </p>
                          )}
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-mono text-[11px]">
                              #{property.propertyNumber}
                            </span>
                            {property.managerName && (
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                property.managerName.includes('개업공인중개사')
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : property.managerName === '사무실'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-emerald-50 text-emerald-800'
                              }`}>
                                {property.managerName.includes('개업공인중개사')
                                  ? '👑 개업공인중개사'
                                  : property.managerName === '사무실'
                                  ? '🏢 사무실'
                                  : `👤 ${property.managerName}`}
                              </span>
                            )}
                            {Array.isArray(property.assignedAgents) && property.assignedAgents.length > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                                👥 {property.assignedAgents.join(', ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {onEditProperty && canEditItem(currentUser, property) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditProperty(property);
                                }}
                                className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>수정</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHighlightedPropertyId(property.id);
                                onSelectProperty(property);
                              }}
                              className="text-blue-600 font-bold hover:underline text-[11px] flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>상세보기 →</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                조회된 매물이 없습니다. 필터 조건을 변경해 보세요.
              </div>
            )}
          </div>

          {/* Right Column: Sticky Interactive Map */}
          <div className="lg:col-span-6 lg:sticky lg:top-20">
            <PropertyMapView
              properties={filtered}
              selectedPropertyId={highlightedPropertyId}
              onSelectProperty={onSelectProperty}
              height="h-[680px]"
            />
          </div>
        </div>
      )}

      {/* 3) GRID ONLY VIEW */}
      {viewMode === 'GRID' && (
        <>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((property) => {
                const statusInfo = STATUS_LABELS[property.status] || { label: property.status, color: 'bg-slate-100 text-slate-800' };
                const hasImages = property.images && property.images.length > 0;

                const smsLink = generateSmsLink({
                  propertyNumber: property.propertyNumber,
                  propertyType: PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType,
                  transactionType: property.transactionType,
                  price: property.price,
                  deposit: property.deposit,
                  monthlyRent: property.monthlyRent,
                  address: property.address,
                  detailAddress: property.detailAddress,
                  consultationNotes: property.consultationNotes,
                });

                const onShareKakao = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  shareViaKakao({
                    id: property.id,
                    title: `${PROPERTY_TYPE_LABELS[property.propertyType]} (${property.transactionType})`,
                    description: property.consultationNotes || property.address,
                    priceText: `${property.transactionType} ${getPriceDisplay(property)}`,
                    address: property.address,
                    propertyNumber: property.propertyNumber,
                    propertyType: PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType,
                    property: property,
                  });
                };

                return (
                  <div
                    key={property.id}
                    onClick={() => onSelectProperty(property)}
                    className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      {/* Top Photo Banner */}
                      <div className="relative aspect-16/9 bg-slate-100 overflow-hidden flex items-center justify-center">
                        {hasImages ? (
                          <>
                            <img
                              src={property.images![0]}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-blue-600 text-white shadow-xs">
                                {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
                              </span>
                              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-white/90 backdrop-blur-xs text-slate-800 shadow-xs">
                                {property.transactionType}
                              </span>
                            </div>
                            <span className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Camera className="w-3 h-3 text-blue-400" />
                              <span>{property.images!.length}장</span>
                            </span>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                            <ImageIcon className="w-8 h-8 stroke-[1.5]" />
                            <span className="text-xs mt-1 font-medium">사진 미등록</span>
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-blue-600 text-white">
                                {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
                              </span>
                              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 text-slate-800">
                                {property.transactionType}
                              </span>
                            </div>
                          </div>
                        )}
                        <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 text-[11px] font-semibold rounded-full border bg-white/90 backdrop-blur-xs ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Card Content */}
                      <div className="p-4">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span className="font-mono">#{property.propertyNumber}</span>
                          <span>{property.direction || '남향'} ({property.directionCriteria || '기준없음'})</span>
                        </div>

                        <h4 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors text-sm line-clamp-1">
                          {property.apartmentDetail?.complexName ||
                           property.storeDetail?.storeName ||
                           property.officeDetail?.officeName ||
                           property.factoryWarehouseDetail?.companyName ||
                           property.landDetail?.companyName ||
                           property.address}
                        </h4>

                        <p className="text-xs text-slate-600 flex items-center gap-1 mt-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {property.roadAddress ? `[도로명] ${property.roadAddress}` : property.address}
                            {property.detailAddress ? ` ${property.detailAddress}` : ''}
                          </span>
                        </p>
                        {property.jibunAddress && (
                          <p className="text-[11px] text-amber-700 truncate pl-4">
                            지번: {property.jibunAddress}
                          </p>
                        )}

                        {/* Price */}
                        <div className="mt-3 p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                          <span className="text-xs text-slate-600 font-medium">거래금액</span>
                          <span className="text-base font-black text-blue-900">
                            {getPriceDisplay(property)}
                          </span>
                        </div>

                        {/* Customer / Owner Info */}
                        {property.customer && (
                          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                            <span className="font-medium text-slate-700 truncate">
                              의뢰인: {property.customer.name} {property.customer.carrier ? `(${property.customer.carrier})` : ''}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 shrink-0">
                              {property.customer.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Row: [📞 전화] [💬 문자] [🟡 카톡 공유] */}
                    <div 
                      className="p-4 pt-0 flex items-center justify-between gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        {property.customer?.phone && (
                          <a
                            href={`tel:${property.customer.phone}`}
                            title="고객 전화걸기"
                            className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSharingProperty(property);
                          }}
                          title="문자로 매물정보 전송"
                          className="p-1.5 rounded-lg text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSharingProperty(property);
                          }}
                          title="매물 링크 복사 (주소 노출 옵션 선택)"
                          className="p-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSharingProperty(property);
                          }}
                          title="카카오톡으로 공유 (주소 노출 옵션 선택)"
                          className="p-1.5 rounded-lg text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        {onEditProperty && canEditItem(currentUser, property) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditProperty(property);
                            }}
                            title="매물 정보 수정"
                            className="p-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => onSelectProperty(property)}
                        className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800"
                      >
                        <span>상세보기</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">조회된 매물이 없습니다.</h4>
              <p className="text-xs text-slate-500 mt-1">
                필터 조건을 변경하거나 [새 매물 등록] 버튼을 눌러 새 매물을 추가하세요.
              </p>
              <button
                onClick={onOpenNewProperty}
                className="mt-4 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                ＋ 새 매물 등록하기
              </button>
            </div>
          )}
        </>
      )}

      {/* Share & Address Disclosure Options Modal */}
      <SharePropertyModal
        property={sharingProperty}
        isOpen={!!sharingProperty}
        onClose={() => setSharingProperty(null)}
      />
    </div>
  );
};
