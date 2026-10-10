'use client';

import React, { useMemo } from 'react';
import { StoreData, StoreLeaseUnitItem } from '@/lib/types';
import { VoiceTextarea } from '@/components/common/VoiceInput';
import { 
  Store, 
  Layers, 
  Zap, 
  Flame, 
  Droplet, 
  Users, 
  Car, 
  ShieldAlert, 
  FileText, 
  DollarSign, 
  Megaphone, 
  Wine, 
  Sparkles,
  Ban,
  Plus,
  Trash2,
  Building2,
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface StoreFormProps {
  data: Partial<StoreData>;
  onChange: (updated: Partial<StoreData>) => void;
  transactionType?: string;
  ledgerData?: any;
  hideSector6?: boolean;
}

export const StoreForm: React.FC<StoreFormProps> = ({ data, onChange, transactionType, ledgerData, hideSector6 }) => {
  const updateField = (field: keyof StoreData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // 매매 시 층별/호수별 임대차 현황 리스트 핸들러
  const leaseList: StoreLeaseUnitItem[] = data.leaseStatusList || [];

  const updateLeaseItem = (index: number, updatedItem: Partial<StoreLeaseUnitItem>) => {
    const nextList = [...leaseList];
    nextList[index] = { ...nextList[index], ...updatedItem };
    onChange({ ...data, leaseStatusList: nextList });
  };

  const addLeaseItem = (floorHoDefault = '') => {
    const newItem: StoreLeaseUnitItem = {
      id: `lease-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      floorHo: floorHoDefault || `${leaseList.length + 1}층`,
      contractStartDate: '',
      evictionPossible: '명도 가능',
      deposit: undefined,
      monthlyRent: undefined,
      isVacant: false,
    };
    onChange({ ...data, leaseStatusList: [...leaseList, newItem] });
  };

  const removeLeaseItem = (index: number) => {
    const nextList = leaseList.filter((_, i) => i !== index);
    onChange({ ...data, leaseStatusList: nextList });
  };

  const handleToggleVacant = (index: number) => {
    const cur = leaseList[index];
    const nextVacant = !cur.isVacant;
    updateLeaseItem(index, {
      isVacant: nextVacant,
      deposit: nextVacant ? 0 : (cur.deposit === 0 ? undefined : cur.deposit),
      monthlyRent: nextVacant ? 0 : (cur.monthlyRent === 0 ? undefined : cur.monthlyRent),
    });
  };

  // 건축물대장 층별/호수 정보로부터 자동 생성
  const handleLoadFromLedger = () => {
    if (!ledgerData) return;
    const generated: StoreLeaseUnitItem[] = [];

    if (ledgerData.unitList && ledgerData.unitList.length > 0) {
      ledgerData.unitList.forEach((u: any, idx: number) => {
        generated.push({
          id: `ledger-unit-${idx}-${Date.now()}`,
          floorHo: `${u.dong ? u.dong + ' ' : ''}${u.ho || u.floor || (idx + 1) + '호'}`,
          contractStartDate: '',
          evictionPossible: '명도 가능',
          deposit: undefined,
          monthlyRent: undefined,
          isVacant: false,
        });
      });
    } else if (ledgerData.floorList && ledgerData.floorList.length > 0) {
      ledgerData.floorList.forEach((f: any, idx: number) => {
        generated.push({
          id: `ledger-floor-${idx}-${Date.now()}`,
          floorHo: `${f.floor} (${f.mainUse || '점포'})`,
          contractStartDate: '',
          evictionPossible: '명도 가능',
          deposit: undefined,
          monthlyRent: undefined,
          isVacant: false,
        });
      });
    }

    if (generated.length > 0) {
      onChange({ ...data, leaseStatusList: generated });
    }
  };

  // 총 보증금 및 총 월세 계산
  const totalDeposit = useMemo(() => {
    return leaseList.reduce((acc, cur) => acc + (cur.isVacant ? 0 : (Number(cur.deposit) || 0)), 0);
  }, [leaseList]);

  const totalMonthlyRent = useMemo(() => {
    return leaseList.reduce((acc, cur) => acc + (cur.isVacant ? 0 : (Number(cur.monthlyRent) || 0)), 0);
  }, [leaseList]);

  // 대장상 면적 ㎡ 입력 시 평 자동 계산
  const handleBuildingAreaSqm = (valStr: string) => {
    if (!valStr) {
      onChange({ ...data, buildingArea: undefined, buildingAreaPyeong: undefined });
      return;
    }
    const sqm = parseFloat(valStr);
    const pyeong = !isNaN(sqm) ? parseFloat((sqm * 0.3025).toFixed(2)) : undefined;
    // 실평수가 아직 없거나 대장상 면적과 같았던 경우 실평수 초기값도 함께 연동
    const nextActualArea = data.actualArea === undefined || data.actualArea === data.buildingArea ? sqm : data.actualArea;
    const nextActualAreaPyeong = data.actualArea === undefined || data.actualArea === data.buildingArea ? pyeong : data.actualAreaPyeong;
    onChange({
      ...data,
      buildingArea: isNaN(sqm) ? undefined : sqm,
      buildingAreaPyeong: pyeong,
      actualArea: nextActualArea,
      actualAreaPyeong: nextActualAreaPyeong,
    });
  };

  // 대장상 면적 평 입력 시 ㎡ 자동 계산
  const handleBuildingAreaPyeong = (valStr: string) => {
    if (!valStr) {
      onChange({ ...data, buildingAreaPyeong: undefined });
      return;
    }
    const pyeong = parseFloat(valStr);
    const sqm = !isNaN(pyeong) ? parseFloat((pyeong / 0.3025).toFixed(2)) : undefined;
    onChange({
      ...data,
      buildingAreaPyeong: isNaN(pyeong) ? undefined : pyeong,
      buildingArea: sqm !== undefined ? sqm : data.buildingArea,
    });
  };

  // 실평수 ㎡ 입력 시 평 자동 계산 (수정 가능)
  const handleActualAreaSqm = (valStr: string) => {
    if (!valStr) {
      onChange({ ...data, actualArea: undefined, actualAreaPyeong: undefined });
      return;
    }
    const sqm = parseFloat(valStr);
    const pyeong = !isNaN(sqm) ? parseFloat((sqm * 0.3025).toFixed(2)) : undefined;
    onChange({
      ...data,
      actualArea: isNaN(sqm) ? undefined : sqm,
      actualAreaPyeong: pyeong,
    });
  };

  // 실평수 평 입력 시 ㎡ 자동 계산
  const handleActualAreaPyeong = (valStr: string) => {
    if (!valStr) {
      onChange({ ...data, actualAreaPyeong: undefined });
      return;
    }
    const pyeong = parseFloat(valStr);
    const sqm = !isNaN(pyeong) ? parseFloat((pyeong / 0.3025).toFixed(2)) : undefined;
    onChange({
      ...data,
      actualAreaPyeong: isNaN(pyeong) ? undefined : pyeong,
      actualArea: sqm !== undefined ? sqm : data.actualArea,
    });
  };

  const calculatedBuildingPyeong = data.buildingAreaPyeong !== undefined 
    ? data.buildingAreaPyeong 
    : (data.buildingArea ? parseFloat((data.buildingArea * 0.3025).toFixed(2)) : '');

  const calculatedActualPyeong = data.actualAreaPyeong !== undefined 
    ? data.actualAreaPyeong 
    : (data.actualArea ? parseFloat((data.actualArea * 0.3025).toFixed(2)) : '');

  return (
    <div className="space-y-6">
      
      {/* ────────────────────────────────────────────────────────── */}
      {/* 섹터 1. 점포 기본 및 면적 정보 */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-amber-200/90 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500 text-white shadow-2xs">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                섹터 1. 점포 기본 및 층·면적 정보
              </h4>
              <span className="text-xs text-amber-700">
                상호, 업종, 층수 및 실평수 규격
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200/80 text-amber-900">
            기본정보
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                상호명
              </label>
              <input
                type="text"
                value={data.storeName || ''}
                onChange={(e) => updateField('storeName', e.target.value)}
                placeholder="예: 맛있는 베이커리 서초점"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                업종 (현재 또는 권장)
              </label>
              <input
                type="text"
                value={data.businessType || ''}
                onChange={(e) => updateField('businessType', e.target.value)}
                placeholder="예: 휴게음식점, 카페, 미용실"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                총층수
              </label>
              <input
                type="number"
                value={data.totalFloors || ''}
                onChange={(e) => updateField('totalFloors', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="예: 5"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                해당층수
              </label>
              <input
                type="text"
                value={data.currentFloor || ''}
                onChange={(e) => updateField('currentFloor', e.target.value)}
                placeholder="예: 지상 1층 (도로변 전면)"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden font-medium text-slate-900"
              />
            </div>
          </div>

          {/* 대장상면적(㎡) -> 대장상면적(평) -> 실평수(전용㎡)* -> 실평수(평) -> 대장상주용도 순서 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
            {/* 1. 대장상 면적 (㎡) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                대장상 면적 (㎡)
              </label>
              <input
                type="number"
                step="0.01"
                value={data.buildingArea !== undefined && data.buildingArea !== null ? data.buildingArea : ''}
                onChange={(e) => handleBuildingAreaSqm(e.target.value)}
                placeholder="대장 면적 (㎡)"
                className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden font-bold text-slate-900"
              />
            </div>

            {/* 2. 대장상 면적 (평) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                대장상 면적 (평)
              </label>
              <input
                type="number"
                step="0.01"
                value={calculatedBuildingPyeong}
                onChange={(e) => handleBuildingAreaPyeong(e.target.value)}
                placeholder="대장 면적 (평)"
                className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden font-bold text-slate-700"
              />
            </div>

            {/* 3. 실평수 (전용 ㎡) * */}
            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1">
                실평수 (전용 ㎡) *
              </label>
              <input
                type="number"
                step="0.01"
                value={data.actualArea !== undefined && data.actualArea !== null ? data.actualArea : ''}
                onChange={(e) => handleActualAreaSqm(e.target.value)}
                placeholder="실평수 (㎡)"
                className="w-full text-sm px-3 py-2.5 bg-amber-50/70 border-2 border-amber-400 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden font-extrabold text-amber-950"
              />
            </div>

            {/* 4. 실평수 (평) */}
            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1">
                실평수 (평)
              </label>
              <input
                type="number"
                step="0.01"
                value={calculatedActualPyeong}
                onChange={(e) => handleActualAreaPyeong(e.target.value)}
                placeholder="실평수 (평)"
                className="w-full text-sm px-3 py-2.5 bg-amber-50/40 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden font-bold text-amber-900"
              />
            </div>

            {/* 5. 대장상 주용도 */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                대장상 주용도
              </label>
              <input
                type="text"
                value={data.buildingUse || ''}
                onChange={(e) => updateField('buildingUse', e.target.value)}
                placeholder="예: 제2종근린생활시설"
                className="w-full text-sm px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden font-medium text-slate-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 섹터 2. 공간 구조 및 화장실·주차 (방개수, 화장실 남녀구분, 주차불가능) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-indigo-200/90 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3 border-b border-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-indigo-950">
                섹터 2. 공간 구획 및 화장실·주차 조건
              </h4>
              <span className="text-xs text-indigo-700">
                방 개수, 화장실 남녀구분, 주차대수 및 주차불가 옵션
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-200/80 text-indigo-900">
            시설구조
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 방 갯수 */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                방 갯수 (룸 / 창고 / 주방 구획)
              </label>
              <input
                type="number"
                value={data.roomCount || ''}
                onChange={(e) => updateField('roomCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="예: 0 (오픈형) 또는 2개"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden font-bold text-slate-900"
              />
            </div>

            {/* 화장실 수 */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                화장실 수
              </label>
              <input
                type="number"
                value={data.bathroomCount || ''}
                onChange={(e) => updateField('bathroomCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="예: 1 또는 2"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden font-bold text-slate-900"
              />
            </div>

            {/* 화장실 남녀 구분 */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                화장실 남녀 구분 및 위치
              </label>
              <select
                value={data.toiletGenderType || '남녀분리'}
                onChange={(e) => updateField('toiletGenderType', e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden font-bold text-slate-900"
              >
                <option value="남녀분리(내부)">남녀분리 (내부 전용)</option>
                <option value="남녀분리(외부공용)">남녀분리 (외부 층별공용)</option>
                <option value="남녀공용(내부)">남녀공용 (내부)</option>
                <option value="남녀공용(외부)">남녀공용 (외부)</option>
                <option value="외부공용화장실">외부 공용 화장실</option>
              </select>
            </div>
          </div>

          {/* 주차대수 & 주차불가능 옵션 */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-600" />
                <label className="text-sm font-bold text-slate-800">
                  주차 가능 여부 및 대수
                </label>
              </div>

              {/* 주차 불가능 토글 칩 */}
              <button
                type="button"
                onClick={() => {
                  const nextImpossible = !data.isParkingImpossible;
                  onChange({
                    ...data,
                    isParkingImpossible: nextImpossible,
                    parkingCount: nextImpossible ? 0 : (data.parkingCount || 1),
                  });
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  data.isParkingImpossible
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>[주차 불가능] 으로 설정</span>
              </button>
            </div>

            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <input
                  type="number"
                  disabled={data.isParkingImpossible}
                  value={data.isParkingImpossible ? 0 : (data.parkingCount || '')}
                  onChange={(e) => updateField('parkingCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  placeholder={data.isParkingImpossible ? '주차 불가' : '가능 주차대수 입력 (예: 2)'}
                  className={`w-full text-sm px-3.5 py-2.5 border rounded-xl font-bold ${
                    data.isParkingImpossible
                      ? 'bg-rose-50 border-rose-200 text-rose-700 cursor-not-allowed'
                      : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500 text-slate-900'
                  }`}
                />
              </div>
              <p className="text-xs text-slate-500">
                {data.isParkingImpossible
                  ? '🚨 본 매물은 주차가 불가능(0대)한 매물로 브리핑됩니다.'
                  : '고객 무료주차 또는 입주자 배정 주차 대수를 기재하세요.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 섹터 3. 유틸리티 설비 스펙 (전기 용량 & 개별/공용, 수도, 가스) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-emerald-200/90 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 border-b border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                섹터 3. 핵심 유틸리티 설비 (전기·수도·가스)
              </h4>
              <span className="text-xs text-emerald-700">
                전기 용량(kW) 및 개별/공용, 수도 개별/공용, 가스(도시가스/LPG/없음)
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-200/80 text-emerald-900">
            설비스펙
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* 1) 전기: 용량 & 개별/공용 */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>전기 설비</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">전기 용량 (kW)</label>
                <input
                  type="text"
                  value={data.electricityCapacity || ''}
                  onChange={(e) => updateField('electricityCapacity', e.target.value)}
                  placeholder="예: 25kW (기본 15kW + 증설 10kW)"
                  className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">전기 구분</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {['개별계량기', '건물공용'].map((type) => {
                    const isSelected = data.electricityType === type || 
                      (type === '개별계량기' && (data.electricityType === '개별' || data.electricityType === '개별계량기')) ||
                      (type === '건물공용' && (data.electricityType === '공용' || data.electricityType === '건물공용'));
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateField('electricityType', type)}
                        className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2) 수도: 개별 / 공용 */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                <Droplet className="w-4 h-4 text-blue-500" />
                <span>수도 설비</span>
              </div>
              <p className="text-xs text-slate-500">수도 계량기 개별 여부</p>
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">수도 구분</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {['개별계량기', '건물공용(n분의1)'].map((type) => {
                    const isSelected = data.waterType === type ||
                      (type === '개별계량기' && (data.waterType === '개별' || data.waterType === '개별계량기')) ||
                      (type === '건물공용(n분의1)' && (data.waterType === '공용' || data.waterType === '건물공용(n분의1)'));
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateField('waterType', type)}
                        className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3) 가스: 도시가스 / LPG / 없음 */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                <Flame className="w-4 h-4 text-rose-500" />
                <span>가스 설비</span>
              </div>
              <p className="text-xs text-slate-500">인입 가스 종류</p>
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">가스 종류</label>
                <div className="grid grid-cols-3 gap-1">
                  {['도시가스(LNG)', 'LPG(용기/탱크)', '가스없음(전기)'].map((type) => {
                    const prefix = type.split('(')[0];
                    const isSelected = data.gasType === type ||
                      (data.gasType && (data.gasType === prefix || type.startsWith(data.gasType) || data.gasType.startsWith(prefix)));
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateField('gasType', type)}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {prefix}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 매매(SALE) 전용: 섹터 4. 층별·호수별 임대차 및 명도 현황 (보증금·월세·공실 관리) */}
      {/* ────────────────────────────────────────────────────────── */}
      {transactionType === '매매' ? (
        <div className="bg-white rounded-2xl border-2 border-indigo-200/90 shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 px-4 py-3.5 border-b border-indigo-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-950">
                  섹터 4. 층별·호수별 임대차 및 명도 현황 (보증금·월세·명도·공실 관리)
                </h4>
                <span className="text-xs text-indigo-700">
                  건축물대장 층별 호수 연동, 계약시작일, 명도여부, 임차보증금 및 월세, 공실 원클릭 설정
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {ledgerData && (
                <button
                  type="button"
                  onClick={handleLoadFromLedger}
                  title="건축물대장의 층별개요 또는 호실 목록을 불러와 자동으로 채웁니다"
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>대장 층/호수 불러오기</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => addLeaseItem()}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-800 text-xs font-bold shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>호실 추가</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {leaseList.length === 0 ? (
              <div className="p-6 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 text-center space-y-2">
                <p className="text-sm font-bold text-slate-700">등록된 층별·호수별 임대차 내역이 없습니다.</p>
                <p className="text-xs text-slate-500">
                  상단의 [대장 층/호수 불러오기]를 누르시거나 [+ 호실 추가] 버튼을 눌러 각 호실의 보증금 및 월세를 입력해주세요.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  {ledgerData && (
                    <button
                      type="button"
                      onClick={handleLoadFromLedger}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-700 cursor-pointer"
                    >
                      🏛️ 건축물대장 층별 목록 일괄 불러오기
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => addLeaseItem('1층')}
                    className="px-3 py-1.5 rounded-lg bg-white border border-indigo-300 text-indigo-800 text-xs font-bold hover:bg-indigo-50 cursor-pointer"
                  >
                    + 첫 호실 직접 입력하기
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 층별 호수 리스트 (데스크톱/모바일 반응형) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                        <th className="py-2.5 px-3 min-w-[120px]">층 · 호수 *</th>
                        <th className="py-2.5 px-3 min-w-[130px]">계약 시작일</th>
                        <th className="py-2.5 px-3 min-w-[120px]">명도 가능 여부</th>
                        <th className="py-2.5 px-3 min-w-[110px]">임차보증금 (만원)</th>
                        <th className="py-2.5 px-3 min-w-[110px]">월세 (만원)</th>
                        <th className="py-2.5 px-3 text-center min-w-[90px]">공실 상태</th>
                        <th className="py-2.5 px-2 text-center w-10">삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaseList.map((item, idx) => (
                        <tr 
                          key={item.id || idx}
                          className={`transition-colors ${item.isVacant ? 'bg-amber-50/40' : 'hover:bg-slate-50'}`}
                        >
                          {/* 1. 층별 호수 */}
                          <td className="py-2 px-2.5">
                            <input
                              type="text"
                              value={item.floorHo}
                              onChange={(e) => updateLeaseItem(idx, { floorHo: e.target.value })}
                              placeholder="예: 1층 101호"
                              className="w-full text-xs font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 text-slate-900"
                            />
                          </td>

                          {/* 2. 계약기간 시작일 */}
                          <td className="py-2 px-2.5">
                            <input
                              type="date"
                              value={item.contractStartDate || ''}
                              onChange={(e) => updateLeaseItem(idx, { contractStartDate: e.target.value })}
                              className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 text-slate-800"
                            />
                          </td>

                          {/* 3. 명도여부 가능 */}
                          <td className="py-2 px-2.5">
                            <select
                              value={item.evictionPossible || '명도 가능'}
                              onChange={(e) => updateLeaseItem(idx, { evictionPossible: e.target.value })}
                              className="w-full text-xs font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 text-slate-800"
                            >
                              <option value="명도 가능">🟢 명도 가능</option>
                              <option value="명도 협의">🟡 명도 협의</option>
                              <option value="만기 퇴거 예정">🔵 만기 퇴거 예정</option>
                              <option value="재계약 승계">⚪ 재계약 승계</option>
                            </select>
                          </td>

                          {/* 4. 임차보증금 (만원) */}
                          <td className="py-2 px-2.5">
                            <input
                              type="number"
                              disabled={item.isVacant}
                              value={item.isVacant ? 0 : (item.deposit !== undefined && item.deposit !== null ? item.deposit : '')}
                              onChange={(e) => updateLeaseItem(idx, { deposit: e.target.value ? parseFloat(e.target.value) : undefined })}
                              placeholder="보증금 (만원)"
                              className={`w-full text-xs font-extrabold px-2 py-1.5 border rounded-lg ${
                                item.isVacant
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : 'bg-white border-blue-300 text-blue-950 focus:ring-1 focus:ring-blue-500'
                              }`}
                            />
                          </td>

                          {/* 5. 월세 (만원) */}
                          <td className="py-2 px-2.5">
                            <input
                              type="number"
                              disabled={item.isVacant}
                              value={item.isVacant ? 0 : (item.monthlyRent !== undefined && item.monthlyRent !== null ? item.monthlyRent : '')}
                              onChange={(e) => updateLeaseItem(idx, { monthlyRent: e.target.value ? parseFloat(e.target.value) : undefined })}
                              placeholder="월세 (만원)"
                              className={`w-full text-xs font-extrabold px-2 py-1.5 border rounded-lg ${
                                item.isVacant
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : 'bg-white border-emerald-300 text-emerald-950 focus:ring-1 focus:ring-emerald-500'
                              }`}
                            />
                          </td>

                          {/* 6. 공실 버튼 (원클릭 토글) */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleVacant(idx)}
                              title={item.isVacant ? '클릭 시 입주 상태로 전환' : '클릭 시 공실(보증금/월세 0)로 전환'}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer shadow-2xs ${
                                item.isVacant
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                              }`}
                            >
                              {item.isVacant ? '✓ 공실' : '입주중'}
                            </button>
                          </td>

                          {/* 7. 삭제 */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeLeaseItem(idx)}
                              title="해당 층/호수 삭제"
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 행 추가 버튼 */}
                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => addLeaseItem()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer border border-indigo-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>호실 추가</span>
                  </button>
                  <span className="text-xs text-slate-500">
                    * 공실인 경우 우측 [공실] 버튼을 누르면 보증금과 월세가 0으로 즉시 반영됩니다.
                  </span>
                </div>
              </div>
            )}

            {/* 맨 마지막: 총 보증금 합 및 월세 합계 요약 대시보드 카드 */}
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      전체 호실 임대차 집계 요약
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      총 {leaseList.length}개 호실 (입주 {leaseList.filter((l) => !l.isVacant).length}곳 / 공실 {leaseList.filter((l) => l.isVacant).length}곳)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5 sm:gap-8">
                  {/* 총 보증금 합계 */}
                  <div className="text-right">
                    <span className="block text-[11px] font-bold text-slate-400">총 보증금 합계</span>
                    <span className="text-lg sm:text-xl font-black text-amber-300 tracking-tight font-mono">
                      {totalDeposit.toLocaleString()} <span className="text-xs font-bold text-white">만원</span>
                    </span>
                  </div>

                  <div className="w-[1px] h-8 bg-slate-700"></div>

                  {/* 총 월세 합계 */}
                  <div className="text-right">
                    <span className="block text-[11px] font-bold text-slate-400">총 월세 합계</span>
                    <span className="text-lg sm:text-xl font-black text-emerald-300 tracking-tight font-mono">
                      {totalMonthlyRent.toLocaleString()} <span className="text-xs font-bold text-white">만원</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <>
      {/* ────────────────────────────────────────────────────────── */}
      {/* 섹터 4. 점포 운영 스펙 (테이블수, 종업원수, 영업기간, 주류대출) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-violet-200/90 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-3 border-b border-violet-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-600 text-white shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-violet-950">
                섹터 4. 매장 운영 및 시설 현황
              </h4>
              <span className="text-xs text-violet-700">
                테이블 갯수, 종업원 수, 영업기간, 주류대출, 업종인허가 및 비품/렌탈 승계
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-200/80 text-violet-900">
            운영현황
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                테이블 갯수 (총 좌석)
              </label>
              <input
                type="number"
                value={data.tableCount || ''}
                onChange={(e) => updateField('tableCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="예: 16 (홀 12 + 룸 4)"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:bg-white font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                종업원 수 (승계 여부)
              </label>
              <input
                type="number"
                value={data.employeeCount || ''}
                onChange={(e) => updateField('employeeCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="예: 3명 (주방 2, 홀 1)"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:bg-white font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                영업기간 (현재 운영 기간)
              </label>
              <input
                type="text"
                value={data.operationPeriod || ''}
                onChange={(e) => updateField('operationPeriod', e.target.value)}
                placeholder="예: 3년 6개월 운영 중"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:bg-white font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                일평균 매출 (만원)
              </label>
              <input
                type="number"
                value={data.dailyRevenue || ''}
                onChange={(e) => updateField('dailyRevenue', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="예: 120 (월 3,500만)"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:bg-white font-bold text-slate-900"
              />
            </div>
          </div>

          {/* 주류대출여부 (주류도매상 선급대출 등) */}
          <div className="p-3.5 bg-violet-50/60 rounded-xl border border-violet-200">
            <div className="flex items-center gap-2 mb-2">
              <Wine className="w-4 h-4 text-violet-700" />
              <label className="text-sm font-bold text-violet-950">
                주류대출여부 및 승계 조건 *
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <select
                  value={data.liquorLoan?.includes('대출있음') ? '대출있음' : (data.liquorLoan ? '대출없음' : '대출없음')}
                  onChange={(e) => {
                    const status = e.target.value;
                    if (status === '대출없음') {
                      updateField('liquorLoan', '주류대출 없음 (깨끗한 상태)');
                    } else {
                      updateField('liquorLoan', '주류대출 있음: 잔액 및 승계/상환 협의 필요');
                    }
                  }}
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-violet-300 rounded-xl font-bold text-violet-950"
                >
                  <option value="대출없음">🟢 주류대출 없음 (정상)</option>
                  <option value="대출있음">🔴 주류대출 있음 (승계/상환 필요)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={data.liquorLoan || ''}
                  onChange={(e) => updateField('liquorLoan', e.target.value)}
                  placeholder="예: 주류도매상 대출 2,000만원 잔액 있음 (신규 임차인 승계 또는 권리금에서 공제 상환 협의)"
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-violet-300 rounded-xl focus:ring-2 focus:ring-violet-500 font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 업종인허가승계 & 비품/렌탈승계 조건 (상가 임대/양도양수 핵심) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1) 업종인허가승계 */}
            <div className="p-3.5 bg-violet-50/60 rounded-xl border border-violet-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-violet-700" />
                <label className="text-sm font-bold text-violet-950">
                  업종인허가승계
                </label>
              </div>
              <div className="space-y-2">
                <select
                  value={
                    data.businessLicenseTransfer?.includes('승계 가능')
                      ? '승계가능'
                      : data.businessLicenseTransfer?.includes('신규')
                      ? '신규발급'
                      : data.businessLicenseTransfer?.includes('불가')
                      ? '승계불가'
                      : data.businessLicenseTransfer?.includes('자유업종')
                      ? '자유업종'
                      : data.businessLicenseTransfer
                      ? '직접입력'
                      : ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '승계가능') {
                      updateField('businessLicenseTransfer', '승계 가능: 기존 영업신고증 즉시 양도양수 승계 (행정처분 없음)');
                    } else if (val === '신규발급') {
                      updateField('businessLicenseTransfer', '신규 발급 필요: 기존 사업자 폐업 후 신규 영업신고/허가 진행');
                    } else if (val === '승계불가') {
                      updateField('businessLicenseTransfer', '승계 불가: 직종 변경 또는 지자체 조례 제한으로 승계 불가');
                    } else if (val === '자유업종') {
                      updateField('businessLicenseTransfer', '자유업종: 별도 관공서 인허가/영업신고증 불필요 (사업자등록만 진행)');
                    }
                  }}
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-violet-300 rounded-xl font-bold text-violet-950"
                >
                  <option value="">-- 업종인허가 승계 유형 선택 --</option>
                  <option value="승계가능">🟢 승계 가능 (영업신고증 즉시 승계)</option>
                  <option value="신규발급">🟡 신규 발급 필요 (기존 폐업 조건)</option>
                  <option value="승계불가">🔴 승계 불가 (직종 변경/행정 제한)</option>
                  <option value="자유업종">⚪ 자유업종 (인허가 불필요)</option>
                  <option value="직접입력">✏️ 직접 입력</option>
                </select>
                <input
                  type="text"
                  value={data.businessLicenseTransfer || ''}
                  onChange={(e) => updateField('businessLicenseTransfer', e.target.value)}
                  placeholder="예: 일반음식점 영업신고증 즉시 승계 가능 (최근 행정처분 및 시정명령 이력 없음)"
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-violet-300 rounded-xl focus:ring-2 focus:ring-violet-500 font-medium text-slate-900"
                />
              </div>
            </div>

            {/* 2) 비품/렌탈승계 */}
            <div className="p-3.5 bg-violet-50/60 rounded-xl border border-violet-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-violet-700" />
                <label className="text-sm font-bold text-violet-950">
                  비품/렌탈승계
                </label>
              </div>
              <div className="space-y-2">
                <select
                  value={
                    data.equipmentRentalTransfer?.includes('일체')
                      ? '일체승계'
                      : data.equipmentRentalTransfer?.includes('부분')
                      ? '부분승계'
                      : data.equipmentRentalTransfer?.includes('승계안함') || data.equipmentRentalTransfer?.includes('철거')
                      ? '승계안함'
                      : data.equipmentRentalTransfer?.includes('렌탈만')
                      ? '렌탈만승계'
                      : data.equipmentRentalTransfer
                      ? '직접입력'
                      : ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '일체승계') {
                      updateField('equipmentRentalTransfer', '비품 일체 포함 & 렌탈 명의승계 (권리금에 포함)');
                    } else if (val === '부분승계') {
                      updateField('equipmentRentalTransfer', '부분 승계: 일부 비품 제외 및 렌탈 명의이전 협의');
                    } else if (val === '승계안함') {
                      updateField('equipmentRentalTransfer', '일체 승계안함: 기존 비품 전부 반출/철거 및 원상복구 조건');
                    } else if (val === '렌탈만승계') {
                      updateField('equipmentRentalTransfer', '렌탈만 명의승계 (기존 비품은 인수 제외)');
                    }
                  }}
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-violet-300 rounded-xl font-bold text-violet-950"
                >
                  <option value="">-- 비품/렌탈 승계 조건 선택 --</option>
                  <option value="일체승계">🟢 비품 일체 포함 & 렌탈 명의승계</option>
                  <option value="부분승계">🟡 부분 승계 (일부 비품 제외/협의)</option>
                  <option value="렌탈만승계">🔵 렌탈만 승계 (비품은 인수 제외)</option>
                  <option value="승계안함">🔴 일체 승계 안함 (전체 철거/원상복구)</option>
                  <option value="직접입력">✏️ 직접 입력</option>
                </select>
                <input
                  type="text"
                  value={data.equipmentRentalTransfer || ''}
                  onChange={(e) => updateField('equipmentRentalTransfer', e.target.value)}
                  placeholder="예: 주방집기/테이블 일체 인수 포함, 제빙기·정수기는 명의변경 승계 조건"
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-violet-300 rounded-xl focus:ring-2 focus:ring-violet-500 font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 3) 비품 항목과 렌탈 항목을 기입할 수 있는 독립된 2개의 칸 (따로 따로) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {/* 칸 1: 비품 항목 */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-violet-600" />
                  비품 항목
                </label>
                <span className="text-[11px] px-2 py-0.5 rounded bg-violet-100 text-violet-800 font-bold">
                  양도/인수 비품 직접 기입
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                권리금에 포함되어 신규 임차인에게 양도되는 비품/시설 목록
              </p>
              <VoiceTextarea
                rows={3}
                value={data.equipmentList || ''}
                onChange={(val) => updateField('equipmentList', val)}
                placeholder="예: 4구 업소용 냉장고 1대, 테이블 12개, 의자 48개, 간텍기 1개, 튀김기 1대, 천장형 시스템에어컨 2대, 닥트 시설 등"
                className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 font-medium text-slate-900 resize-none"
              />
            </div>

            {/* 칸 2: 렌탈 항목 */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-violet-600" />
                  렌탈 항목
                </label>
                <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                  명의승계 렌탈 직접 기입
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                신규 임차인이 명의를 승계받아 월 렌탈료를 납부할 품목 목록
              </p>
              <VoiceTextarea
                rows={3}
                value={data.rentalList || ''}
                onChange={(val) => updateField('rentalList', val)}
                placeholder="예: 제빙기(카이저 월 4만원), 정수기(코웨이 월 3.5만원), 포스기/카드단말기(월 2만원), 식기세척기 등"
                className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 font-medium text-slate-900 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 섹터 5. 법적 인허가 및 계약 리스크 (위반건축물, 계약년도, 갱신권, 명의일치) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-rose-200/90 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 px-4 py-3 border-b border-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-600 text-white shadow-2xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-950">
                섹터 5. 법적 인허가 및 계약·명의 리스크 점검
              </h4>
              <span className="text-xs text-rose-700">
                위반건축물 여부, 계약년도/갱신요구권 잔여, 사업자등록 및 실운영자 명의 일치
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-200/80 text-rose-900">
            권리분석
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 위반건축물 여부 */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                위반건축물 여부 (불법증축/테라스/이행강제금) *
              </label>
              <input
                type="text"
                value={data.violationBuilding || ''}
                onChange={(e) => updateField('violationBuilding', e.target.value)}
                placeholder="예: 위반건축물 없음(정상) / 테라스 무단확장 등"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white font-medium text-slate-900"
              />
            </div>

            {/* 사업자등록 여부 */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                사업자등록 여부 *
              </label>
              <select
                value={data.businessRegistrationStatus || '등록완료(일반과세)'}
                onChange={(e) => updateField('businessRegistrationStatus', e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white font-bold text-slate-900"
              >
                <option value="등록완료(일반과세)">등록완료 (일반과세자)</option>
                <option value="등록완료(간이과세)">등록완료 (간이과세자)</option>
                <option value="등록완료(면세사업자)">등록완료 (면세사업자)</option>
                <option value="미등록(신규오픈예정)">미등록 (신규 양수자 등록 필요)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            {/* 계약년도 */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                최초 계약년도 (현 임차인 입주일)
              </label>
              <input
                type="text"
                value={data.contractYear || ''}
                onChange={(e) => updateField('contractYear', e.target.value)}
                placeholder="예: 2022년 3월 최초 계약"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white font-medium text-slate-900"
              />
            </div>

            {/* 계약갱신요구권 잔여기간 */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                계약갱신요구권 잔여기간 (상임법 10년)
              </label>
              <input
                type="text"
                value={data.renewalPeriodRemain || ''}
                onChange={(e) => updateField('renewalPeriodRemain', e.target.value)}
                placeholder="예: 상임법 10년 중 6년 잔여 / 갱신권 소진 등"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white font-medium text-slate-900"
              />
            </div>
          </div>

          {/* 실제 운영자와 임대차계약자 및 사업자 명의 일치 여부 */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-sm font-bold text-slate-800 mb-1.5">
              실제 운영자와 임대차계약자 및 사업자 명의 일치 여부 *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <select
                  value={data.operatorContractorMatch?.includes('불일치') ? '불일치' : '일치'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '일치') {
                      updateField('operatorContractorMatch', '3자 명의 완전 일치 (계약자 = 사업자 = 실운영자)');
                    } else {
                      updateField('operatorContractorMatch', '불일치 (계약자/사업자/운영자 상이 - 위임장/가족관계 확인 필요)');
                    }
                  }}
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                >
                  <option value="일치">🟢 3자 명의 일치</option>
                  <option value="불일치">🟡 명의 불일치 (가족/전대 등)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={data.operatorContractorMatch || ''}
                  onChange={(e) => updateField('operatorContractorMatch', e.target.value)}
                  placeholder="예: 3자 명의 완전 일치 (계약자 = 사업자 = 실운영자)"
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 행정처분 이력 점검란 (영업정지/과징금/시정명령 등 구청 위생과 조회) */}
          <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200">
            <label className="block text-sm font-bold text-rose-950 mb-1.5">
              행정처분 이력 점검 (영업정지 / 과징금 / 시정명령 승계 리스크) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <select
                  value={data.administrativeDisposition?.includes('이력있음') ? '처분있음' : '처분없음'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '처분없음') {
                      updateField('administrativeDisposition', '행정처분 이력 없음 (구청 위생과 사전 조회 완료 정상)');
                    } else {
                      updateField('administrativeDisposition', '행정처분 이력있음: 세부 내역 및 신규 양수인 승계 여부 확인 필요');
                    }
                  }}
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-rose-300 rounded-xl font-bold text-rose-950"
                >
                  <option value="처분없음">🟢 행정처분 이력 없음 (정상)</option>
                  <option value="처분있음">🔴 행정처분 이력 있음 (주의)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={data.administrativeDisposition || ''}
                  onChange={(e) => updateField('administrativeDisposition', e.target.value)}
                  placeholder="예: 행정처분 이력 없음 (구청 위생과 조회 완료) / 최근 1년간 처분이력 기재"
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 font-medium text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 임대차 전용: 섹터 6. 권리금·인상조건·광고·원상복구특약 (매매 또는 외부 배치 시 숨김) */}
      {/* ────────────────────────────────────────────────────────── */}
      {transactionType !== '매매' && !hideSector6 && (
      <div className="bg-white rounded-2xl border-2 border-blue-200/90 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-3 border-b border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-950">
                섹터 6. 권리금·인상조건·광고·원상복구특약
              </h4>
              <span className="text-xs text-blue-700">
                권리금 및 조정가능 권리금, 임대료 인상액, 광고 동의, 원상복구특약
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-200/80 text-blue-900">
            계약조건
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          
          {/* 권리금 & 조정가능한 권리금 (직접 입력 지원) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-slate-800">
                  권리금 (만원)
                </label>
                
                {/* [권리금 없음] 토글 버튼 */}
                <button
                  type="button"
                  onClick={() => {
                    const isCurrentlyNoPremium = !!data.isNoPremium;
                    const nextNoPremium = !isCurrentlyNoPremium;
                    onChange({
                      ...data,
                      isNoPremium: nextNoPremium,
                      premium: nextNoPremium ? 0 : undefined,
                      negotiablePremium: nextNoPremium ? 0 : data.negotiablePremium,
                    });
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                    data.isNoPremium
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span>✓</span>
                  <span>[권리금 없음] 설정</span>
                </button>
              </div>
              <input
                type="number"
                disabled={!!data.isNoPremium}
                value={data.isNoPremium ? 0 : (data.premium !== undefined && data.premium !== null ? data.premium : '')}
                onChange={(e) => {
                  const val = e.target.value;
                  const parsed = val !== '' ? parseFloat(val) : undefined;
                  onChange({
                    ...data,
                    isNoPremium: false,
                    premium: parsed,
                  });
                }}
                placeholder={data.isNoPremium ? '0 (무권리)' : '예: 3000 (직접 입력, 무권리 시 0)'}
                className={`w-full text-sm px-3.5 py-2.5 border rounded-xl font-bold ${
                  data.isNoPremium
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-extrabold cursor-not-allowed'
                    : 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500 font-extrabold text-slate-900'
                }`}
              />
            </div>

            {/* 조정가능한 권리금 (만원) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-indigo-950">
                  조정가능한 권리금 (만원)
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                  협의 가능 하한선
                </span>
              </div>
              <input
                type="number"
                disabled={!!data.isNoPremium}
                value={data.isNoPremium ? 0 : (data.negotiablePremium !== undefined && data.negotiablePremium !== null ? data.negotiablePremium : '')}
                onChange={(e) => {
                  const val = e.target.value;
                  const parsed = val !== '' ? parseFloat(val) : undefined;
                  onChange({
                    ...data,
                    negotiablePremium: parsed,
                  });
                }}
                placeholder="예: 2500 (직접 입력, 협의 하한선)"
                className={`w-full text-sm px-3.5 py-2.5 rounded-xl font-bold border ${
                  data.isNoPremium
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* 월세 인상조건 여부 및 인상액/비율 */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800">
                임대료 인상조건 여부 및 인상폭 (새 임대차 승계 시) *
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <select
                  value={data.rentIncreaseCondition?.includes('인상조건있음') ? '인상있음' : '인상없음'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '인상없음') {
                      updateField('rentIncreaseCondition', '인상조건 없음 (기존 월세 동결 유지)');
                    } else {
                      updateField('rentIncreaseCondition', '인상조건있음: 신규 계약 시 월세 OO만원 인상 요구');
                    }
                  }}
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                >
                  <option value="인상없음">🟢 인상 없음 (동결)</option>
                  <option value="인상있음">🔴 인상 조건 있음</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={data.rentIncreaseCondition || ''}
                  onChange={(e) => updateField('rentIncreaseCondition', e.target.value)}
                  placeholder="예: 인상조건있음: 보증금 5,000만원 동일, 월세 20만원 인상(300만원 -> 320만원 요구)"
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 점포 광고 여부 및 타부동산 광고 여부 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 점포 자체 광고 여부 */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                <Megaphone className="w-4 h-4 text-blue-600" />
                <span>점포 자체 광고 여부</span>
              </div>
              <select
                value={data.storeAdStatus || '공개광고가능'}
                onChange={(e) => updateField('storeAdStatus', e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
              >
                <option value="공개광고가능">🟢 공개 광고 진행 (네이버부동산/포털/블로그 전체 노출)</option>
                <option value="비공개(비밀매물)">🔴 비공개 매물 (단골/직원 동요 방지로 1:1 비밀 매칭만)</option>
                <option value="상호비공개">🟡 상호/위치 일부 비공개 광고</option>
              </select>
            </div>

            {/* 타부동산 광고 여부 */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>타부동산 광고/의뢰 여부</span>
              </div>
              <select
                value={data.otherAgencyAdStatus || '타부동산없음(전속)'}
                onChange={(e) => updateField('otherAgencyAdStatus', e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
              >
                <option value="타부동산없음(전속)">🟢 타부동산 광고 없음 (당사 단독/전속 우대)</option>
                <option value="타부동산진행중(다수의뢰)">🟡 타부동산 광고 진행 중 (2~3곳 의뢰됨)</option>
                <option value="타부동산다수경쟁">🔴 인근 다수 부동산 공개 진행 중</option>
              </select>
            </div>

          </div>

          {/* 원상복구특약 */}
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-300 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <label className="text-sm font-bold text-amber-950">
                원상복구특약 (분쟁 방지 필수 기재 - 타자 & 음성 지원) *
              </label>
            </div>
            <VoiceTextarea
              rows={2}
              value={data.restorationTerms || ''}
              onChange={(val) => updateField('restorationTerms', val)}
              placeholder="예: 현 시설 상태(인테리어 및 바닥/천장/닥트) 그대로 인수하며, 임대차 종료 시 현 상태를 기준으로 원상복구하거나 다음 임차인에게 승계함을 임대인과 합의함."
              className="border-amber-300 focus:ring-amber-500 font-medium text-slate-900"
            />
          </div>

        </div>
      </div>
      )}

    </div>
  );
};
