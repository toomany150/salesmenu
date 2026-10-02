'use client';

import React from 'react';
import { OfficeData } from '@/lib/types';

interface OfficeFormProps {
  data: Partial<OfficeData>;
  onChange: (updated: Partial<OfficeData>) => void;
}

export const OfficeForm: React.FC<OfficeFormProps> = ({ data, onChange }) => {
  const updateField = (field: keyof OfficeData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4 bg-blue-50/40 p-4 rounded-xl border border-blue-200">
      <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
        사무실 세부 스펙 및 시설 조건
      </h4>

      {/* 1. 기본 정보 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">상호명/빌딩명</label>
          <input
            type="text"
            value={data.officeName || ''}
            onChange={(e) => updateField('officeName', e.target.value)}
            placeholder="예: 테크스페이스 7층"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">총층수</label>
          <input
            type="number"
            value={data.totalFloors || ''}
            onChange={(e) => updateField('totalFloors', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="예: 12층"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">해당층수</label>
          <input
            type="text"
            value={data.currentFloor || ''}
            onChange={(e) => updateField('currentFloor', e.target.value)}
            placeholder="예: 7층 전체"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* 2. 면적 및 스펙 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">실평수 (㎡)</label>
          <input
            type="number"
            step="0.01"
            value={data.actualArea || ''}
            onChange={(e) => updateField('actualArea', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="예: 185.0"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">룸 수 (구획/회의실)</label>
          <input
            type="number"
            value={data.roomCount || ''}
            onChange={(e) => updateField('roomCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="예: 4개"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">화장실 수</label>
          <input
            type="number"
            value={data.bathroomCount || ''}
            onChange={(e) => updateField('bathroomCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="예: 2개 (내부/공용)"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">배정 주차대수</label>
          <input
            type="number"
            value={data.parkingCount || ''}
            onChange={(e) => updateField('parkingCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="예: 무료 2대"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* 3. 금액 조건 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-blue-200">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">관리비 (만원)</label>
          <input
            type="number"
            value={data.maintenanceFee || ''}
            onChange={(e) => updateField('maintenanceFee', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="예: 80"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">건물내 총사무실수</label>
          <input
            type="number"
            value={data.totalOfficeCount || ''}
            onChange={(e) => updateField('totalOfficeCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="예: 15실"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
        <div className="flex flex-col justify-center">
          <label className="flex items-center gap-2 cursor-pointer mt-3">
            <input
              type="checkbox"
              checked={!!data.monthlyRentVat}
              onChange={(e) => updateField('monthlyRentVat', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-sm"
            />
            <span className="text-xs font-medium text-slate-700">월세 부가세 별도</span>
          </label>
        </div>
        <div className="flex flex-col justify-center">
          <label className="flex items-center gap-2 cursor-pointer mt-3">
            <input
              type="checkbox"
              checked={!!data.maintenanceFeeVat}
              onChange={(e) => updateField('maintenanceFeeVat', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-sm"
            />
            <span className="text-xs font-medium text-slate-700">관리비 부가세 별도</span>
          </label>
        </div>
      </div>

      {/* 4. 체크리스트 연동 필드 */}
      <div className="pt-2">
        <span className="text-xs font-bold text-slate-700 block mb-2">체크리스트 상담 메모</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={data.hvacSystem || ''}
            onChange={(e) => updateField('hvacSystem', e.target.value)}
            placeholder="냉난방 시스템 (천장형 FCU 개별제어 등)"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.restorationScope || ''}
            onChange={(e) => updateField('restorationScope', e.target.value)}
            placeholder="원상복구 범위 (칸막이/바닥재 승계 협의)"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.specialTerms || ''}
            onChange={(e) => updateField('specialTerms', e.target.value)}
            placeholder="특약사항 (렌트프리 1개월 제공 등)"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.parkingAndFee || ''}
            onChange={(e) => updateField('parkingAndFee', e.target.value)}
            placeholder="주차요금 규정 (추가 월 15만원 등)"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.electricityExpansion || ''}
            onChange={(e) => updateField('electricityExpansion', e.target.value)}
            placeholder="전기 증설 가능 여부 (현재 30kW)"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.prosAndCons || ''}
            onChange={(e) => updateField('prosAndCons', e.target.value)}
            placeholder="매물 장단점 (초역세권, 채광 등)"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
