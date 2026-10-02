'use client';

import React, { useState, useEffect } from 'react';
import { 
  ApartmentData, 
  APARTMENT_AIRCON_ROOMS, 
  APARTMENT_OPTION_CATEGORIES 
} from '@/lib/types';
import { 
  Wind, 
  Flame, 
  Sparkles, 
  CookingPot, 
  DoorClosed, 
  Check, 
  Plus, 
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface ApartmentFormProps {
  data: Partial<ApartmentData>;
  onChange: (updated: Partial<ApartmentData>) => void;
}

export const ApartmentForm: React.FC<ApartmentFormProps> = ({ data, onChange }) => {
  // 에어컨 선택된 방 목록 (거실, 안방, 방1, 방2, 방3)
  const [airconRooms, setAirconRooms] = useState<string[]>(() => {
    if (data.systemAirconRooms) return data.systemAirconRooms;
    if (data.systemAircon) {
      // 만약 기존 데이터에 방 정보가 파싱 가능하면 파싱
      const matched = data.otherOptions?.match(/시스템에어콘\(([^)]+)\)/);
      if (matched && matched[1]) {
        return matched[1].split(',').map((s) => s.trim());
      }
      return ['거실', '안방'];
    }
    return [];
  });

  // 선택된 일반 옵션 목록
  const [selectedOptions, setSelectedOptions] = useState<string[]>(() => {
    if (data.optionsList) return data.optionsList;
    const initial: string[] = [];
    if (data.heatExchanger) initial.push('전열교환기');
    if (data.induction) initial.push('인덕션');
    if (data.roomLivingOption?.includes('확장')) initial.push('발코니확장');
    
    // otherOptions 에서 기존 등록 옵션들 추출
    if (data.otherOptions) {
      const parts = data.otherOptions.split(',').map((s) => s.trim());
      parts.forEach((p) => {
        if (!p.startsWith('시스템에어콘') && !initial.includes(p)) {
          initial.push(p);
        }
      });
    }
    return initial;
  });

  // 기타 수동 입력 텍스트
  const [customText, setCustomText] = useState<string>('');

  const updateField = (field: keyof ApartmentData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // 옵션 변경 시 종합하여 부모 상태로 반영
  const syncAllOptions = (rooms: string[], opts: string[], custom: string) => {
    const optionSummaryParts: string[] = [];
    
    if (rooms.length > 0) {
      optionSummaryParts.push(`시스템에어콘(${rooms.join(', ')})`);
    }

    opts.forEach((o) => {
      if (!optionSummaryParts.includes(o)) {
        optionSummaryParts.push(o);
      }
    });

    if (custom.trim()) {
      optionSummaryParts.push(custom.trim());
    }

    const compiledOtherOptions = optionSummaryParts.join(', ');

    onChange({
      ...data,
      systemAircon: rooms.length > 0,
      systemAirconRooms: rooms,
      heatExchanger: opts.includes('전열교환기'),
      induction: opts.includes('인덕션') || opts.includes('하이라이트'),
      roomLivingOption: opts.includes('발코니확장') ? '발코니확장' : data.roomLivingOption,
      optionsList: opts,
      otherOptions: compiledOtherOptions || undefined,
    });
  };

  // 에어컨 특정 방 토글
  const toggleAirconRoom = (room: string) => {
    const nextRooms = airconRooms.includes(room)
      ? airconRooms.filter((r) => r !== room)
      : [...airconRooms, room];
    setAirconRooms(nextRooms);
    syncAllOptions(nextRooms, selectedOptions, customText);
  };

  // 에어컨 전체 방 선택 / 해제 토글
  const toggleAllAirconRooms = () => {
    const nextRooms = airconRooms.length === APARTMENT_AIRCON_ROOMS.length
      ? []
      : [...APARTMENT_AIRCON_ROOMS];
    setAirconRooms(nextRooms);
    syncAllOptions(nextRooms, selectedOptions, customText);
  };

  // 일반 옵션 항목 토글
  const toggleOption = (item: string) => {
    const nextOpts = selectedOptions.includes(item)
      ? selectedOptions.filter((o) => o !== item)
      : [...selectedOptions, item];
    setSelectedOptions(nextOpts);
    syncAllOptions(airconRooms, nextOpts, customText);
  };

  // 전체 옵션 해제
  const handleResetAllOptions = () => {
    setAirconRooms([]);
    setSelectedOptions([]);
    setCustomText('');
    syncAllOptions([], [], '');
  };

  // 기타 직접 입력 추가
  const handleAddCustom = () => {
    if (!customText.trim()) return;
    const item = customText.trim();
    if (!selectedOptions.includes(item)) {
      const nextOpts = [...selectedOptions, item];
      setSelectedOptions(nextOpts);
      setCustomText('');
      syncAllOptions(airconRooms, nextOpts, '');
    }
  };

  const totalSelectedCount = airconRooms.length + selectedOptions.length;

  return (
    <div className="space-y-5 bg-slate-50/80 p-4 sm:p-5 rounded-xl border border-slate-200">
      
      {/* 1. 단지 기본 정보 */}
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          단지 및 동호수 정보
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">단지명 *</label>
            <input
              type="text"
              value={data.complexName || ''}
              onChange={(e) => updateField('complexName', e.target.value)}
              placeholder="예: 래미안 대치팰리스"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">동</label>
            <input
              type="text"
              value={data.buildingNo || ''}
              onChange={(e) => updateField('buildingNo', e.target.value)}
              placeholder="예: 104동"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">호수</label>
            <input
              type="text"
              value={data.unitNo || ''}
              onChange={(e) => updateField('unitNo', e.target.value)}
              placeholder="예: 1204호"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* 2. 면적 및 스펙 */}
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
          면적 및 구조 스펙
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">공급면적 (㎡)</label>
            <input
              type="number"
              step="0.01"
              value={data.supplyArea || ''}
              onChange={(e) => updateField('supplyArea', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="예: 112.4"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">평타입</label>
            <input
              type="text"
              value={data.pyeongType || ''}
              onChange={(e) => updateField('pyeongType', e.target.value)}
              placeholder="예: 34평형 A타입"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">전용면적 (㎡)</label>
            <input
              type="number"
              step="0.01"
              value={data.exclusiveArea || ''}
              onChange={(e) => updateField('exclusiveArea', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="예: 84.9"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">방수 / 욕실수</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={data.roomCount || ''}
                onChange={(e) => updateField('roomCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="방 3"
                className="w-1/2 text-xs px-2 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <input
                type="number"
                value={data.bathroomCount || ''}
                onChange={(e) => updateField('bathroomCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="욕실 2"
                className="w-1/2 text-xs px-2 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. 비용 및 설비 */}
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          관리비 및 공용 설비
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">관리비 (만원/월)</label>
            <input
              type="number"
              value={data.maintenanceFee || ''}
              onChange={(e) => updateField('maintenanceFee', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="예: 25"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">난방방식</label>
            <select
              value={data.heatingType || '도시가스(개별난방)'}
              onChange={(e) => updateField('heatingType', e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="도시가스(개별난방)">도시가스 (개별난방)</option>
              <option value="지역난방(열병합)">지역난방 (열병합)</option>
              <option value="중앙난방">중앙난방</option>
              <option value="LPG">LPG</option>
              <option value="심야전기">심야전기</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">엘리베이터 수</label>
            <input
              type="number"
              value={data.elevatorCount || ''}
              onChange={(e) => updateField('elevatorCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
              placeholder="예: 2"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. 아파트 맞춤 옵션 선택 (사용자 요청 항목 전체 반영) */}
      {/* ======================================================== */}
      <div className="pt-2 border-t border-slate-200">
        
        {/* 옵션 헤더 & 현황 카운트 */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              아파트 세부 설치 옵션 (체크리스트)
            </h4>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full">
              {totalSelectedCount}개 선택됨
            </span>
          </div>

          {totalSelectedCount > 0 && (
            <button
              type="button"
              onClick={handleResetAllOptions}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>선택 초기화</span>
            </button>
          )}
        </div>

        {/* 4-1. 시스템에어콘 (방별 개별 다중 선택) */}
        <div className="mb-4 p-3.5 bg-white rounded-xl border border-blue-200/90 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-blue-50 text-blue-600">
                <Wind className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900">시스템에어콘</span>
              <span className="text-[11px] text-slate-500">설치된 방/위치를 선택하세요</span>
            </div>

            <button
              type="button"
              onClick={toggleAllAirconRooms}
              className="text-[11px] px-2 py-1 rounded font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              {airconRooms.length === APARTMENT_AIRCON_ROOMS.length ? '전체 해제' : '에어컨 전실 전체선택'}
            </button>
          </div>

          {/* 에어컨 위치 칩 버튼들: 안방, 거실, 방1, 방2, 방3 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {APARTMENT_AIRCON_ROOMS.map((room) => {
              const isSelected = airconRooms.includes(room);
              return (
                <button
                  key={room}
                  type="button"
                  onClick={() => toggleAirconRoom(room)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{room}</span>
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4-2. 카테고리별 맞춤 옵션 목록 (총 23개 옵션) */}
        <div className="space-y-3.5">
          {APARTMENT_OPTION_CATEGORIES.map((group) => (
            <div key={group.category} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                {group.category}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {group.items.map((item) => {
                  const isChecked = selectedOptions.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleOption(item)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition-all ${
                        isChecked
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-semibold'
                          : 'bg-slate-50/70 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{item}</span>
                      {isChecked ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 ml-1"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 4-3. 기타 직접 입력 필드 */}
        <div className="mt-3.5 p-3 bg-slate-100/70 rounded-xl border border-slate-200">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            기타 특이 옵션 직접 추가 입력
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
              placeholder="예: 음식물 분쇄기, 스마트 홈월패드, 탄성코트 시공 등"
              className="flex-1 text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              className="inline-flex items-center gap-1 px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>추가</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
