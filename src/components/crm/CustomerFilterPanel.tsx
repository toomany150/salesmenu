// src/components/crm/CustomerFilterPanel.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RotateCcw, 
  Building2, 
  DollarSign, 
  Maximize2, 
  MapPin, 
  Calendar, 
  Car,
  Filter,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  PropertyType, 
  PROPERTY_TYPE_LABELS, 
  CustomerItem,
  CustomerDemandItem,
  CustomerGroup
} from '@/lib/types';

export interface CustomerFilterCriteria {
  propertyType: string; // 'ALL' | PropertyType
  transactionType: string; // 'ALL' | '매매' | '전세' | '보증금' | '월세'
  // 면적: 평수 ⇄ 평방미터(㎡) 자동 연동
  minM2: string;
  minPyeong: string;
  maxM2: string;
  maxPyeong: string;
  // 찾는 지역
  targetRegion: string;
  // 필요시기 (입주시기 및 오픈시기)
  moveInTiming: string;
  // 주차대수
  parkingRequirement: string;
  // 텍스트 검색 (이름, 전화번호, 메모 등)
  searchQuery: string;
}

export const INITIAL_CUSTOMER_FILTER_CRITERIA: CustomerFilterCriteria = {
  propertyType: 'ALL',
  transactionType: 'ALL',
  minM2: '',
  minPyeong: '',
  maxM2: '',
  maxPyeong: '',
  targetRegion: '',
  moveInTiming: '',
  parkingRequirement: '',
  searchQuery: '',
};

interface CustomerFilterPanelProps {
  customers: CustomerItem[];
  onFilterChange: (filtered: CustomerItem[], criteria: CustomerFilterCriteria) => void;
  className?: string;
}

