'use client';

import React from 'react';
import { 
  X, 
  Phone, 
  MessageSquare, 
  Building, 
  Calendar, 
  User, 
  Compass, 
  Target, 
  Tag, 
  Clock, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { CustomerItem, PropertyItem, PROPERTY_TYPE_LABELS } from '@/lib/types';

interface CustomerDetailModalProps {
  customer: CustomerItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectProperty?: (property: PropertyItem) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSelectProperty,
}) => {
  if (!isOpen || !customer) return null;

  const isReceived = customer.group === 'RECEIVED';
  const typeKorean = 
    customer.type === 'SELLER' ? '매도인' :
    customer.type === 'LESSOR' ? '임대인' :
    customer.type === 'BUYER' ? '매수인' : '임차인';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl text-white shadow-sm ${isReceived ? 'bg-blue-600' : 'bg-indigo-600'}`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{customer.name} 고객 상세</h3>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                  isReceived 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {isReceived ? '[물건 접수] ' : '[물건 찾음] '} {typeKorean}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                등록일: {customer.createdAt ? customer.createdAt.substring(0, 10) : '-'}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Customer Profile Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {customer.carrier && (
                  <>
                    <span className="text-xs text-slate-500">통신사:</span>
                    <span className="px-2 py-0.5 text-xs font-bold bg-white text-slate-800 rounded-md border border-slate-300 shadow-2xs">
                      {customer.carrier}
                    </span>
                  </>
                )}
                <span className="text-xs text-slate-500 ml-1">연락처:</span>
                <span className="font-mono text-sm font-bold text-slate-900">{customer.phone}</span>
              </div>
              {customer.memo && (
                <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 mt-2">
                  <span className="font-semibold text-slate-800">상담 메모:</span> {customer.memo}
                </p>
              )}
            </div>

            {/* Direct Call & SMS Buttons */}
            <div className="flex items-center gap-2 shrink-0">
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
                      onClick={() => onSelectProperty && onSelectProperty(prop)}
                      className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700 rounded-sm">
                            {PROPERTY_TYPE_LABELS[prop.propertyType] || prop.propertyType}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-500">
                            #{prop.propertyNumber}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">
                            {prop.transactionType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium mt-1">
                          {prop.address} {prop.detailAddress || ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-blue-900 block">
                          {prop.transactionType === '매매' ? `${prop.price?.toLocaleString()}만원` :
                           prop.transactionType === '전세' ? `${prop.deposit?.toLocaleString()}만원` :
                           `${prop.deposit?.toLocaleString()}만 / ${prop.monthlyRent?.toLocaleString()}만`}
                        </span>
                        <span className="text-[10px] text-blue-600 font-semibold hover:underline">
                          상세보기 →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                  아직 등록된 매물이 없습니다. 상단 [새 매물 등록]에서 이 고객을 의뢰인으로 지정하여 등록할 수 있습니다.
                </div>
              )}
            </div>
          )}

          {/* Group 2: [물건 찾음] 매수인/임차인의 희망 조건 목록 */}
          {!isReceived && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-600" />
                희망 매물 탐색 조건 ({customer.demands?.length || 0}건)
              </h4>

              {customer.demands && customer.demands.length > 0 ? (
                <div className="space-y-3">
                  {customer.demands.map((demand) => (
                    <div
                      key={demand.id}
                      className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-200 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-bold bg-indigo-600 text-white rounded-md">
                            {PROPERTY_TYPE_LABELS[demand.targetPropertyType] || demand.targetPropertyType}
                          </span>
                          <span className="text-xs font-semibold text-indigo-900">
                            {demand.targetTransactionType} 희망
                          </span>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-medium">
                          {demand.status === 'ACTIVE' ? '탐색 및 상담중' : '매칭완료'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="bg-white p-2 rounded-lg border border-indigo-100">
                          <span className="text-[11px] text-slate-500 block">희망 지역</span>
                          <span className="font-semibold text-slate-900">{demand.targetRegion || '지역 무관'}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-indigo-100">
                          <span className="text-[11px] text-slate-500 block">희망 예산</span>
                          <span className="font-semibold text-indigo-950">
                            {demand.targetTransactionType === '매매' ? 
                              `${demand.minBudget?.toLocaleString() || 0} ~ ${demand.maxBudget?.toLocaleString() || '제한없음'} 만원` :
                             demand.targetTransactionType === '전세' ?
                              `보증금 ${demand.minDeposit?.toLocaleString() || 0} ~ ${demand.maxDeposit?.toLocaleString() || '제한없음'} 만원` :
                              `보증금 ${demand.minDeposit || 0} / 월세 ${demand.minMonthlyRent || 0}~${demand.maxMonthlyRent || '협의'}만원`}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-indigo-100">
                          <span className="text-[11px] text-slate-500 block">희망 평수</span>
                          <span className="font-semibold text-slate-900">
                            {demand.preferredArea ? `${demand.preferredArea} ㎡` : '협의'}
                          </span>
                        </div>
                      </div>

                      {demand.requirements && (
                        <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-indigo-100">
                          <span className="font-semibold text-slate-800">요구 조건:</span> {demand.requirements}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                  등록된 희망 조건이 없습니다.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};
