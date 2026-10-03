// src/components/properties/PropertyFilterPanel.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  RotateCcw, 
  UserCheck, 
  Building2, 
  DollarSign, 
  SlidersHorizontal,
  PlusCircle,
  Maximize2,
  Compass,
  CheckSquare,
  Square
} from 'lucide-react';
import { 
  PropertyItem, 
  PropertyType, 
  TransactionType, 
  CustomerItem, 
  PROPERTY_TYPE_LABELS, 
  DIRECTION_OPTIONS 
} from '@/lib/types';

export type AreaTargetType = 'EXCLUSIVE' | 'SUPPLY' | 'LAND' | 'BUILDING';

export interface PropertyFilterCriteria {
  searchQuery: string;
  status: string; // 'ALL' | 'AVAILABLE' | 'CONTRACTED' | 'HOLD'
  propertyType: string; // 'ALL' or PropertyType
  transactionType: string; // 'ALL' or TransactionType
  // Price (in 만원)
  minPrice?: number;
  maxPrice?: number;
  minDeposit?: number;
  maxDeposit?: number;
  minMonthlyRent?: number;
  maxMonthlyRent?: number;
  // Area (평 & ㎡)
  areaType: AreaTargetType;
  minPyeong?: number;
  maxPyeong?: number;
  minM2?: number;
  maxM2?: number;
  // Direction
  direction?: string;
  // Special options
  isFullOption?: boolean;
  hasElevator?: boolean;
  hasParking?: boolean;
  // Matched Customer ID
  matchedCustomerId?: string;
}

interface PropertyFilterPanelProps {
  properties: PropertyItem[];
  customers: CustomerItem[];
  onFilterChange: (filtered: PropertyItem[], criteria: PropertyFilterCriteria) => void;
  onOpenNewProperty?: () => void;
  className?: string;
}