export const CustomerFilterPanel: React.FC<CustomerFilterPanelProps> = ({
  customers,
  onFilterChange,
  className = '',
}) => {
  const [criteria, setCriteria] = useState<CustomerFilterCriteria>(INITIAL_CUSTOMER_FILTER_CRITERIA);
  const [isDetailedOpen, setIsDetailedOpen] = useState(true);

  // 면적 자동 환산 핸들러 (1평 = 3.305785㎡, 1㎡ = 0.3025평)
  const handleMinPyeongChange = (val: string) => {
    if (!val || isNaN(Number(val))) {
      setCriteria((prev) => ({ ...prev, minPyeong: val, minM2: '' }));
    } else {
      const calcM2 = Math.round(parseFloat(val) * 3.305785 * 10) / 10;
      setCriteria((prev) => ({ ...prev, minPyeong: val, minM2: String(calcM2) }));
    }
  };

  const handleMinM2Change = (val: string) => {
    if (!val || isNaN(Number(val))) {
      setCriteria((prev) => ({ ...prev, minM2: val, minPyeong: '' }));
    } else {
      const calcPy = Math.round((parseFloat(val) / 3.305785) * 10) / 10;
      setCriteria((prev) => ({ ...prev, minM2: val, minPyeong: String(calcPy) }));
    }
  };

  const handleMaxPyeongChange = (val: string) => {
    if (!val || isNaN(Number(val))) {
      setCriteria((prev) => ({ ...prev, maxPyeong: val, maxM2: '' }));
    } else {
      const calcM2 = Math.round(parseFloat(val) * 3.305785 * 10) / 10;
      setCriteria((prev) => ({ ...prev, maxPyeong: val, maxM2: String(calcM2) }));
    }
  };

  const handleMaxM2Change = (val: string) => {
    if (!val || isNaN(Number(val))) {
      setCriteria((prev) => ({ ...prev, maxM2: val, maxPyeong: '' }));
    } else {
      const calcPy = Math.round((parseFloat(val) / 3.305785) * 10) / 10;
      setCriteria((prev) => ({ ...prev, maxM2: val, maxPyeong: String(calcPy) }));
    }
  };

  const handleReset = () => {
    setCriteria(INITIAL_CUSTOMER_FILTER_CRITERIA);
  };

  // 실시간 필터링 계산 및 부모 전달
  useEffect(() => {
    const filtered = customers.filter((customer) => {
      // 1. 찾는 물건의 종류
      if (criteria.propertyType !== 'ALL') {
        const pType = criteria.propertyType;
        const matchDemand = customer.demands?.some((d) => d.targetPropertyType === pType);
        const matchReceived = 
          customer.receivedDetail?.propertyType === pType ||
          customer.properties?.some((p) => p.propertyType === pType);
        const label = PROPERTY_TYPE_LABELS[pType as PropertyType] || '';
        const matchMemo = label ? customer.memo?.includes(label) : false;

        if (!matchDemand && !matchReceived && !matchMemo) {
          return false;
        }
      }

      // 2. 거래 형태 (매매 / 전세 / 보증금 / 월세)
      if (criteria.transactionType !== 'ALL') {
        const tType = criteria.transactionType;
        let matched = false;

        // 희망 탐색조건(demands) 검사
        if (customer.demands && customer.demands.length > 0) {
          matched = customer.demands.some((d) => {
            if (tType === '보증금') {
              return (
                d.targetTransactionType === '월세' ||
                d.targetTransactionType === '전세' ||
                (d.targetDeposit !== undefined && d.targetDeposit > 0) ||
                (d.minDeposit !== undefined && d.minDeposit > 0)
              );
            }
            return d.targetTransactionType === tType;
          });
        }

        // 물건접수 상세(receivedDetail) 검사
        if (!matched && customer.receivedDetail) {
          if (tType === '보증금') {
            matched = 
              customer.receivedDetail.transactionType === '월세' ||
              customer.receivedDetail.transactionType === '전세' ||
              (customer.receivedDetail.deposit !== undefined && customer.receivedDetail.deposit > 0);
          } else {
            matched = customer.receivedDetail.transactionType === tType;
          }
        }

        // 접수 매물 목록(properties) 검사
        if (!matched && customer.properties && customer.properties.length > 0) {
          matched = customer.properties.some((p) => {
            if (tType === '보증금') {
              return p.transactionType === '월세' || p.transactionType === '전세' || (p.deposit !== undefined && p.deposit > 0);
            }
            return p.transactionType === tType;
          });
        }

        // 고객 구분 / 메모 / transactionType 필드 검사
        if (!matched) {
          if (tType === '매매' && (customer.type === 'SELLER' || customer.type === 'BUYER')) {
            matched = true;
          } else if (tType === '보증금' && (customer.deposit || customer.memo?.includes('보증금'))) {
            matched = true;
          } else if (customer.transactionType === tType || customer.memo?.includes(tType)) {
            matched = true;
          }
        }

        if (!matched) return false;
      }

      // 3. 매물의 면적 (평방미터 및 평수)
      const minM2Val = criteria.minM2 ? parseFloat(criteria.minM2) : null;
      const maxM2Val = criteria.maxM2 ? parseFloat(criteria.maxM2) : null;
      if (minM2Val !== null || maxM2Val !== null) {
        let areaMatched = false;
        if (customer.demands && customer.demands.length > 0) {
          areaMatched = customer.demands.some((d) => {
            const area = 
              d.preferredArea || 
              (d.preferredAreaPy ? d.preferredAreaPy * 3.305785 : null) || 
              d.minRequiredArea || 
              (d.minRequiredAreaPy ? d.minRequiredAreaPy * 3.305785 : null);
            if (area === null || area === undefined) return false;
            if (minM2Val !== null && area < minM2Val) return false;
            if (maxM2Val !== null && area > maxM2Val) return false;
            return true;
          });
        }

        if (!areaMatched && customer.properties && customer.properties.length > 0) {
          areaMatched = customer.properties.some((p) => {
            const area = 
              p.apartmentDetail?.exclusiveArea ||
              p.houseDetail?.exclusiveArea ||
              p.houseDetail?.actualArea ||
              p.storeDetail?.actualArea ||
              p.officeDetail?.actualArea ||
              p.buildingArea ||
              p.landArea ||
              p.totalFloorArea;
            if (area === null || area === undefined) return false;
            if (minM2Val !== null && area < minM2Val) return false;
            if (maxM2Val !== null && area > maxM2Val) return false;
            return true;
          });
        }

        if (!areaMatched) return false;
      }

      // 4. 찾는 지역 (targetRegion)
      if (criteria.targetRegion.trim()) {
        const qRegion = criteria.targetRegion.trim().toLowerCase();
        const inDemand = customer.demands?.some(
          (d) =>
            (d.targetRegion && d.targetRegion.toLowerCase().includes(qRegion)) ||
            (d.regionReason && d.regionReason.toLowerCase().includes(qRegion))
        );
        const inReceived =
          (customer.receivedDetail?.roadAddress && customer.receivedDetail.roadAddress.toLowerCase().includes(qRegion)) ||
          (customer.receivedDetail?.jibunAddress && customer.receivedDetail.jibunAddress.toLowerCase().includes(qRegion)) ||
          (customer.receivedDetail?.detailAddress && customer.receivedDetail.detailAddress.toLowerCase().includes(qRegion));
        const inProp = customer.properties?.some(
          (p) =>
            (p.address && p.address.toLowerCase().includes(qRegion)) ||
            (p.roadAddress && p.roadAddress.toLowerCase().includes(qRegion)) ||
            (p.jibunAddress && p.jibunAddress.toLowerCase().includes(qRegion))
        );
        const inMemo = customer.memo && customer.memo.toLowerCase().includes(qRegion);

        if (!inDemand && !inReceived && !inProp && !inMemo) {
          return false;
        }
      }

      // 5. 필요시기 (입주시기 및 오픈시기)
      if (criteria.moveInTiming.trim()) {
        const qTiming = criteria.moveInTiming.trim().toLowerCase();
        const inDemand = customer.demands?.some(
          (d) =>
            (d.moveInTiming && d.moveInTiming.toLowerCase().includes(qTiming)) ||
            (d.moveInReason && d.moveInReason.toLowerCase().includes(qTiming)) ||
            (d.moveInDate && d.moveInDate.toLowerCase().includes(qTiming))
        );
        const inReceived =
          (customer.receivedDetail?.moveInTiming && customer.receivedDetail.moveInTiming.toLowerCase().includes(qTiming)) ||
          (customer.receivedDetail?.emptyPeriodOrMoveOutDate && customer.receivedDetail.emptyPeriodOrMoveOutDate.toLowerCase().includes(qTiming));
        const inProp = customer.properties?.some(
          (p) => p.availableDate && p.availableDate.toLowerCase().includes(qTiming)
        );
        const inMemo = customer.memo && customer.memo.toLowerCase().includes(qTiming);

        if (!inDemand && !inReceived && !inProp && !inMemo) {
          return false;
        }
      }

      // 6. 주차대수
      if (criteria.parkingRequirement.trim()) {
        const qParking = criteria.parkingRequirement.trim().toLowerCase();
        const inDemand = customer.demands?.some(
          (d) => d.parkingRequirement && d.parkingRequirement.toLowerCase().includes(qParking)
        );
        const inReceived =
          (customer.receivedDetail?.parkingDetails && customer.receivedDetail.parkingDetails.toLowerCase().includes(qParking)) ||
          (customer.receivedDetail?.parkingAvailable !== undefined && String(customer.receivedDetail.parkingAvailable).toLowerCase().includes(qParking));
        const inProp = customer.properties?.some((p) => {
          const count = 
            p.apartmentDetail?.parkingCount ||
            p.houseDetail?.parkingCount ||
            p.storeDetail?.parkingCount ||
            p.officeDetail?.parkingCount ||
            p.factoryWarehouseDetail?.parkingCount;
          return count !== undefined && String(count).includes(qParking);
        });
        const inMemo = customer.memo && customer.memo.toLowerCase().includes(qParking);

        if (!inDemand && !inReceived && !inProp && !inMemo) {
          return false;
        }
      }

      // 7. 검색어 (이름, 전화번호, 메모 등)
      if (criteria.searchQuery.trim()) {
        const q = criteria.searchQuery.trim().toLowerCase();
        const inName = customer.name.toLowerCase().includes(q);
        const inPhone = customer.phone.includes(q);
        const inMemo = customer.memo && customer.memo.toLowerCase().includes(q);
        const inManager = customer.managerName && customer.managerName.toLowerCase().includes(q);

        if (!inName && !inPhone && !inMemo && !inManager) {
          return false;
        }
      }

      return true;
    });

    onFilterChange(filtered, criteria);
  }, [customers, criteria, onFilterChange]);

  // 활성화된 필터 개수 계산
  const activeFilterCount = [
    criteria.propertyType !== 'ALL',
    criteria.transactionType !== 'ALL',
    Boolean(criteria.minM2 || criteria.maxM2 || criteria.minPyeong || criteria.maxPyeong),
    Boolean(criteria.targetRegion),
    Boolean(criteria.moveInTiming),
    Boolean(criteria.parkingRequirement),
    Boolean(criteria.searchQuery),
  ].filter(Boolean).length;

  return (
    <div className={`bg-white rounded-2xl border-2 border-blue-200 shadow-sm overflow-hidden ${className}`}>
      {/* 헤더: 실시간 조건 필터 타이틀 & 초기화 버튼 */}
      <div className="bg-gradient-to-r from-blue-50/80 via-sky-50/60 to-indigo-50/40 px-4 py-3 border-b border-blue-200/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
            <Filter className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-blue-950">
                고객장 실시간 조건 검색 필터
              </span>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black bg-blue-600 text-white rounded-full">
                  {activeFilterCount}개 조건 적용중
                </span>
              )}
            </div>
            <p className="text-[11px] text-blue-700">
              물건종류, 거래형태, 면적(㎡⇄평), 지역, 입주/오픈시기, 주차대수를 실시간으로 검색합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>조건 초기화</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDetailedOpen(!isDetailedOpen)}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
            title={isDetailedOpen ? '필터 접기' : '필터 펼치기'}
          >
            {isDetailedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 필터 본체 */}
      {isDetailedOpen && (
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* 상단 검색어 입력창 */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={criteria.searchQuery}
              onChange={(e) => setCriteria((prev) => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="고객명, 연락처, 상담메모, 담당자 검색..."
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden shadow-2xs text-xs"
            />
            {criteria.searchQuery && (
              <button
                type="button"
                onClick={() => setCriteria((prev) => ({ ...prev, searchQuery: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* 조건 1: 찾는 물건의 종류 */}
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>1. 찾는 물건의 종류</span>
              </span>
              {criteria.propertyType !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setCriteria((prev) => ({ ...prev, propertyType: 'ALL' }))}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  선택해제
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setCriteria((prev) => ({ ...prev, propertyType: 'ALL' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  criteria.propertyType === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                전체
              </button>
              {(['APARTMENT', 'HOUSE', 'STORE', 'OFFICE', 'FACTORY_WAREHOUSE', 'LAND', 'ETC'] as PropertyType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCriteria((prev) => ({ ...prev, propertyType: type }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    criteria.propertyType === type
                      ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-500'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {PROPERTY_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* 조건 2: 거래 형태 (매매 / 전세 / 보증금 / 월세) */}
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. 거래 형태</span>
              </span>
              {criteria.transactionType !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setCriteria((prev) => ({ ...prev, transactionType: 'ALL' }))}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  선택해제
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: '전체' },
                { id: '매매', label: '매매' },
                { id: '전세', label: '전세' },
                { id: '보증금', label: '보증금' },
                { id: '월세', label: '월세' },
              ].map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => setCriteria((prev) => ({ ...prev, transactionType: tx.id }))}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    criteria.transactionType === tx.id
                      ? 'bg-indigo-600 text-white shadow-2xs ring-1 ring-indigo-500'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {tx.label}
                </button>
              ))}
            </div>
          </div>

          {/* 조건 3: 매물의 면적 (평방미터 ⇄ 평수 자동 연산) */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                <span>3. 매물의 면적 (평방미터 ⇄ 평수 자동 기입)</span>
              </span>
              <span className="text-[11px] text-blue-700 font-semibold">
                ※ 한쪽에 입력하면 다른쪽이 자동으로 환산 기입됩니다 (1평 = 3.3㎡)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 최소 면적 */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-300 space-y-1">
                <span className="text-[11px] font-extrabold text-slate-600 block">최소 면적 (이상)</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      step="any"
                      value={criteria.minM2}
                      onChange={(e) => handleMinM2Change(e.target.value)}
                      placeholder="평방미터"
                      className="w-full pl-2 pr-7 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold">㎡</span>
                  </div>
                  <span className="text-slate-400 font-bold">⇄</span>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      step="any"
                      value={criteria.minPyeong}
                      onChange={(e) => handleMinPyeongChange(e.target.value)}
                      placeholder="평수"
                      className="w-full pl-2 pr-6 py-1.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs font-bold text-blue-900 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-blue-600 font-bold">평</span>
                  </div>
                </div>
              </div>

              {/* 최대 면적 */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-300 space-y-1">
                <span className="text-[11px] font-extrabold text-slate-600 block">최대 면적 (이하)</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      step="any"
                      value={criteria.maxM2}
                      onChange={(e) => handleMaxM2Change(e.target.value)}
                      placeholder="평방미터"
                      className="w-full pl-2 pr-7 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold">㎡</span>
                  </div>
                  <span className="text-slate-400 font-bold">⇄</span>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      step="any"
                      value={criteria.maxPyeong}
                      onChange={(e) => handleMaxPyeongChange(e.target.value)}
                      placeholder="평수"
                      className="w-full pl-2 pr-6 py-1.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs font-bold text-blue-900 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-blue-600 font-bold">평</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 빠른 평수 선택 칩 */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400 font-medium">빠른선택:</span>
              {[
                { label: '10평 (33㎡)', py: '10' },
                { label: '20평 (66㎡)', py: '20' },
                { label: '30평 (99㎡)', py: '30' },
                { label: '40평 (132㎡)', py: '40' },
                { label: '50평 (165㎡)', py: '50' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleMinPyeongChange(chip.py)}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-white hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded-md border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                >
                  {chip.label} 이상
                </button>
              ))}
              {(criteria.minPyeong || criteria.maxPyeong) && (
                <button
                  type="button"
                  onClick={() => {
                    setCriteria((prev) => ({
                      ...prev,
                      minM2: '',
                      minPyeong: '',
                      maxM2: '',
                      maxPyeong: '',
                    }));
                  }}
                  className="text-[10px] font-bold text-rose-600 hover:underline ml-1"
                >
                  면적 초기화
                </button>
              )}
            </div>
          </div>

          {/* 조건 4, 5, 6: 찾는 지역, 필요시기, 주차대수 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 조건 4: 찾는 지역 */}
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>4. 찾는 지역</span>
                </span>
                {criteria.targetRegion && (
                  <button
                    type="button"
                    onClick={() => setCriteria((prev) => ({ ...prev, targetRegion: '' }))}
                    className="text-[10px] font-bold text-rose-600 hover:underline"
                  >
                    지우기
                  </button>
                )}
              </div>
              <input
                type="text"
                value={criteria.targetRegion}
                onChange={(e) => setCriteria((prev) => ({ ...prev, targetRegion: e.target.value }))}
                placeholder="예: 사상, 주례, 개금, 강남구 등"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            {/* 조건 5: 필요시기 (입주시기 및 오픈시기) */}
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>5. 필요시기 (입주/오픈)</span>
                </span>
                {criteria.moveInTiming && (
                  <button
                    type="button"
                    onClick={() => setCriteria((prev) => ({ ...prev, moveInTiming: '' }))}
                    className="text-[10px] font-bold text-rose-600 hover:underline"
                  >
                    지우기
                  </button>
                )}
              </div>
              <input
                type="text"
                value={criteria.moveInTiming}
                onChange={(e) => setCriteria((prev) => ({ ...prev, moveInTiming: e.target.value }))}
                placeholder="예: 즉시입주, 협의, 1개월 이내"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                {['즉시입주', '협의가능', '1개월 이내'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCriteria((prev) => ({ ...prev, moveInTiming: opt }))}
                    className="px-1.5 py-0.5 text-[10px] font-medium bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded border border-slate-200 transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* 조건 6: 주차대수 */}
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-blue-600" />
                  <span>6. 주차대수 및 조건</span>
                </span>
                {criteria.parkingRequirement && (
                  <button
                    type="button"
                    onClick={() => setCriteria((prev) => ({ ...prev, parkingRequirement: '' }))}
                    className="text-[10px] font-bold text-rose-600 hover:underline"
                  >
                    지우기
                  </button>
                )}
              </div>
              <input
                type="text"
                value={criteria.parkingRequirement}
                onChange={(e) => setCriteria((prev) => ({ ...prev, parkingRequirement: e.target.value }))}
                placeholder="예: 1대, 2대 이상, 자주식, 가능"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                {['주차필수', '1대 이상', '2대 이상'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCriteria((prev) => ({ ...prev, parkingRequirement: opt }))}
                    className="px-1.5 py-0.5 text-[10px] font-medium bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded border border-slate-200 transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
