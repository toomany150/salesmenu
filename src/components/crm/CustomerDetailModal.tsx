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
  Check,
  Edit3,
  Star
} from 'lucide-react';
import { CustomerItem, PropertyItem, PROPERTY_TYPE_LABELS, CustomerDemandItem } from '@/lib/types';
import { useAuth } from '../auth/AuthContext';
import { maskPhoneNumber, canViewCustomerContact, canDeleteItem, canEditItem } from '@/lib/auth';
import { formatKoreanMoney } from './CustomerFormModal';
import { saveCustomCustomer } from '@/lib/storage';

interface CustomerDetailModalProps {
  customer: CustomerItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEditCustomer?: (customer: CustomerItem) => void;
  onSelectProperty?: (property: PropertyItem) => void;
  onCustomerDeleted?: (customerId: string) => void;
  onCustomerUpdated?: (customer: CustomerItem) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onEditCustomer,
  onSelectProperty,
  onCustomerDeleted,
  onCustomerUpdated,
}) => {
  const { currentUser } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedDemandId, setCopiedDemandId] = useState<string | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<CustomerItem | null>(customer);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [copiedKakao, setCopiedKakao] = useState(false);
  const [showKakaoModal, setShowKakaoModal] = useState(false);
  const [kakaoText, setKakaoText] = useState('');

  React.useEffect(() => {
    setCurrentCustomer(customer);
  }, [customer]);

  // [기능 1] 고객등록완료 설정 및 상태 변경 핸들러
  const handleToggleStatus = async (targetStatus?: 'ACTIVE' | 'COMPLETED' | 'HOLD') => {
    if (!currentCustomer) return;
    const nextStatus = targetStatus || (currentCustomer.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED');
    setIsUpdatingStatus(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentCustomer.id,
          status: nextStatus,
          currentUser,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '상태 변경 중 오류가 발생했습니다.');

      const updated: CustomerItem = { ...currentCustomer, status: nextStatus };
      setCurrentCustomer(updated);
      saveCustomCustomer(updated);
      if (onCustomerUpdated) onCustomerUpdated(updated);

      if (nextStatus === 'COMPLETED') {
        alert(`"${currentCustomer.name}" 고객이 [고객등록완료]로 설정되었습니다! ✓`);
      } else {
        alert(`"${currentCustomer.name}" 고객이 [상담 진행중]으로 변경되었습니다.`);
      }
    } catch (err: any) {
      alert(err.message || '상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // [기능 5] 중요 고객 설정 및 맨 처음으로 이동 핸들러
  const handleTogglePin = async () => {
    if (!currentCustomer) return;
    const nextPinned = !currentCustomer.isPinned;
    setIsUpdatingPin(true);
    try {
      // 중요 고객 지정 시 최신 접수일시를 부여하여 리스트 맨 처음으로 즉시 이동 보장
      const nowIso = new Date().toISOString();
      const res = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentCustomer.id,
          isPinned: nextPinned,
          receiptDate: nextPinned ? nowIso : currentCustomer.receiptDate,
          currentUser,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '중요 고객 설정 중 오류가 발생했습니다.');

      const updated: CustomerItem = {
        ...currentCustomer,
        isPinned: nextPinned,
        receiptDate: nextPinned ? nowIso : currentCustomer.receiptDate,
      };
      setCurrentCustomer(updated);
      saveCustomCustomer(updated);
      if (onCustomerUpdated) onCustomerUpdated(updated);

      if (nextPinned) {
        alert(`⭐ "${currentCustomer.name}" 고객이 [중요 고객]으로 지정되어 목록 맨 처음으로 이동되었습니다!`);
      } else {
        alert(`"${currentCustomer.name}" 고객의 중요 고객 설정이 해제되었습니다.`);
      }
    } catch (err: any) {
      alert(err.message || '중요 고객 설정 중 오류가 발생했습니다.');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  // [기능 3] 카톡 공동중개 공유 대본 생성 (고객 이름과 연락처는 완전 제외!)
  const generateKakaoBrokerShareText = (cust: CustomerItem) => {
    const isRecv = cust.group === 'RECEIVED';
    const typeLabel = 
      cust.type === 'SELLER' ? '매도인' :
      cust.type === 'LESSOR' ? '임대인' :
      cust.type === 'BUYER' ? '매수인' : '임차인';

    let text = `[공동중개 매물 의뢰]\n`;
    text += `소장님, 아래 조건에 맞는 매물 있으시면 공동중개 부탁드립니다! 🤝\n\n`;

    if (!isRecv) {
      // [물건 찾음] 매수/임차 의뢰
      const demand = cust.demands && cust.demands[0];
      const propLabel = demand ? (PROPERTY_TYPE_LABELS[demand.targetPropertyType] || '부동산') : '부동산';
      const txType = demand?.targetTransactionType || '매매/임대';

      text += `📋 의뢰 구분: [물건 찾음] ${typeLabel} (${propLabel} · ${txType})\n`;
      if (demand) {
        text += `📍 희망 지역: ${demand.targetRegion || '지역 무관'}\n`;
        if (demand.regionReason) {
          text += `   └ 선정이유: ${demand.regionReason}\n`;
        }

        const areaStr = demand.preferredAreaPy
          ? `${demand.preferredAreaPy}평 (${demand.preferredArea}㎡)`
          : (demand.preferredArea ? `${demand.preferredArea}㎡` : '협의');
        text += `📐 희망 면적: ${areaStr}\n`;
        text += `🏢 희망 층수: ${demand.preferredFloor || '층수 무관'}\n`;
        text += `🚗 주차 요건: ${demand.parkingRequirement || '주차 조건 협의'}\n`;

        let budgetStr = '예산 협의';
        if (txType === '매매') {
          budgetStr = demand.targetPrice ? `매매 ${formatKoreanMoney(demand.targetPrice)}` : '매매가 협의';
        } else if (txType === '전세') {
          budgetStr = demand.targetJeonse ? `전세 ${formatKoreanMoney(demand.targetJeonse)}` : '전세가 협의';
        } else {
          const dep = demand.targetDeposit ? `보증금 ${formatKoreanMoney(demand.targetDeposit)}` : '보증금 협의';
          const rent = demand.targetMonthlyRent ? `월세 ${formatKoreanMoney(demand.targetMonthlyRent)}` : '월세 협의';
          budgetStr = `${dep} / ${rent}`;
        }
        text += `💰 희망 예산: ${budgetStr}\n`;
        text += `📅 입주/오픈: ${demand.moveInTiming || '즉시가능'}${demand.moveInReason ? ` (사유: ${demand.moveInReason})` : ''}\n`;

        if (demand.loanRequirement) {
          text += `🏦 대출 여부: ${demand.loanRequirement}\n`;
        }

        // 2번째 파일: 1순위 조건 & 조율 조건
        if (demand.nonNegotiableCondition) {
          text += `\n🚨 [1순위 타협불가] 절대 양보할 수 없는 최우선 조건:\n👉 ${demand.nonNegotiableCondition}\n`;
        }
        if (demand.negotiableCondition) {
          text += `\n🤝 [조율가능] 매물이 정말 좋을 경우 가장 포기하기 쉬운 조건:\n👉 ${demand.negotiableCondition}\n`;
        }
      }
    } else {
      // [물건 접수] 매도/임대 의뢰
      text += `📋 의뢰 구분: [물건 접수] ${typeLabel}\n`;
      if (cust.transactionType) text += `🏷️ 거래 유형: ${cust.transactionType}\n`;
      if (cust.price) text += `💰 희망 매매가: ${formatKoreanMoney(cust.price)}\n`;
      if (cust.negotiablePrice) text += `   └ 조정선: ${formatKoreanMoney(cust.negotiablePrice)}\n`;
      if (cust.deposit) text += `💵 보증금/전세: ${formatKoreanMoney(cust.deposit)}\n`;
      if (cust.monthlyRent) text += `💶 희망 월세: ${formatKoreanMoney(cust.monthlyRent)}\n`;
      if (cust.premium) text += `🏪 권리금: ${formatKoreanMoney(cust.premium)}\n`;
      if (cust.receivedDetail?.roadAddress || cust.receivedDetail?.jibunAddress) {
        text += `📍 물건 소재지: ${cust.receivedDetail.roadAddress || cust.receivedDetail.jibunAddress}\n`;
      }
    }

    if (cust.memo) {
      text += `\n📝 상세 상담 메모:\n"${cust.memo}"\n`;
    }

    text += `\n────────────────────────\n`;
    text += `※ 본 의뢰서는 고객 개인정보(이름·연락처)를 안전하게 보호한 공동중개 의뢰문입니다.\n`;
    const myName = currentUser?.name || cust.managerName || '개업공인중개사 (대표)';
    text += `🏢 의뢰 중개사: ${myName}\n`;
    if (currentUser?.phone) {
      text += `📞 연락처: ${currentUser.phone}\n`;
    }

    return text;
  };

  const handleOpenKakaoShare = () => {
    if (!currentCustomer) return;
    const txt = generateKakaoBrokerShareText(currentCustomer);
    setKakaoText(txt);
    setShowKakaoModal(true);

    // 자동 클립보드 복사
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(txt).then(() => {
        setCopiedKakao(true);
        setTimeout(() => setCopiedKakao(false), 3000);
      }).catch(() => {});
    }
  };

  const [copiedAddressKey, setCopiedAddressKey] = useState<string | null>(null);

  const handleCopyText = (text: string, key: string) => {
    if (!text) return;
    const clean = text.trim();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(clean).then(() => {
        setCopiedAddressKey(key);
        setTimeout(() => setCopiedAddressKey(null), 2000);
      }).catch(() => fallbackCopyKey(clean, key));
    } else {
      fallbackCopyKey(clean, key);
    }
  };

  const fallbackCopyKey = (text: string, key: string) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedAddressKey(key);
      setTimeout(() => setCopiedAddressKey(null), 2000);
    } catch {
      alert('주소 복사에 실패했습니다.');
    }
  };

  if (!isOpen || !customer) return null;
  const activeCust = currentCustomer || customer;

  const isReceived = activeCust.group === 'RECEIVED';
  const typeKorean = 
    activeCust.type === 'SELLER' ? '매도인' :
    customer.type === 'LESSOR' ? '임대인' :
    customer.type === 'BUYER' ? '매수인' : '임차인';

  const canViewContact = canViewCustomerContact(currentUser, activeCust);
  const displayPhone = canViewContact ? activeCust.phone : maskPhoneNumber(activeCust.phone);
  const canDelete = canDeleteItem(currentUser);
  const canEdit = canEditItem(currentUser, activeCust);
  const managerName = activeCust.managerName || '사무실';

  const handleDelete = async () => {
    if (!canDelete) {
      alert('고객 삭제 권한은 개업공인중개사(대표)에게만 있습니다.');
      return;
    }

    if (!confirm(`정말로 "${customer.name}" 고객을 시스템에서 완전히 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const safeUserName = currentUser?.name ? encodeURIComponent(currentUser.name) : encodeURIComponent('관리자');
      const res = await fetch(`/api/customers?id=${customer.id}&userName=${safeUserName}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser?.role || 'ADMIN',
          'x-user-id': currentUser?.id || '',
          'x-user-name': safeUserName,
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

    if (demand.residenceType) {
      let resDesc = `현재 [${demand.residenceType}] 거주 중`;
      if (demand.residenceType === '자가' && demand.moveOutPlanDate) resDesc += ` (이사 예정: ${demand.moveOutPlanDate})`;
      else if (demand.residenceType === '전세' && (demand.jeonseContractPeriod || demand.jeonseRemainingPeriod)) resDesc += ` (계약: ${demand.jeonseContractPeriod || ''}, 잔여: ${demand.jeonseRemainingPeriod || ''})`;
      else if (demand.residenceType === '보증금,월세' && (demand.monthlyContractPeriod || demand.monthlyRemainingPeriod)) resDesc += ` (계약: ${demand.monthlyContractPeriod || ''}, 잔여: ${demand.monthlyRemainingPeriod || ''})`;
      script += `4. 현재 거주 형태: [${resDesc}]`;
      if (demand.loanRequirement) script += `, 자금 대출: [${demand.loanRequirement}]\n`;
      else script += `\n`;
    } else if (demand.loanRequirement) {
      script += `4. 자금 대출 계획: [${demand.loanRequirement}]\n`;
    }

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

                {/* [기능 5] 중요 고객 뱃지 */}
                {activeCust.isPinned && (
                  <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-amber-100 text-amber-950 border-2 border-amber-400 flex items-center gap-1 shadow-2xs">
                    <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                    ⭐ 중요 고객 (맨처음 고정)
                  </span>
                )}

                {/* [기능 1] 고객등록완료 설정 상태 뱃지 */}
                {activeCust.status === 'COMPLETED' ? (
                  <span className="px-3 py-0.5 text-xs font-black rounded-full bg-emerald-100 text-emerald-900 border-2 border-emerald-500 flex items-center gap-1.5 shadow-xs ring-2 ring-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ✓ 고객등록완료
                  </span>
                ) : activeCust.status === 'HOLD' ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    보류
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                    ● 진행중
                  </span>
                )}

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

                {/* 추가 권한자 뱃지 */}
                {Array.isArray(customer.assignedAgents) && customer.assignedAgents.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                    <span>👥 추가권한:</span>
                    <span className="font-bold">{customer.assignedAgents.join(', ')}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                접수일: {customer.receiptDate ? customer.receiptDate.substring(0, 10) : (customer.createdAt ? customer.createdAt.substring(0, 10) : '-')} | 등록: {customer.createdAt ? customer.createdAt.substring(0, 10) : '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* [기능 5] 중요 고객일 경우 맨처음으로 이동하게 하는 버튼 */}
            <button
              type="button"
              onClick={handleTogglePin}
              disabled={isUpdatingPin}
              title={activeCust.isPinned ? "중요 고객 해제 (클릭 시 일반 정렬로 복귀)" : "중요 고객으로 지정하여 목록 맨 처음(최상단)으로 이동합니다"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 border ${
                activeCust.isPinned
                  ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-950 border-amber-400 hover:from-amber-200 hover:to-yellow-200'
                  : 'bg-white text-slate-700 hover:text-amber-700 border-slate-300 hover:border-amber-400 hover:bg-amber-50/50'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${activeCust.isPinned ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
              <span>{activeCust.isPinned ? '⭐ 중요 고객 (맨처음 고정)' : '⭐ 중요 고객 (맨처음 이동)'}</span>
            </button>

            {/* [기능 1] 고객등록완료 설정할 수 있는 칸 (원클릭 완료/진행중 전환) */}
            <button
              type="button"
              onClick={() => handleToggleStatus()}
              disabled={isUpdatingStatus}
              title={activeCust.status === 'COMPLETED' ? "클릭 시 [상담 진행중] 상태로 전환합니다" : "클릭 시 [고객등록완료] 상태로 설정합니다"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 border ${
                activeCust.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-400 hover:bg-emerald-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${activeCust.status === 'COMPLETED' ? 'text-emerald-700' : 'text-white'}`} />
              <span>{activeCust.status === 'COMPLETED' ? '✓ 등록완료 (진행중 전환)' : '✓ 고객등록완료 설정'}</span>
            </button>

            {/* [기능 3] 첫번째 파일을 고객정보(이름 연락처)만 빼고 카톡 공유 버튼 */}
            <button
              type="button"
              onClick={handleOpenKakaoShare}
              title="상대방 중개소장에게 보낼 수 있도록 이름/연락처를 제외한 정돈된 상담내용을 카카오톡으로 공유합니다"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-[#191919] bg-[#FEE500] hover:bg-[#FDD835] active:scale-95 rounded-lg shadow-xs transition-all cursor-pointer border border-[#E5CE00]"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#191919] fill-[#191919]" />
              <span>💬 소장님 카톡공유</span>
            </button>

            {/* 고객 수정 버튼 */}
            {onEditCustomer && (
              canEdit ? (
                <button
                  type="button"
                  onClick={() => onEditCustomer(activeCust)}
                  title="고객 정보 수정"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>수정</span>
                </button>
              ) : (
                <div
                  title="개업공인중개사(대표) 및 지정된 권한자만 수정할 수 있습니다."
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed"
                >
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>수정 불가</span>
                </div>
              )
            )}

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
          
          {/* 완료 상태일 때 상단 완료 도장/배너 이미지 스탬프 */}
          {customer.status === 'COMPLETED' && (
            <div className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 border-2 border-rose-300 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3 z-10">
                <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-sm shadow-md ring-4 ring-rose-200">
                  완료
                </div>
                <div>
                  <div className="text-sm font-black text-rose-950 flex items-center gap-2">
                    <span>상담 및 계약 진행이 완료된 고객입니다.</span>
                  </div>
                  <p className="text-xs text-rose-700 mt-0.5">
                    접수일: {customer.receiptDate ? customer.receiptDate.substring(0, 10) : (customer.createdAt ? customer.createdAt.substring(0, 10) : '-')} | 고객분류: {typeKorean}
                  </p>
                </div>
              </div>
              <div className="z-10 px-3.5 py-1.5 rounded-lg border-2 border-dashed border-rose-600 bg-white/90 text-rose-700 font-black text-xs sm:text-sm tracking-widest transform rotate-[-4deg] shadow-xs">
                [ 상 담 완 료 / COMPLETED ]
              </div>
            </div>
          )}
          
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
                    onClick={(e) => {
                      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                      if (!isMobile) {
                        e.preventDefault();
                        if (customer.phone) {
                          navigator.clipboard.writeText(customer.phone).catch(() => {});
                          alert(`고객 연락처(${customer.phone})가 클립보드에 복사되었습니다.\n\n(스마트폰에서 터치 시 문자 앱이 바로 실행됩니다)`);
                        }
                      }
                    }}
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

          {/* Group 1: [물건 접수] 매도인/임대인 의뢰 조건 & 내놓은 매물 목록 */}
          {isReceived && (
            <div className="space-y-4">
              {(customer.price || customer.negotiablePrice || customer.deposit || customer.monthlyRent || customer.subType) && (
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      [물건 접수] {customer.subType || typeKorean} 의뢰 희망가 및 조정가능 가격
                    </span>
                    {customer.transactionType && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {customer.transactionType}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {customer.price && (
                      <div className="p-2 bg-white rounded-lg border border-blue-100 flex justify-between">
                        <span className="text-slate-500">희망 매매가액:</span>
                        <span className="font-black text-blue-900">{customer.price.toLocaleString()} 만원</span>
                      </div>
                    )}
                    {customer.negotiablePrice && (
                      <div className="p-2 bg-white rounded-lg border border-amber-200 flex justify-between">
                        <span className="text-amber-700 font-semibold">조정할 수 있는 매매가액:</span>
                        <span className="font-black text-amber-800">{customer.negotiablePrice.toLocaleString()} 만원</span>
                      </div>
                    )}
                    {customer.deposit && (
                      <div className="p-2 bg-white rounded-lg border border-blue-100 flex justify-between">
                        <span className="text-slate-500">희망 보증금/전세:</span>
                        <span className="font-black text-blue-900">{customer.deposit.toLocaleString()} 만원</span>
                      </div>
                    )}
                    {customer.negotiableDeposit && (
                      <div className="p-2 bg-white rounded-lg border border-amber-200 flex justify-between">
                        <span className="text-amber-700 font-semibold">조정할 수 있는 보증금/전세:</span>
                        <span className="font-black text-amber-800">{customer.negotiableDeposit.toLocaleString()} 만원</span>
                      </div>
                    )}
                    {customer.monthlyRent && (
                      <div className="p-2 bg-white rounded-lg border border-blue-100 flex justify-between">
                        <span className="text-slate-500">희망 월세:</span>
                        <span className="font-black text-blue-900">{customer.monthlyRent.toLocaleString()} 만원</span>
                      </div>
                    )}
                    {customer.negotiableMonthlyRent && (
                      <div className="p-2 bg-white rounded-lg border border-amber-200 flex justify-between">
                        <span className="text-amber-700 font-semibold">조정할 수 있는 월세:</span>
                        <span className="font-black text-amber-800">{customer.negotiableMonthlyRent.toLocaleString()} 만원</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* [물건 접수] 확정 주소 (도로명 / 지번 분리 및 복사 버튼) */}
              {(customer.receivedDetail?.roadAddress || customer.receivedDetail?.jibunAddress) && (
                <div className="p-3 bg-white rounded-xl border border-blue-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-600 text-white rounded-md flex items-center gap-1 shadow-2xs shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                      확정 주소
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      접수 의뢰 물건 소재지 (도로명 및 지번 분리)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    {customer.receivedDetail.roadAddress && (
                      <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-blue-100 text-blue-800 rounded shrink-0">도로명</span>
                          <span className="font-bold text-slate-900 break-all select-all">
                            {customer.receivedDetail.roadAddress}
                            {customer.receivedDetail.detailAddress ? ` (${customer.receivedDetail.detailAddress})` : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyText(customer.receivedDetail?.roadAddress || '', 'recv_road');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 active:scale-95 border border-blue-300 rounded-md transition-all shadow-2xs shrink-0 cursor-pointer"
                          title="도로명 주소 복사"
                        >
                          {copiedAddressKey === 'recv_road' ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                              <span className="text-emerald-700 font-bold">복사 완료!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5 text-blue-600" />
                              <span>도로명 복사</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {customer.receivedDetail.jibunAddress && (
                      <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-800 rounded shrink-0">지번</span>
                          <span className="font-semibold text-slate-800 break-all select-all">
                            {customer.receivedDetail.jibunAddress}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyText(customer.receivedDetail?.jibunAddress || '', 'recv_jibun');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-800 bg-white hover:bg-amber-50 active:scale-95 border border-amber-300 rounded-md transition-all shadow-2xs shrink-0 cursor-pointer"
                          title="지번 주소 복사"
                        >
                          {copiedAddressKey === 'recv_jibun' ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                              <span className="text-emerald-700 font-bold">복사 완료!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5 text-amber-700" />
                              <span>지번 복사</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                      <div className="space-y-1.5">
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

                        {/* 도로명 & 지번 분리 표시 및 복사 버튼 */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded shrink-0">도로명</span>
                            <span className="text-xs font-bold text-slate-900 break-all">
                              {prop.roadAddress || prop.address} {prop.detailAddress || ''}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(prop.roadAddress || prop.address, `prop_road_${prop.id}`);
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded shadow-2xs cursor-pointer ml-1"
                              title="도로명 복사"
                            >
                              {copiedAddressKey === `prop_road_${prop.id}` ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                                  <span className="text-emerald-700">복사됨</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5 text-blue-600" />
                                  <span>도로명 복사</span>
                                </>
                              )}
                            </button>
                          </div>
                          {prop.jibunAddress && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded shrink-0">지번</span>
                              <span className="text-xs font-medium text-slate-700 break-all">
                                {prop.jibunAddress}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyText(prop.jibunAddress || '', `prop_jibun_${prop.id}`);
                                }}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 bg-white hover:bg-amber-50 border border-amber-200 rounded shadow-2xs cursor-pointer ml-1"
                                title="지번 복사"
                              >
                                {copiedAddressKey === `prop_jibun_${prop.id}` ? (
                                  <>
                                    <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                                    <span className="text-emerald-700">복사됨</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-2.5 h-2.5 text-amber-700" />
                                    <span>지번 복사</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-extrabold text-blue-600">
                          {prop.transactionType === '매매'
                            ? prop.price ? `${prop.price.toLocaleString()} 만원` : '가격협의'
                            : prop.transactionType === '전세'
                            ? prop.deposit ? `${prop.deposit.toLocaleString()} 만원` : '협의'
                            : `${prop.deposit || 0}만 / ${prop.monthlyRent || 0}만`}
                        </span>
                        {prop.negotiablePrice ? (
                          <span className="block text-[11px] font-bold text-amber-700 mt-0.5">
                            조정: {prop.negotiablePrice.toLocaleString()}만
                          </span>
                        ) : null}
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
                          <span className="font-bold text-slate-700">
                            {demand.targetPropertyType === 'APARTMENT' || demand.targetPropertyType === 'HOUSE' ? '희망 지역:' : '희망 지역/상권:'}
                          </span>
                          <span className="font-extrabold text-blue-700">{demand.targetRegion || '지역 무관'}</span>
                        </div>
                        {demand.regionReason && (
                          <div className="text-slate-600 text-[11px] pl-4 border-l-2 border-blue-400 mt-1">
                            <span className="font-semibold text-slate-700">
                              {demand.targetPropertyType === 'APARTMENT' || demand.targetPropertyType === 'HOUSE' ? '희망지역 선정이유: ' : '선정 이유: '}
                            </span>
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
                          {demand.maxBudget ? (
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              최대한도: {formatKoreanMoney(demand.maxBudget)}
                              {demand.maxBudgetReason ? ` (${demand.maxBudgetReason})` : ''}
                            </span>
                          ) : demand.maxBudgetReason ? (
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              최대한도 이유: {demand.maxBudgetReason}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* 매수인/임차인 거주형태 및 대출 정보 */}
                      {(demand.residenceType || demand.loanRequirement) && (
                        <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-200 text-xs space-y-2">
                          <div className="flex items-center justify-between font-bold text-indigo-950">
                            <span className="flex items-center gap-1.5">
                              <span>🏠 매수인 · 임차인 현재 거주 및 대출 현황</span>
                            </span>
                            {demand.residenceType && (
                              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold">
                                {demand.residenceType}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            {demand.residenceType === '자가' && demand.moveOutPlanDate && (
                              <div className="p-2 bg-white rounded border border-indigo-100 sm:col-span-2">
                                <span className="text-slate-500 font-semibold block">이사 예정일:</span>
                                <span className="font-bold text-slate-900">{demand.moveOutPlanDate}</span>
                              </div>
                            )}

                            {demand.residenceType === '전세' && (
                              <>
                                {(demand.jeonseContractPeriod || demand.jeonseRemainingPeriod) && (
                                  <div className="p-2 bg-white rounded border border-indigo-100">
                                    <span className="text-slate-500 font-semibold block">계약기간 / 남은기간:</span>
                                    <span className="font-bold text-slate-900">
                                      {demand.jeonseContractPeriod || '미기재'}
                                      {demand.jeonseRemainingPeriod ? ` (잔여: ${demand.jeonseRemainingPeriod})` : ''}
                                    </span>
                                  </div>
                                )}
                                {demand.jeonseRenewalClaimUsed && (
                                  <div className="p-2 bg-white rounded border border-indigo-100">
                                    <span className="text-slate-500 font-semibold block">임차갱신권 행사여부:</span>
                                    <span className="font-bold text-slate-900">{demand.jeonseRenewalClaimUsed}</span>
                                  </div>
                                )}
                              </>
                            )}

                            {demand.residenceType === '보증금,월세' && (
                              <>
                                {(demand.monthlyContractPeriod || demand.monthlyRemainingPeriod) && (
                                  <div className="p-2 bg-white rounded border border-indigo-100">
                                    <span className="text-slate-500 font-semibold block">계약기간 / 남은기간:</span>
                                    <span className="font-bold text-slate-900">
                                      {demand.monthlyContractPeriod || '미기재'}
                                      {demand.monthlyRemainingPeriod ? ` (잔여: ${demand.monthlyRemainingPeriod})` : ''}
                                    </span>
                                  </div>
                                )}
                                {demand.monthlyRenewalClaimUsed && (
                                  <div className="p-2 bg-white rounded border border-indigo-100">
                                    <span className="text-slate-500 font-semibold block">임차갱신권 행사여부:</span>
                                    <span className="font-bold text-slate-900">{demand.monthlyRenewalClaimUsed}</span>
                                  </div>
                                )}
                              </>
                            )}

                            {demand.loanRequirement && (
                              <div className="p-2 bg-white rounded border border-purple-200 sm:col-span-2">
                                <span className="text-purple-700 font-semibold block">대출 계획 / 여부:</span>
                                <span className="font-bold text-purple-950">{demand.loanRequirement}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

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

                      {/* [기능 2] 2번째 첨부 파일 내용을 첫번째 파일에 넣기 (절대양보불가 최우선 조건 & 매물 좋을경우 포기가능 조건) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                        {/* 1순위: 절대로 양보할 수 없는 최우선 조건 하나 */}
                        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/50 p-4 shadow-2xs space-y-2.5 transition-all">
                          <div className="flex items-start gap-2.5">
                            <span className="px-2.5 py-1 text-xs font-black rounded-md bg-rose-600 text-white shrink-0 shadow-2xs">
                              1순위
                            </span>
                            <div>
                              <h5 className="text-xs sm:text-sm font-black text-rose-950 flex items-center gap-1">
                                절대로 양보할 수 없는 최우선 조건 하나 <span className="text-rose-500">*</span>
                              </h5>
                              <p className="text-[11px] text-rose-700/80 mt-0.5 leading-snug">
                                "나열한 여러 조건 중 어떤 것이 절대 포기 못할 1순위인가요?" 질문 (음성 마이크 지원)
                              </p>
                            </div>
                          </div>

                          {/* 2번째 이미지 인풋창 스타일 재현 */}
                          <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-2xs min-h-[44px] flex items-center">
                            <p className="text-xs sm:text-sm font-extrabold text-slate-900 break-words leading-relaxed">
                              {demand.nonNegotiableCondition?.trim() || (
                                <span className="text-slate-400 font-normal italic">
                                  예: 1층 전면 노출 필수 / 주차 최소 2대 / 예산 3천 초과 절대불가 (미입력 상태)
                                </span>
                              )}
                            </p>
                          </div>

                          {/* 추천 칩들 (선택된 항목은 채워진 스타일) */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {['1층 전면 노출', '주차 2대 필수', '예산 초과 절대불가', '역세권 도보 5분', '즉시 입주'].map((chip) => {
                              const isIncluded = Boolean(demand.nonNegotiableCondition && demand.nonNegotiableCondition.includes(chip));
                              return (
                                <span
                                  key={chip}
                                  className={`px-2 py-0.8 text-[11px] font-bold rounded-md border transition-all ${
                                    isIncluded
                                      ? 'bg-rose-600 text-white border-rose-600 shadow-2xs ring-2 ring-rose-200'
                                      : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50'
                                  }`}
                                >
                                  {chip}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* 조율: 매물이 정말 좋을 경우 가장 포기하기 쉬운 조건 */}
                        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-4 shadow-2xs space-y-2.5 transition-all">
                          <div className="flex items-start gap-2.5">
                            <span className="px-2.5 py-1 text-xs font-black rounded-md bg-emerald-600 text-white shrink-0 shadow-2xs">
                              조율
                            </span>
                            <div>
                              <h5 className="text-xs sm:text-sm font-black text-emerald-950 flex items-center gap-1">
                                매물이 정말 좋을 경우 가장 포기하기 쉬운 조건 <span className="text-emerald-500">*</span>
                              </h5>
                              <p className="text-[11px] text-emerald-700/80 mt-0.5 leading-snug">
                                "원하는 입지나 조건이 완벽하다면 어떤 조건을 가장 먼저 양보할 수 있나요?" (음성 마이크 지원)
                              </p>
                            </div>
                          </div>

                          {/* 2번째 이미지 인풋창 스타일 재현 */}
                          <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs min-h-[44px] flex items-center">
                            <p className="text-xs sm:text-sm font-extrabold text-slate-900 break-words leading-relaxed">
                              {demand.negotiableCondition?.trim() || (
                                <span className="text-slate-400 font-normal italic">
                                  예: 인테리어 좋다면 월세 30만 상향 가능 / 2층도 검토 (미입력 상태)
                                </span>
                              )}
                            </p>
                          </div>

                          {/* 추천 칩들 (선택된 항목은 채워진 스타일) */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {['월세 20~30만 상향 가능', '2층/지하도 검토', '면적 약간 작아도 무방', '주차 인근 공영 활용', '입주시점 조율'].map((chip) => {
                              const isIncluded = Boolean(demand.negotiableCondition && demand.negotiableCondition.includes(chip));
                              return (
                                <span
                                  key={chip}
                                  className={`px-2 py-0.8 text-[11px] font-bold rounded-md border transition-all ${
                                    isIncluded
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs ring-2 ring-emerald-200'
                                      : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                                  }`}
                                >
                                  {chip}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

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

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            개업공인중개사 스마트 고객관리 CRM
          </span>
          <div className="flex items-center gap-2">
            {/* 하단에도 빠른 소장님 카톡공유 버튼 배치 */}
            <button
              type="button"
              onClick={handleOpenKakaoShare}
              className="px-3.5 py-2 text-xs font-black text-[#191919] bg-[#FEE500] hover:bg-[#FDD835] active:scale-95 rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer border border-[#E5CE00]"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#191919] fill-[#191919]" />
              <span>💬 소장님 카톡공유</span>
            </button>

            {onEditCustomer && (
              canEdit ? (
                <button
                  type="button"
                  onClick={() => onEditCustomer(activeCust)}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>고객 수정하기</span>
                </button>
              ) : (
                <div
                  title="개업공인중개사(대표) 및 지정된 권한자만 수정할 수 있습니다."
                  className="px-3 py-2 text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-not-allowed"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>수정 권한 없음 (지정 권한자 전용)</span>
                </div>
              )
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>

      </div>

      {/* [기능 3] 카카오톡 공동중개 공유 모달 팝업 */}
      {showKakaoModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#FEE500] border-b border-[#E5CE00] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#191919] text-[#FEE500] rounded-lg">
                  <MessageSquare className="w-4 h-4 fill-[#FEE500]" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#191919]">
                    소장님 카톡 공동중개 의뢰문
                  </h4>
                  <p className="text-[11px] text-[#191919]/70 font-semibold">
                    🔒 고객 성함 및 연락처 완전 제외 (개인정보 보호 안심 공유)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKakaoModal(false)}
                className="p-1.5 text-black/60 hover:text-black hover:bg-black/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 leading-relaxed">
                💡 <span className="font-bold">원클릭 복사 완료!</span> 아래 대본이 클립보드에 자동 복사되었습니다.<br />
                카카오톡 단체방이나 소장님과의 1:1 대화창에 <span className="font-extrabold underline text-blue-700">붙여넣기(Ctrl+V)</span>하세요.
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  value={kakaoText}
                  rows={14}
                  className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-800 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-amber-400 select-all"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 font-medium">
                {copiedKakao ? '✓ 클립보드 복사 완료' : '전체 텍스트 선택 가능'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(kakaoText);
                    setCopiedKakao(true);
                    setTimeout(() => setCopiedKakao(false), 2500);
                  }}
                  className="px-4 py-2 text-xs font-black text-[#191919] bg-[#FEE500] hover:bg-[#FDD835] active:scale-95 rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer border border-[#E5CE00]"
                >
                  {copiedKakao ? <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKakao ? '복사되었습니다!' : '대본 다시 복사하기'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowKakaoModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
