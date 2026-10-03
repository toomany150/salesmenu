'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Building, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Search, 
  MapPin, 
  ArrowRightLeft 
} from 'lucide-react';
import { PublicBuildingLedgerResult } from '@/lib/types';
import { openDaumPostcode, convertAddressViaGeocoder } from '@/lib/address';

interface PublicDataFetcherProps {
  roadAddress: string;
  jibunAddress: string;
  onAddressChange: (road: string, jibun: string) => void;
  onApplyData: (data: PublicBuildingLedgerResult) => void;
}

export const PublicDataFetcher: React.FC<PublicDataFetcherProps> = ({
  roadAddress,
  jibunAddress,
  onAddressChange,
  onApplyData,
}) => {
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [fetchedData, setFetchedData] = useState<PublicBuildingLedgerResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Daum Postcode modal search
  const handleOpenPostcode = () => {
    openDaumPostcode((result) => {
      onAddressChange(result.roadAddress, result.jibunAddress);
    });
  };

  // Convert when user finishes typing in Road Address (주소1)
  const handleRoadAddressChange = (val: string) => {
    onAddressChange(val, jibunAddress);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!val || val.trim().length < 5) return;

    debounceTimerRef.current = setTimeout(async () => {
      setConverting(true);
      const converted = await convertAddressViaGeocoder(val.trim());
      setConverting(false);
      if (converted && converted.jibunAddress) {
        onAddressChange(val, converted.jibunAddress);
      }
    }, 600);
  };

  // Convert when user finishes typing in Jibun Address (주소2)
  const handleJibunAddressChange = (val: string) => {
    onAddressChange(roadAddress, val);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!val || val.trim().length < 5) return;

    debounceTimerRef.current = setTimeout(async () => {
      setConverting(true);
      const converted = await convertAddressViaGeocoder(val.trim());
      setConverting(false);
      if (converted && converted.roadAddress) {
        onAddressChange(converted.roadAddress, val);
      }
    }, 600);
  };

  // Fetch Public Ledger
  const fetchLedger = async () => {
    const targetAddress = roadAddress || jibunAddress;
    if (!targetAddress || targetAddress.trim().length === 0) {
      setErrorMsg('소재지 주소(도로명 또는 지번)를 먼저 입력해주세요.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/public-data/building-ledger?address=${encodeURIComponent(targetAddress.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '대장 정보 조회 중 오류가 발생했습니다.');
      }
      setFetchedData(data);
      // Automatically apply to subform fields
      onApplyData(data);
    } catch (err: any) {
      setErrorMsg(err.message || '공공데이터포털 연동 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const setExampleAddress = (road: string, jibun: string) => {
    onAddressChange(road, jibun);
  };

  return (
    <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-sky-50/60 p-4 rounded-xl border border-blue-200/80 shadow-2xs space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              공공데이터포털 정부 건축물대장 자동 연동
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-sm">
                대장 자동 입력
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              주소1 또는 주소2를 넣으면 나머지 주소가 상호 자동 입력되며, 정부 건축물대장을 원클릭 조회합니다.
            </p>
          </div>
        </div>

        {/* Quick Sample Links */}
        <div className="flex items-center gap-1 text-[11px] text-slate-500 self-start sm:self-center">
          <span className="text-slate-400">예시:</span>
          <button
            type="button"
            onClick={() => setExampleAddress('서울특별시 강남구 역삼로 310', '서울특별시 강남구 역삼동 779-1')}
            className="text-blue-600 hover:underline px-1.5 py-0.5 bg-white/70 rounded-md border border-slate-200"
          >
            역삼동 아파트
          </button>
          <button
            type="button"
            onClick={() => setExampleAddress('서울특별시 서초구 서초대로 350', '서울특별시 서초구 서초동 1685-8')}
            className="text-blue-600 hover:underline px-1.5 py-0.5 bg-white/70 rounded-md border border-slate-200"
          >
            서초 상가
          </button>
        </div>
      </div>

      {/* Two Addresses Inputs: 주소1(도로명주소) & 주소2(지번주소) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* 주소1 (도로명주소) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              주소1 (도로명주소) *
            </label>
            {converting && (
              <span className="text-[10px] text-blue-600 animate-pulse flex items-center gap-0.5">
                <ArrowRightLeft className="w-2.5 h-2.5" />
                자동 변환 중...
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={roadAddress}
              onChange={(e) => handleRoadAddressChange(e.target.value)}
              placeholder="예: 서울특별시 강남구 역삼로 310"
              className="w-full text-xs pl-3 pr-20 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-900"
            />
            <button
              type="button"
              onClick={handleOpenPostcode}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
            >
              주소검색
            </button>
          </div>
        </div>

        {/* 주소2 (지번주소) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
              주소2 (지번주소) *
            </label>
            <span className="text-[10px] text-slate-400">지번 입력 시 도로명주소 자동 변환</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={jibunAddress}
              onChange={(e) => handleJibunAddressChange(e.target.value)}
              placeholder="예: 서울특별시 강남구 역삼동 779-1"
              className="w-full text-xs pl-3 pr-20 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium text-slate-900"
            />
            <button
              type="button"
              onClick={handleOpenPostcode}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
            >
              우편번호
            </button>
          </div>
        </div>
      </div>

      {/* Action Button: [대장 정보 불러오기] */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-slate-500">
          💡 주소1 또는 주소2 둘 중 하나만 입력해도 다른 주소가 자동 완성됩니다.
        </span>
        <button
          type="button"
          onClick={fetchLedger}
          disabled={loading || (!roadAddress && !jibunAddress)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition-all shadow-sm active:scale-95 shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>정부 대장 조회중...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>대장 정보 불러오기</span>
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success Banner and Result Preview */}
      {fetchedData && (
        <div className="p-3 rounded-lg bg-white border border-emerald-200/90 shadow-2xs transition-all">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>대장 정보가 성공적으로 조회되어 아래 폼에 자동 입력되었습니다.</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
              출처: {fetchedData.source === 'API' ? '국토부 공공데이터 API' : '건축물대장 스마트 매칭'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-50 p-2 rounded-md">
              <span className="text-slate-400 block text-[10px]">대지면적</span>
              <span className="font-bold text-slate-800">{fetchedData.landArea ? `${fetchedData.landArea} ㎡` : '-'}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-md">
              <span className="text-slate-400 block text-[10px]">연면적</span>
              <span className="font-bold text-slate-800">{fetchedData.totalFloorArea ? `${fetchedData.totalFloorArea} ㎡` : '-'}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-md">
              <span className="text-slate-400 block text-[10px]">건축물대장상 용도</span>
              <span className="font-bold text-slate-800 truncate block">{fetchedData.buildingRegisterUse || '-'}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-md">
              <span className="text-slate-400 block text-[10px]">사용승인일</span>
              <span className="font-bold text-slate-800">{fetchedData.approvalDate || '-'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