export const PropertyFilterPanel: React.FC<PropertyFilterPanelProps> = ({
  properties,
  customers,
  onFilterChange,
  onOpenNewProperty,
  className = '',
}) => {
  // 1. Text Search & Customer Matching
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // 2. 거래상태: [전체, 거래중, 판매완료, 보류]
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // 3. 매물종류: [전체, 아파트, 주택, 상가점포, 사무실, 공장/창고, 토지]
  const [propertyType, setPropertyType] = useState<string>('ALL');

  // 4. 거래종류: [전체, 매매, 전세, 월세]
  const [transactionType, setTransactionType] = useState<string>('ALL');

  // 5. 금액 조건 (만원 단위)
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minDeposit, setMinDeposit] = useState<string>('');
  const [maxDeposit, setMaxDeposit] = useState<string>('');
  const [minMonthlyRent, setMinMonthlyRent] = useState<string>('');
  const [maxMonthlyRent, setMaxMonthlyRent] = useState<string>('');

  // 6. 면적 조건 (평수 ↔ ㎡ 자동연동)
  const [areaType, setAreaType] = useState<AreaTargetType>('EXCLUSIVE');
  const [minPyeong, setMinPyeong] = useState<string>('');
  const [minM2, setMinM2] = useState<string>('');
  const [maxPyeong, setMaxPyeong] = useState<string>('');
  const [maxM2, setMaxM2] = useState<string>('');

  // 7. 선호방향
  const [direction, setDirection] = useState<string>('ALL');

  // 8. 필수옵션
  const [hasParking, setHasParking] = useState(false);
  const [hasElevator, setHasElevator] = useState(false);
  const [isFullOption, setIsFullOption] = useState(false);

  // 면적 자동 환산 핸들러 (1평 = 3.30578㎡)
  const handleMinPyeongChange = (val: string) => {
    setMinPyeong(val);
    if (!val || isNaN(Number(val))) {
      setMinM2('');
    } else {
      const calcM2 = Math.round(parseFloat(val) * 3.30578 * 10) / 10;
      setMinM2(String(calcM2));
    }
  };

  const handleMinM2Change = (val: string) => {
    setMinM2(val);
    if (!val || isNaN(Number(val))) {
      setMinPyeong('');
    } else {
      const calcPy = Math.round((parseFloat(val) / 3.30578) * 10) / 10;
      setMinPyeong(String(calcPy));
    }
  };

  const handleMaxPyeongChange = (val: string) => {
    setMaxPyeong(val);
    if (!val || isNaN(Number(val))) {
      setMaxM2('');
    } else {
      const calcM2 = Math.round(parseFloat(val) * 3.30578 * 10) / 10;
      setMaxM2(String(calcM2));
    }
  };

  const handleMaxM2Change = (val: string) => {
    setMaxM2(val);
    if (!val || isNaN(Number(val))) {
      setMaxPyeong('');
    } else {
      const calcPy = Math.round((parseFloat(val) / 3.30578) * 10) / 10;
      setMaxPyeong(String(calcPy));
    }
  };

  // Searching customers list ([물건 찾음] 고객 목록)
  const searchingCustomers = useMemo(() => {
    return customers.filter((c) => c.group === 'SEARCHING' || c.type === 'BUYER' || c.type === 'LESSEE');
  }, [customers]);

  // When a searching customer is selected, apply their preferences
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    if (!custId) return;

    const cust = customers.find((c) => c.id === custId);
    if (!cust) return;

    const demand = cust.demands && cust.demands.length > 0 ? cust.demands[0] : null;
    if (demand) {
      if (demand.targetPropertyType) setPropertyType(demand.targetPropertyType);
      if (demand.targetTransactionType) setTransactionType(demand.targetTransactionType);
      if (demand.minBudget) setMinPrice(String(demand.minBudget));
      if (demand.maxBudget) setMaxPrice(String(demand.maxBudget));
      if (demand.minDeposit) setMinDeposit(String(demand.minDeposit));
      if (demand.maxDeposit) setMaxDeposit(String(demand.maxDeposit));
      if (demand.minMonthlyRent) setMinMonthlyRent(String(demand.minMonthlyRent));
      if (demand.maxMonthlyRent) setMaxMonthlyRent(String(demand.maxMonthlyRent));
      if (demand.preferredArea) {
        const pyeong = Math.round(demand.preferredArea / 3.30578);
        handleMinPyeongChange(String(Math.max(1, pyeong - 5)));
        handleMaxPyeongChange(String(pyeong + 10));
      }
    }
  };

  // Helper to extract area based on selected area target type
  const getPropertyArea = (p: PropertyItem, targetType: AreaTargetType): number => {
    switch (targetType) {
      case 'EXCLUSIVE': // 전용면적
        return (
          p.apartmentDetail?.exclusiveArea || 
          p.storeDetail?.actualArea || 
          p.officeDetail?.actualArea || 
          p.houseDetail?.totalFloorArea || 
          p.landArea || 
          0
        );
      case 'SUPPLY': // 공급면적
        return (
          p.apartmentDetail?.supplyArea || 
          p.houseDetail?.totalFloorArea || 
          p.storeDetail?.actualArea || 
          p.officeDetail?.actualArea || 
          0
        );
      case 'LAND': // 대지면적
        return (
          p.landArea || 
          p.landDetail?.landArea || 
          p.houseDetail?.landArea || 
          p.storeDetail?.landArea || 
          p.officeDetail?.landArea || 
          p.factoryWarehouseDetail?.landArea || 
          0
        );
      case 'BUILDING': // 건축면적
        return (
          p.houseDetail?.buildingArea || 
          p.storeDetail?.buildingArea || 
          p.officeDetail?.buildingArea || 
          p.factoryWarehouseDetail?.buildingArea || 
          p.apartmentDetail?.supplyArea || 
          0
        );
      default:
        return 0;
    }
  };

  // Execute filtering
  const filtered = useMemo(() => {
    return properties.filter((p) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = p.propertyNumber.toLowerCase().includes(q);
        const matchAddr = p.address.toLowerCase().includes(q);
        const matchRoad = p.roadAddress?.toLowerCase().includes(q);
        const matchJibun = p.jibunAddress?.toLowerCase().includes(q);
        const matchDetail = p.detailAddress?.toLowerCase().includes(q);
        const matchCust = p.customer?.name.toLowerCase().includes(q);
        const matchNotes = p.consultationNotes?.toLowerCase().includes(q);
        if (!matchNum && !matchAddr && !matchRoad && !matchJibun && !matchDetail && !matchCust && !matchNotes) {
          return false;
        }
      }

      // 2. 거래상태 (전체, 거래중, 판매완료, 보류)
      if (statusFilter !== 'ALL') {
        if (p.status !== statusFilter) return false;
      }

      // 3. 매물종류 (전체, 아파트, 주택, 상가점포, 사무실, 공장/창고, 토지)
      if (propertyType !== 'ALL' && p.propertyType !== propertyType) {
        return false;
      }

      // 4. 거래종류 (전체, 매매, 전세, 월세)
      if (transactionType !== 'ALL' && p.transactionType !== transactionType) {
        return false;
      }

      // 5. 금액 조건
      if (p.transactionType === '매매') {
        const price = p.price || 0;
        if (minPrice && price < parseFloat(minPrice)) return false;
        if (maxPrice && price > parseFloat(maxPrice)) return false;
      } else if (p.transactionType === '전세') {
        const deposit = p.deposit || 0;
        if (minPrice && deposit < parseFloat(minPrice)) return false; // 매매가칸과 겸용
        if (maxPrice && deposit > parseFloat(maxPrice)) return false;
        if (minDeposit && deposit < parseFloat(minDeposit)) return false;
        if (maxDeposit && deposit > parseFloat(maxDeposit)) return false;
      } else if (p.transactionType === '월세') {
        const deposit = p.deposit || 0;
        const rent = p.monthlyRent || 0;
        if (minDeposit && deposit < parseFloat(minDeposit)) return false;
        if (maxDeposit && deposit > parseFloat(maxDeposit)) return false;
        if (minMonthlyRent && rent < parseFloat(minMonthlyRent)) return false;
        if (maxMonthlyRent && rent > parseFloat(maxMonthlyRent)) return false;
      }

      // 6. 면적 조건 (평수 ↔ ㎡)
      const areaM2 = getPropertyArea(p, areaType);
      if (minM2 && areaM2 > 0 && areaM2 < parseFloat(minM2)) return false;
      if (maxM2 && areaM2 > 0 && areaM2 > parseFloat(maxM2)) return false;

      // 7. 선호방향
      if (direction !== 'ALL') {
        if (!p.direction || !p.direction.includes(direction)) return false;
      }

      // 8. 필수옵션: 주차가능
      if (hasParking) {
        const parking = 
          (p.houseDetail?.parkingCount || 0) > 0 || 
          (p.storeDetail?.parkingCount || 0) > 0 || 
          (p.officeDetail?.parkingCount || 0) > 0 ||
          (p.factoryWarehouseDetail?.parkingCount || 0) > 0;
        if (!parking) return false;
      }

      // 9. 필수옵션: 엘리베이터
      if (hasElevator) {
        const aptElev = (p.apartmentDetail?.elevatorCount || 0) > 0;
        const houseElev = (p.houseDetail?.options || '').includes('엘리베이터');
        const officeElev = (p.officeDetail?.elevator || '').length > 0;
        if (!aptElev && !houseElev && !officeElev) return false;
      }

      // 10. 필수옵션: 풀옵션
      if (isFullOption) {
        const optionsStr = (p.houseDetail?.options || p.apartmentDetail?.otherOptions || '').toLowerCase();
        const hasAc = optionsStr.includes('에어컨') || optionsStr.includes('에어콘') || p.apartmentDetail?.systemAircon;
        const hasFridge = optionsStr.includes('냉장고');
        const hasWasher = optionsStr.includes('세탁기');
        if (!hasAc && !hasFridge && !hasWasher) return false;
      }

      return true;
    });
  }, [
    properties,
    searchQuery,
    statusFilter,
    propertyType,
    transactionType,
    minPrice,
    maxPrice,
    minDeposit,
    maxDeposit,
    minMonthlyRent,
    maxMonthlyRent,
    areaType,
    minM2,
    maxM2,
    direction,
    hasParking,
    hasElevator,
    isFullOption,
  ]);

  // Sync with parent whenever filtered results change
  useEffect(() => {
    onFilterChange(filtered, {
      searchQuery,
      status: statusFilter,
      propertyType,
      transactionType,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minDeposit: minDeposit ? parseFloat(minDeposit) : undefined,
      maxDeposit: maxDeposit ? parseFloat(maxDeposit) : undefined,
      minMonthlyRent: minMonthlyRent ? parseFloat(minMonthlyRent) : undefined,
      maxMonthlyRent: maxMonthlyRent ? parseFloat(maxMonthlyRent) : undefined,
      areaType,
      minPyeong: minPyeong ? parseFloat(minPyeong) : undefined,
      maxPyeong: maxPyeong ? parseFloat(maxPyeong) : undefined,
      minM2: minM2 ? parseFloat(minM2) : undefined,
      maxM2: maxM2 ? parseFloat(maxM2) : undefined,
      direction,
      hasParking,
      hasElevator,
      isFullOption,
      matchedCustomerId: selectedCustomerId || undefined,
    });
  }, [filtered, statusFilter, propertyType, transactionType]);

  // Reset all filters
  const handleReset = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPropertyType('ALL');
    setTransactionType('ALL');
    setMinPrice('');
    setMaxPrice('');
    setMinDeposit('');
    setMaxDeposit('');
    setMinMonthlyRent('');
    setMaxMonthlyRent('');
    setMinPyeong('');
    setMinM2('');
    setMaxPyeong('');
    setMaxM2('');
    setDirection('ALL');
    setHasParking(false);
    setHasElevator(false);
    setIsFullOption(false);
    setSelectedCustomerId('');
  };

  const isPriceRangeActive = transactionType === 'ALL' || transactionType === '매매' || transactionType === '전세';
  const isRentRangeActive = transactionType === '월세';

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 ${className}`}>
      
      {/* ============================================================== */}
      {/* 1. 5번째 첨부화면 상단부: 스마트 매물장 타이틀 & 새 매물 등록 버튼 */}
      {/* ============================================================== */}
      <div className="bg-gradient-to-r from-slate-900/5 via-slate-800/5 to-transparent px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            스마트 매물장 (아파트·주택·상가·사무실·공장창고·토지)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            각 매물별로 [📞 전화걸기], [💬 문자로 전송], [🟡 카톡 공유] 버튼이 바로 제공됩니다.
          </p>
        </div>

        {onOpenNewProperty && (
          <button
            type="button"
            onClick={onOpenNewProperty}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all active:scale-95 shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>＋ 새 매물 등록</span>
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. 5번째 첨부화면 검색창: 매물검색어 + 고객 매칭 연동 + 초기화 */}
      {/* ============================================================== */}
      <div className="px-5 pt-1">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="매물번호, 도로명/지번 주소, 의뢰고객명, 메모 검색..."
              className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-900 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Customer Demand Link Select (고객 등록 연동 물건 찾기) */}
          {searchingCustomers.length > 0 && (
            <div className="flex items-center gap-1.5 md:w-72 shrink-0">
              <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-indigo-50/70 border border-indigo-200 rounded-xl text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                <option value="">👤 [물건 찾음] 고객 조건으로 자동 매칭</option>
                {searchingCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.demands && c.demands[0] ? `${c.demands[0].targetTransactionType} ${c.demands[0].targetPropertyType}` : '조건탐색'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors shrink-0 shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>조건 초기화</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. 재구성된 상세 필터 바: 거래상태 / 매물종류 / 거래종류 / 금액 / 면적(자동연산) / 선호방향 / 필수옵션 */}
      {/* ============================================================== */}
      <div className="px-5 pb-5 space-y-3 pt-1">
        
        {/* 행 1: [거래상태] | [매물종류] | [거래종류] */}
        <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200/90 flex flex-wrap items-center gap-4 text-xs">
          
          {/* (1) 거래상태: [전체 거래중 판매완료 보류] */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-slate-700 shrink-0">거래상태:</span>
            {[
              { id: 'ALL', label: '전체' },
              { id: 'AVAILABLE', label: '⚡ 거래중', activeClass: 'bg-emerald-600 text-white shadow-2xs' },
              { id: 'CONTRACTED', label: '✓ 판매완료', activeClass: 'bg-blue-600 text-white shadow-2xs' },
              { id: 'HOLD', label: '⏸️ 보류', activeClass: 'bg-amber-600 text-white shadow-2xs' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st.id
                    ? (st.activeClass || 'bg-slate-900 text-white shadow-2xs')
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="hidden lg:block w-px h-6 bg-slate-300"></div>

          {/* (2) 매물종류: [전체 아파트 주택 상가점포 사무실 공장/창고 토지] */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-slate-700 shrink-0">매물종류:</span>
            <button
              type="button"
              onClick={() => setPropertyType('ALL')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                propertyType === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              전체
            </button>
            {(['APARTMENT', 'HOUSE', 'STORE', 'OFFICE', 'FACTORY_WAREHOUSE', 'LAND'] as PropertyType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPropertyType(type)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  propertyType === type
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {PROPERTY_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          <div className="hidden xl:block w-px h-6 bg-slate-300"></div>

          {/* (3) 거래종류: [전체 매매 전세 월세] */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-extrabold text-slate-700 shrink-0">거래종류:</span>
            {(['ALL', '매매', '전세', '월세'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTransactionType(t)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  transactionType === t
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {t === 'ALL' ? '전체' : t}
              </button>
            ))}
          </div>

        </div>

        {/* 행 2: [금액 범위] | [면적 (평수↔㎡ 자동연산 & 전용/공급/대지/건축)] | [선호방향] | [필수옵션] */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          
          {/* (4) 금액 범위: 매매/전세일 경우 매매가 범위, 월세일 경우 보증금/월세 범위 */}
          <div className="md:col-span-4 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                {transactionType === '월세' ? '보증금 / 월세 범위 (만원)' : '금액 / 매매가 범위 (만원)'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">1억=10,000</span>
            </div>

            {/* 매매 또는 전세 or 전체 */}
            {isPriceRangeActive && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="최소 금액"
                  className="w-24 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                />
                <span className="text-slate-400">~</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="최대 금액"
                  className="w-24 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                />
                <span className="text-slate-500 font-medium text-[11px]">만원</span>

                {/* 퀵 칩 */}
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {[
                    { label: '~3억', min: '', max: '30000' },
                    { label: '3억~6억', min: '30000', max: '60000' },
                    { label: '6억~10억', min: '60000', max: '100000' },
                    { label: '10억~', min: '100000', max: '' },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setMinPrice(chip.min);
                        setMaxPrice(chip.max);
                      }}
                      className="px-1.5 py-0.5 text-[10px] bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded border border-slate-200"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 월세인 경우: 보증금 및 월세 범위 */}
            {isRentRangeActive && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-12 text-slate-500 text-[11px] font-bold">보증금:</span>
                  <input
                    type="number"
                    value={minDeposit}
                    onChange={(e) => setMinDeposit(e.target.value)}
                    placeholder="최소"
                    className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                  <span className="text-slate-400">~</span>
                  <input
                    type="number"
                    value={maxDeposit}
                    onChange={(e) => setMaxDeposit(e.target.value)}
                    placeholder="최대"
                    className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                  <span className="text-slate-500 text-[11px]">만</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-12 text-slate-500 text-[11px] font-bold">월세:</span>
                  <input
                    type="number"
                    value={minMonthlyRent}
                    onChange={(e) => setMinMonthlyRent(e.target.value)}
                    placeholder="최소"
                    className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                  <span className="text-slate-400">~</span>
                  <input
                    type="number"
                    value={maxMonthlyRent}
                    onChange={(e) => setMaxMonthlyRent(e.target.value)}
                    placeholder="최대"
                    className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                  <span className="text-slate-500 text-[11px]">만</span>
                </div>
              </div>
            )}
          </div>

          {/* (5) 면적: 평수 ↔ 면적 자동 환산 + [전용면적 공급면적 대지면적 건축면적] 선택 */}
          <div className="md:col-span-5 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                면적 조건 (평수 ⇄ ㎡ 자동연동)
              </span>
              
              {/* 면적 종류: 전용면적, 공급면적, 대지면적, 건축면적 */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px]">
                {[
                  { id: 'EXCLUSIVE', label: '전용면적' },
                  { id: 'SUPPLY', label: '공급면적' },
                  { id: 'LAND', label: '대지면적' },
                  { id: 'BUILDING', label: '건축면적' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAreaType(item.id as AreaTargetType)}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      areaType === item.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 평수 / ㎡ 양방향 자동 환산 입력 필드 */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* 최소 면적 */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300">
                  <span className="text-[11px] font-bold text-slate-500 pl-1">최소:</span>
                  <input
                    type="number"
                    value={minPyeong}
                    onChange={(e) => handleMinPyeongChange(e.target.value)}
                    placeholder="평"
                    className="w-14 px-1 py-0.5 text-xs text-right font-bold text-indigo-900 focus:outline-hidden"
                  />
                  <span className="text-slate-400 text-xs">평</span>
                  <span className="text-slate-300">⇄</span>
                  <input
                    type="number"
                    value={minM2}
                    onChange={(e) => handleMinM2Change(e.target.value)}
                    placeholder="㎡"
                    className="w-16 px-1 py-0.5 text-xs text-right font-bold text-indigo-900 focus:outline-hidden"
                  />
                  <span className="text-slate-400 text-xs pr-1">㎡</span>
                </div>

                <span className="text-slate-400 font-bold">~</span>

                {/* 최대 면적 */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300">
                  <span className="text-[11px] font-bold text-slate-500 pl-1">최대:</span>
                  <input
                    type="number"
                    value={maxPyeong}
                    onChange={(e) => handleMaxPyeongChange(e.target.value)}
                    placeholder="평"
                    className="w-14 px-1 py-0.5 text-xs text-right font-bold text-indigo-900 focus:outline-hidden"
                  />
                  <span className="text-slate-400 text-xs">평</span>
                  <span className="text-slate-300">⇄</span>
                  <input
                    type="number"
                    value={maxM2}
                    onChange={(e) => handleMaxM2Change(e.target.value)}
                    placeholder="㎡"
                    className="w-16 px-1 py-0.5 text-xs text-right font-bold text-indigo-900 focus:outline-hidden"
                  />
                  <span className="text-slate-400 text-xs pr-1">㎡</span>
                </div>
              </div>

              {/* 퀵 평수 칩 */}
              <div className="flex items-center gap-1 flex-wrap text-[10px]">
                {[
                  { label: '~10평(33㎡)', min: '', max: '10' },
                  { label: '10~20평', min: '10', max: '20' },
                  { label: '20~30평', min: '20', max: '30' },
                  { label: '30~40평(84㎡대)', min: '30', max: '40' },
                  { label: '40평~(132㎡~)', min: '40', max: '' },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      handleMinPyeongChange(chip.min);
                      handleMaxPyeongChange(chip.max);
                    }}
                    className="px-1.5 py-0.5 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded border border-slate-200 font-medium"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* (6) 선호방향 & (7) 필수옵션 (주차가능, 엘리베이터, 풀옵션) */}
          <div className="md:col-span-3 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-2">
            
            {/* 선호방향 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-slate-800 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-emerald-600" />
                  선호방향
                </span>
              </div>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">방향 전체 (무관)</option>
                {DIRECTION_OPTIONS.map((d) => (
                  <option key={d} value={d}>🧭 {d}</option>
                ))}
              </select>
            </div>

            {/* 필수옵션: 주차가능 / 엘리베이터 / 풀옵션 */}
            <div className="pt-1 border-t border-slate-200/80">
              <span className="font-extrabold text-slate-800 block mb-1 text-[11px]">
                필수옵션
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setHasParking(!hasParking)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    hasParking
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {hasParking ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3 text-slate-400" />}
                  <span>주차가능</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHasElevator(!hasElevator)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    hasElevator
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {hasElevator ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3 text-slate-400" />}
                  <span>엘리베이터</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullOption(!isFullOption)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    isFullOption
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {isFullOption ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3 text-slate-400" />}
                  <span>풀옵션</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
