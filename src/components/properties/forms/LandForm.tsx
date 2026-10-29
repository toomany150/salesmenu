'use client';

import React from 'react';
import { LandData } from '@/lib/types';
import { Coins, FileText, Compass, Mountain, Eye, HelpCircle } from 'lucide-react';

interface LandFormProps {
  data: Partial<LandData>;
  onChange: (updated: Partial<LandData>) => void;
}

export const LandForm: React.FC<LandFormProps> = ({ data, onChange }) => {
  const updateField = (field: keyof LandData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // 평당가 또는 면적 변경 시 계산 보조
  const handlePricePerM2Change = (val: number | undefined) => {
    updateField('officialLandPrice', val);
    if (val) {
      updateField('officialLandPricePerPyeong', Math.round(val * 3.305785));
    }
  };

  return (
    <div className="space-y-4 bg-emerald-50/40 p-4 rounded-xl border border-emerald-200">
      <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80">
        <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
          토지 세부 스펙 및 대장/공시지가·입지 조건
        </h4>
        <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded">
          토지대장 & 공시지가 자동 연동
        </span>
      </div>

      {/* 1. 토지 기본 개요 및 면적 */}
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
          <label className="block text-xs font-medium text-slate-700 mb-1">
            토지면적 (㎡)
            {data.landArea ? (
              <span className="ml-1 text-[11px] text-emerald-700 font-bold">
                (약 {(data.landArea * 0.3025).toFixed(1)}평)
              </span>
            ) : null}
          </label>
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
          <label className="block text-xs font-medium text-slate-700 mb-1">희망 평당단가 (만원)</label>
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

      {/* 2. 토지 공법 및 지목 */}
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
          <label className="block text-xs font-medium text-slate-700 mb-1">토지 형상(모양)</label>
          <input
            type="text"
            value={data.landShape || ''}
            onChange={(e) => updateField('landShape', e.target.value)}
            placeholder="예: 정방형(네모반듯), 장방형, 부정형, 자루형"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* 3. 국토교통부 개별공시지가 정보 섹션 */}
      <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-emerald-600" />
            <span>국토교통부 개별공시지가 정보</span>
          </label>
          <span className="text-[11px] text-slate-500">
            기준년도: <span className="font-bold text-emerald-700">{data.officialPriceYear || '2026년'}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">개별공시지가 (원/㎡)</label>
            <input
              type="number"
              value={data.officialLandPrice || ''}
              onChange={(e) => handlePricePerM2Change(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="예: 450,000"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">평당 환산 공시지가 (원/3.3㎡)</label>
            <input
              type="number"
              value={data.officialLandPricePerPyeong || ''}
              onChange={(e) => updateField('officialLandPricePerPyeong', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="예: 1,487,000"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">공시지가 기준년도</label>
            <input
              type="text"
              value={data.officialPriceYear || ''}
              onChange={(e) => updateField('officialPriceYear', e.target.value)}
              placeholder="예: 2026년"
              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {data.officialLandPrice && data.landArea ? (
          <div className="text-[11px] text-emerald-800 bg-emerald-50/80 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
            <span>
              필지 전체 공시지가 합계:{' '}
              <strong className="text-emerald-900 font-extrabold">
                {Math.round((data.officialLandPrice * data.landArea) / 10000).toLocaleString()}만원
              </strong>
            </span>
            <span className="text-[10px] text-slate-500">
              ({data.landArea}㎡ × {data.officialLandPrice.toLocaleString()}원/㎡)
            </span>
          </div>
        ) : null}
      </div>

      {/* 4. 체크리스트 연동 주요 확인사항 */}
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
