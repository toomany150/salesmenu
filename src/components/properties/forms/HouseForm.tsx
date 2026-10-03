'use client';

import React, { useState, useEffect } from 'react';
import { 
  HouseData, 
  HOUSE_AIRCON_TYPES, 
  HOUSE_AIRCON_ROOMS, 
  HOUSE_OPTION_CATEGORIES 
} from '@/lib/types';
import { 
  Wind, 
  Sparkles, 
  CookingPot, 
  DoorClosed, 
  Check, 
  Plus, 
  RotateCcw,
  CheckCircle2,
  Zap
} from 'lucide-react';

interface HouseFormProps {
  data: Partial<HouseData>;
  onChange: (updated: Partial<HouseData>) => void;
}

export const HouseForm: React.FC<HouseFormProps> = ({ data, onChange }) => {
  // 1. 에어컨 상태 (종류 및 설치 위치)
  const [airconType, setAirconType] = useState<string>(() => {
    if (data.airconType) return data.airconType;
    if (data.options?.includes('시스템에어컨')) return '시스템에어컨';
    if (data.options?.includes('벽걸이에어컨')) return '벽걸이에어컨';
    if (data.options?.includes('스탠드에어컨')) return '스탠드에어컨';
    if (data.options?.includes('투인원')) return '투인원(2in1)';
    if (data.options?.includes('에어컨')) return '벽걸이에어컨';
    return '';
  });

  const [airconRooms, setAirconRooms] = useState<string[]>(() => {
    if (data.airconRooms && data.airconRooms.length > 0) return data.airconRooms;
    if (data.options) {
      const matched = data.options.match(/에어컨\(([^)]+)\)/);
      if (matched && matched[1]) {
        return matched[1].split(',').map((s) => s.trim());
      }
    }
    return [];
  });

  // 2. 카테고리별 선택된 옵션 목록
  const [selectedOptions, setSelectedOptions] = useState<string[]>(() => {
    if (data.optionsList && data.optionsList.length > 0) return data.optionsList;
    if (data.options) {
      const parts = data.options.split(',').map((s) => s.trim());
      return parts.filter((p) => p && !p.startsWith('에어컨') && !p.includes('에어컨('));
    }
    return [];
  });

  // 3. 기타 수동 직접 추가 텍스트
  const [customText, setCustomText] = useState<string>('');

  const updateField = (field: keyof HouseData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // 종합 옵션 동기화 함수
  const syncOptions = (type: string, rooms: string[], opts: string[], custom: string) => {
    const optionSummaryParts: string[] = [];

    // 에어컨 요약
    if (type) {
      if (rooms.length > 0) {
        optionSummaryParts.push(`에어컨(${type}: ${rooms.join(', ')})`);
      } else {
        optionSummaryParts.push(`에어컨(${type})`);
      }
    } else if (rooms.length > 0) {
      optionSummaryParts.push(`에어컨(${rooms.join(', ')})`);
    }

    // 일반 옵션들
    opts.forEach((o) => {
      if (!optionSummaryParts.includes(o)) {
        optionSummaryParts.push(o);
      }
    });

    // 커스텀 옵션
    if (custom.trim() && !optionSummaryParts.includes(custom.trim())) {
      optionSummaryParts.push(custom.trim());
    }

    const compiledOptions = optionSummaryParts.join(', ');

    onChange({
      ...data,
      options: compiledOptions || undefined,
      optionsList: opts,
      airconType: type || undefined,
      airconRooms: rooms,
    });
  };

  // 에어컨 종류 토글
  const toggleAirconType = (type: string) => {
    const nextType = airconType === type ? '' : type;
    setAirconType(nextType);
    syncOptions(nextType, airconRooms, selectedOptions, customText);
  };

  // 에어컨 위치 토글
  const toggleAirconRoom = (room: string) => {
    const nextRooms = airconRooms.includes(room)
      ? airconRooms.filter((r) => r !== room)
      : [...airconRooms, room];
    setAirconRooms(nextRooms);
    syncOptions(airconType || '벽걸이에어컨', nextRooms, selectedOptions, customText);
    if (!airconType) setAirconType('벽걸이에어컨');
  };

  // 에어컨 전체 위치 선택 토글
  const toggleAllAirconRooms = () => {
    const nextRooms = airconRooms.length === HOUSE_AIRCON_ROOMS.length
      ? []
      : [...HOUSE_AIRCON_ROOMS];
    setAirconRooms(nextRooms);
    const nextType = airconType || '벽걸이에어컨';
    if (!airconType && nextRooms.length > 0) setAirconType(nextType);
    syncOptions(nextRooms.length > 0 ? nextType : airconType, nextRooms, selectedOptions, customText);
  };

  // 옵션 항목 토글
  const toggleOption = (item: string) => {
    const nextOpts = selectedOptions.includes(item)
      ? selectedOptions.filter((o) => o !== item)
      : [...selectedOptions, item];
    setSelectedOptions(nextOpts);
    syncOptions(airconType, airconRooms, nextOpts, customText);
  };

  // 원룸 풀옵션 프리셋 원클릭 적용
  const handleApplyStudioPreset = () => {
    const studioPresetOpts = [
      '냉장고',
      '세탁기',
      '인덕션',
      '전자레인지',
      '도어락(디지털키)',
      '붙박이장',
      '침대',
      '신발장',
    ];
    setAirconType('벽걸이에어컨');
    setAirconRooms(['원룸/전실']);
    setSelectedOptions(studioPresetOpts);
    syncOptions('벽걸이에어컨', ['원룸/전실'], studioPresetOpts, customText);
  };

  // 투룸/빌라 풀옵션 프리셋
  const handleApplyTwoRoomPreset = () => {
    const twoRoomPresetOpts = [
      '냉장고',
      '세탁기',
      '인덕션',
      '전자레인지',
      '도어락(디지털키)',
      '붙박이장',
      '신발장',
      '중문',
      '엘리베이터',
      'CCTV/보안현관',
    ];
    setAirconType('투인원(2in1)');
    setAirconRooms(['거실', '안방']);
    setSelectedOptions(twoRoomPresetOpts);
    syncOptions('투인원(2in1)', ['거실', '안방'], twoRoomPresetOpts, customText);
  };

  // 옵션 전체 초기화
  const handleResetAllOptions = () => {
    setAirconType('');
    setAirconRooms([]);
    setSelectedOptions([]);
    setCustomText('');
    syncOptions('', [], [], '');
  };

  // 커스텀 옵션 추가
  const handleAddCustom = () => {
    if (!customText.trim()) return;
    const item = customText.trim();
    if (!selectedOptions.includes(item)) {
      const nextOpts = [...selectedOptions, item];
      setSelectedOptions(nextOpts);
      setCustomText('');
      syncOptions(airconType, airconRooms, nextOpts, '');
    }
  };

  const totalSelectedCount = (airconType ? 1 : 0) + airconRooms.length + selectedOptions.length;

  return (
    <div className="space-y-5 bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200">
      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        주택 세부 스펙 입력 (단독/다가구/다세대/빌라/원룸)
      </h4>

      {/* 1. 건축 개요 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">총층수</label>
          <input
            type="number"
            value={data.totalFloors || ''}
            onChange={(e) => updateField('totalFloors', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="예: 3층"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">해당층수</label>
          <input
            type="text"
            value={data.currentFloor || ''}
            onChange={(e) => updateField('currentFloor', e.target.value)}
            placeholder="예: 2층 / 반지하 / 옥탑"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">대지면적 (㎡)</label>
          <input
            type="number"
            step="0.01"
            value={data.landArea || ''}
            onChange={(e) => updateField('landArea', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="예: 230.5"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">연면적 (㎡)</label>
          <input
            type="number"
            step="0.01"
            value={data.totalFloorArea || ''}
            onChange={(e) => updateField('totalFloorArea', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="예: 350.2"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">건축면적 (㎡)</label>
          <input
            type="number"
            step="0.01"
            value={data.buildingArea || ''}
            onChange={(e) => updateField('buildingArea', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="예: 116.56"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">대장상 주용도</label>
          <input
            type="text"
            value={data.buildingUse || ''}
            onChange={(e) => updateField('buildingUse', e.target.value)}
            placeholder="예: 다가구주택, 근린생활시설"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">지역 (용도지역)</label>
          <input
            type="text"
            value={data.zoningArea || ''}
            onChange={(e) => updateField('zoningArea', e.target.value)}
            placeholder="예: 2종일반주거지역"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">주구조</label>
          <input
            type="text"
            value={data.structure || ''}
            onChange={(e) => updateField('structure', e.target.value)}
            placeholder="예: 철근콘크리트조, 벽돌조"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">사용승인일</label>
          <input
            type="date"
            value={data.approvalDate ? data.approvalDate.substring(0, 10) : ''}
            onChange={(e) => updateField('approvalDate', e.target.value)}
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* 2. 내부 스펙 & 임대현황 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">방수</label>
          <input
            type="number"
            value={data.roomCount || ''}
            onChange={(e) => updateField('roomCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="원룸: 1, 투룸: 2"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">욕실수</label>
          <input
            type="number"
            value={data.bathroomCount || ''}
            onChange={(e) => updateField('bathroomCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="욕실 수"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">가능주차대수</label>
          <input
            type="number"
            value={data.parkingCount || ''}
            onChange={(e) => updateField('parkingCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="예: 1대 / 불가"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">난방방식</label>
          <input
            type="text"
            value={data.heatingType || ''}
            onChange={(e) => updateField('heatingType', e.target.value)}
            placeholder="도시가스 개별난방 등"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">현재 임대현황 (다가구/원룸 등)</label>
        <input
          type="text"
          value={data.currentLeaseStatus || ''}
          onChange={(e) => updateField('currentLeaseStatus', e.target.value)}
          placeholder="예: 101호 보증금 500/45(즉시입주), 201호 전세 1.2억"
          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
        />
      </div>

      {/* 3. 관리비 분리 입력 */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">관리비 내역 (만원/월)</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input
            type="number"
            value={data.maintenanceFeeCommon || ''}
            onChange={(e) => updateField('maintenanceFeeCommon', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="공용 관리비"
            className="text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
          <input
            type="number"
            value={data.maintenanceFeeWater || ''}
            onChange={(e) => updateField('maintenanceFeeWater', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="수도요금"
            className="text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
          <input
            type="number"
            value={data.maintenanceFeeElectricity || ''}
            onChange={(e) => updateField('maintenanceFeeElectricity', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="전기요금"
            className="text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
          <input
            type="number"
            value={data.maintenanceFeeGas || ''}
            onChange={(e) => updateField('maintenanceFeeGas', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="가스요금"
            className="text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. 주택/원룸/빌라 맞춤 옵션 (사용자 요청 3번 전체 반영) */}
      {/* ======================================================== */}
      <div className="pt-3 border-t border-slate-200">
        
        {/* 옵션 헤더 & 원터치 프리셋 버튼 */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              주택 / 원룸 풀옵션 체크리스트
            </h4>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">
              {totalSelectedCount}개 선택됨
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleApplyStudioPreset}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-colors shadow-2xs"
            >
              <Zap className="w-3 h-3 text-emerald-700" />
              <span>⚡ 원룸 풀옵션 프리셋</span>
            </button>
            <button
              type="button"
              onClick={handleApplyTwoRoomPreset}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md font-bold text-blue-800 bg-blue-100 hover:bg-blue-200 transition-colors shadow-2xs"
            >
              <Zap className="w-3 h-3 text-blue-700" />
              <span>⚡ 투룸/빌라 프리셋</span>
            </button>
            {totalSelectedCount > 0 && (
              <button
                type="button"
                onClick={handleResetAllOptions}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 transition-colors ml-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>초기화</span>
              </button>
            )}
          </div>
        </div>

        {/* 4-1. 에어콘 옵션 (종류 + 설치 위치 칩) */}
        <div className="mb-3.5 p-3.5 bg-white rounded-xl border border-emerald-200/90 shadow-2xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                <Wind className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900">에어컨 옵션</span>
              <span className="text-[11px] text-slate-500">방식 및 설치된 방을 선택하세요</span>
            </div>

            <button
              type="button"
              onClick={toggleAllAirconRooms}
              className="text-[11px] px-2 py-1 rounded font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              {airconRooms.length === HOUSE_AIRCON_ROOMS.length ? '전체 해제' : '에어컨 전실 전체선택'}
            </button>
          </div>

          {/* 에어컨 종류 칩 */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">에어컨 종류</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {HOUSE_AIRCON_TYPES.map((type) => {
                const isSelected = airconType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleAirconType(type)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{type}</span>
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

          {/* 에어컨 위치 칩 */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">설치 위치</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {HOUSE_AIRCON_ROOMS.map((room) => {
                const isSelected = airconRooms.includes(room);
                return (
                  <button
                    key={room}
                    type="button"
                    onClick={() => toggleAirconRoom(room)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-400 font-bold'
                        : 'bg-slate-50/70 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{room}</span>
                    {isSelected ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-slate-300"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4-2. 주방가전/빌트인, 수납/가구/현관, 기타특이옵션 카테고리 칩 목록 */}
        <div className="space-y-3">
          {HOUSE_OPTION_CATEGORIES.map((group) => (
            <div key={group.category} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
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

        {/* 4-3. 기타 특이 옵션 직접 추가 입력창 */}
        <div className="mt-3 p-3 bg-slate-100/70 rounded-xl border border-slate-200">
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
              placeholder="예: 옥상 바베큐장, 스타일러, 빔프로젝터, 개인창고 등"
              className="flex-1 text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
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
