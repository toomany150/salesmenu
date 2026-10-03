'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  UserCheck, 
  Building2, 
  DollarSign, 
  Check, 
  X
} from 'lucide-react';
import { 
  PropertyItem, 
  PropertyType, 
  TransactionType, 
  CustomerItem, 
  PROPERTY_TYPE_LABELS, 
  DIRECTION_OPTIONS 
} from '@/lib/types';

export interface PropertyFilterCriteria {
  searchQuery: string;
  propertyType: string; // 'ALL' or PropertyType
  transactionType: string; // 'ALL' or TransactionType
  // Price (in 만원)
  minPrice?: number;
  maxPrice?: number;
  minDeposit?: number;
  maxDeposit?: number;
  minMonthlyRent?: number;
  maxMonthlyRent?: number;
  // Area (in 평)
  minPyeong?: number;
  maxPyeong?: number;
  // Rooms
  roomCount?: string; // 'ALL', '1', '2', '3', '4+'
  // Direction
  direction?: string; // 'ALL' or direction
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
  className?: string;
}

export const PropertyFilterPanel: React.FC<PropertyFilterPanelProps> = ({
  properties,
  customers,
  onFilterChange,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyType, setPropertyType] = useState<string>('ALL');
  const [transactionType, setTransactionType] = useState<string>('ALL');

  // Price ranges (만원)
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minDeposit, setMinDeposit] = useState<string>('');
  const [maxDeposit, setMaxDeposit] = useState<string>('');
  const [minMonthlyRent, setMinMonthlyRent] = useState<string>('');
  const [maxMonthlyRent, setMaxMonthlyRent] = useState<string>('');

  // Area (평)
  const [minPyeong, setMinPyeong] = useState<string>('');
  const [maxPyeong, setMaxPyeong] = useState<string>('');

  // Specs
  const [roomCount, setRoomCount] = useState<string>('ALL');
  const [direction, setDirection] = useState<string>('ALL');

  // Features
  const [isFullOption, setIsFullOption] = useState(false);
  const [hasElevator, setHasElevator] = useState(false);
  const [hasParking, setHasParking] = useState(false);

  // Matched Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

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
        const pyeong = Math.round(demand.preferredArea / 3.3058);
        setMinPyeong(String(Math.max(1, pyeong - 5)));
        setMaxPyeong(String(pyeong + 10));
      }
      setIsExpanded(true);
    }
  };

  // Helper to extract area in Pyeong from property
  const getPropertyPyeong = (p: PropertyItem): number => {
    const areaM2 = 
      p.apartmentDetail?.exclusiveArea || 
      p.apartmentDetail?.supplyArea || 
      p.houseDetail?.totalFloorArea || 
      p.houseDetail?.buildingArea || 
      p.storeDetail?.actualArea || 
      p.officeDetail?.actualArea || 
      p.factoryWarehouseDetail?.totalFloorArea || 
      p.landArea || 
      0;
    return areaM2 > 0 ? areaM2 / 3.3058 : 0;
  };

  // Helper to get room count from property
  const getPropertyRoomCount = (p: PropertyItem): number => {
    return (
      p.apartmentDetail?.roomCount || 
      p.houseDetail?.roomCount || 
      p.storeDetail?.roomCount || 
      p.officeDetail?.roomCount || 
      0
    );
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

      // 2. Property Type
      if (propertyType !== 'ALL' && p.propertyType !== propertyType) {
        return false;
      }

      // 3. Transaction Type
      if (transactionType !== 'ALL' && p.transactionType !== transactionType) {
        return false;
      }

      // 4. Price conditions
      if (p.transactionType === '매매') {
        const price = p.price || 0;
        if (minPrice && price < parseFloat(minPrice)) return false;
        if (maxPrice && price > parseFloat(maxPrice)) return false;
      } else if (p.transactionType === '전세') {
        const deposit = p.deposit || 0;
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

      // 5. Area in Pyeong
      const pyeong = getPropertyPyeong(p);
      if (minPyeong && pyeong > 0 && pyeong < parseFloat(minPyeong)) return false;
      if (maxPyeong && pyeong > 0 && pyeong > parseFloat(maxPyeong)) return false;

      // 6. Room count
      if (roomCount !== 'ALL') {
        const rooms = getPropertyRoomCount(p);
        if (roomCount === '1' && rooms !== 1) return false;
        if (roomCount === '2' && rooms !== 2) return false;
        if (roomCount === '3' && rooms !== 3) return false;
        if (roomCount === '4+' && rooms < 4) return false;
      }

      // 7. Direction
      if (direction !== 'ALL') {
        if (!p.direction || !p.direction.includes(direction)) return false;
      }

      // 8. Full option
      if (isFullOption) {
        const optionsStr = (p.houseDetail?.options || p.apartmentDetail?.otherOptions || '').toLowerCase();
        const hasAc = optionsStr.includes('에어컨') || optionsStr.includes('에어콘') || p.apartmentDetail?.systemAircon;
        const hasFridge = optionsStr.includes('냉장고');
        const hasWasher = optionsStr.includes('세탁기');
        if (!hasAc && !hasFridge && !hasWasher) return false;
      }

      // 9. Elevator
      if (hasElevator) {
        const aptElev = (p.apartmentDetail?.elevatorCount || 0) > 0;
        const houseElev = (p.houseDetail?.options || '').includes('엘리베이터');
        const officeElev = (p.officeDetail?.elevator || '').length > 0;
        if (!aptElev && !houseElev && !officeElev) return false;
      }

      // 10. Parking
      if (hasParking) {
        const parking = (p.houseDetail?.parkingCount || 0) > 0 || (p.storeDetail?.parkingCount || 0) > 0 || (p.officeDetail?.parkingCount || 0) > 0;
        if (!parking) return false;
      }

      return true;
    });
  }, [
    properties,
    searchQuery,
    propertyType,
    transactionType,
    minPrice,
    maxPrice,
    minDeposit,
    maxDeposit,
    minMonthlyRent,
    maxMonthlyRent,
    minPyeong,
    maxPyeong,
    roomCount,
    direction,
    isFullOption,
    hasElevator,
    hasParking,
  ]);

  // Sync with parent whenever filtered results change
  useEffect(() => {
    onFilterChange(filtered, {
      searchQuery,
      propertyType,
      transactionType,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minDeposit: minDeposit ? parseFloat(minDeposit) : undefined,
      maxDeposit: maxDeposit ? parseFloat(maxDeposit) : undefined,
      minMonthlyRent: minMonthlyRent ? parseFloat(minMonthlyRent) : undefined,
      maxMonthlyRent: maxMonthlyRent ? parseFloat(maxMonthlyRent) : undefined,
      minPyeong: minPyeong ? parseFloat(minPyeong) : undefined,
      maxPyeong: maxPyeong ? parseFloat(maxPyeong) : undefined,
      roomCount,
      direction,
      isFullOption,
      hasElevator,
      hasParking,
      matchedCustomerId: selectedCustomerId || undefined,
    });
  }, [filtered]);

  // Reset all filters
  const handleReset = () => {
    setSearchQuery('');
    setPropertyType('ALL');
    setTransactionType('ALL');
    setMinPrice('');
    setMaxPrice('');
    setMinDeposit('');
    setMaxDeposit('');
    setMinMonthlyRent('');
    setMaxMonthlyRent('');
    setMinPyeong('');
    setMaxPyeong('');
    setRoomCount('ALL');
    setDirection('ALL');
    setIsFullOption(false);
    setHasElevator(false);
    setHasParking(false);
    setSelectedCustomerId('');
  };

  // Active filter count (excluding default values)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (propertyType !== 'ALL') count++;
    if (transactionType !== 'ALL') count++;
    if (minPrice || maxPrice) count++;
    if (minDeposit || maxDeposit) count++;
    if (minMonthlyRent || maxMonthlyRent) count++;
    if (minPyeong || maxPyeong) count++;
    if (roomCount !== 'ALL') count++;
    if (direction !== 'ALL') count++;
    if (isFullOption) count++;
    if (hasElevator) count++;
    if (hasParking) count++;
    if (selectedCustomerId) count++;
    return count;
  }, [
    searchQuery,
    propertyType,
    transactionType,
    minPrice,
    maxPrice,
    minDeposit,
    maxDeposit,
    minMonthlyRent,
    maxMonthlyRent,
    minPyeong,
    maxPyeong,
    roomCount,
    direction,
    isFullOption,
    hasElevator,
    hasParking,
    selectedCustomerId,
  ]);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden ${className}`}>
      {/* 1. Main Search & Top Control Bar */}
      <div className="p-4 space-y-3">
        {/* Top bar: Search bar + Customer Demand Linking Dropdown + Expand Toggle */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="매물번호, 도로명/지번 주소, 의뢰고객명, 메모 검색..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
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
                className="w-full text-xs px-2.5 py-2 bg-indigo-50/60 border border-indigo-200 rounded-lg text-indigo-900 font-semibold focus:ring-2 focus:ring-indigo-500"
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

          {/* Toggle Expand / Collapse Button & Reset */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>초기화</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                isExpanded || activeFilterCount > 0
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>상세 필터로 물건 찾기</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-blue-800 text-[10px] font-black rounded-full">
                  {activeFilterCount}
                </span>
              )}
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 2. Fast Filter: 7 Types Buttons + Transaction Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          {/* Type Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPropertyType('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
                propertyType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 ({properties.length})
            </button>
            {(['APARTMENT', 'HOUSE', 'STORE', 'OFFICE', 'FACTORY_WAREHOUSE', 'LAND'] as PropertyType[]).map((type) => {
              const count = properties.filter((p) => p.propertyType === type).length;
              const isSel = propertyType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPropertyType(type)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
                    isSel
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {PROPERTY_TYPE_LABELS[type]} ({count})
                </button>
              );
            })}
          </div>

          {/* Transaction Type Filter */}
          <div className="flex items-center gap-1 text-xs shrink-0">
            <span className="text-slate-400 font-medium mr-1">거래:</span>
            {(['ALL', '매매', '전세', '월세'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTransactionType(t)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  transactionType === t
                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t === 'ALL' ? '전체' : t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Collapsible Detailed Filter Panel */}
      {isExpanded && (
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 space-y-4 animate-in fade-in duration-150">
          
          {/* Row 1: 가격대 필터 (매매가 / 보증금 / 월세) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                가격대 조건 (만원 단위)
              </span>
              <span className="text-[11px] text-slate-400">
                (예: 3억 = 30000, 10억 = 100000)
              </span>
            </div>

            {(transactionType === 'ALL' || transactionType === '매매') && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-600">매매가 범위</span>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="최소 매매가"
                    className="w-28 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                  <span className="text-slate-400">~</span>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="최대 매매가"
                    className="w-28 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />

                  {/* Quick Price Chips */}
                  <div className="flex items-center gap-1 text-[11px] flex-wrap">
                    {[
                      { label: '~3억', min: '', max: '30000' },
                      { label: '3억~6억', min: '30000', max: '60000' },
                      { label: '6억~10억', min: '60000', max: '100000' },
                      { label: '10억~20억', min: '100000', max: '200000' },
                      { label: '20억 이상', min: '200000', max: '' },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => {
                          setMinPrice(chip.min);
                          setMaxPrice(chip.max);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md font-medium"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(transactionType === '전세' || transactionType === '월세') && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-600">보증금 범위</span>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    value={minDeposit}
                    onChange={(e) => setMinDeposit(e.target.value)}
                    placeholder="최소 보증금"
                    className="w-28 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                  <span className="text-slate-400">~</span>
                  <input
                    type="number"
                    value={maxDeposit}
                    onChange={(e) => setMaxDeposit(e.target.value)}
                    placeholder="최대 보증금"
                    className="w-28 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {transactionType === '월세' && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-600">월세 범위 (만원)</span>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    value={minMonthlyRent}
                    onChange={(e) => setMinMonthlyRent(e.target.value)}
                    placeholder="최소 월세"
                    className="w-28 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                  <span className="text-slate-400">~</span>
                  <input
                    type="number"
                    value={maxMonthlyRent}
                    onChange={(e) => setMaxMonthlyRent(e.target.value)}
                    placeholder="최대 월세"
                    className="w-28 text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Row 2: 평수(면적), 방수, 방향, 옵션 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* 평수 / 면적 */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-800 block">면적 / 평수 조건 (평)</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={minPyeong}
                  onChange={(e) => setMinPyeong(e.target.value)}
                  placeholder="최소"
                  className="w-16 text-xs px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
                <span className="text-slate-400 text-xs">~</span>
                <input
                  type="number"
                  value={maxPyeong}
                  onChange={(e) => setMaxPyeong(e.target.value)}
                  placeholder="최대"
                  className="w-16 text-xs px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                />
                <span className="text-xs text-slate-500 font-semibold">평</span>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px]">
                {[
                  { label: '~10평', min: '', max: '10' },
                  { label: '10~20평', min: '10', max: '20' },
                  { label: '20~30평', min: '20', max: '30' },
                  { label: '30~40평', min: '30', max: '40' },
                  { label: '40평~', min: '40', max: '' },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      setMinPyeong(chip.min);
                      setMaxPyeong(chip.max);
                    }}
                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 방 수 */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-800 block">방 개수</span>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { id: 'ALL', label: '전체' },
                  { id: '1', label: '원룸' },
                  { id: '2', label: '2룸' },
                  { id: '3', label: '3룸' },
                  { id: '4+', label: '4룸+' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRoomCount(item.id)}
                    className={`py-1.5 text-xs font-semibold rounded-md border text-center transition-all ${
                      roomCount === item.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 방향 */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-800 block">선호 방향</span>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
              >
                <option value="ALL">방향 전체</option>
                {DIRECTION_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* 특이 옵션 체크박스 */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-800 block">필수 설비 / 옵션</span>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFullOption}
                    onChange={(e) => setIsFullOption(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                  />
                  <span className="text-slate-700 font-medium">풀옵션 (에어컨/냉장고 등)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasElevator}
                    onChange={(e) => setHasElevator(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                  />
                  <span className="text-slate-700 font-medium">엘리베이터 설치</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasParking}
                    onChange={(e) => setHasParking(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
                  />
                  <span className="text-slate-700 font-medium">주차 가능 매물</span>
                </label>
              </div>
            </div>

          </div>

          {/* Result Badge */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="font-bold text-blue-900">
              🎯 필터 조건 검색 결과: <strong className="text-sm font-black">{filtered.length}</strong>건의 매물이 발견되었습니다.
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-slate-500 hover:text-slate-800 font-medium"
            >
              필터 전체 닫기 및 초기화
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
