'use client';

import React from 'react';
import { OfficeData } from '@/lib/types';
import { 
  Briefcase, 
  Layers, 
  Zap, 
  Droplet, 
  Car, 
  ShieldAlert, 
  FileText, 
  DollarSign, 
  Megaphone, 
  Sparkles,
  Ban,
  Wind
} from 'lucide-react';

interface OfficeFormProps {
  data: Partial<OfficeData>;
  onChange: (updated: Partial<OfficeData>) => void;
}

export const OfficeForm: React.FC<OfficeFormProps> = ({ data, onChange }) => {
  const updateField = (field: keyof OfficeData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      
      {/* ────────────────────────────────────────────────────────── */}
      {/* 섹터 1. 사무실 기본 및 층·면적 정보 */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-blue-200/90 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-950">
                섹터 1. 사무실 기본 및 층·면적 규격
              </h4>
              <span className="text-xs text-blue-700">
                빌딩명, 입주사 상호, 층수 및 전용 실평수
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-200/80 text-blue-900">
            기본정보
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                상호명 / 빌딩명
              </label>
              <input
                type="text"
                value={data.officeName || ''}
                onChange={(e) => updateField('officeName', e.target.value)}
                placeholder="예: 강남타워 7층 전체"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium text-slate-900"
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
                placeholder="예: 15"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium text-slate-900"
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
                placeholder="예: 7층 단독사용"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                건물 내 총 호실/사무실수
              </label>
              <input
                type="number"
                value={data.totalOfficeCount || ''}
                onChange={(e) => updateField('totalOfficeCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="예: 12"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                실평수 (전용 ㎡) *
              </label>
              <input
                type="number"
                step="0.01"
                value={data.actualArea || ''}
                onChange={(e) => updateField('actualArea', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="예: 165.2 (약 50평)"
                className="w-full text-sm px-3.5 py-2.5 bg-blue-50/50 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-bold text-blue-950"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                대장상 면적 (㎡)
              </label>
              <input
                type="number"
                step="0.01"
                value={data.buildingArea || ''}
                onChange={(e) => updateField('buildingArea', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="대장상 면적"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                대장상 주용도
              </label>
              <input
                type="text"
                value={data.buildingUse || ''}
                onChange={(e) => updateField('buildingUse', e.target.value)}
                placeholder="예: 업무시설 (사무소)"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium text-slate-900"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 섹터 2. 공간 구조 및 화장실·주차 조건 */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-indigo-200/90 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-sky-50 px-4 py-3 border-b border-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-indigo-950">
                섹터 2. 내부 룸 구획 및 화장실·주차 조건
              </h4>
              <span className="text-xs text-indigo-700">
                회의실/임원실 수, 화장실 남녀구분, 배정 주차대수 및 주차불가 옵션
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-200/80 text-indigo-900">
            공간구조
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                룸 수 (임원실 / 회의실 / 탕비실)
              </label>
              <input
                type="number"
                value={data.roomCount || ''}
                onChange={(e) => updateField('roomCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="예: 3 (유리 칸막이 룸)"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                화장실 수
              </label>
              <input
                type="number"
                value={data.bathroomCount || ''}
                onChange={(e) => updateField('bathroomCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="예: 2 (외부 층별/내부)"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                화장실 남녀 구분 및 위치
              </label>
              <select
                value={data.toiletGenderType || '남녀분리(층별외부)'}
                onChange={(e) => updateField('toiletGenderType', e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white font-bold text-slate-900"
              >
                <option value="남녀분리(층별외부)">남녀분리 (층별 외부 공용)</option>
                <option value="남녀분리(내부전용)">남녀분리 (호실 내부 전용)</option>
                <option value="남녀공용(내부)">남녀공용 (내부)</option>
                <option value="남녀공용(외부)">남녀공용 (외부)</option>
              </select>
            </div>
          </div>

          {/* 주차대수 & 주차불가능 옵션 */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-600" />
                <label className="text-sm font-bold text-slate-800">
                  배정 주차 대수 및 추가 주차 규정
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
                  placeholder={data.isParkingImpossible ? '주차 불가' : '무료 배정 대수 (예: 무료 2대)'}
                  className={`w-full text-sm px-3.5 py-2.5 border rounded-xl font-bold ${
                    data.isParkingImpossible
                      ? 'bg-rose-50 border-rose-200 text-rose-700 cursor-not-allowed'
                      : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <input
                  type="text"
                  value={data.parkingAndFee || ''}
                  onChange={(e) => updateField('parkingAndFee', e.target.value)}
                  placeholder="예: 무료 2대 배정, 유료 추가 주차 대당 월 15만원(자주식/기계식)"
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 섹터 3. 유틸리티 & 냉난방·빌딩 시설 */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-teal-200/90 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 px-4 py-3 border-b border-teal-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-600 text-white shadow-2xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-teal-950">
                섹터 3. 유틸리티 (전기·수도) 및 냉난방·빌딩 시설
              </h4>
              <span className="text-xs text-teal-700">
                전기 용량(kW) 및 개별/공용, 수도, 냉난방 시스템, 엘리베이터
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-200/80 text-teal-900">
            설비스펙
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* 전기 */}
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
                  placeholder="예: 30kW (서버실 운영 가능)"
                  className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-bold text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {['개별계량기', '건물공용'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateField('electricityType', type)}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all ${
                      data.electricityType === type
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* 수도 */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                <Droplet className="w-4 h-4 text-blue-500" />
                <span>수도 설비 (탕비실)</span>
              </div>
              <p className="text-xs text-slate-500">탕비실 배수 및 계량기</p>
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">수도 구분</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {['개별계량기', '건물공용(n분의1)'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateField('waterType', type)}
                      className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all ${
                        data.waterType === type
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 냉난방 */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                <Wind className="w-4 h-4 text-cyan-600" />
                <span>냉난방 시스템 *</span>
              </div>
              <p className="text-xs text-slate-500">야간/주말 가동 가능 여부</p>
              <input
                type="text"
                value={data.hvacSystem || ''}
                onChange={(e) => updateField('hvacSystem', e.target.value)}
                placeholder="예: 천장형 시스템에어컨(개별제어 / 24시간 가동가능)"
                className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-slate-900 font-medium"
              />
            </div>

          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 섹터 4. 관리비·인상조건·원상복구특약·광고 */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-slate-100 to-slate-200 px-4 py-3 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-700 text-white shadow-2xs">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                섹터 4. 관리비(없음 옵션)·인상조건·광고·원상복구특약
              </h4>
              <span className="text-xs text-slate-600">
                관리비 부과 방식, 재계약 인상조건, 원상복구특약, 광고 동의 여부
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-300 text-slate-800">
            계약조건
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          
          {/* 관리비 & 관리비 없음 체크 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-slate-800">
                  관리비 (만원)
                </label>
                
                {/* [관리비 없음] 토글 버튼 */}
                <button
                  type="button"
                  onClick={() => {
                    const nextNoFee = !data.isNoMaintenanceFee;
                    onChange({
                      ...data,
                      isNoMaintenanceFee: nextNoFee,
                      maintenanceFee: nextNoFee ? 0 : (data.maintenanceFee || 30),
                    });
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
                    data.isNoMaintenanceFee
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span>✓</span>
                  <span>[관리비 없음] 설정</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={data.isNoMaintenanceFee}
                  value={data.isNoMaintenanceFee ? 0 : (data.maintenanceFee || '')}
                  onChange={(e) => updateField('maintenanceFee', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder={data.isNoMaintenanceFee ? '관리비 없음' : '예: 50'}
                  className={`w-full text-sm px-3.5 py-2.5 border rounded-xl font-bold ${
                    data.isNoMaintenanceFee
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 cursor-not-allowed'
                      : 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500 text-slate-900'
                  }`}
                />
                <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!data.maintenanceFeeVat}
                    onChange={(e) => updateField('maintenanceFeeVat', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-sm"
                  />
                  <span>부가세 별도</span>
                </label>
              </div>
            </div>

            {/* 계약년도 & 갱신권 */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                계약년도 및 계약갱신권 잔여기간
              </label>
              <input
                type="text"
                value={data.contractYear ? `${data.contractYear} / ${data.renewalPeriodRemain || ''}` : (data.renewalPeriodRemain || '')}
                onChange={(e) => updateField('renewalPeriodRemain', e.target.value)}
                placeholder="예: 2022년 최초 입주, 상임법 10년 중 6년 잔여"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
              />
            </div>
          </div>

          {/* 임대료 인상조건 */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <label className="block text-sm font-bold text-slate-800">
              임대료 인상조건 여부 및 인상폭 (재계약/신규 계약 시)
            </label>
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
                  placeholder="예: 인상조건 없음(동결) 또는 월세 5% 인상 요구"
                  className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 광고 여부 및 원상복구특약 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                사무실 광고 노출 여부
              </label>
              <select
                value={data.storeAdStatus || '공개광고가능'}
                onChange={(e) => updateField('storeAdStatus', e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
              >
                <option value="공개광고가능">🟢 공개 광고 진행 (포털/블로그 전체 노출)</option>
                <option value="비공개(비밀매물)">🔴 비공개 매물 (직원/거래처 보안 1:1 매칭)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                타부동산 광고 여부
              </label>
              <select
                value={data.otherAgencyAdStatus || '타부동산없음(전속)'}
                onChange={(e) => updateField('otherAgencyAdStatus', e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
              >
                <option value="타부동산없음(전속)">🟢 타부동산 없음 (단독/전속)</option>
                <option value="타부동산진행중">🟡 타부동산 2~3곳 의뢰 진행 중</option>
              </select>
            </div>
          </div>

          {/* 원상복구특약 */}
          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-300 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700" />
              <label className="text-sm font-bold text-blue-950">
                원상복구특약 (칸막이/바닥재 승계 여부 분쟁 방지 필수 기재) *
              </label>
            </div>
            <textarea
              rows={2}
              value={data.restorationTerms || ''}
              onChange={(e) => updateField('restorationTerms', e.target.value)}
              placeholder="예: 유리 칸막이 3개 룸 및 바닥 디럭스타일은 시설 승계 인정하며, 퇴실 시 불필요한 철거 비용 없이 다음 임차인에게 그대로 인계함."
              className="w-full text-sm p-3 bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
            />
          </div>

        </div>
      </div>

    </div>
  );
};
