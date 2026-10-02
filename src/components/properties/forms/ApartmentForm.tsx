'use client';

import React from 'react';
import { ApartmentData } from '@/lib/types';

interface ApartmentFormProps {
  data: Partial<ApartmentData>;
  onChange: (updated: Partial<ApartmentData>) => void;
}

export const ApartmentForm: React.FC<ApartmentFormProps> = ({ data, onChange }) => {
  const updateField = (field: keyof ApartmentData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
        아파트 세부 스펙 입력
      </h4>

      {/* 1. 단지 정보 */}
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

      {/* 2. 면적 및 스펙 */}
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

      {/* 3. 비용 및 시설 */}
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

      {/* 4. 옵션 선택 */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-2">기본 및 확장 옵션</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={!!data.systemAircon}
              onChange={(e) => updateField('systemAircon', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-sm"
            />
            <span className="text-xs text-slate-700">시스템에어컨</span>
          </label>
          <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={!!data.heatExchanger}
              onChange={(e) => updateField('heatExchanger', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-sm"
            />
            <span className="text-xs text-slate-700">전열교환기(환기)</span>
          </label>
          <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={!!data.induction}
              onChange={(e) => updateField('induction', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-sm"
            />
            <span className="text-xs text-slate-700">인덕션/하이라이트</span>
          </label>
          <div className="col-span-1">
            <input
              type="text"
              value={data.roomLivingOption || ''}
              onChange={(e) => updateField('roomLivingOption', e.target.value)}
              placeholder="방/거실 확장 여부 (예: 거실확장)"
              className="w-full text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
