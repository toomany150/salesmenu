'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  HouseData, 
  StoreLeaseUnitItem,
  PublicBuildingLedgerResult,
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
  Zap,
  Building2,
  Trash2,
  Home
} from 'lucide-react';

interface HouseFormProps {
  data: Partial<HouseData>;
  onChange: (updated: Partial<HouseData>) => void;
  transactionType?: string;
  ledgerData?: PublicBuildingLedgerResult | null;
}

export const HouseForm: React.FC<HouseFormProps> = ({ data, onChange, transactionType, ledgerData }) => {
  // 매매 시 층별/호수별 임대차 현황 리스트 (상가주택/다가구 매매 지원)
  const leaseList: StoreLeaseUnitItem[] = data.leaseStatusList || [];

  const updateLeaseItem = (index: number, updatedItem: Partial<StoreLeaseUnitItem>) => {
    const nextList = [...leaseList];
    nextList[index] = { ...nextList[index], ...updatedItem };
    
    // 텍스트 요약도 자동 생성하여 currentLeaseStatus에 동기화
    const summary = nextList
      .map((item) => `${item.floorHo}${item.tenantName ? `(${item.tenantName})` : ''}: ${item.isVacant ? '공실' : `보${item.deposit || 0}/월${item.monthlyRent || 0}`}`)
      .join(', ');

    onChange({ 
      ...data, 
      leaseStatusList: nextList,
      currentLeaseStatus: summary || data.currentLeaseStatus,
    });
  };

  const addLeaseItem = (floorHoDefault = '', insertAfterIndex?: number) => {
    const newItem: StoreLeaseUnitItem = {
      id: `lease-h-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      floorHo: floorHoDefault || `${leaseList.length + 1}층`,
      tenantName: '',
      contractStartDate: '',
      evictionPossible: '명도 가능',
      deposit: undefined,
      monthlyRent: undefined,
      isVacant: false,
    };
    if (insertAfterIndex !== undefined && insertAfterIndex >= 0) {
      const nextList = [...leaseList];
      nextList.splice(insertAfterIndex + 1, 0, newItem);
      onChange({ ...data, leaseStatusList: nextList });
    } else {
      onChange({ ...data, leaseStatusList: [...leaseList, newItem] });
    }
  };

  // 1층에 여러 점포(임대인)를 넣을 수 있는 전용 추가 버튼 핸들러
  const handleAddFirstFloorUnit = () => {
    const firstFloorItems = leaseList.filter((item) => 
      item.floorHo.includes('1층') || /^10\d/.test(item.floorHo) || item.floorHo.startsWith('1-')
    );
    const count = firstFloorItems.length + 1;
    const defaultName = count === 1 ? '1층 1호' : `1층 ${count}호 점포`;
    
    let insertIdx = -1;
    for (let i = leaseList.length - 1; i >= 0; i--) {
      if (leaseList[i].floorHo.includes('1층') || /^10\d/.test(leaseList[i].floorHo) || leaseList[i].floorHo.startsWith('1-')) {
        insertIdx = i;
        break;
      }
    }
    
    const newItem: StoreLeaseUnitItem = {
      id: `lease-h-1f-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      floorHo: defaultName,
      tenantName: '',
      contractStartDate: '',
      evictionPossible: '명도 가능',
      deposit: undefined,
      monthlyRent: undefined,
      isVacant: false,
    };

    if (insertIdx >= 0) {
      const next = [...leaseList];
      next.splice(insertIdx + 1, 0, newItem);
      onChange({ ...data, leaseStatusList: next });
    } else {
      onChange({ ...data, leaseStatusList: [newItem, ...leaseList] });
    }
  };

  // 특정 행과 같은 층 점포/호실을 바로 아래에 추가하는 핸들러
  const handleAddSameFloorUnit = (index: number) => {
    const current = leaseList[index];
    const floorText = current.floorHo.trim();
    const match = floorText.match(/^(지하\s*\d+층|\d+층|옥탑\d*층?|\S+층|\S+호)/);
    const prefix = match ? match[0] : floorText;
    
    const sameCount = leaseList.filter((item) => item.floorHo.includes(prefix)).length + 1;
    const defaultName = `${prefix} 점포 ${sameCount}`;

    const newItem: StoreLeaseUnitItem = {
      id: `lease-h-same-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      floorHo: defaultName,
      tenantName: '',
      contractStartDate: '',
      evictionPossible: current.evictionPossible || '명도 가능',
      deposit: undefined,
      monthlyRent: undefined,
      isVacant: false,
    };

    const next = [...leaseList];
    next.splice(index + 1, 0, newItem);
    onChange({ ...data, leaseStatusList: next });
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

  // 건축물대장 층별/호수 정보로부터 자동 생성 (선택된 건물/층이 있으면 해당 데이터만 반영)
  const handleLoadFromLedger = () => {
    if (!ledgerData) return;
    const generated: StoreLeaseUnitItem[] = [];

    const prevList = (data.leaseStatusList || []) as StoreLeaseUnitItem[];
    const prevMap = new Map<string, StoreLeaseUnitItem>();
    prevList.forEach((it) => {
      if (it.floorHo) prevMap.set(it.floorHo.trim(), it);
    });

    const targetDong = ledgerData.selectedDong;
    if (ledgerData.unitList && ledgerData.unitList.length > 0) {
      // 선택된 동이 있다면 해당 동의 호수만 불러옴
      const filteredUnits = targetDong
        ? ledgerData.unitList.filter((u: any) => u.dong && (u.dong === targetDong || u.dong.replace(/동$/, '') === targetDong.replace(/동$/, '')))
        : ledgerData.unitList;

      filteredUnits.forEach((u: any, idx: number) => {
        const floorHoName = `${u.dong ? u.dong + ' ' : ''}${u.ho || u.floor || (idx + 1) + '호'}`;
        const existing = prevMap.get(floorHoName);
        generated.push({
          id: existing?.id || `ledger-h-unit-${idx}-${Date.now()}`,
          floorHo: floorHoName,
          tenantName: existing?.tenantName || u.owner || '',
          contractStartDate: existing?.contractStartDate || '',
          evictionPossible: existing?.evictionPossible || '명도 가능',
          deposit: existing?.deposit,
          monthlyRent: existing?.monthlyRent,
          isVacant: existing?.isVacant || false,
        });
      });
    } else if ((ledgerData.selectedFloors && ledgerData.selectedFloors.length > 0) || (ledgerData.floorList && ledgerData.floorList.length > 0)) {
      // 사용자가 층별개요에서 특정 건물이나 층들을 선택한 경우, 전체가 아닌 선택된 건물/층만 불러옴!
      const targetFloors = (ledgerData.selectedFloors && ledgerData.selectedFloors.length > 0)
        ? ledgerData.selectedFloors
        : (targetDong && ledgerData.floorList
            ? ledgerData.floorList.filter((f: any) => f.dong === targetDong)
            : ledgerData.floorList || []);

      targetFloors.forEach((f: any, idx: number) => {
        const floorHoName = `${f.floor} (${f.mainUse || f.etcUse || '주택/점포'})`;
        const existing = prevMap.get(floorHoName);
        generated.push({
          id: existing?.id || `ledger-h-floor-${idx}-${Date.now()}`,
          floorHo: floorHoName,
          tenantName: existing?.tenantName || '',
          contractStartDate: existing?.contractStartDate || '',
          evictionPossible: existing?.evictionPossible || '명도 가능',
          deposit: existing?.deposit,
          monthlyRent: existing?.monthlyRent,
          isVacant: existing?.isVacant || false,
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

  // data props 변경 시 (수정 모달 로드 등) 내부 옵션 상태 자동 동기화
  useEffect(() => {
    let nextAirconType = '';
    if (data.airconType) {
      nextAirconType = data.airconType;
    } else if (data.options?.includes('시스템에어컨')) {
      nextAirconType = '시스템에어컨';
    } else if (data.options?.includes('벽걸이에어컨')) {
      nextAirconType = '벽걸이에어컨';
    } else if (data.options?.includes('스탠드에어컨')) {
      nextAirconType = '스탠드에어컨';
    } else if (data.options?.includes('투인원')) {
      nextAirconType = '투인원(2in1)';
    } else if (data.options?.includes('에어컨')) {
      nextAirconType = '벽걸이에어컨';
    }
    setAirconType(nextAirconType);

    let nextRooms: string[] = [];
    if (data.airconRooms && data.airconRooms.length > 0) {
      nextRooms = data.airconRooms;
    } else if (data.options) {
      const matched = data.options.match(/에어컨\(([^)]+)\)/);
      if (matched && matched[1]) {
        nextRooms = matched[1].split(',').map((s) => s.trim());
      }
    }
    setAirconRooms(nextRooms);

    let nextOpts: string[] = [];
    if (data.optionsList && data.optionsList.length > 0) {
      nextOpts = data.optionsList;
    } else if (data.options) {
      const parts = data.options.split(',').map((s) => s.trim());
      nextOpts = parts.filter((p) => p && !p.startsWith('에어컨') && !p.includes('에어컨('));
    }
    setSelectedOptions(nextOpts);
  }, [data.options, data.optionsList, data.airconType, data.airconRooms]);

  const updateField = (field: keyof HouseData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // 대장상면적(㎡) 변경 시 평수 자동 계산
  const handleBuildingAreaSqm = (val: string) => {
    if (!val) {
      onChange({ ...data, buildingArea: undefined, buildingAreaPyeong: undefined });
      return;
    }
    const sqm = parseFloat(val);
    const py = +(sqm * 0.3025).toFixed(2);
    onChange({ 
      ...data, 
      buildingArea: sqm, 
      buildingAreaPyeong: py,
      actualArea: data.actualArea !== undefined ? data.actualArea : sqm,
      actualAreaPyeong: data.actualAreaPyeong !== undefined ? data.actualAreaPyeong : py,
    });
  };

  const handleBuildingAreaPyeong = (val: string) => {
    if (!val) {
      onChange({ ...data, buildingAreaPyeong: undefined });
      return;
    }
    const py = parseFloat(val);
    const sqm = +(py / 0.3025).toFixed(2);
    onChange({ ...data, buildingArea: sqm, buildingAreaPyeong: py });
  };

  // 실평수(전용㎡) 변경 시 평수 자동 계산
  const handleActualAreaSqm = (val: string) => {
    if (!val) {
      onChange({ ...data, actualArea: undefined, actualAreaPyeong: undefined });
      return;
    }
    const sqm = parseFloat(val);
    const py = +(sqm * 0.3025).toFixed(2);
    onChange({ ...data, actualArea: sqm, actualAreaPyeong: py });
  };

  const handleActualAreaPyeong = (val: string) => {
    if (!val) {
      onChange({ ...data, actualAreaPyeong: undefined });
      return;
    }
    const py = parseFloat(val);
    const sqm = +(py / 0.3025).toFixed(2);
    onChange({ ...data, actualArea: sqm, actualAreaPyeong: py });
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

      {/* 대장상면적(㎡) -> 대장상면적(평) -> 실평수(전용㎡)* -> 실평수(평) -> 대장상주용도 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
            placeholder="예: 78.2"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
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
            value={data.buildingAreaPyeong !== undefined && data.buildingAreaPyeong !== null ? data.buildingAreaPyeong : (data.buildingArea ? +(data.buildingArea * 0.3025).toFixed(2) : '')}
            onChange={(e) => handleBuildingAreaPyeong(e.target.value)}
            placeholder="예: 23.6"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700"
          />
        </div>

        {/* 3. 실평수 (전용 ㎡) * */}
        <div>
          <label className="block text-xs font-bold text-emerald-900 mb-1 flex items-center justify-between">
            <span>실평수 (전용 ㎡) *</span>
            <span className="text-[10px] text-emerald-600 font-normal">수정가능</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={data.actualArea !== undefined && data.actualArea !== null ? data.actualArea : (data.buildingArea || '')}
            onChange={(e) => handleActualAreaSqm(e.target.value)}
            placeholder="예: 59.84"
            className="w-full text-xs px-3 py-2 bg-emerald-50/80 border-2 border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 font-extrabold text-emerald-950"
          />
        </div>

        {/* 4. 실평수 (평) */}
        <div>
          <label className="block text-xs font-bold text-emerald-900 mb-1">
            실평수 (평)
          </label>
          <input
            type="number"
            step="0.01"
            value={data.actualAreaPyeong !== undefined && data.actualAreaPyeong !== null ? data.actualAreaPyeong : (data.actualArea ? +(data.actualArea * 0.3025).toFixed(2) : '')}
            onChange={(e) => handleActualAreaPyeong(e.target.value)}
            placeholder="예: 18.1"
            className="w-full text-xs px-3 py-2 bg-emerald-50/40 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-900"
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
            placeholder="예: 다세대주택, 다가구주택"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
          />
        </div>
      </div>

      {/* 지역 / 주구조 / 사용승인일 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            value={data.roomCount !== undefined && data.roomCount !== null ? data.roomCount : ''}
            onChange={(e) => updateField('roomCount', e.target.value !== '' ? parseInt(e.target.value, 10) : undefined)}
            placeholder="원룸: 1, 투룸: 2"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">욕실수</label>
          <input
            type="number"
            value={data.bathroomCount !== undefined && data.bathroomCount !== null ? data.bathroomCount : ''}
            onChange={(e) => updateField('bathroomCount', e.target.value !== '' ? parseInt(e.target.value, 10) : undefined)}
            placeholder="욕실 수"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">가능주차대수</label>
          <input
            type="number"
            value={data.parkingCount !== undefined && data.parkingCount !== null ? data.parkingCount : ''}
            onChange={(e) => updateField('parkingCount', e.target.value !== '' ? parseInt(e.target.value, 10) : undefined)}
            placeholder="예: 0 (불가) 또는 주차대수"
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

      {/* 2-1. 매매 시 또는 다가구/상가주택용: 층별·호수별 임대차 및 점포 현황 */}
      <div className="bg-white rounded-2xl border-2 border-emerald-200/90 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 px-4 py-3.5 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                <span>층별·호수별 임대차 및 점포 현황</span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-300">
                  다가구·상가주택·원룸 매매
                </span>
              </h4>
              <span className="text-xs text-emerald-800">
                건축물대장 층별 호수 연동, 1층 다중 점포/세대 분할, 보증금 및 월세, 공실 원클릭 관리
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {ledgerData && (
              <button
                type="button"
                onClick={handleLoadFromLedger}
                title="건축물대장의 층별개요 또는 호실 목록을 불러와 자동으로 채웁니다"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>대장 층/호수 불러오기</span>
              </button>
            )}
            {/* [사용자 요청]: 1층에 여러 점포/임대인을 넣을 수 있는 전용 버튼 */}
            <button
              type="button"
              onClick={handleAddFirstFloorUnit}
              title="1층에 여러 점포나 임대인이 입점한 경우 클릭하여 1층 호실을 추가합니다"
              className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-2xs flex items-center gap-1 transition-all cursor-pointer ring-1 ring-teal-400"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>🏢 + 1층 점포(임대인) 추가</span>
            </button>
            <button
              type="button"
              onClick={() => addLeaseItem()}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-bold shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>일반 호실 추가</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {leaseList.length === 0 ? (
            <div className="p-5 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">등록된 층별·호수별 임대차 내역이 없습니다.</p>
              <p className="text-xs text-slate-500">
                상단의 [대장 층/호수 불러오기]를 누르시거나 1층에 여러 점포가 입점한 경우 [+ 1층 점포(임대인) 추가]를 눌러주세요.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                {ledgerData && (
                  <button
                    type="button"
                    onClick={handleLoadFromLedger}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>🏛️ 건축물대장 층별 목록 일괄 불러오기</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddFirstFloorUnit}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold shadow-xs hover:bg-teal-700 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>🏢 + 1층 점포(임대인) 추가</span>
                </button>
                <button
                  type="button"
                  onClick={() => addLeaseItem('1층')}
                  className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-50 cursor-pointer"
                >
                  + 첫 호실 직접 입력하기
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                      <th className="py-2.5 px-3 min-w-[110px]">층 · 구획 *</th>
                      <th className="py-2.5 px-3 min-w-[120px]">상호 / 세입자(임차인)</th>
                      <th className="py-2.5 px-3 min-w-[115px]">계약 시작일</th>
                      <th className="py-2.5 px-3 min-w-[110px]">명도 가능 여부</th>
                      <th className="py-2.5 px-3 min-w-[105px]">임차보증금 (만원)</th>
                      <th className="py-2.5 px-3 min-w-[95px]">월세 (만원)</th>
                      <th className="py-2.5 px-2 text-center min-w-[70px]">공실 상태</th>
                      <th className="py-2.5 px-2 text-center min-w-[80px]">같은 층 추가</th>
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
                            placeholder="예: 1층 1호 점포"
                            className="w-full text-xs font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-900"
                          />
                        </td>

                        {/* 2. 상호 / 세입자명 */}
                        <td className="py-2 px-2.5">
                          <input
                            type="text"
                            value={item.tenantName || ''}
                            onChange={(e) => updateLeaseItem(idx, { tenantName: e.target.value })}
                            placeholder="예: CU편의점, 세탁소, 김철수"
                            className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium"
                          />
                        </td>

                        {/* 3. 계약기간 시작일 */}
                        <td className="py-2 px-2.5">
                          <input
                            type="date"
                            value={item.contractStartDate || ''}
                            onChange={(e) => updateLeaseItem(idx, { contractStartDate: e.target.value })}
                            className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-800"
                          />
                        </td>

                        {/* 4. 명도여부 가능 */}
                        <td className="py-2 px-2.5">
                          <select
                            value={item.evictionPossible || '명도 가능'}
                            onChange={(e) => updateLeaseItem(idx, { evictionPossible: e.target.value })}
                            className="w-full text-xs font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 text-slate-800"
                          >
                            <option value="명도 가능">🟢 명도 가능</option>
                            <option value="명도 협의">🟡 명도 협의</option>
                            <option value="만기 퇴거 예정">🔵 만기 퇴거 예정</option>
                            <option value="재계약 승계">⚪ 재계약 승계</option>
                          </select>
                        </td>

                        {/* 5. 임차보증금 (만원) */}
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

                        {/* 6. 월세 (만원) */}
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

                        {/* 7. 공실 버튼 (원클릭 토글) */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleVacant(idx)}
                            title={item.isVacant ? '클릭 시 입주 상태로 전환' : '클릭 시 공실(보증금/월세 0)로 전환'}
                            className={`px-2 py-1 rounded-md text-[11px] font-black transition-all cursor-pointer shadow-2xs ${
                              item.isVacant
                                ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                            }`}
                          >
                            {item.isVacant ? '✓ 공실' : '입주중'}
                          </button>
                        </td>

                        {/* 8. 같은 층 분할 추가 (원클릭) */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleAddSameFloorUnit(idx)}
                            title="이 층에 점포/호실을 하나 더 추가합니다"
                            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                            <span>추가</span>
                          </button>
                        </td>

                        {/* 9. 삭제 */}
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

              {/* 행 추가 버튼 바 */}
              <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleAddFirstFloorUnit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-extrabold transition-colors cursor-pointer border border-teal-300 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-600" />
                    <span>🏢 + 1층 점포(임대인) 추가</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addLeaseItem()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>일반 호실 추가</span>
                  </button>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  💡 1층에 여러 점포나 세대가 있는 경우 <b>[+ 1층 점포 추가]</b> 또는 해당 행의 <b>[추가]</b> 버튼을 누르면 쉽게 여러 곳을 입력할 수 있습니다.
                </span>
              </div>
            </div>
          )}

          {/* 총 보증금 및 월세 합계 카드 */}
          <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 text-white shadow-md">
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
                <div className="text-right">
                  <span className="block text-[11px] font-bold text-slate-400">총 보증금 합계</span>
                  <span className="text-lg sm:text-xl font-black text-amber-300 tracking-tight font-mono">
                    {totalDeposit.toLocaleString()} <span className="text-xs font-bold text-white">만원</span>
                  </span>
                </div>
                <div className="w-[1px] h-8 bg-slate-700"></div>
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

      {/* 종합 임대현황 요약 메모 (직접 수정 가능) */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">현재 임대현황 종합 메모 (자동 연동 또는 직접 수정)</label>
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
