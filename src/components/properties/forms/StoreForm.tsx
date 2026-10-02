'use client';

import React from 'react';
import { StoreData } from '@/lib/types';

interface StoreFormProps {
  data: Partial<StoreData>;
  onChange: (updated: Partial<StoreData>) => void;
}

export const StoreForm: React.FC<StoreFormProps> = ({ data, onChange }) => {
  const updateField = (field: keyof StoreData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4 bg-amber-50/40 p-4 rounded-xl border border-amber-200">
      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
        상가점포 세부 스펙 및 금액 조건
      </h4>

      {/* 1. 점포 기본 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">상호명</label>
          <input
            type="text"
            value={data.storeName || ''}
            onChange={(e) => updateField('storeName', e.target.value)}
            placeholder="예: 달콤카페 서초점"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">업종</label>
          <input
            type="text"
            value={data.businessType || ''}
            onChange={(e) => updateField('businessType', e.target.value)}
            placeholder="예: 휴게음식점, 베이커리"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">총층수</label>
          <input
            type="number"
            value={data.totalFloors || ''}
            onChange={(e) => updateField('totalFloors', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="예: 5층"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">해당층수</label>
          <input
            type="text"
            value={data.currentFloor || ''}
            onChange={(e) => updateField('currentFloor', e.target.value)}
            placeholder="예: 지상 1층"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
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
            placeholder="예: 62.5"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">대장상 면적 (㎡)</label>
          <input
            type="number"
            step="0.01"
            value={data.buildingArea || ''}
            onChange={(e) => updateField('buildingArea', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="대장상 면적"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">대장상 용도</label>
          <input
            type="text"
            value={data.buildingUse || ''}
            onChange={(e) => updateField('buildingUse', e.target.value)}
            placeholder="제1종/제2종 근린생활"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">주차대수</label>
          <input
            type="number"
            value={data.parkingCount || ''}
            onChange={(e) => updateField('parkingCount', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="예: 2대"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* 3. 금액 조건 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-amber-200">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">권리금 (만원)</label>
          <input
            type="number"
            value={data.premium || ''}
            onChange={(e) => updateField('premium', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="예: 4000 (무권리 시 0)"
            className="w-full text-xs px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">관리비 (만원)</label>
          <input
            type="number"
            value={data.maintenanceFee || ''}
            onChange={(e) => updateField('maintenanceFee', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="예: 30"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>
        <div className="flex flex-col justify-center">
          <label className="flex items-center gap-2 cursor-pointer mt-3">
            <input
              type="checkbox"
              checked={!!data.monthlyRentVat}
              onChange={(e) => updateField('monthlyRentVat', e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded-sm"
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
              className="w-4 h-4 text-amber-600 rounded-sm"
            />
            <span className="text-xs font-medium text-slate-700">관리비 부가세 별도</span>
          </label>
        </div>
      </div>

      {/* 4. 세부 상담 체크 기록 (우측 고정 패널과 연동) */}
      <div className="pt-2">
        <span className="text-xs font-bold text-slate-700 block mb-2">상담 확인 주요 메모 (우측 체크리스트 참고)</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={data.adminActionChecked || ''}
            onChange={(e) => updateField('adminActionChecked', e.target.value)}
            placeholder="행정처분 확인 결과 (없음/위생과 조회 등)"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.violationBuilding || ''}
            onChange={(e) => updateField('violationBuilding', e.target.value)}
            placeholder="위반건축물 여부 (테라스/불법증축 등)"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.operationPeriod || ''}
            onChange={(e) => updateField('operationPeriod', e.target.value)}
            placeholder="영업기간 및 계약잔여기간"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.equipmentStatus || ''}
            onChange={(e) => updateField('equipmentStatus', e.target.value)}
            placeholder="비품체크 (인수포함 / 렌탈 품목)"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.fireInspectionCert || ''}
            onChange={(e) => updateField('fireInspectionCert', e.target.value)}
            placeholder="소방필증/완비증명서 구비여부"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="number"
            value={data.dailyRevenue || ''}
            onChange={(e) => updateField('dailyRevenue', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="일매출 (만원)"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};
