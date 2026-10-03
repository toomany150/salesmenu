'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  Phone, 
  Target,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { 
  MobileCarrier, 
  CustomerType, 
  CARRIER_OPTIONS, 
  PropertyType, 
  TransactionType,
  PROPERTY_TYPE_LABELS 
} from '@/lib/types';
import { useAuth } from '@/components/auth/AuthContext';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: any) => void;
  defaultGroup?: 'RECEIVED' | 'SEARCHING';
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultGroup = 'RECEIVED',
}) => {
  const { currentUser, availableAgents } = useAuth();
  const [name, setName] = useState('');
  const [carrier, setCarrier] = useState<MobileCarrier>('SK');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<CustomerType>(defaultGroup === 'RECEIVED' ? 'SELLER' : 'BUYER');
  const [memo, setMemo] = useState('');
  const [managerName, setManagerName] = useState<string>('사무실');

  // Set default manager to current user name when modal opens
  useEffect(() => {
    if (currentUser?.name) {
      setManagerName(currentUser.name);
    } else {
      setManagerName('사무실');
    }
  }, [currentUser, isOpen]);

  // 매수 / 임차인 희망조건 상태
  const [targetPropertyType, setTargetPropertyType] = useState<PropertyType>('APARTMENT');
  const [targetTransactionType, setTargetTransactionType] = useState<TransactionType>('매매');
  const [targetRegion, setTargetRegion] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [preferredArea, setPreferredArea] = useState('');
  const [requirements, setRequirements] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isSearching = type === 'BUYER' || type === 'LESSEE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('고객명을 입력해주세요.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('전화번호를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const group = isSearching ? 'SEARCHING' : 'RECEIVED';

    const payload: any = {
      name: name.trim(),
      carrier: isSearching ? undefined : carrier,
      phone: phone.trim(),
      type,
      group,
      memo: memo.trim() || undefined,
      managerName: managerName || '사무실',
      createdById: currentUser?.id,
      creatorName: currentUser?.name,
      currentUser,
    };

    if (isSearching) {
      payload.demand = {
        targetPropertyType,
        targetTransactionType,
        targetRegion: targetRegion.trim() || undefined,
        minBudget: minBudget ? parseFloat(minBudget) : undefined,
        maxBudget: maxBudget ? parseFloat(maxBudget) : undefined,
        preferredArea: preferredArea ? parseFloat(preferredArea) : undefined,
        requirements: requirements.trim() || undefined,
      };
    }

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '고객 등록에 실패했습니다.');
      }
      onSuccess(data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">신규 고객 등록</h2>
              <p className="text-xs text-slate-500">
                고객 구분(매도/매수/임대/임차) 및 연락처, 희망 조건을 등록합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. 고객 구분 4버튼 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                고객 그룹 및 구분 *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-xl border border-blue-200 bg-blue-50/40">
                  <span className="text-[11px] font-bold text-blue-800 block mb-1.5">
                    [물건 접수] 매도/임대인
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setType('SELLER')}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        type === 'SELLER'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      매도인
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('LESSOR')}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        type === 'LESSOR'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      임대인
                    </button>
                  </div>
                </div>

                <div className="p-2 rounded-xl border border-indigo-200 bg-indigo-50/40">
                  <span className="text-[11px] font-bold text-indigo-800 block mb-1.5">
                    [물건 찾음] 매수/임차인
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setType('BUYER')}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        type === 'BUYER'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      매수인
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('LESSEE')}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        type === 'LESSEE'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      임차인
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 고객 기본 정보 */}
            <div className={`grid grid-cols-1 ${!isSearching ? 'sm:grid-cols-2' : ''} gap-3`}>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">고객명 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 홍길동"
                  required
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {!isSearching && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    통신사 (매도/임대인 택 1)
                  </label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value as MobileCarrier)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                  >
                    {CARRIER_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">전화번호 *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="예: 010-1234-5678"
                required
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* 담당 권한자 (관리 주체) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  고객 담당 권한자 (관리 주체) *
                </label>
                <span className="text-[11px] text-slate-500">
                  {managerName === '사무실' ? '사무실 전체 공용 (워크인)' : `${managerName} 전담`}
                </span>
              </div>
              <select
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
              >
                <option value="사무실">🏢 사무실 (공용/워크인)</option>
                {availableAgents.map((agent) => (
                  <option key={agent} value={agent}>👤 {agent}</option>
                ))}
              </select>
              {currentUser && (
                <div className="flex items-center gap-1.5 text-xs pt-0.5">
                  <button
                    type="button"
                    onClick={() => setManagerName('사무실')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                      managerName === '사무실'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    🏢 사무실 공용
                  </button>
                  <button
                    type="button"
                    onClick={() => setManagerName(currentUser.name)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                      managerName === currentUser.name
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    👤 본인 ({currentUser.name})
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">상담 메모 및 고객 특이사항</label>
              <textarea
                rows={2}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="상담 이력, 선호하는 상담 시간대, 직업 등"
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 3. [물건 찾음] 매수인 / 임차인일 경우 희망 조건 서브 폼 */}
            {isSearching && (
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3 animate-in fade-in duration-200">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                  [물건 찾음] 희망 매물 조건 등록
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">희망 매물 종류</label>
                    <select
                      value={targetPropertyType}
                      onChange={(e) => setTargetPropertyType(e.target.value as PropertyType)}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    >
                      {(['APARTMENT', 'HOUSE', 'STORE', 'OFFICE', 'FACTORY_WAREHOUSE', 'LAND', 'ETC'] as PropertyType[]).map((p) => (
                        <option key={p} value={p}>{PROPERTY_TYPE_LABELS[p]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">희망 거래 유형</label>
                    <select
                      value={targetTransactionType}
                      onChange={(e) => setTargetTransactionType(e.target.value as TransactionType)}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="매매">매매</option>
                      <option value="전세">전세</option>
                      <option value="월세">월세</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">희망 지역 / 상권</label>
                  <input
                    type="text"
                    value={targetRegion}
                    onChange={(e) => setTargetRegion(e.target.value)}
                    placeholder="예: 강남구 역삼/선릉 역세권 도보 5분"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">최대 예산 (만원)</label>
                    <input
                      type="number"
                      value={maxBudget}
                      onChange={(e) => setMaxBudget(e.target.value)}
                      placeholder="예: 150000 (15억원)"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">희망 전용면적 (㎡)</label>
                    <input
                      type="number"
                      value={preferredArea}
                      onChange={(e) => setPreferredArea(e.target.value)}
                      placeholder="예: 84.9"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">기타 희망사항</label>
                  <input
                    type="text"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="예: 주차 2대 필수, 로얄층, 초품아 선호 등"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            취소
          </button>
          <button
            type="submit"
            form="customer-form"
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg shadow-sm"
          >
            {submitting ? '고객 등록중...' : '고객 등록 완료'}
          </button>
        </div>

      </div>
    </div>
  );
};
