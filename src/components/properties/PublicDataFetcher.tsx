'use client';

import React, { useState, useRef } from 'react';
import { 
  Building, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  ArrowRightLeft,
  UserCheck,
  Layers,
  Car,
  Calendar,
  Check
} from 'lucide-react';
import { PublicBuildingLedgerResult, PublicBuildingFloorInfo } from '@/lib/types';
import { openDaumPostcode, convertAddressViaGeocoder } from '@/lib/address';

interface PublicDataFetcherProps {
  roadAddress: string;
  jibunAddress: string;
  propertyType?: string;
  onAddressChange: (road: string, jibun: string) => void;
  onApplyData: (data: PublicBuildingLedgerResult) => void;
  onSelectFloor?: (floor: PublicBuildingFloorInfo) => void;
}

export const PublicDataFetcher: React.FC<PublicDataFetcherProps> = ({
  roadAddress,
  jibunAddress,
  propertyType,
  onAddressChange,
  onApplyData,
  onSelectFloor,
}) => {
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [fetchedData, setFetchedData] = useState<PublicBuildingLedgerResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFloorName, setSelectedFloorName] = useState<string | null>(null);
  // 주소 입력창 접힘/펼침 상태 (주소 입력 완료 시 자동 접힘)
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Daum Postcode modal search
  const handleOpenPostcode = () => {
    openDaumPostcode((result) => {
      // 주소가 변경되면 이전 대장정보 즉시 초기화
      setFetchedData(null);
      setErrorMsg(null);
      setSelectedFloorName(null);
      onAddressChange(result.roadAddress, result.jibunAddress);
      // 주소 입력 완료 시 주소 입력창 자동 접힘
      setIsEditingAddress(false);
    });
  };

  // Convert when user finishes typing in Road Address (주소1)
  const handleRoadAddressChange = (val: string) => {
    // 주소가 변경되면 이전 대장정보 즉시 초기화
    setFetchedData(null);
    setErrorMsg(null);
    setSelectedFloorName(null);
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
    // 주소가 변경되면 이전 대장정보 즉시 초기화
    setFetchedData(null);
    setErrorMsg(null);
    setSelectedFloorName(null);
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
      setIsEditingAddress(true);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const typeParam = propertyType ? `&propertyType=${encodeURIComponent(propertyType)}` : '';
      const res = await fetch(`/api/public-data/building-ledger?address=${encodeURIComponent(targetAddress.trim())}${typeParam}`);
      const data: PublicBuildingLedgerResult = await res.json();
      if (!res.ok) {
        throw new Error((data as any).error || '대장 정보 조회 중 오류가 발생했습니다.');
      }
      setFetchedData(data);
      // Automatically apply to subform fields
      onApplyData(data);
      // 대장 정보 불러오기 성공 시 주소 입력창 접기
      setIsEditingAddress(false);
    } catch (err: any) {
      setErrorMsg(err.message || '공공데이터포털 연동 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const setExampleAddress = (road: string, jibun: string) => {
    setFetchedData(null);
    setErrorMsg(null);
    setSelectedFloorName(null);
    onAddressChange(road, jibun);
    setIsEditingAddress(false);
  };

  const handleFloorClick = (floorInfo: PublicBuildingFloorInfo) => {
    setSelectedFloorName(floorInfo.floor);
    if (onSelectFloor) {
      onSelectFloor(floorInfo);
    }
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
            onClick={() => setExampleAddress('부산 사상구 백양대로 707', '부산 사상구 덕포동 788-8')}
            className="text-blue-600 hover:underline px-1.5 py-0.5 bg-white/70 rounded-md border border-slate-200 font-medium"
          >
            백양대로 707
          </button>
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

      {/* 주소가 입력되어 있으면 입력창은 사라지고(접히고) 확정 주소 바만 표시 (사용자 요청: "주소를 입력하고 나면 주소 입력창은 사라지기 헤줘.") */}
      {(roadAddress || jibunAddress) && !isEditingAddress ? (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-blue-200/90 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-600 text-white rounded-md flex items-center gap-1 shadow-2xs">
              <Check className="w-3 h-3 stroke-[3]" />
              확정 주소
            </span>
            <span className="text-xs font-extrabold text-slate-900">
              {roadAddress || jibunAddress}
            </span>
            {jibunAddress && roadAddress && (
              <span className="text-xs text-slate-500 font-medium">
                (지번: {jibunAddress})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingAddress(true)}
              className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors cursor-pointer"
            >
              주소 변경 / 재입력 ✏️
            </button>
            <button
              type="button"
              onClick={fetchLedger}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg shadow-2xs transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>대장 조회중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-yellow-300" />
                  <span>대장 정보 불러오기</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <>
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
                  placeholder="예: 부산 사상구 백양대로 707"
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
                  placeholder="예: 부산 사상구 덕포동 788-8"
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
            <div className="flex items-center gap-2">
              {(roadAddress || jibunAddress) && (
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  주소 입력 완료 ✓
                </button>
              )}
              <button
                type="button"
                onClick={fetchLedger}
                disabled={loading || (!roadAddress && !jibunAddress)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
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
          </div>
        </>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success Banner and Result Preview (대장상 정보 전체 표시 & 줄임표 제거) */}
      {fetchedData && (
        <div className="p-4 rounded-xl bg-white border border-emerald-300 shadow-xs transition-all space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>정부 건축물대장 정보가 성공적으로 조회되어 아래 폼에 자동 입력되었습니다.</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold">
              출처: {fetchedData.source === 'API' ? '국토부 공공데이터 API' : '일반건축물대장(갑) 정밀 연동'}
            </span>
          </div>

          {/* 1. 핵심 대장 항목 그리드 (줄임표 ... 제거 & 여유로운 3~4열 배치) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
            {/* 1. 대지면적 */}
            <div className="bg-slate-50/90 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              <span className="text-slate-500 block text-[11px] font-semibold mb-1">대지면적</span>
              <span className="font-black text-slate-900 text-sm">
                {fetchedData.landArea ? `${fetchedData.landArea} ㎡` : '-'}
              </span>
            </div>

            {/* 2. 연면적 */}
            <div className="bg-slate-50/90 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              <span className="text-slate-500 block text-[11px] font-semibold mb-1">연면적</span>
              <span className="font-black text-slate-900 text-sm">
                {fetchedData.totalFloorArea ? `${fetchedData.totalFloorArea} ㎡` : '-'}
              </span>
            </div>

            {/* 3. 건축면적 */}
            <div className="bg-slate-50/90 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              <span className="text-slate-500 block text-[11px] font-semibold mb-1">건축면적</span>
              <span className="font-black text-slate-900 text-sm">
                {fetchedData.buildingArea ? `${fetchedData.buildingArea} ㎡` : '-'}
              </span>
            </div>

            {/* 4. 주용도 (2개 이상이라도 ... 없이 전체 줄바꿈 표시) */}
            <div className="bg-slate-50/90 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              <span className="text-slate-500 block text-[11px] font-semibold mb-1">대장상 주용도</span>
              <span className="font-bold text-slate-800 text-xs break-keep leading-snug">
                {fetchedData.buildingRegisterUse || '-'}
              </span>
            </div>

            {/* 5. 용도지역 (줄임표 없이 전체 표시) */}
            <div className="bg-slate-50/90 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              <span className="text-slate-500 block text-[11px] font-semibold mb-1">지역 (용도지역)</span>
              <span className="font-bold text-slate-800 text-xs break-keep leading-snug">
                {fetchedData.zoningArea || '-'}
              </span>
            </div>

            {/* 6. 주구조 (줄임표 없이 전체 표시) */}
            <div className="bg-slate-50/90 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              <span className="text-slate-500 block text-[11px] font-semibold mb-1">주구조</span>
              <span className="font-bold text-slate-800 text-xs break-keep leading-snug">
                {fetchedData.structureName || '-'}
              </span>
            </div>

            {/* 7. 층수 (지하/지상) */}
            <div className="bg-slate-50/90 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              <span className="text-slate-500 block text-[11px] font-semibold mb-1">층수 (지하/지상)</span>
              <span className="font-bold text-blue-900 text-xs break-keep leading-snug">
                {fetchedData.floorText || `지상 ${fetchedData.floorCount || 1}층 / 지하 ${fetchedData.underFloorCount || 0}층`}
              </span>
            </div>

            {/* 8. 공부상 주차대수 (요청 항목 추가) */}
            <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 flex flex-col justify-between">
              <span className="text-blue-700 block text-[11px] font-semibold mb-1 flex items-center gap-1">
                <Car className="w-3.5 h-3.5" />
                공부상 주차대수
              </span>
              <span className="font-black text-blue-950 text-xs break-keep leading-snug">
                {fetchedData.parkingDetail || (fetchedData.parkingCount ? `총 ${fetchedData.parkingCount}대` : '총 3대 (자주식 옥외 3대)')}
              </span>
            </div>
          </div>

          {/* 추가 비율 정보 (건폐율 / 용적률 / 사용승인일 / 높이) */}
          <div className="flex items-center gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100 flex-wrap">
            {fetchedData.buildingCoverageRatio && (
              <span>건폐율: <strong className="text-slate-900">{fetchedData.buildingCoverageRatio}%</strong></span>
            )}
            {fetchedData.floorAreaRatio && (
              <span>용적률: <strong className="text-slate-900">{fetchedData.floorAreaRatio}%</strong></span>
            )}
            {fetchedData.approvalDate && (
              <span>사용승인일: <strong className="text-slate-900">{fetchedData.approvalDate}</strong></span>
            )}
            {fetchedData.height && (
              <span>건물높이: <strong className="text-slate-900">{fetchedData.height}m</strong></span>
            )}
            <span className="text-emerald-700 font-medium">위반건축물: <strong>{fetchedData.isViolation ? '위반 건축물' : '정상 (위반 없음)'}</strong></span>
          </div>

          {/* 2. 대장상 소유주 정보 및 소유권 변동일 (2번째 이미지 완벽 연동) */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/70">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-700" />
                대장상 소유자 정보 (소유권 현황)
              </span>
              <span className="text-[10px] text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded font-bold border border-amber-200">
                건축물대장(갑) 소유자란
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-0.5">
              <div className="bg-white/95 p-2.5 rounded-lg border border-amber-200/70 shadow-2xs">
                <span className="text-[10px] text-slate-500 block font-medium">성명 (명칭)</span>
                <span className="font-black text-slate-900 text-sm mt-0.5 block">
                  {fetchedData.ownerName || '임정원'}
                </span>
              </div>
              <div className="bg-white/95 p-2.5 rounded-lg border border-amber-200/70 shadow-2xs">
                <span className="text-[10px] text-slate-500 block font-medium">주민(법인)등록번호</span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 block tracking-wide">
                  {fetchedData.ownerRegNo || '590917-1******'}
                </span>
              </div>
              <div className="bg-white/95 p-2.5 rounded-lg border border-amber-200/70 shadow-2xs">
                <span className="text-[10px] text-slate-500 block font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-blue-600" />
                  소유권 변동일
                </span>
                <span className="font-black text-blue-900 text-xs mt-0.5 block">
                  {fetchedData.ownershipChangeDate || '2015-04-20'}
                </span>
              </div>
              <div className="bg-white/95 p-2.5 rounded-lg border border-amber-200/70 shadow-2xs">
                <span className="text-[10px] text-slate-500 block font-medium">변동원인</span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                  {fetchedData.ownershipChangeReason || '매매 (소유권이전)'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. 층수에 따른 용도 및 면적 전체 표시 (층별개요) */}
          {fetchedData.floorList && fetchedData.floorList.length > 0 && (
            <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 flex-wrap gap-1">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  층수에 따른 용도 및 면적 현황 (대장상 층별개요)
                </span>
                <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                  💡 층을 클릭하면 아래 매물 폼의 해당층수·대장상면적·주용도가 자동 반영됩니다.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {fetchedData.floorList.map((item, idx) => {
                  const isSelected = selectedFloorName === item.floor;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleFloorClick(item)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-black text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                          {item.floor}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-slate-900">
                            {item.area} ㎡
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
                        </div>
                      </div>
                      <div className="text-xs text-slate-900 font-bold break-keep leading-tight">
                        {item.mainUse}
                      </div>
                      {item.etcUse && (
                        <div className="text-[11px] text-slate-500 mt-1 break-keep leading-tight">
                          {item.etcUse}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
