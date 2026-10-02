'use client';

import React, { useState } from 'react';
import { Search, Building, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { PublicBuildingLedgerResult } from '@/lib/types';

interface PublicDataFetcherProps {
  address: string;
  onAddressChange: (address: string) => void;
  onApplyData: (data: PublicBuildingLedgerResult) => void;
}

export const PublicDataFetcher: React.FC<PublicDataFetcherProps> = ({
  address,
  onAddressChange,
  onApplyData,
}) => {
  const [loading, setLoading] = useState(false);
  const [fetchedData, setFetchedData] = useState<PublicBuildingLedgerResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLedger = async () => {
    if (!address || address.trim().length === 0) {
      setErrorMsg('소재지 주소를 먼저 입력해주세요.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/public-data/building-ledger?address=${encodeURIComponent(address.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '대장 정보 조회 중 오류가 발생했습니다.');
      }
      setFetchedData(data);
      // 자동으로 폼 필드에도 반영
      onApplyData(data);
    } catch (err: any) {
      setErrorMsg(err.message || '공공데이터포털 연동 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const setExampleAddress = (sample: string) => {
    onAddressChange(sample);
  };

  return (
    <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-sky-50/60 p-4 rounded-xl border border-blue-200/80 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
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
              소재지 주소를 입력하면 대지면적, 연면적, 사용승인일, 대장상 용도를 공공데이터에서 자동 조회합니다.
            </p>
          </div>
        </div>

        {/* Quick Sample Links */}
        <div className="flex items-center gap-1 text-[11px] text-slate-500 self-start sm:self-center">
          <span className="text-slate-400">예시:</span>
          <button
            type="button"
            onClick={() => setExampleAddress('서울특별시 강남구 역삼로 310')}
            className="text-blue-600 hover:underline px-1 py-0.5 bg-white/70 rounded-sm border border-slate-200"
          >
            역삼동 아파트
          </button>
          <button
            type="button"
            onClick={() => setExampleAddress('서울특별시 서초구 서초대로 350')}
            className="text-blue-600 hover:underline px-1 py-0.5 bg-white/70 rounded-sm border border-slate-200"
          >
            서초 상가
          </button>
        </div>
      </div>

      {/* Input + Button */}
      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="도로명 또는 지번 주소 입력 (예: 서울특별시 강남구 역삼로 310)"
            className="w-full text-xs pl-3 pr-8 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-900"
          />
          {address && (
            <button
              type="button"
              onClick={() => onAddressChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={fetchLedger}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-all shadow-sm active:scale-95 shrink-0"
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
        <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success Banner and Result Preview */}
      {fetchedData && (
        <div className="mt-3 p-3 rounded-lg bg-white border border-emerald-200/90 shadow-2xs transition-all">
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
            <div className="p-1.5 bg-slate-50 rounded-sm">
              <span className="text-[11px] text-slate-500 block">대지면적</span>
              <span className="font-semibold text-slate-900">{fetchedData.landArea ? `${fetchedData.landArea} ㎡` : '-'}</span>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-sm">
              <span className="text-[11px] text-slate-500 block">연면적</span>
              <span className="font-semibold text-slate-900">{fetchedData.totalFloorArea ? `${fetchedData.totalFloorArea} ㎡` : '-'}</span>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-sm">
              <span className="text-[11px] text-slate-500 block">대장상 용도</span>
              <span className="font-semibold text-slate-900">{fetchedData.buildingRegisterUse || '-'}</span>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-sm">
              <span className="text-[11px] text-slate-500 block">사용승인일</span>
              <span className="font-semibold text-slate-900">{fetchedData.approvalDate || '-'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
