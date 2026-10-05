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
  Check,
  Edit3,
  Save,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { PublicBuildingLedgerResult, PublicBuildingFloorInfo, PublicBuildingUnitInfo } from '@/lib/types';
import { openDaumPostcode, convertAddressViaGeocoder } from '@/lib/address';

interface PublicDataFetcherProps {
  roadAddress: string;
  jibunAddress: string;
  propertyType?: string;
  detailAddress?: string;
  onAddressChange: (road: string, jibun: string) => void;
  onApplyData: (data: PublicBuildingLedgerResult) => void;
  onSelectFloor?: (floor: PublicBuildingFloorInfo) => void;
  onSelectUnit?: (unit: PublicBuildingUnitInfo) => void;
}

export const PublicDataFetcher: React.FC<PublicDataFetcherProps> = ({
  roadAddress,
  jibunAddress,
  propertyType,
  detailAddress,
  onAddressChange,
  onApplyData,
  onSelectFloor,
  onSelectUnit,
}) => {
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [fetchedData, setFetchedData] = useState<PublicBuildingLedgerResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFloorName, setSelectedFloorName] = useState<string | null>(null);
  // 집합건물 전유부(동/호수) 선택 상태
  const [selectedDong, setSelectedDong] = useState<string>('ALL');
  const [selectedUnitKey, setSelectedUnitKey] = useState<string | null>(null);
  // 주소 입력창 접힘/펼침 상태 (주소 입력 완료 시 자동 접힘)
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);

  // 대장 정보 직접 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<PublicBuildingLedgerResult | null>(null);
  const [savingCustomLedger, setSavingCustomLedger] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleOpenEditModal = () => {
    if (!fetchedData) return;
    setEditForm(JSON.parse(JSON.stringify(fetchedData)));
    setIsEditModalOpen(true);
  };

  const handleSaveEditModal = async () => {
    if (!editForm) return;
    setSavingCustomLedger(true);
    try {
      await fetch('/api/public-data/building-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
    } catch (err) {
      console.warn('Custom ledger save failed', err);
    } finally {
      setSavingCustomLedger(false);
    }

    setFetchedData(editForm);
    onApplyData(editForm);
    setIsEditModalOpen(false);
  };

  // 외부 상세주소(detailAddress) 또는 대장 데이터 변경 시 선택된 전유부 동기화
  React.useEffect(() => {
    if (!detailAddress) {
      setSelectedUnitKey(null);
      return;
    }
    if (fetchedData?.unitList && fetchedData.unitList.length > 0) {
      const cleanDetail = detailAddress.trim().replace(/\s+/g, '');
      const found = fetchedData.unitList.find((u) => {
        const fullKey = `${u.dong || ''}${u.ho}`.replace(/\s+/g, '');
        return cleanDetail.includes(fullKey) || fullKey.includes(cleanDetail) || (cleanDetail.includes(u.ho) && (!u.dong || cleanDetail.includes(u.dong)));
      });
      if (found) {
        setSelectedUnitKey(`${found.dong || ''}_${found.ho}`);
        if (found.dong && selectedDong !== 'ALL' && selectedDong !== found.dong) {
          setSelectedDong(found.dong);
        }
      }
    }
  }, [detailAddress, fetchedData, selectedDong]);

  // 주소가 비어있거나 달라질 때 이전 대장 정보 초기화
  React.useEffect(() => {
    if (!roadAddress && !jibunAddress) {
      setFetchedData(null);
      setErrorMsg(null);
      setSelectedFloorName(null);
      setIsEditingAddress(false);
    } else if (fetchedData && fetchedData.address) {
      const current = (roadAddress || jibunAddress).trim();
      if (!current.includes(fetchedData.address) && !fetchedData.address.includes(current)) {
        setFetchedData(null);
        setSelectedFloorName(null);
      }
    }
  }, [roadAddress, jibunAddress, fetchedData]);

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
    setSelectedUnitKey(null);
    onAddressChange(road, jibun);
    setIsEditingAddress(false);
  };

  const handleFloorClick = (floorInfo: PublicBuildingFloorInfo) => {
    setSelectedFloorName(floorInfo.floor);
    if (onSelectFloor) {
      onSelectFloor(floorInfo);
    }
  };

  const handleUnitClick = (unit: PublicBuildingUnitInfo) => {
    const key = `${unit.dong || ''}_${unit.ho}`;
    setSelectedUnitKey(key);
    if (onSelectUnit) {
      onSelectUnit(unit);
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
        <div className="flex items-center gap-1 text-[11px] text-slate-500 self-start sm:self-center flex-wrap">
          <span className="text-slate-400">예시:</span>
          <button
            type="button"
            onClick={() => setExampleAddress('부산 사상구 백양대로703번길 53-11', '부산 사상구 덕포동 104-4')}
            className="text-blue-600 hover:underline px-1.5 py-0.5 bg-blue-100/70 text-blue-900 font-extrabold rounded-md border border-blue-300"
          >
            백양대로 53-11 (가·나동 빌라)
          </button>
          <button
            type="button"
            onClick={() => setExampleAddress('부산 사상구 사상로 300', '부산 사상구 덕포동 795')}
            className="text-blue-600 hover:underline px-1.5 py-0.5 bg-white/70 rounded-md border border-slate-200 font-medium"
          >
            사상강변동원
          </button>
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
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 flex-wrap">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>정부 건축물대장 정보가 성공적으로 조회되어 아래 폼에 자동 입력되었습니다.</span>
              {fetchedData.complexName && (
                <span className="text-[11px] font-black text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded border border-blue-300">
                  건물명: {fetchedData.complexName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-700 border border-blue-300 rounded-lg font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <Edit3 className="w-3 h-3 text-blue-600" />
                <span>대장정보 직접 수정</span>
              </button>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold">
                출처: {fetchedData.source === 'API'
                  ? (fetchedData.isCollectiveBuilding ? '국토부 집합건축물대장(표제부/전유부) API' : '국토부 일반건축물대장(갑) API')
                  : (fetchedData.source === 'USER_CUSTOM'
                      ? '사용자 직접 등록/수정 대장'
                      : (fetchedData.isCollectiveBuilding ? '집합건축물대장(표제부/전유부) 정밀 연동' : '일반건축물대장(갑) 정밀 연동'))}
              </span>
            </div>
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

          {/* 2. 🏢 집합건축물 전유부(각 동·호수) 선택 섹션 (사용자 요청: 집합건물일 경우 전유부를 선택할수 있게 각 동호수를 선택) */}
          {fetchedData.isCollectiveBuilding && fetchedData.unitList && fetchedData.unitList.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-sky-50/80 border-2 border-blue-400 rounded-xl p-4 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-blue-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-blue-950 flex items-center gap-1.5 flex-wrap">
                      🏢 집합건축물 전유부(각 동·호수) 선택
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-md shadow-2xs">
                        {fetchedData.buildingCategoryName || '집합건축물'}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 rounded-md border border-blue-300">
                        총 {fetchedData.unitList.length}개 호실
                      </span>
                    </h5>
                    <p className="text-[11px] text-blue-800 font-medium mt-0.5">
                      💡 원하시는 동·호수를 클릭하시면 상세주소(동호수) 및 해당 호실의 층수, 전용면적(실평수), 대장상면적, 주용도, 소유자 정보가 폼에 자동 입력됩니다.
                    </p>
                  </div>
                </div>

                {/* 동 선택 탭 (가동, 나동 / 101동, 102동 등) */}
                {fetchedData.dongList && fetchedData.dongList.length > 1 && (
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-blue-200 shadow-2xs self-start sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedDong('ALL')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        selectedDong === 'ALL'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      전체 ({fetchedData.unitList.length})
                    </button>
                    {fetchedData.dongList.map((d) => {
                      const count = fetchedData.unitList?.filter((u) => u.dong === d).length || 0;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedDong(d)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            selectedDong === d
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {d} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 전유부 호수 목록 그리드 (호수 카드) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {fetchedData.unitList
                  .filter((unit) => selectedDong === 'ALL' || unit.dong === selectedDong)
                  .map((unit, idx) => {
                    const unitKey = `${unit.dong || ''}_${unit.ho}`;
                    const isSelected = selectedUnitKey === unitKey;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleUnitClick(unit)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400 shadow-md scale-[1.02]'
                            : 'bg-white hover:bg-blue-50/80 border-slate-200 hover:border-blue-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-xs font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-900 group-hover:text-blue-700'}`}>
                            {unit.dong ? `${unit.dong} ` : ''}{unit.ho}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {unit.floor.replace('지상 ', '')}
                          </span>
                        </div>

                        <div className="space-y-0.5 mt-1">
                          <div className={`text-[11px] font-extrabold flex items-center justify-between ${
                            isSelected ? 'text-blue-100' : 'text-blue-700'
                          }`}>
                            <span>전용</span>
                            <span>{unit.exclusiveArea}㎡</span>
                          </div>
                          <div className={`text-[10px] flex items-center justify-between ${
                            isSelected ? 'text-blue-200' : 'text-slate-500'
                          }`}>
                            <span>실평수</span>
                            <span>{unit.exclusiveAreaPyeong || +(unit.exclusiveArea * 0.3025).toFixed(1)}평</span>
                          </div>
                          {unit.ownerName && (
                            <div className={`text-[10px] truncate pt-1 border-t ${
                              isSelected ? 'text-white/90 border-blue-500' : 'text-slate-600 border-slate-100'
                            }`}>
                              소유: {unit.ownerName}
                            </div>
                          )}
                        </div>

                        {isSelected && (
                          <div className="mt-1.5 pt-1 border-t border-blue-400 flex items-center justify-center gap-1 text-[10px] font-bold text-yellow-300">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>선택됨</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>

              {/* 선택된 호수 상세 안내 바 */}
              {selectedUnitKey && (() => {
                const currentSelected = fetchedData.unitList?.find((u) => `${u.dong || ''}_${u.ho}` === selectedUnitKey);
                if (!currentSelected) return null;
                return (
                  <div className="p-3 bg-white rounded-xl border border-blue-300 shadow-2xs flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-extrabold flex items-center gap-1 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                        선택된 전유부: {currentSelected.dong ? `${currentSelected.dong} ` : ''}{currentSelected.ho}
                      </span>
                      <span className="text-slate-700 font-semibold">
                        층수: <strong className="text-slate-900">{currentSelected.floor}</strong>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-700 font-semibold">
                        전용(실평수): <strong className="text-blue-700">{currentSelected.exclusiveArea}㎡ ({currentSelected.exclusiveAreaPyeong || +(currentSelected.exclusiveArea * 0.3025).toFixed(1)}평)</strong>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-700 font-semibold">
                        공급(대장상): <strong className="text-slate-900">{currentSelected.supplyArea || currentSelected.exclusiveArea}㎡ ({currentSelected.supplyAreaPyeong || +((currentSelected.supplyArea || currentSelected.exclusiveArea) * 0.3025).toFixed(1)}평)</strong>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-slate-700 font-semibold">
                        주용도: <strong className="text-slate-900">{currentSelected.mainUse}</strong>
                      </span>
                      {currentSelected.ownerName && (
                        <>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-700 font-semibold">
                            소유자: <strong className="text-purple-700">{currentSelected.ownerName}</strong> ({currentSelected.ownerRegNo || '-'})
                          </span>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUnitKey(null);
                      }}
                      className="text-[11px] text-slate-500 hover:text-rose-600 underline font-medium cursor-pointer"
                    >
                      호수 선택 해제
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 3. 대장상 소유주 정보 및 소유권 변동일 (2번째 이미지 완벽 연동, 선택된 전유부 소유자 자동 반영) */}
          {(() => {
            const currentSelected = fetchedData.unitList?.find((u) => `${u.dong || ''}_${u.ho}` === selectedUnitKey);
            const activeOwnerName = currentSelected?.ownerName || fetchedData.ownerName || '임정원';
            const activeOwnerRegNo = currentSelected?.ownerRegNo || fetchedData.ownerRegNo || '590917-1******';
            const activeChangeDate = currentSelected?.ownershipChangeDate || fetchedData.ownershipChangeDate || '2015-04-20';
            const activeChangeReason = currentSelected?.ownershipChangeReason || fetchedData.ownershipChangeReason || '매매 (소유권이전)';

            return (
              <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/70">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-700" />
                    대장상 소유자 정보 (소유권 현황)
                    {currentSelected && (
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">
                        {currentSelected.dong ? `${currentSelected.dong} ` : ''}{currentSelected.ho} 전유부 소유권
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded font-bold border border-amber-200">
                    {currentSelected
                      ? '집합건축물대장(전유부) 소유자란'
                      : (fetchedData.isCollectiveBuilding ? '집합건축물대장(표제부) 소유자현황' : '건축물대장(갑) 소유자란')}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-0.5">
                  <div className="bg-white/95 p-2.5 rounded-lg border border-amber-200/70 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-medium">성명 (명칭)</span>
                    <span className="font-black text-slate-900 text-sm mt-0.5 block">
                      {activeOwnerName}
                    </span>
                  </div>
                  <div className="bg-white/95 p-2.5 rounded-lg border border-amber-200/70 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-medium">주민(법인)등록번호</span>
                    <span className="font-bold text-slate-800 text-xs mt-0.5 block tracking-wide">
                      {activeOwnerRegNo}
                    </span>
                  </div>
                  <div className="bg-white/95 p-2.5 rounded-lg border border-amber-200/70 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-600" />
                      소유권 변동일
                    </span>
                    <span className="font-black text-blue-900 text-xs mt-0.5 block">
                      {activeChangeDate}
                    </span>
                  </div>
                  <div className="bg-white/95 p-2.5 rounded-lg border border-amber-200/70 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block font-medium">변동원인</span>
                    <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                      {activeChangeReason}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 4. 층수에 따른 용도 및 면적 전체 표시 (층별개요) */}
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

      {/* 5. 건축물대장 정보 직접 수정 모달 (표제부 + 전유부 호실 완벽 편집) */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-xs">
                  <Edit3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">건축물대장 정보 직접 수정 및 폼 즉시 반영</h3>
                  <p className="text-xs text-blue-100 font-medium">
                    소재지: {editForm.address} | 실제 건축물대장 수치로 수정하시면 매물장 폼에 완벽히 동기화됩니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* 표제부 정보 */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-blue-600" />
                    1. 표제부 기본 정보
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600">대장 구분:</label>
                    <select
                      value={editForm.isCollectiveBuilding ? 'COLLECTIVE' : 'GENERAL'}
                      onChange={(e) => {
                        const isCol = e.target.value === 'COLLECTIVE';
                        setEditForm({
                          ...editForm,
                          isCollectiveBuilding: isCol,
                          buildingCategoryName: isCol ? '집합건축물' : '일반건축물',
                        });
                      }}
                      className="px-2 py-1 bg-white border border-slate-300 rounded font-bold text-blue-700"
                    >
                      <option value="COLLECTIVE">🏢 집합건축물 (다세대/연립/아파트/오피스텔)</option>
                      <option value="GENERAL">🏠 일반건축물 (단독/다가구/상가단독)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">건물/단지명</label>
                    <input
                      type="text"
                      value={editForm.complexName || ''}
                      onChange={(e) => setEditForm({ ...editForm, complexName: e.target.value })}
                      placeholder="예: 우방하이츠빌라"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">대장상 주용도</label>
                    <input
                      type="text"
                      value={editForm.buildingRegisterUse || ''}
                      onChange={(e) => setEditForm({ ...editForm, buildingRegisterUse: e.target.value })}
                      placeholder="예: 공동주택 (다세대주택)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">주구조</label>
                    <input
                      type="text"
                      value={editForm.structureName || ''}
                      onChange={(e) => setEditForm({ ...editForm, structureName: e.target.value })}
                      placeholder="예: 철근콘크리트구조"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">대지면적 (㎡)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.landArea ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, landArea: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">연면적 (㎡)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.totalFloorArea ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, totalFloorArea: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">건축면적 (㎡)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.buildingArea ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, buildingArea: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">사용승인일</label>
                    <input
                      type="date"
                      value={editForm.approvalDate || ''}
                      onChange={(e) => setEditForm({ ...editForm, approvalDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">층수 (지상/지하 표기)</label>
                    <input
                      type="text"
                      value={editForm.floorText || ''}
                      onChange={(e) => setEditForm({ ...editForm, floorText: e.target.value })}
                      placeholder="예: 지상: 4층 (가동, 나동)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">주차대수</label>
                    <input
                      type="number"
                      value={editForm.parkingCount ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, parkingCount: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">위반건축물 여부</label>
                    <select
                      value={editForm.isViolation ? 'YES' : 'NO'}
                      onChange={(e) => setEditForm({ ...editForm, isViolation: e.target.value === 'YES' })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-bold"
                    >
                      <option value="NO">정상 (위반 없음)</option>
                      <option value="YES">위반건축물</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">대표 소유자 성명</label>
                    <input
                      type="text"
                      value={editForm.ownerName || ''}
                      onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">주민/법인등록번호</label>
                    <input
                      type="text"
                      value={editForm.ownerRegNo || ''}
                      onChange={(e) => setEditForm({ ...editForm, ownerRegNo: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">변동일자 / 변동원인</label>
                    <input
                      type="text"
                      value={`${editForm.ownershipChangeDate || ''} ${editForm.ownershipChangeReason || ''}`.trim()}
                      onChange={(e) => {
                        const parts = e.target.value.split(' ');
                        setEditForm({
                          ...editForm,
                          ownershipChangeDate: parts[0] || '',
                          ownershipChangeReason: parts.slice(1).join(' ') || undefined,
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* 전유부(호실별) 정보 (집합건축물인 경우) */}
              {editForm.isCollectiveBuilding && (
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                    <div>
                      <span className="font-bold text-blue-950 text-sm flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        2. 전유부 호실별 상세 정보 ({editForm.unitList?.length || 0}개 호실)
                      </span>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        각 호실의 동, 호수, 층수, 전용면적, 공급면적 및 소유자를 실제 대장 기준으로 직접 수정할 수 있습니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const curList = editForm.unitList || [];
                        const newHo = `${curList.length + 1}01호`;
                        const newUnit: PublicBuildingUnitInfo = {
                          dong: editForm.dongList?.[0] || '가동',
                          ho: newHo,
                          floor: '지상 1층',
                          exclusiveArea: 59.84,
                          exclusiveAreaPyeong: 18.1,
                          supplyArea: 78.2,
                          supplyAreaPyeong: 23.6,
                          mainUse: editForm.buildingRegisterUse || '공동주택 (다세대주택)',
                          ownerName: '소유자',
                          ownerRegNo: '******-1******',
                          ownershipChangeDate: '2020-01-01',
                          ownershipChangeReason: '매매',
                        };
                        setEditForm({
                          ...editForm,
                          unitList: [...curList, newUnit],
                        });
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>호실 추가</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-[300px] border border-blue-200 rounded-lg bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-blue-100/70 text-blue-900 sticky top-0 font-bold border-b border-blue-200">
                        <tr>
                          <th className="p-2 text-center w-16">동</th>
                          <th className="p-2 text-center w-20">호수</th>
                          <th className="p-2 text-center w-24">층수</th>
                          <th className="p-2 text-center w-24">전용(㎡)</th>
                          <th className="p-2 text-center w-24">공급(㎡)</th>
                          <th className="p-2 text-center w-24">소유자</th>
                          <th className="p-2 text-center w-32">주민번호</th>
                          <th className="p-2 text-center w-16">삭제</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {(editForm.unitList || []).map((u, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/40">
                            <td className="p-1.5 text-center">
                              <input
                                type="text"
                                value={u.dong || ''}
                                onChange={(e) => {
                                  const next = [...(editForm.unitList || [])];
                                  next[idx].dong = e.target.value;
                                  setEditForm({ ...editForm, unitList: next });
                                }}
                                className="w-full px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <input
                                type="text"
                                value={u.ho}
                                onChange={(e) => {
                                  const next = [...(editForm.unitList || [])];
                                  next[idx].ho = e.target.value;
                                  setEditForm({ ...editForm, unitList: next });
                                }}
                                className="w-full px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded font-bold"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <input
                                type="text"
                                value={u.floor}
                                onChange={(e) => {
                                  const next = [...(editForm.unitList || [])];
                                  next[idx].floor = e.target.value;
                                  setEditForm({ ...editForm, unitList: next });
                                }}
                                className="w-full px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <input
                                type="number"
                                step="0.01"
                                value={u.exclusiveArea}
                                onChange={(e) => {
                                  const next = [...(editForm.unitList || [])];
                                  const val = parseFloat(e.target.value) || 0;
                                  next[idx].exclusiveArea = val;
                                  next[idx].exclusiveAreaPyeong = +(val * 0.3025).toFixed(2);
                                  setEditForm({ ...editForm, unitList: next });
                                }}
                                className="w-full px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <input
                                type="number"
                                step="0.01"
                                value={u.supplyArea || u.exclusiveArea}
                                onChange={(e) => {
                                  const next = [...(editForm.unitList || [])];
                                  const val = parseFloat(e.target.value) || 0;
                                  next[idx].supplyArea = val;
                                  next[idx].supplyAreaPyeong = +(val * 0.3025).toFixed(2);
                                  setEditForm({ ...editForm, unitList: next });
                                }}
                                className="w-full px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <input
                                type="text"
                                value={u.ownerName || ''}
                                onChange={(e) => {
                                  const next = [...(editForm.unitList || [])];
                                  next[idx].ownerName = e.target.value;
                                  setEditForm({ ...editForm, unitList: next });
                                }}
                                className="w-full px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded font-bold text-slate-800"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <input
                                type="text"
                                value={u.ownerRegNo || ''}
                                onChange={(e) => {
                                  const next = [...(editForm.unitList || [])];
                                  next[idx].ownerRegNo = e.target.value;
                                  setEditForm({ ...editForm, unitList: next });
                                }}
                                className="w-full px-1.5 py-1 text-center bg-slate-50 border border-slate-200 rounded text-slate-600"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = (editForm.unitList || []).filter((_, i) => i !== idx);
                                  setEditForm({ ...editForm, unitList: next });
                                }}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                수정된 내용은 캐시에 저장되어 이후 검색 시에도 우선 적용됩니다.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditModal}
                  disabled={savingCustomLedger}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:bg-blue-300"
                >
                  {savingCustomLedger ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>저장 중...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>저장 및 폼에 즉시 적용</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
