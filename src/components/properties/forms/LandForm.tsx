'use client';

import React from 'react';
import { LandData } from '@/lib/types';

interface LandFormProps {
  data: Partial<LandData>;
  onChange: (updated: Partial<LandData>) => void;
}

export const LandForm: React.FC<LandFormProps> = ({ data, onChange }) => {
  const updateField = (field: keyof LandData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4 bg-emerald-50/40 p-4 rounded-xl border border-emerald-200">
      <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
        토지 세부 스펙 및 공법/권리 관계 조건
      </h4>

      {/* 1. 토지 개요 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">상호/필지명칭</label>
          <input
            type="text"
            value={data.companyName || ''}
            onChange={(e) => updateField('companyName', e.target.value)}
            placeholder="예: 양평 전원주택부지"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">현재 이용상황</label>
          <input
            type="text"
            value={data.businessType || ''}
            onChange={(e) => updateField('businessType', e.target.value)}
            placeholder="나대지, 밭, 야적장 등"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">토지면적 (㎡)</label>
          <input
            type="number"
            step="0.01"
            value={data.landArea || ''}
            onChange={(e) => updateField('landArea', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="예: 660.0 (약 200평)"
            className="w-full text-xs px-3 py-2 bg-emerald-50/50 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">평당 단가 (만원)</label>
          <input
            type="number"
            step="0.1"
            value={data.rentPerPyeong || ''}
            onChange={(e) => updateField('rentPerPyeong', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="예: 평당 150만원"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* 2. 토지 공법 스펙 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">용도지역</label>
          <input
            type="text"
            value={data.zoningArea || ''}
            onChange={(e) => updateField('zoningArea', e.target.value)}
            placeholder="예: 자연녹지지역, 계획관리지역"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">지목</label>
          <input
            type="text"
            value={data.landCategory || ''}
            onChange={(e) => updateField('landCategory', e.target.value)}
            placeholder="예: 대, 전, 답, 임야, 잡종지"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">도로 접도 여부</label>
          <input
            type="text"
            value={data.roadAccess || ''}
            onChange={(e) => updateField('roadAccess', e.target.value)}
            placeholder="예: 2차선 아스콘포장도로 접, 맹지"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* 3. 체크리스트 연동 주요 확인사항 */}
      <div className="pt-2">
        <span className="text-xs font-bold text-slate-700 block mb-2">공법 및 권리분석 상담 기록 (우측 체크리스트 참고)</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={data.ordinancePermitted || ''}
            onChange={(e) => updateField('ordinancePermitted', e.target.value)}
            placeholder="매수자 희망 건축물 조례 허용 여부 (건폐율/용적률)"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.roadAccessConfirmed || ''}
            onChange={(e) => updateField('roadAccessConfirmed', e.target.value)}
            placeholder="건축법상 진입도로 확보 및 사도 개설 필요 여부"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.surfaceRights || ''}
            onChange={(e) => updateField('surfaceRights', e.target.value)}
            placeholder="지상권 / 지역권 / 분묘기지권 유무"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.farmlandsCert || ''}
            onChange={(e) => updateField('farmlandsCert', e.target.value)}
            placeholder="농지취득자격증명(농취증) / 토지거래허가구역 여부"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={data.infrastructure || ''}
            onChange={(e) => updateField('infrastructure', e.target.value)}
            placeholder="전기, 상수도, 하수관로 인입 거리 및 연결 여부"
            className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg col-span-1 sm:col-span-2"
          />
        </div>
      </div>
    </div>
  );
};
