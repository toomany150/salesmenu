'use client';

import React from 'react';
import { FactoryWarehouseData } from '@/lib/types';

interface FactoryWarehouseFormProps {
  data: Partial<FactoryWarehouseData>;
  onChange: (updated: Partial<FactoryWarehouseData>) => void;
}

export const FactoryWarehouseForm: React.FC<FactoryWarehouseFormProps> = ({ data, onChange }) => {
  const updateField = (field: keyof FactoryWarehouseData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4 bg-indigo-50/40 p-4 rounded-xl border border-indigo-200">
      <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
        공장/창고 세부 스펙 및 산업 시설 조건
      </h4>

      {/* 1. 기본 정보 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">상호/업체명</label>
          <input
            type="text"
            value={data.companyName || ''}
            onChange={(e) => updateField('companyName', e.target.value)}
            placeholder="예: 대한정밀공업"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">현재 업종</label>
          <input
            type="text"
            value={data.businessType || ''}
            onChange={(e) => updateField('businessType', e.target.value)}
            placeholder="금속가공, 물류창고 등"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">건축구조</label>
          <input
            type="text"
            value={data.structure || ''}
            onChange={(e) => updateField('structure', e.target.value)}
            placeholder="일반철골조, 판넬 등"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">층수 (총층/해당층)</label>
          <input
            type="text"
            value={data.currentFloor || ''}
            onChange={(e) => updateField('currentFloor', e.target.value)}
            placeholder="지상 1층 단층"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* 2. 토지 및 도로 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">대지면적 (㎡)</label>
          <input
            type="number"
            step="0.01"
            value={data.landArea || ''}
            onChange={(e) => updateField('landArea', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="예: 1650.0"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">연면적 (㎡)</label>
          <input
            type="number"
            step="0.01"
            value={data.totalFloorArea || ''}
            onChange={(e) => updateField('totalFloorArea', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="예: 820.0"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">용도지역/지목</label>
          <input
            type="text"
            value={data.zoningArea || ''}
            onChange={(e) => updateField('zoningArea', e.target.value)}
            placeholder="일반공업지역 / 공장용지(장)"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">진입도로 폭</label>
          <input
            type="text"
            value={data.roadAccessWidth || ''}
            onChange={(e) => updateField('roadAccessWidth', e.target.value)}
            placeholder="예: 8m (대형트레일러 진입가)"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* 3. 산업 스펙 (층고, 호이스트, 전력) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-indigo-200">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">층고 (m)</label>
          <input
            type="number"
            step="0.1"
            value={data.ceilingHeight || ''}
            onChange={(e) => updateField('ceilingHeight', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="처마고: 8m, 최고: 10m"
            className="w-full text-xs px-3 py-2 bg-indigo-50/50 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">호이스트 (톤수)</label>
          <input
            type="text"
            value={data.hoistCapacity || ''}
            onChange={(e) => updateField('hoistCapacity', e.target.value)}
            placeholder="예: 2.8톤 1기, 5톤 1기"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">인입/사용전력</label>
          <input
            type="text"
            value={data.incomingElectricity || ''}
            onChange={(e) => updateField('incomingElectricity', e.target.value)}
            placeholder="예: 150kW (동력충분)"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">평당임대료 (만원)</label>
          <input
            type="number"
            step="0.1"
            value={data.rentPerPyeong || ''}
            onChange={(e) => updateField('rentPerPyeong', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="예: 평당 3.5만원"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* 4. 환경 및 인허가 체크 */}
      <div className="pt-2">
        <span className="text-xs font-bold text-slate-700 block mb-2">환경 규제 및 인허가 상담 메모</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={data.wastewater || ''}
            onChange={(e) => updateField('wastewater', e.target.value)}
            placeholder="폐수 배출 여부 (위탁처리 or 발생안함)"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.airPollution || ''}
            onChange={(e) => updateField('airPollution', e.target.value)}
            placeholder="대기오염/집진기 시설 유무"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.sewageDirectConnection || ''}
            onChange={(e) => updateField('sewageDirectConnection', e.target.value)}
            placeholder="하수종말처리장 직관 연결 여부"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
