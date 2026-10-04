// src/components/crm/CustomerDetailModal.tsx
'use client';

import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  MessageSquare, 
  Building, 
  Calendar, 
  User, 
  Target, 
  Tag, 
  Clock, 
  CheckCircle2,
  Lock,
  Trash2,
  ShieldAlert,
  Building2,
  Car,
  Sparkles,
  DollarSign,
  AlertTriangle,
  Store,
  Volume2,
  Copy,
  Check
} from 'lucide-react';
import { CustomerItem, PropertyItem, PROPERTY_TYPE_LABELS, CustomerDemandItem } from '@/lib/types';
import { useAuth } from '../auth/AuthContext';
import { maskPhoneNumber, canViewCustomerContact, canDeleteItem } from '@/lib/auth';
import { formatKoreanMoney } from './CustomerFormModal';

interface CustomerDetailModalProps {
  customer: CustomerItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectProperty?: (property: PropertyItem) => void;
  onCustomerDeleted?: (customerId: string) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSelectProperty,
  onCustomerDeleted,
}) => {
  const { currentUser } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedDemandId, setCopiedDemandId] = useState<string | null>(null);

  if (!isOpen || !customer) return null;

  const isReceived = customer.group === 'RECEIVED';
  const typeKorean = 
    customer.type === 'SELLER' ? '매도인' :
    customer.type === 'LESSOR' ? '임대인' :
    customer.type === 'BUYER' ? '매수인' : '임차인';

  const canViewContact = canViewCustomerContact(currentUser, customer);
  const displayPhone = canViewContact ? customer.phone : maskPhoneNumber(customer.phone);
  const canDelete = canDeleteItem(currentUser);
  const managerName = customer.managerName || '사무실';

  const handleDelete = async () => {
    if (!canDelete) {
      alert('고객 삭제 권한은 프로그램 관리자(대표)에게만 있습니다.');
      return;
    }

    if (!confirm(`정말로 "${customer.name}" 고객을 시스템에서 완전히 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/customers?id=${customer.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser?.role || 'ADMIN',
          'x-user-id': currentUser?.id || '',
          'x-user-name': currentUser?.name || '관리자',
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '고객 삭제에 실패했습니다.');
      }

      alert('고객이 정상적으로 삭제되었습니다.');
      if (onCustomerDeleted) onCustomerDeleted(customer.id);
      onClose();
    } catch (err: any) {
      alert(err.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyScript = (demand: CustomerDemandItem) => {
    const custName = customer.name || '고객';
    const propTypeLabel = PROPERTY_TYPE_LABELS[demand.targetPropertyType] || '매물';
    const region = demand.targetRegion || '원하시는 지역';
    const regionReason = demand.regionReason ? ` (선정이유: ${demand.regionReason})` : '';
    const floor = demand.preferredFloor || '층수 무관';
    const area = demand.preferredAreaPy 
      ? `${demand.preferredAreaPy}평 (${demand.preferredArea}㎡)` 
      : (demand.preferredArea ? `${demand.preferredArea}㎡` : '면적 협의');
    
    let budget = '예산 협의';
    if (demand.targetTransactionType === '매매') {
      budget = demand.targetPrice ? `매매 ${formatKoreanMoney(demand.targetPrice)}` : '매매가 협의';
    } else if (demand.targetTransactionType === '전세') {
      budget = demand.targetJeonse ? `전세 ${formatKoreanMoney(demand.targetJeonse)}` : '전세가 협의';
    } else {
      const dep = demand.targetDeposit ? `보증금 ${formatKoreanMoney(demand.targetDeposit)}` : '보증금 협의';
      const rent = demand.targetMonthlyRent ? `월세 ${formatKoreanMoney(demand.targetMonthlyRent)}` : '월세 협의';
      budget = `${dep} / ${rent}`;
    }

    let script = `"${custName}님, 말씀해주신 희망 조건을 종합하여 확인해 드리겠습니다.\n\n`;
    script += `1. 찾으시는 물건: [${region}${regionReason}] 부근 [${propTypeLabel}] (${demand.targetTransactionType})\n`;
    script += `2. 희망 스펙: 층수 [${floor}], 실면적 [${area}], 주차 [${demand.parkingRequirement || '협의'}]\n`;
    script += `3. 예산 및 일정: [${budget}], 입주/오픈 [${demand.moveInTiming || '협의'}${demand.moveInReason ? ` (사유: ${demand.moveInReason})` : ''}]\n`;

    if (demand.targetPropertyType === 'STORE') {
      if (demand.premiumLimit !== undefined && demand.premiumLimit !== null) {
        script += `4. 권리금 상한선: [최대 ${formatKoreanMoney(demand.premiumLimit)}]${demand.premiumReason ? ` (${demand.premiumReason})` : ''}\n`;
      }
      if (demand.minRequiredAreaPy || demand.minRequiredArea) {
        script += `5. 최소 필요면적: [최소 ${demand.minRequiredAreaPy ? demand.minRequiredAreaPy + '평' : demand.minRequiredArea + '㎡'}]${demand.minAreaReason ? ` (${demand.minAreaReason})` : ''}\n`;
      }
    }

    if (demand.nonNegotiableCondition) {
      script += `★ 절대 양보 불가 1순위 조건: [${demand.nonNegotiableCondition}]\n`;
    }
    if (demand.negotiableCondition) {
      script += `★ 유연하게 조율 가능한 조건: [${demand.negotiableCondition}]\n\n`;
    }

    script += `제가 정리해 드린 내용이 맞으실까요?"`;

    navigator.clipboard.writeText(script);
    setCopiedDemandId(demand.id);
    setTimeout(() => setCopiedDemandId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl text-white shadow-sm ${isReceived ? 'bg-blue-600' : 'bg-indigo-600'}`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">{customer.name} 고객 상세 상담장</h3>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                  isReceived 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {isReceived ? '[물건 접수] ' : '[물건 찾음] '} {typeKorean}
                </span>

                {/* 담당 권한자 뱃지 */}
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md ${
                  managerName.includes('개업공인중개사')
                    ? 'bg-purple-100 text-purple-900 border border-purple-300'
                    : 'bg-slate-200 text-slate-800'
                }`}>
                  {managerName.includes('개업공인중개사')
                    ? '👑 담당: 개업공인중개사 (대표)'
                    : managerName === '사무실'
                    ? '🏢 담당: 사무실'
                    : `👤 담당: ${managerName}`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                등록일: {customer.createdAt ? customer.createdAt.substring(0, 10) : '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 관리자 전용 삭제 버튼 */}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                title="고객 삭제 (관리자 전용)"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 rounded-lg transition-colors shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? '삭제 중...' : '고객 삭제'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Unauthorized Contact Security Notice */}
          {!canViewContact && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">연락처 비공개 안내: </span>
                본 고객은 다른 소속공인중개사 또는 사무실 공용으로 관리되는 고객입니다. 
                중개사고 예방 및 고객정보 보호 규정에 따라 연락처 열람 및 전화/문자 발송이 제한됩니다.
              </div>
            </div>
          )}

          {/* Customer Profile Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {customer.carrier && (
                  <>
                    <span className="text-xs text-slate-500">통신사:</span>
                    <span className="px-2 py-0.5 text-xs font-bold bg-white text-slate-800 rounded-md border border-slate-300 shadow-2xs">
                      {customer.carrier}
                    </span>
                  </>
                )}
                <span className="text-xs text-slate-500 ml-1">연락처:</span>
                <span className="font-mono text-base font-black text-slate-900">{displayPhone}</span>
                {!canViewContact && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded">
                    <Lock className="w-3 h-3" />
                    마스킹 보안 처리됨
                  </span>
                )}
              </div>
              {customer.memo && (
                <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 mt-2">
                  <span className="font-semibold text-slate-800">상담 메모:</span> {customer.memo}
                </p>
              )}
            </div>

            {/* Direct Call & SMS Buttons (Only for Authorized User) */}
            <div className="flex items-center gap-2 shrink-0">
              {canViewContact ? (
                <>
                  <a
                    href={`tel:${customer.phone}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>📞 전화걸기</span>
                  </a>
                  <a
                    href={`sms:${customer.phone}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>문자보내기</span>
                  </a>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-400 bg-slate-200/80 rounded-lg border border-slate-300">
                  <Lock className="w-3.5 h-3.5" />
                  <span>연락처 권한 없음</span>
                </span>
              )}
            </div>
          </div>

          {/* Group 1: [물건 접수] 매도인/임대인이 내놓은 매물 목록 */}
          {isReceived && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-600" />
                내놓은 매물 목록 ({customer.properties?.length || 0}건)
              </h4>

              {customer.properties && customer.properties.length > 0 ? (
                <div className="space-y-2.5">
                  {customer.properties.map((prop) => (
                    <div
                      key={prop.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/20 transition-all flex items-center justify-between cursor-pointer"
                      onClick={() => onSelectProperty && onSelectProperty(prop)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-100 text-blue-800">
                            {PROPERTY_TYPE_LABELS[prop.propertyType]}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-700">
                            #{prop.propertyNumber}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            ({prop.transactionType})
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900">
                          {prop.address} {prop.detailAddress || ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-extrabold text-blue-600">
                          {prop.transactionType === '매매'
                            ? prop.price ? `${prop.price.toLocaleString()} 만원` : '가격협의'
                            : prop.transactionType === '전세'
                            ? prop.deposit ? `${prop.deposit.toLocaleString()} 만원` : '협의'
                            : `${prop.deposit || 0}만 / ${prop.monthlyRent || 0}만`}
                        </span>
                        <span className="block text-[11px] text-slate-400 mt-0.5">
                          상세보기 →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
                  아직 접수 등록된 매물이 없습니다.
                </div>
              )}
            </div>
          )}

          {/* Group 2: [물건 찾음] 매수인/임차인의 희망 조건 목록 */}
          {!isReceived && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-600" />
                고객 희망 조건 및 심층 상담장 ({customer.demands?.length || 0}건)
              </h4>

              {customer.demands && customer.demands.length > 0 ? (
                <div className="space-y-4">
                  {customer.demands.map((demand) => (
                    <div
                      key={demand.id}
                      className="p-4 sm:p-5 rounded-2xl border-2 border-indigo-200/90 bg-white shadow-xs space-y-4"
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-indigo-100 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-2xs">
                            {PROPERTY_TYPE_LABELS[demand.targetPropertyType]}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800">
                            {demand.targetTransactionType}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                            층수: {demand.preferredFloor || '무관'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyScript(demand)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all"
                        >
                          {copiedDemandId === demand.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">낭독 대본 복사완료!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>낭독 대본 복사</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* 희망 지역 & 이유 */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">희망 지역/상권:</span>
                          <span className="font-extrabold text-blue-700">{demand.targetRegion || '지역 무관'}</span>
                        </div>
                        {demand.regionReason && (
                          <div className="text-slate-600 text-[11px] pl-4 border-l-2 border-blue-400 mt-1">
                            <span className="font-semibold text-slate-700">선정 이유: </span>
                            {demand.regionReason}
                          </div>
                        )}
                      </div>

                      {/* 그리드 스펙 (면적, 주차, 일정, 예산) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        {/* 면적 */}
                        <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100">
                          <span className="text-[11px] text-slate-500 font-semibold block">희망 전용면적</span>
                          <span className="font-black text-indigo-900 text-sm mt-0.5 block">
                            {demand.preferredAreaPy ? `${demand.preferredAreaPy}평` : ''}
                            {demand.preferredArea ? ` (${demand.preferredArea}㎡)` : (demand.preferredAreaPy ? '' : '협의')}
                          </span>
                        </div>

                        {/* 주차 */}
                        <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100">
                          <span className="text-[11px] text-slate-500 font-semibold block">주차 요건</span>
                          <span className="font-black text-slate-800 text-xs mt-0.5 block truncate" title={demand.parkingRequirement || '협의'}>
                            {demand.parkingRequirement || '주차 협의'}
                          </span>
                        </div>

                        {/* 입주/오픈 시기 */}
                        <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100">
                          <span className="text-[11px] text-slate-500 font-semibold block">입주/오픈 시기</span>
                          <span className="font-black text-emerald-800 text-xs mt-0.5 block">
                            {demand.moveInTiming || '협의'}
                          </span>
                          {demand.moveInReason && (
                            <span className="text-[10px] text-slate-500 block truncate" title={demand.moveInReason}>
                              사유: {demand.moveInReason}
                            </span>
                          )}
                        </div>

                        {/* 희망 예산/가격 */}
                        <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100">
                          <span className="text-[11px] text-slate-500 font-semibold block">희망 가격</span>
                          <span className="font-black text-blue-700 text-xs mt-0.5 block">
                            {demand.targetTransactionType === '매매' ? (
                              demand.targetPrice ? formatKoreanMoney(demand.targetPrice) : (demand.maxBudget ? formatKoreanMoney(demand.maxBudget) : '협의')
                            ) : demand.targetTransactionType === '전세' ? (
                              demand.targetJeonse ? formatKoreanMoney(demand.targetJeonse) : '협의'
                            ) : (
                              demand.targetDeposit || demand.targetMonthlyRent ? (
                                `${formatKoreanMoney(demand.targetDeposit || 0)} / ${formatKoreanMoney(demand.targetMonthlyRent || 0)}`
                              ) : '협의'
                            )}
                          </span>
                        </div>
                      </div>

                      {/* 상가 전용 스펙 (권리금 상한, 최소면적, 이전 둘러본 매물) */}
                      {demand.targetPropertyType === 'STORE' && (
                        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-2">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900 border-b border-amber-200/80 pb-1">
                            <Store className="w-3.5 h-3.5 text-amber-600" />
                            상가점포 전문 상담 내역
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <span className="font-bold text-slate-700">권리금 상한선: </span>
                              <span className="font-black text-amber-800">
                                {demand.premiumLimit !== undefined && demand.premiumLimit !== null
                                  ? `${formatKoreanMoney(demand.premiumLimit)}`
                                  : '협의'}
                              </span>
                              {demand.premiumReason && (
                                <span className="text-[11px] text-slate-500 block">
                                  이유: {demand.premiumReason}
                                </span>
                              )}
                            </div>

                            <div>
                              <span className="font-bold text-slate-700">최소 필요 면적: </span>
                              <span className="font-black text-amber-800">
                                {demand.minRequiredAreaPy ? `${demand.minRequiredAreaPy}평` : ''}
                                {demand.minRequiredArea ? ` (${demand.minRequiredArea}㎡)` : (demand.minRequiredAreaPy ? '' : '협의')}
                              </span>
                              {demand.minAreaReason && (
                                <span className="text-[11px] text-slate-500 block">
                                  이유: {demand.minAreaReason}
                                </span>
                              )}
                            </div>
                          </div>

                          {demand.previousVisitedProps && (
                            <div className="pt-1 text-[11px] bg-white p-2 rounded-lg border border-amber-200">
                              <span className="font-bold text-rose-800">둘러본 매물 및 계약 포기 사유: </span>
                              <span className="text-slate-800">{demand.previousVisitedProps}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 양보 불가 조건 & 포기 가능 조건 (공통 체크포인트) */}
                      {(demand.nonNegotiableCondition || demand.negotiableCondition) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {demand.nonNegotiableCondition && (
                            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                              <span className="font-black text-rose-900 block mb-0.5">
                                🚨 절대 양보 불가 1순위 조건:
                              </span>
                              <span className="font-bold text-rose-800">{demand.nonNegotiableCondition}</span>
                            </div>
                          )}
                          {demand.negotiableCondition && (
                            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                              <span className="font-black text-emerald-900 block mb-0.5">
                                🤝 가장 포기하기 쉬운 조건 (양보가능):
                              </span>
                              <span className="font-bold text-emerald-800">{demand.negotiableCondition}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 기타 희망사항 */}
                      {demand.requirements && (
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                          <span className="font-bold text-indigo-900">기타 요구조건: </span>
                          <span className="text-slate-700">{demand.requirements}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
                  아직 등록된 탐색 조건이 없습니다.
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
