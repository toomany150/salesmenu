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
  Copy,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { 
  PropertyItem, 
  CustomerItem,
  PROPERTY_TYPE_LABELS, 
  STATUS_LABELS 
} from '@/lib/types';
import { exportPropertiesToExcel } from '@/lib/excelExport';
import { shareViaKakao, generateSmsLink, copyPropertyShareLink, handleSmartSms } from '@/lib/kakao';
import { PropertyMapView } from '../map/PropertyMapView';
import { PropertyFilterPanel, PropertyFilterCriteria } from './PropertyFilterPanel';
import { SharePropertyModal } from './SharePropertyModal';
import { useAuth } from '../auth/AuthContext';
import { canEditItem } from '@/lib/auth';

interface PropertyListProps {
  properties: PropertyItem[];
  customers?: CustomerItem[];
  onSelectProperty: (property: PropertyItem) => void;
  onOpenNewProperty: () => void;
  onEditProperty?: (property: PropertyItem) => void;
  onPropertyUpdated?: (property: PropertyItem) => void;
}

export const PropertyList: React.FC<PropertyListProps> = ({
  properties,
  customers = [],
  onSelectProperty,
  onOpenNewProperty,
  onEditProperty,
  onPropertyUpdated,
}) => {
  const { currentUser } = useAuth();
  const [filtered, setFiltered] = useState<PropertyItem[]>(properties);
  const [filterCriteria, setFilterCriteria] = useState<PropertyFilterCriteria | null>(null);
  const [viewMode, setViewMode] = useState<'SPLIT' | 'GRID' | 'MAP'>('SPLIT');
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<string | undefined>();
  const [sharingProperty, setSharingProperty] = useState<PropertyItem | null>(null);

  // 매물 목록 카드에서 원클릭으로 판매완료/진행중 상태를 즉시 토글하는 핸들러
  const handleQuickToggleStatus = async (e: React.MouseEvent, property: PropertyItem, targetStatus: any) => {
    e.stopPropagation();
    if (!onPropertyUpdated) return;
    const isSelling = targetStatus === 'CONTRACTED';
    const actionLabel = isSelling ? '판매완료' : (STATUS_LABELS[targetStatus as keyof typeof STATUS_LABELS]?.label || targetStatus);
    const title = property.apartmentDetail?.complexName || property.storeDetail?.storeName || property.propertyNumber || property.address;
    const confirmMsg = isSelling
      ? `[${title}] 매물을 '판매완료' 처리하시겠습니까?\n(매물장 카드에 '판매완료'가 표시됩니다)`
      : `[${title}] 매물 상태를 '${actionLabel}'(으)로 변경하시겠습니까?`;

    if (!window.confirm(confirmMsg)) return;

    const updated: PropertyItem = {
      ...property,
      status: targetStatus,
      updatedAt: new Date().toISOString(),
    };

    try {
      await fetch('/api/properties', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Failed to update status on server:', err);
    }

    onPropertyUpdated(updated);
  };

  // 최근 등록된 일시(createdAt 또는 receiptDate) 기준 최신순 내림차순 정렬 (최신 등록 매물이 맨 처음)
  const sortedFiltered = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      const tA = new Date(a.createdAt || a.receiptDate || 0).getTime();
      const tB = new Date(b.createdAt || b.receiptDate || 0).getTime();
      return tB - tA;
    });
  }, [filtered]);

  // 필터 조건이 활성화되어 있는지 확인하는 헬퍼 함수
  const isFilterActive = (c: PropertyFilterCriteria | null): boolean => {
    if (!c) return false;
    return !!(
      (c.searchQuery && c.searchQuery.trim().length > 0) ||
      (c.status && c.status !== 'ALL') ||
      (c.propertyType && c.propertyType !== 'ALL') ||
      (c.transactionType && c.transactionType !== 'ALL') ||
      (c.targetCity && c.targetCity.trim().length > 0) ||
      (c.targetGu && c.targetGu.trim().length > 0) ||
      (c.targetDong && c.targetDong.trim().length > 0) ||
      (c.floorFilter && c.floorFilter !== 'ALL') ||
      (c.customFloorInput && c.customFloorInput.trim().length > 0) ||
      c.minPrice || c.maxPrice ||
      c.minDeposit || c.maxDeposit ||
      c.minMonthlyRent || c.maxMonthlyRent ||
      c.minM2 || c.maxM2 ||
      (c.direction && c.direction !== 'ALL') ||
      c.hasParking || c.hasElevator || c.isFullOption ||
      c.matchedCustomerId
    );
  };

  // Sync when properties changes externally: 필터 조건이 활성화되어 있을 때는 전체 목록으로 강제 덮어쓰지 않고 필터 상태 보존
  useEffect(() => {
    if (!isFilterActive(filterCriteria)) {
      setFiltered(properties);
    }
  }, [properties, filterCriteria]);

  const formatShortDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const getPriceDisplay = (p: PropertyItem) => {
    if (p.transactionType === '매매') {
      return p.price ? `매매 ${p.price.toLocaleString()} 만원` : '매매 협의';
    } else if (p.transactionType === '전세') {
      return p.deposit ? `전세 ${p.deposit.toLocaleString()} 만원` : '전세 협의';
    } else {
      const isVat = p.monthlyRentVat || p.storeDetail?.monthlyRentVat || p.officeDetail?.monthlyRentVat;
      const vatText = isVat ? ' (부가세 별도)' : '';
      let display = `보증금 ${p.deposit ? p.deposit.toLocaleString() + '만' : '0'} / 월세 ${p.monthlyRent ? p.monthlyRent.toLocaleString() + '만' : '0'}${vatText}`;
      if (p.propertyType === 'STORE') {
        const isNoPrem = !!(p.storeDetail?.isNoPremium || p.isNoPremium || (p.storeDetail && p.storeDetail.premium === 0));
        const premVal = isNoPrem
          ? 0
          : (p.storeDetail?.premium ?? p.premium ?? (p.propertyNumber === '구만족발보쌈' ? 10000 : (p.propertyNumber === '왕돈까스' ? 3000 : (p.propertyNumber === '뭉터기와육회' ? 1000 : undefined))));
        if (isNoPrem) {
          display += ' · 무권리';
        } else if (premVal !== undefined && premVal !== null) {
          const premStr = premVal >= 10000 ? `${(premVal / 10000).toFixed(premVal % 10000 === 0 ? 0 : 1)}억` : `${premVal.toLocaleString()}만`;
          display += ` · 권리 ${premStr}`;
        }
      }
      return display;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* 1. 종합 필터 조건란 (물건 찾기 & 고객 조건 매칭 & 매물구분/매매전세월세/가격/평수 등) */}
      <PropertyFilterPanel
        properties={properties}
        customers={customers}
        onFilterChange={(newFiltered, criteria) => {
          setFilterCriteria(criteria);
          setFiltered(newFiltered);
        }}
        onOpenNewProperty={onOpenNewProperty}
      />

      {/* 2. 보기 모드 전환 및 결과 요약 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800">
            검색 결과: <span className="text-blue-600 font-extrabold">{sortedFiltered.length}</span>건
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
            type="button"
            onClick={() => exportPropertiesToExcel(sortedFiltered)}
            title="현재 검색된 매물 목록을 엑셀(.xlsx) 파일로 다운로드합니다"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-300 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>엑셀 다운로드</span>
          </button>

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
          properties={sortedFiltered}
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
            {sortedFiltered.length > 0 ? (
              sortedFiltered.map((property) => {
                const statusInfo = STATUS_LABELS[property.status] || { label: property.status, color: 'bg-slate-100 text-slate-800' };
                const isSelected = highlightedPropertyId === property.id;
                const hasImages = property.images && property.images.length > 0;
                const isContracted = property.status === 'CONTRACTED';

                return (
                  <div
                    key={property.id}
                    onClick={() => {
                      setHighlightedPropertyId(property.id);
                      onSelectProperty(property);
                    }}
                    className={`rounded-xl border p-3.5 transition-all cursor-pointer relative overflow-hidden ${
                      isContracted
                        ? 'bg-rose-50/20 border-rose-200 hover:border-rose-400 hover:shadow-xs'
                        : isSelected
                        ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
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

                        {/* 판매완료 썸네일 오버레이 */}
                        {isContracted && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center z-10 p-1 pointer-events-none">
                            <span className="bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded shadow-md border border-rose-300 tracking-wider">
                              판매완료
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {property.receiptDate && (
                                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                  {formatShortDate(property.receiptDate)}
                                </span>
                              )}
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-600 text-white shrink-0">
                                {PROPERTY_TYPE_LABELS[property.propertyType]}
                              </span>
                              <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-800 shrink-0">
                                {property.transactionType}
                              </span>
                              {isContracted && (
                                <span className="px-2 py-0.5 text-[11px] font-black rounded-md bg-rose-600 text-white shadow-xs shrink-0 flex items-center gap-0.5 border border-rose-300 animate-pulse">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>판매완료</span>
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-black text-blue-900 truncate">
                              {getPriceDisplay(property)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className={`font-black text-xs sm:text-sm line-clamp-1 ${
                              isContracted ? 'text-slate-800' : 'text-slate-900'
                            }`}>
                              {property.apartmentDetail?.complexName ||
                               property.storeDetail?.storeName ||
                               property.officeDetail?.officeName ||
                               property.factoryWarehouseDetail?.companyName ||
                               property.landDetail?.companyName ||
                               property.address}
                            </h4>
                            {isContracted && (
                              <span className="px-1.5 py-0.2 text-[10px] font-black rounded bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                                [판매완료]
                              </span>
                            )}
                          </div>

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
                          {property.propertyType === 'STORE' && (
                            <div className="flex items-center gap-1.5 mt-1">
                              {(() => {
                                const isNoPrem = !!(property.storeDetail?.isNoPremium || property.isNoPremium || (property.storeDetail && property.storeDetail.premium === 0));
                                const premVal = isNoPrem
                                  ? 0
                                  : (property.storeDetail?.premium ?? property.premium ?? (property.propertyNumber === '구만족발보쌈' ? 10000 : (property.propertyNumber === '왕돈까스' ? 3000 : (property.propertyNumber === '뭉터기와육회' ? 1000 : undefined))));
                                const negoPremVal = isNoPrem
                                  ? 0
                                  : (property.storeDetail?.negotiablePremium ?? property.negotiablePremium ?? (property.propertyNumber === '구만족발보쌈' ? 7000 : (property.propertyNumber === '뭉터기와육회' ? 1000 : premVal)));
                                const premStr = premVal ? (premVal >= 10000 ? `${(premVal / 10000).toFixed(premVal % 10000 === 0 ? 0 : 1)}억` : `${premVal.toLocaleString()}만원`) : null;
                                const negoStr = negoPremVal && negoPremVal !== premVal ? (negoPremVal >= 10000 ? `${(negoPremVal / 10000).toFixed(negoPremVal % 10000 === 0 ? 0 : 1)}억` : `${negoPremVal.toLocaleString()}만원`) : null;

                                if (isNoPrem) {
                                  return (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      ✨ 무권리
                                    </span>
                                  );
                                }
                                if (premStr) {
                                  return (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                      💰 권리 {premStr}{negoStr ? ` (조정 ${negoStr})` : ''}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
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
                            {/* 카드에서 바로 판매완료/진행중 원클릭 상태 전환 버튼 */}
                            {canEditItem(currentUser, property) && onPropertyUpdated && (
                              !isContracted ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickToggleStatus(e, property, 'CONTRACTED')}
                                  title="클릭 시 즉시 '판매완료'로 표시됩니다"
                                  className="text-[11px] font-black text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-300 rounded px-2 py-0.5 transition-all shadow-2xs flex items-center gap-1 active:scale-95 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>판매완료</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleQuickToggleStatus(e, property, 'AVAILABLE')}
                                  title="판매완료를 해제하고 '진행중'으로 복원합니다"
                                  className="text-[10px] font-bold text-emerald-800 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-300 rounded px-1.5 py-0.5 transition-all shadow-2xs flex items-center gap-0.5 active:scale-95 cursor-pointer"
                                >
                                  <span>진행중 복원</span>
                                </button>
                              )
                            )}

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
          {sortedFiltered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedFiltered.map((property) => {
                const statusInfo = STATUS_LABELS[property.status] || { label: property.status, color: 'bg-slate-100 text-slate-800' };
                const hasImages = property.images && property.images.length > 0;
                const isContracted = property.status === 'CONTRACTED';

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
                    description: `${property.address} ${property.detailAddress || ''}`,
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
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                              {property.receiptDate && (
                                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-white/95 text-slate-700 shadow-xs">
                                  {formatShortDate(property.receiptDate)}
                                </span>
                              )}
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
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                              {property.receiptDate && (
                                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-white text-slate-700 shadow-xs border border-slate-200">
                                  {formatShortDate(property.receiptDate)}
                                </span>
                              )}
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

                        {/* 판매완료 카드 뷰 오버레이 스탬프 */}
                        {isContracted && (
                          <div className="absolute inset-0 bg-black/45 backdrop-blur-2xs flex items-center justify-center z-10 pointer-events-none">
                            <div className="border-2 border-dashed border-rose-400 bg-rose-600/95 text-white font-black px-4 py-1.5 rounded-xl text-sm sm:text-base tracking-widest shadow-xl flex items-center gap-1.5 animate-pulse">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>[ 판 매 완 료 ]</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-4">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span className="font-mono">#{property.propertyNumber}</span>
                          <span>
                            {property.propertyType === 'LAND'
                              ? (property.landDetail?.roadDirection || property.direction || '도로접')
                              : `${property.direction || '남향'} (${property.directionCriteria || '기준없음'})`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors text-sm line-clamp-1">
                            {property.apartmentDetail?.complexName ||
                             property.storeDetail?.storeName ||
                             property.officeDetail?.officeName ||
                             property.factoryWarehouseDetail?.companyName ||
                             property.landDetail?.companyName ||
                             property.address}
                          </h4>
                          {isContracted && (
                            <span className="px-1.5 py-0.2 text-[10px] font-black rounded bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                              [판매완료]
                            </span>
                          )}
                        </div>

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

                        {property.propertyType === 'STORE' && (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            {(() => {
                              const isNoPrem = !!(property.storeDetail?.isNoPremium || property.isNoPremium || (property.storeDetail && property.storeDetail.premium === 0));
                              const premVal = isNoPrem
                                ? 0
                                : (property.storeDetail?.premium ?? property.premium ?? (property.propertyNumber === '구만족발보쌈' ? 10000 : (property.propertyNumber === '왕돈까스' ? 3000 : (property.propertyNumber === '뭉터기와육회' ? 1000 : undefined))));
                              const negoPremVal = isNoPrem
                                ? 0
                                : (property.storeDetail?.negotiablePremium ?? property.negotiablePremium ?? (property.propertyNumber === '구만족발보쌈' ? 7000 : (property.propertyNumber === '뭉터기와육회' ? 1000 : premVal)));
                              const premStr = premVal ? (premVal >= 10000 ? `${(premVal / 10000).toFixed(premVal % 10000 === 0 ? 0 : 1)}억` : `${premVal.toLocaleString()}만원`) : null;
                              const negoStr = negoPremVal && negoPremVal !== premVal ? (negoPremVal >= 10000 ? `${(negoPremVal / 10000).toFixed(negoPremVal % 10000 === 0 ? 0 : 1)}억` : `${negoPremVal.toLocaleString()}만원`) : null;

                              if (isNoPrem) {
                                return (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    ✨ 무권리 (권리금 없음)
                                  </span>
                                );
                              }
                              if (premStr) {
                                return (
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                    💰 권리금: {premStr}{negoStr ? ` (조정: ${negoStr})` : ''}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}

                        {/* 토지 매물 전용 입지 뱃지 & 개별공시지가 정보 */}
                        {(property.propertyType === 'LAND' || property.landDetail) && (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                              {property.landDetail?.roadDirection && (
                                <span className="px-2 py-0.5 rounded font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                                  🛣️ {property.landDetail.roadDirection}
                                </span>
                              )}
                              {property.landDetail?.viewDirection && (
                                <span className="px-2 py-0.5 rounded font-extrabold bg-cyan-50 text-cyan-800 border border-cyan-200">
                                  🌊 {property.landDetail.viewDirection}
                                </span>
                              )}
                              {property.landDetail?.topography && (
                                <span className="px-2 py-0.5 rounded font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  ⛰️ {property.landDetail.topography}
                                </span>
                              )}
                              {property.landDetail?.landCategory && (
                                <span className="px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                                  지목: {property.landDetail.landCategory}
                                </span>
                              )}
                            </div>

                            {property.landDetail?.officialLandPrice ? (
                              <div className="text-[11px] font-bold text-amber-900 bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-200 flex items-center justify-between">
                                <span>
                                  💰 공시지가: <strong>㎡당 {property.landDetail.officialLandPrice.toLocaleString()}원</strong>
                                </span>
                                <span className="text-[10px] text-amber-700 font-semibold">
                                  (평당 약 {Math.round((property.landDetail.officialLandPricePerPyeong || property.landDetail.officialLandPrice * 3.305785) / 10000).toLocaleString()}만원)
                                </span>
                              </div>
                            ) : null}
                          </div>
                        )}

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
                            const savedMode = (typeof window !== 'undefined' ? localStorage.getItem('pref_address_share_mode') : null) as any || 'dong';
                            const result = handleSmartSms(property, undefined, savedMode);
                            if (!result.isMobile) {
                              alert('매물 안내 문자 문구가 클립보드에 복사되었습니다!\n\n(스마트폰에서 접속 시 터치 한 번으로 문자 앱이 즉시 실행됩니다)');
                            }
                          }}
                          title="문자로 매물정보 전송 (스마트폰 즉시 실행 / PC 클립보드 복사)"
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
                        {/* 그리드 뷰 판매완료 원클릭 버튼 */}
                        {canEditItem(currentUser, property) && onPropertyUpdated && (
                          <button
                            type="button"
                            onClick={(e) => handleQuickToggleStatus(e, property, isContracted ? 'AVAILABLE' : 'CONTRACTED')}
                            title={isContracted ? "진행중으로 복원" : "판매완료로 변경"}
                            className={`px-2 py-1 rounded-md text-[10px] font-black border transition-all cursor-pointer ${
                              isContracted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-600 hover:text-white'
                                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-600 hover:text-white'
                            }`}
                          >
                            {isContracted ? '진행복원' : '판매완료'}
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
