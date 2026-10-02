'use client';

import React from 'react';
import { HouseData } from '@/lib/types';

interface HouseFormProps {
  data: Partial<HouseData>;
  onChange: (updated: Partial<HouseData>) => void;
}

export const HouseForm: React.FC<HouseFormProps> = ({ data, onChange }) => {
  const updateField = (field: keyof HouseData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        주택 세부 스펙 입력 (단독/다가구/다세대/빌라)
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
            placeholder="예: 2층 / 전체"
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">건축물대장상 면적 (㎡)</label>
          <input
            type="number"
            step="0.01"
            value={data.buildingArea || ''}
            onChange={(e) => updateField('buildingArea', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="대장상 면적"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">대장상 용도</label>
          <input
            type="text"
            value={data.buildingUse || ''}
            onChange={(e) => updateField('buildingUse', e.target.value)}
            placeholder="예: 단독주택 / 다가구주택"
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
            placeholder="방 수"
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
            placeholder="예: 2대"
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
        <label className="block text-xs font-medium text-slate-700 mb-1">현재 임대현황 (다가구 등)</label>
        <input
          type="text"
          value={data.currentLeaseStatus || ''}
          onChange={(e) => updateField('currentLeaseStatus', e.target.value)}
          placeholder="예: 1층 보증금 3천/월 120, 2층 전세 2억, 3층 주인세대 거주"
          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
        />
      </div>

      {/* 3. 관리비 분리 입력 (공용, 수도, 전기, 가스) */}
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
    </div>
  );
};
