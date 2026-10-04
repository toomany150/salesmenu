'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  UserPlus, 
  Phone, 
  Target,
  ShieldCheck,
  UserCheck,
  Building2,
  Car,
  Calendar,
  AlertTriangle,
  Sparkles,
  Volume2,
  Copy,
  Check,
  Ban,
  Store,
  DollarSign,
  HelpCircle,
  MapPin
} from 'lucide-react';
import { 
  MobileCarrier, 
  CustomerType, 
  CARRIER_OPTIONS, 
  PropertyType, 
  TransactionType,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPE_ORDER
} from '@/lib/types';
import { useAuth } from '@/components/auth/AuthContext';
import { openDaumPostcode, convertAddressViaGeocoder } from '@/lib/address';
import { VoiceInput, VoiceTextarea } from '@/components/common/VoiceInput';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: any) => void;
  defaultGroup?: 'RECEIVED' | 'SEARCHING';
}

// 금액 한글 변환 헬퍼 (만원 단위 -> 억/만원 표시)
export function formatKoreanMoney(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num) || num <= 0) return '';
  
  const eok = Math.floor(num / 10000);
  const man = Math.round(num % 10000);
  
  if (eok > 0 && man > 0) {
    return `${eok}억 ${man.toLocaleString()}만 원`;
  } else if (eok > 0) {
    return `${eok}억 원`;
  } else {
    return `${man.toLocaleString()}만 원`;
  }
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultGroup = 'RECEIVED',
}) => {
  const { currentUser, availableAgents } = useAuth();
  
  // 1. 고객 기본 정보
  const [name, setName] = useState('');
  const [carrier, setCarrier] = useState<MobileCarrier>('SK');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<CustomerType>(defaultGroup === 'RECEIVED' ? 'SELLER' : 'BUYER');
  const [subType, setSubType] = useState<string>(
    defaultGroup === 'RECEIVED' ? '매도인' : '매수인'
  );
  const [memo, setMemo] = useState('');
  const [managerName, setManagerName] = useState<string>('사무실');

  // 1-2. [물건 접수] 매도인/임대인/임차인(권리금) 물건 상세 정보 상태
  const [recvPropertyType, setRecvPropertyType] = useState<PropertyType>('APARTMENT');
  const [recvTransactionType, setRecvTransactionType] = useState<string>('매매');
  // 희망 가격
  const [recvPrice, setRecvPrice] = useState('');
  const [recvJeonse, setRecvJeonse] = useState('');
  const [recvDeposit, setRecvDeposit] = useState('');
  const [recvMonthlyRent, setRecvMonthlyRent] = useState('');
  const [recvPremium, setRecvPremium] = useState('');
  // 조정할 수 있는 가격 (네고선)
  const [recvNegoPrice, setRecvNegoPrice] = useState('');
  const [recvNegoJeonse, setRecvNegoJeonse] = useState('');
  const [recvNegoDeposit, setRecvNegoDeposit] = useState('');
  const [recvNegoMonthlyRent, setRecvNegoMonthlyRent] = useState('');
  const [recvNegoPremium, setRecvNegoPremium] = useState('');
  // 위치 및 층수
  const [recvFloorAndUnit, setRecvFloorAndUnit] = useState('');
  const [recvMoveInTiming, setRecvMoveInTiming] = useState('즉시가능');
  const [recvRoadAddress, setRecvRoadAddress] = useState('');
  const [recvJibunAddress, setRecvJibunAddress] = useState('');
  const [recvDetailAddress, setRecvDetailAddress] = useState('');
  // 실거래시 지원세부사항 (렌트프리, 인테리어비용지원 등)
  const [recvDealSupport, setRecvDealSupport] = useState('');
  // 공실 및 이전 업종
  const [recvIsEmpty, setRecvIsEmpty] = useState(false);
  const [recvEmptyPeriod, setRecvEmptyPeriod] = useState('');
  const [recvPreviousBusiness, setRecvPreviousBusiness] = useState('');
  // 주거용 특화 (반려동물/외국인)
  const [recvPetAllowed, setRecvPetAllowed] = useState<'YES' | 'NO' | 'DISCUSS'>('YES');
  const [recvForeignerAllowed, setRecvForeignerAllowed] = useState<'YES' | 'NO' | 'DISCUSS'>('YES');
  // 상가/사무실 특화 (주차)
  const [recvParkingAvailable, setRecvParkingAvailable] = useState<'YES' | 'NO' | 'DISCUSS'>('YES');
  const [recvParkingCount, setRecvParkingCount] = useState('');
  // 상가 임대 특화 (임차거부 업종)
  const [recvRestrictedBusinesses, setRecvRestrictedBusinesses] = useState('');

  const debounceAddressRef = useRef<NodeJS.Timeout | null>(null);

  const handleRecvRoadAddressChange = (val: string) => {
    setRecvRoadAddress(val);
    if (debounceAddressRef.current) clearTimeout(debounceAddressRef.current);
    if (!val || val.trim().length < 5) return;
    debounceAddressRef.current = setTimeout(async () => {
      const converted = await convertAddressViaGeocoder(val.trim());
      if (converted && converted.jibunAddress) {
        setRecvJibunAddress(converted.jibunAddress);
      }
    }, 600);
  };

  const handleRecvJibunAddressChange = (val: string) => {
    setRecvJibunAddress(val);
    if (debounceAddressRef.current) clearTimeout(debounceAddressRef.current);
    if (!val || val.trim().length < 5) return;
    debounceAddressRef.current = setTimeout(async () => {
      const converted = await convertAddressViaGeocoder(val.trim());
      if (converted && converted.roadAddress) {
        setRecvRoadAddress(converted.roadAddress);
      }
    }, 600);
  };

  const handleOpenRecvPostcode = () => {
    openDaumPostcode((result) => {
      setRecvRoadAddress(result.roadAddress);
      setRecvJibunAddress(result.jibunAddress);
    });
  };

  // 2. 희망 조건 기본 항목 (물건 찾음 탐색 모드)
  const [targetPropertyType, setTargetPropertyType] = useState<PropertyType>('APARTMENT');
  const [targetTransactionType, setTargetTransactionType] = useState<TransactionType>('월세');
  const [targetRegion, setTargetRegion] = useState('');
  const [regionReason, setRegionReason] = useState(''); // 희망지역/상권 이유

  // 층수 항목
  const [preferredFloor, setPreferredFloor] = useState('1층 선호');

  // 면적 (㎡ <-> 평 실시간 양방향 자동 환산)
  const [preferredArea, setPreferredArea] = useState('');
  const [preferredAreaPy, setPreferredAreaPy] = useState('');

  // 주차 요건 (매물등록란 형식 반영)
  const [isParkingImpossible, setIsParkingImpossible] = useState(false);
  const [parkingCount, setParkingCount] = useState<string>('');
  const [parkingRequirement, setParkingRequirement] = useState('');

  // 입주 및 오픈 시기 & 이유
  const [moveInTiming, setMoveInTiming] = useState('즉시가능');
  const [moveInReason, setMoveInReason] = useState('');

  // 금액 항목 (매매가 / 전세가 / 보증금 / 월세)
  const [targetPrice, setTargetPrice] = useState('');
  const [targetJeonse, setTargetJeonse] = useState('');
  const [targetDeposit, setTargetDeposit] = useState('');
  const [targetMonthlyRent, setTargetMonthlyRent] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  // 공통 심층 상담 체크 사항
  const [nonNegotiableCondition, setNonNegotiableCondition] = useState(''); // 절대로 양보할 수 없는 최우선 조건 하나
  const [negotiableCondition, setNegotiableCondition] = useState(''); // 매물이 정말 좋을 경우 가장 포기하기 쉬운 조건
  const [requirements, setRequirements] = useState('');

  // <상가 전용 심층 상담 항목>
  const [premiumLimit, setPremiumLimit] = useState(''); // 권리금 상한선 (만원)
  const [premiumReason, setPremiumReason] = useState(''); // 권리금 상한 이유
  const [minRequiredArea, setMinRequiredArea] = useState(''); // 최소 필요 면적 (㎡)
  const [minRequiredAreaPy, setMinRequiredAreaPy] = useState(''); // 최소 필요 면적 (평)
  const [minAreaReason, setMinAreaReason] = useState(''); // 최소 필요 면적 이유
  const [previousVisitedProps, setPreviousVisitedProps] = useState(''); // 둘러본 매물 및 계약하지 않은 이유

  // UI 상태
  const [copiedBriefing, setCopiedBriefing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default manager to current user name when modal opens
  useEffect(() => {
    if (currentUser?.name) {
      setManagerName(currentUser.name);
    } else {
      setManagerName('사무실');
    }
  }, [currentUser, isOpen]);

  // 면적 양방향 환산 핸들러 (공통)
  const handleAreaSqmChange = (val: string) => {
    setPreferredArea(val);
    if (!val || isNaN(parseFloat(val))) {
      setPreferredAreaPy('');
    } else {
      const py = (parseFloat(val) / 3.305785).toFixed(1);
      setPreferredAreaPy(py);
    }
  };

  const handleAreaPyChange = (val: string) => {
    setPreferredAreaPy(val);
    if (!val || isNaN(parseFloat(val))) {
      setPreferredArea('');
    } else {
      const sqm = (parseFloat(val) * 3.305785).toFixed(1);
      setPreferredArea(sqm);
    }
  };

  // 상가 최소 면적 양방향 환산 핸들러
  const handleStoreMinAreaSqmChange = (val: string) => {
    setMinRequiredArea(val);
    if (!val || isNaN(parseFloat(val))) {
      setMinRequiredAreaPy('');
    } else {
      const py = (parseFloat(val) / 3.305785).toFixed(1);
      setMinRequiredAreaPy(py);
    }
  };

  const handleStoreMinAreaPyChange = (val: string) => {
    setMinRequiredAreaPy(val);
    if (!val || isNaN(parseFloat(val))) {
      setMinRequiredArea('');
    } else {
      const sqm = (parseFloat(val) * 3.305785).toFixed(1);
      setMinRequiredArea(sqm);
    }
  };

  if (!isOpen) return null;

  const isSearching = type === 'BUYER' || type === 'LESSEE';

  // 주차 요건 종합 텍스트
  const getFullParkingSummary = () => {
    if (isParkingImpossible) return '주차 무관 / 필요없음';
    const parts: string[] = [];
    if (parkingCount) parts.push(`최소 ${parkingCount}대 필수`);
    if (parkingRequirement) parts.push(parkingRequirement);
    return parts.length > 0 ? parts.join(', ') : '주차 조건 협의';
  };

  // 예산/금액 요약 텍스트
  const getBudgetSummary = () => {
    if (targetTransactionType === '매매') {
      return targetPrice ? `매매 ${formatKoreanMoney(targetPrice)}` : '매매가 협의';
    } else if (targetTransactionType === '전세') {
      return targetJeonse ? `전세 ${formatKoreanMoney(targetJeonse)}` : '전세가 협의';
    } else {
      const dep = targetDeposit ? `보증금 ${formatKoreanMoney(targetDeposit)}` : '보증금 협의';
      const rent = targetMonthlyRent ? `월세 ${formatKoreanMoney(targetMonthlyRent)}` : '월세 협의';
      return `${dep} / ${rent}`;
    }
  };

  // 실시간 고객 상담 브리핑 낭독 가이드 대본 생성
  const generateBriefingScript = () => {
    const custName = name.trim() || '고객';
    const propTypeLabel = PROPERTY_TYPE_LABELS[targetPropertyType] || '매물';
    const regionText = targetRegion.trim() ? `'${targetRegion.trim()}'` : '원하시는 지역';
    const regionReasonText = regionReason.trim() ? ` (선정 이유: ${regionReason.trim()})` : '';
    const floorText = preferredFloor ? `'${preferredFloor}'` : '층수 무관';
    const areaText = preferredAreaPy 
      ? `'약 ${preferredAreaPy}평 (${preferredArea}㎡)'` 
      : (preferredArea ? `'${preferredArea}㎡'` : '적정 면적');
    const budgetText = getBudgetSummary();
    const parkingText = getFullParkingSummary();
    const timingText = moveInTiming ? `'${moveInTiming}'` : '협의';
    const timingReasonText = moveInReason.trim() ? ` (사유: ${moveInReason.trim()})` : '';

    let script = `"${custName}님, 지금까지 말씀해주신 조건을 제가 종합하여 소리 내어 확인해 드리겠습니다.\n\n`;
    script += `1. 찾으시는 물건은 [${regionText}${regionReasonText}] 부근의 [${propTypeLabel}] [${targetTransactionType}] 매물입니다.\n`;
    script += `2. 층수는 [${floorText}], 실면적은 [${areaText}], 주차는 [${parkingText}] 조건을 희망하십니다.\n`;
    script += `3. 예산은 [${budgetText}] 수준이며, 입주/오픈은 [${timingText}${timingReasonText}]을 목표로 하고 계십니다.\n`;

    if (targetPropertyType === 'STORE') {
      if (premiumLimit) {
        script += `4. 상가 권리금은 [최대 ${formatKoreanMoney(premiumLimit)} 이내]${premiumReason ? ` (${premiumReason})` : ''}를 상한선으로 보시며,\n`;
      }
      if (minRequiredAreaPy || minRequiredArea) {
        script += `5. 영업에 필요한 최소 실면적은 [최소 ${minRequiredAreaPy ? minRequiredAreaPy + '평' : minRequiredArea + '㎡'}]${minAreaReason ? ` (${minAreaReason})` : ''}입니다.\n`;
      }
    }

    if (nonNegotiableCondition.trim()) {
      script += `★ 특히 여러 조건 중에서도 [${nonNegotiableCondition.trim()}] 조건을 '절대로 양보할 수 없는 최우선 1순위 조건'으로 꼽아주셨습니다.\n`;
    }

    if (negotiableCondition.trim()) {
      script += `★ 반면에 매물이 정말 마음에 든다면 [${negotiableCondition.trim()}] 부분은 '가장 유연하게 양보하거나 조율할 수 있는 조건'으로 말씀해 주셨습니다.\n\n`;
    }

    script += `제가 정리해 드린 상담 내용이 손님께서 생각하신 조건과 정확히 일치하실까요?"`;
    return script;
  };

  const handleCopyBriefing = () => {
    const text = generateBriefingScript();
    navigator.clipboard.writeText(text);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2500);
  };

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
      subType,
      group,
      memo: memo.trim() || undefined,
      managerName: managerName || '사무실',
      createdById: currentUser?.id,
      creatorName: currentUser?.name,
      currentUser,
    };

    if (!isSearching) {
      payload.receivedDetail = {
        propertyType: recvPropertyType,
        transactionType: recvTransactionType,
        price: recvPrice ? parseFloat(recvPrice) : undefined,
        jeonse: recvJeonse ? parseFloat(recvJeonse) : undefined,
        deposit: recvDeposit ? parseFloat(recvDeposit) : undefined,
        monthlyRent: recvMonthlyRent ? parseFloat(recvMonthlyRent) : undefined,
        premium: recvPremium ? parseFloat(recvPremium) : undefined,
        negotiablePrice: recvNegoPrice ? parseFloat(recvNegoPrice) : undefined,
        negotiableJeonse: recvNegoJeonse ? parseFloat(recvNegoJeonse) : undefined,
        negotiableDeposit: recvNegoDeposit ? parseFloat(recvNegoDeposit) : undefined,
        negotiableMonthlyRent: recvNegoMonthlyRent ? parseFloat(recvNegoMonthlyRent) : undefined,
        negotiablePremium: recvNegoPremium ? parseFloat(recvNegoPremium) : undefined,
        floorAndUnit: recvFloorAndUnit.trim() || undefined,
        moveInTiming: recvMoveInTiming.trim() || undefined,
        roadAddress: recvRoadAddress.trim() || undefined,
        jibunAddress: recvJibunAddress.trim() || undefined,
        detailAddress: recvDetailAddress.trim() || undefined,
        dealSupportDetails: recvDealSupport.trim() || undefined,
        isEmpty: recvIsEmpty,
        emptyPeriodOrMoveOutDate: recvEmptyPeriod.trim() || undefined,
        previousBusiness: recvPreviousBusiness.trim() || undefined,
        petAllowed: recvPetAllowed,
        foreignerAllowed: recvForeignerAllowed,
        parkingAvailable: recvParkingAvailable,
        parkingDetails: recvParkingCount.trim() || undefined,
        restrictedBusinesses: recvRestrictedBusinesses.trim() || undefined,
      };

      // 고객 상담 메모에 물건 접수 주요 정보 자동 보존
      const recvSummaryParts: string[] = [];
      if (recvRoadAddress || recvJibunAddress) recvSummaryParts.push(`소재지: ${recvRoadAddress || recvJibunAddress} ${recvDetailAddress}`.trim());
      if (recvFloorAndUnit) recvSummaryParts.push(`층/호수: ${recvFloorAndUnit}`);
      if (recvPrice) recvSummaryParts.push(`희망매매: ${formatKoreanMoney(recvPrice)}`);
      if (recvDeposit || recvMonthlyRent) recvSummaryParts.push(`보증금/월세: ${formatKoreanMoney(recvDeposit)}/${formatKoreanMoney(recvMonthlyRent)}`);
      if (recvPremium) recvSummaryParts.push(`권리금: ${formatKoreanMoney(recvPremium)}`);
      if (recvDealSupport) recvSummaryParts.push(`거래지원: ${recvDealSupport}`);
      if (recvIsEmpty) recvSummaryParts.push(`공실(전업종: ${recvPreviousBusiness || '미상'})`);
      if (recvRestrictedBusinesses) recvSummaryParts.push(`임차거부업종: ${recvRestrictedBusinesses}`);

      if (recvSummaryParts.length > 0) {
        const extraNote = `\n[접수물건 정보] ${recvSummaryParts.join(' | ')}`;
        payload.memo = payload.memo ? `${payload.memo}${extraNote}` : extraNote.trim();
      }
    } else {
      payload.demand = {
        targetPropertyType,
        targetTransactionType,
        targetRegion: targetRegion.trim() || undefined,
        regionReason: regionReason.trim() || undefined,
        minBudget: minBudget ? parseFloat(minBudget) : undefined,
        maxBudget: maxBudget ? parseFloat(maxBudget) : undefined,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        targetJeonse: targetJeonse ? parseFloat(targetJeonse) : undefined,
        minDeposit: targetDeposit ? parseFloat(targetDeposit) : undefined,
        maxDeposit: targetDeposit ? parseFloat(targetDeposit) : undefined,
        minMonthlyRent: targetMonthlyRent ? parseFloat(targetMonthlyRent) : undefined,
        maxMonthlyRent: targetMonthlyRent ? parseFloat(targetMonthlyRent) : undefined,
        preferredFloor: preferredFloor.trim() || undefined,
        preferredArea: preferredArea ? parseFloat(preferredArea) : undefined,
        preferredAreaPy: preferredAreaPy ? parseFloat(preferredAreaPy) : undefined,
        parkingRequirement: getFullParkingSummary(),
        moveInTiming: moveInTiming.trim() || undefined,
        moveInReason: moveInReason.trim() || undefined,
        nonNegotiableCondition: nonNegotiableCondition.trim() || undefined,
        negotiableCondition: negotiableCondition.trim() || undefined,
        premiumLimit: premiumLimit ? parseFloat(premiumLimit) : undefined,
        premiumReason: premiumReason.trim() || undefined,
        minRequiredArea: minRequiredArea ? parseFloat(minRequiredArea) : undefined,
        minRequiredAreaPy: minRequiredAreaPy ? parseFloat(minRequiredAreaPy) : undefined,
        minAreaReason: minAreaReason.trim() || undefined,
        previousVisitedProps: previousVisitedProps.trim() || undefined,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                신규 고객 및 심층 상담장 등록
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {isSearching ? '🎯 매수 / 임차 상담 모드' : '📋 물건 접수 모드'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                고객 기본 인적사항과 함께 희망 조건, 양보 불가 1순위 조건, 실시간 브리핑 가이드를 작성합니다.
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form id="customer-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* ────────────────────────────────────────────────────────── */}
            {/* 섹션 1. 고객 구분 및 기본 정보 */}
            {/* ────────────────────────────────────────────────────────── */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  고객 그룹 및 구분 *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* [물건 접수] 매도/임대인/임차인(권리금원함) */}
                  <div className={`p-3 rounded-xl border-2 transition-all ${
                    !isSearching ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20' : 'border-slate-200 bg-slate-50/70'
                  }`}>
                    <span className="text-xs font-black text-blue-900 block mb-2 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      [물건 접수] 매도인 / 임대인 / 임차인(권리금원함)
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setType('SELLER'); setSubType('SELLER'); }}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                          type === 'SELLER' && subType !== 'LESSEE_PREMIUM'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        매도인
                      </button>
                      <button
                        type="button"
                        onClick={() => { setType('LESSOR'); setSubType('LESSOR'); }}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                          type === 'LESSOR' && subType !== 'LESSEE_PREMIUM'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        임대인
                      </button>
                      <button
                        type="button"
                        onClick={() => { setType('LESSOR'); setSubType('LESSEE_PREMIUM'); }}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                          subType === 'LESSEE_PREMIUM'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-blue-800 border-blue-300 hover:bg-blue-100/50'
                        }`}
                      >
                        임차인(권리금)
                      </button>
                    </div>
                  </div>

                  {/* [물건 찾음] 매수/임차인/임차인(권리금가능) */}
                  <div className={`p-3 rounded-xl border-2 transition-all ${
                    isSearching ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20' : 'border-slate-200 bg-slate-50/70'
                  }`}>
                    <span className="text-xs font-black text-indigo-900 block mb-2 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-indigo-600" />
                      [물건 찾음] 매수인 / 임차인 / 임차인(권리금가능)
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setType('BUYER'); setSubType('BUYER'); }}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                          type === 'BUYER' && subType !== 'LESSEE_PREMIUM_OK'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        매수인
                      </button>
                      <button
                        type="button"
                        onClick={() => { setType('LESSEE'); setSubType('LESSEE'); }}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                          type === 'LESSEE' && subType !== 'LESSEE_PREMIUM_OK'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        임차인
                      </button>
                      <button
                        type="button"
                        onClick={() => { setType('LESSEE'); setSubType('LESSEE_PREMIUM_OK'); }}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                          subType === 'LESSEE_PREMIUM_OK'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-indigo-800 border-indigo-300 hover:bg-indigo-100/50'
                        }`}
                      >
                        임차인(권리금가능)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 고객 기본 인적사항 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">고객명 *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 홍길동"
                    required
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">전화번호 *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="예: 010-1234-5678"
                    required
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>

                <div>
                  {!isSearching ? (
                    <>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        통신사 (매도/임대인)
                      </label>
                      <select
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value as MobileCarrier)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                      >
                        {CARRIER_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        담당 관리 주체
                      </label>
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
                    </div>
                  )}
                </div>
              </div>

              {!isSearching && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">고객 담당 권한자:</span>
                    <span className="text-xs font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                      {managerName === '사무실' ? '사무실 전체 공용' : `${managerName} 전담`}
                    </span>
                  </div>
                  {currentUser && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setManagerName('사무실')}
                        className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                          managerName === '사무실'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-300'
                        }`}
                      >
                        🏢 사무실
                      </button>
                      <button
                        type="button"
                        onClick={() => setManagerName(currentUser.name)}
                        className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                          managerName === currentUser.name
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-300'
                        }`}
                      >
                        👤 본인 ({currentUser.name})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 상담 메모 및 고객 특이사항 (직접 타자 또는 마이크 음성 입력 가능) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    📝 상담 메모 및 고객 특이사항
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-normal">타자 & 마이크 음성 입력</span>
                  </span>
                </label>
                <VoiceTextarea
                  value={memo}
                  onChange={setMemo}
                  rows={2}
                  placeholder="예: 선호 상담시간 오후 2~5시, 기존 방문 손님, 특정 학군 선호 등 직접 입력하거나 마이크 버튼을 눌러 음성으로 입력하세요."
                  className="text-xs"
                />
              </div>
            </div>

            {/* ────────────────────────────────────────────────────────── */}
            {/* 섹션 2. [물건 찾음] 매수인 / 임차인 희망 매물 조건 서브폼 */}
            {/* ────────────────────────────────────────────────────────── */}
            {isSearching && (
              <div className="space-y-5 animate-in fade-in duration-200">
                
                {/* 2-1. 공통 매물 유형 & 거래유형 & 층수 */}
                <div className="p-4 bg-indigo-50/40 rounded-xl border-2 border-indigo-200/90 space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2.5">
                    <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-indigo-600" />
                      [공통 희망 조건] 매물 종류 · 층수 · 지역 · 면적 · 주차 · 일정
                    </h3>
                    <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                      기본 탐색 스펙
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">희망 매물 종류</label>
                      <select
                        value={targetPropertyType}
                        onChange={(e) => setTargetPropertyType(e.target.value as PropertyType)}
                        className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                      >
                        {PROPERTY_TYPE_ORDER.map((p) => (
                          <option key={p} value={p}>{PROPERTY_TYPE_LABELS[p]}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">희망 거래 유형</label>
                      <select
                        value={targetTransactionType}
                        onChange={(e) => setTargetTransactionType(e.target.value as TransactionType)}
                        className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                      >
                        <option value="월세">월세 (보증금 / 월차임)</option>
                        <option value="매매">매매</option>
                        {targetPropertyType !== 'STORE' && <option value="전세">전세</option>}
                      </select>
                    </div>

                    {/* 희망 층수 */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>희망하는 층수</span>
                        <span className="text-[10px] text-slate-400 font-normal">빠른선택/직접입력</span>
                      </label>
                      <input
                        type="text"
                        value={preferredFloor}
                        onChange={(e) => setPreferredFloor(e.target.value)}
                        placeholder="예: 1층 선호, 2층 이하, 로얄층"
                        className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {['1층 선호', '2층', '3층 이하', '고층/로얄층', '지하', '층수 무관'].map((fl) => (
                          <button
                            key={fl}
                            type="button"
                            onClick={() => setPreferredFloor(fl)}
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-colors ${
                              preferredFloor === fl
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {fl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 희망 지역 / 상권 및 그 이유 */}
                  <div className="space-y-2 pt-1 border-t border-indigo-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        희망 지역 / 상권 *
                      </label>
                      <input
                        type="text"
                        value={targetRegion}
                        onChange={(e) => setTargetRegion(e.target.value)}
                        placeholder="예: 강남구 역삼/선릉 먹자골목, 역세권 도보 5분 이내 메인대로변"
                        className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <span className="text-indigo-600">📍</span>
                        희망지역/상권을 선정한 이유
                      </label>
                      <input
                        type="text"
                        value={regionReason}
                        onChange={(e) => setRegionReason(e.target.value)}
                        placeholder="예: 기존 단골 고객층 흡수 유리, 배후 3,000세대 대단지 아파트 배후수요, 직장과 도보 10분 이내 등"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                      />
                    </div>
                  </div>

                  {/* 희망 전용면적 (평 ↔ ㎡ 양방향 자동 환산) */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        희망 전용면적 (평 ↔ ㎡ 실시간 자동 환산)
                      </label>
                      <span className="text-[11px] text-slate-500">1평 = 3.3058㎡</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-600">전용면적 (㎡)</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            value={preferredArea}
                            onChange={(e) => handleAreaSqmChange(e.target.value)}
                            placeholder="예: 66.1"
                            className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg pr-9 focus:bg-white focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">㎡</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-600">실평수 (평)</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            value={preferredAreaPy}
                            onChange={(e) => handleAreaPyChange(e.target.value)}
                            placeholder="예: 20"
                            className="w-full text-xs font-bold px-3 py-2 bg-blue-50/50 border border-blue-300 rounded-lg pr-9 focus:bg-white focus:ring-2 focus:ring-blue-500 text-blue-900"
                          />
                          <span className="absolute right-3 top-2 text-xs font-bold text-blue-600">평</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400 font-semibold mr-1">빠른 선택:</span>
                      {[
                        { py: '10', sqm: '33.1' },
                        { py: '15', sqm: '49.6' },
                        { py: '20', sqm: '66.1' },
                        { py: '30', sqm: '99.2' },
                        { py: '50', sqm: '165.3' },
                        { py: '100', sqm: '330.6' },
                      ].map((item) => (
                        <button
                          key={item.py}
                          type="button"
                          onClick={() => {
                            setPreferredAreaPy(item.py);
                            setPreferredArea(item.sqm);
                          }}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-600 rounded border border-slate-200 transition-colors"
                        >
                          {item.py}평 ({item.sqm}㎡)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 주차 요건 (매물등록란 형식 반영) */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Car className="w-4 h-4 text-indigo-600" />
                        주차 요건 (매물등록 형식)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !isParkingImpossible;
                          setIsParkingImpossible(next);
                          if (next) {
                            setParkingCount('0');
                            setParkingRequirement('주차 무관 / 필요없음');
                          } else {
                            setParkingCount('1');
                            setParkingRequirement('');
                          }
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                          isParkingImpossible
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <Ban className="w-3 h-3" />
                        <span>[주차 무관 / 불필요] 로 설정</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          최소 필요 주차 대수
                        </label>
                        <input
                          type="number"
                          disabled={isParkingImpossible}
                          value={isParkingImpossible ? 0 : parkingCount}
                          onChange={(e) => setParkingCount(e.target.value)}
                          placeholder={isParkingImpossible ? '주차 무관' : '예: 2'}
                          className={`w-full text-xs font-bold px-3 py-2 border rounded-lg ${
                            isParkingImpossible
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                              : 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500'
                          }`}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          주차 세부 요건 및 선호사항
                        </label>
                        <input
                          type="text"
                          value={parkingRequirement}
                          onChange={(e) => setParkingRequirement(e.target.value)}
                          placeholder="예: 자주식 선호, 방문객 1시간 무료 주차 필수, 대형 SUV 진입 가능 등"
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {['자주식 선호', '기계식 가능', '방문객 주차 필수', '화물/탑차 진입', '인근 공영주차장 이용가능'].map((pChip) => (
                        <button
                          key={pChip}
                          type="button"
                          onClick={() => {
                            if (parkingRequirement.includes(pChip)) return;
                            setParkingRequirement(parkingRequirement ? `${parkingRequirement}, ${pChip}` : pChip);
                          }}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded border border-slate-200"
                        >
                          +{pChip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 희망 입주시기/오픈시기 및 그 이유 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        희망 입주시기 / 오픈시기 및 그 이유
                      </label>
                      <div className="flex gap-1">
                        {['즉시가능', '1개월 이내', '2~3개월 이내', '일정 협의'].map((timing) => (
                          <button
                            key={timing}
                            type="button"
                            onClick={() => setMoveInTiming(timing)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-colors ${
                              moveInTiming === timing
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {timing === '즉시가능' ? '⚡ ' + timing : timing}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          희망 시기 (직접 입력 또는 칩 선택)
                        </label>
                        <input
                          type="text"
                          value={moveInTiming}
                          onChange={(e) => setMoveInTiming(e.target.value)}
                          placeholder="예: 2026년 11월 중순, 즉시 입주 가능 등"
                          className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg text-emerald-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          입주/오픈 시기 선정 이유
                        </label>
                        <input
                          type="text"
                          value={moveInReason}
                          onChange={(e) => setMoveInReason(e.target.value)}
                          placeholder="예: 현 임차 매장 만료일 11월 30일, 프랜차이즈 가맹 본사 승인 일정 등"
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 희망 매매가액 / 전세가액 / 보증금 / 월세란 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-amber-600" />
                        희망 가격/예산 입력 (매매가액 / 전세가액 / 보증금 / 월세)
                      </label>
                      <span className="text-[11px] text-slate-400 font-semibold">단위: 만원</span>
                    </div>

                    {targetTransactionType === '매매' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>희망 매매가액</span>
                          {targetPrice && (
                            <span className="text-xs font-black text-blue-700">
                              ≒ {formatKoreanMoney(targetPrice)}
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          value={targetPrice}
                          onChange={(e) => setTargetPrice(e.target.value)}
                          placeholder="예: 150000 (15억원)"
                          className="w-full text-sm font-black px-3.5 py-2.5 bg-blue-50/30 border border-blue-300 rounded-lg text-blue-950 focus:bg-white"
                        />
                      </div>
                    )}

                    {targetTransactionType === '전세' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>희망 전세가액</span>
                          {targetJeonse && (
                            <span className="text-xs font-black text-indigo-700">
                              ≒ {formatKoreanMoney(targetJeonse)}
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          value={targetJeonse}
                          onChange={(e) => setTargetJeonse(e.target.value)}
                          placeholder="예: 50000 (5억원)"
                          className="w-full text-sm font-black px-3.5 py-2.5 bg-indigo-50/30 border border-indigo-300 rounded-lg text-indigo-950 focus:bg-white"
                        />
                      </div>
                    )}

                    {targetTransactionType === '월세' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                            <span>희망 보증금</span>
                            {targetDeposit && (
                              <span className="text-xs font-black text-emerald-700">
                                ≒ {formatKoreanMoney(targetDeposit)}
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            value={targetDeposit}
                            onChange={(e) => setTargetDeposit(e.target.value)}
                            placeholder="예: 5000 (5,000만원)"
                            className="w-full text-sm font-black px-3.5 py-2.5 bg-emerald-50/30 border border-emerald-300 rounded-lg text-emerald-950 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                            <span>희망 월세 (월차임)</span>
                            {targetMonthlyRent && (
                              <span className="text-xs font-black text-amber-700">
                                ≒ {formatKoreanMoney(targetMonthlyRent)}
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            value={targetMonthlyRent}
                            onChange={(e) => setTargetMonthlyRent(e.target.value)}
                            placeholder="예: 300 (300만원)"
                            className="w-full text-sm font-black px-3.5 py-2.5 bg-amber-50/30 border border-amber-300 rounded-lg text-amber-950 focus:bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-[11px] text-slate-500 block mb-0.5">최소 예산 범위 (선택)</span>
                        <input
                          type="number"
                          value={minBudget}
                          onChange={(e) => setMinBudget(e.target.value)}
                          placeholder="최소 예산"
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block mb-0.5">최대 한도 예산 (선택)</span>
                        <input
                          type="number"
                          value={maxBudget}
                          onChange={(e) => setMaxBudget(e.target.value)}
                          placeholder="최대 예산"
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ────────────────────────────────────────────────────────── */}
                {/* 2-2. <상가 전용 심층 상담란> (targetPropertyType === 'STORE') */}
                {/* ────────────────────────────────────────────────────────── */}
                {targetPropertyType === 'STORE' && (
                  <div className="p-4 bg-amber-50/50 rounded-xl border-2 border-amber-300/80 space-y-4">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                      <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-amber-600" />
                        [상가점포 전문 심층 상담 체크리스트]
                      </h3>
                      <span className="text-[11px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded-full border border-amber-300">
                        상가 필터링 핵심
                      </span>
                    </div>

                    {/* 권리금 상한선 & 이유 */}
                    <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <span>권리금 상한선 및 그 이유</span>
                          {premiumLimit && (
                            <span className="text-xs font-black text-amber-700 ml-2">
                              ≒ {formatKoreanMoney(premiumLimit)}
                            </span>
                          )}
                        </label>
                        <div className="flex gap-1">
                          {[
                            { label: '무권리 선호', val: '0' },
                            { label: '최대 2천', val: '2000' },
                            { label: '최대 5천', val: '5000' },
                            { label: '최대 1억', val: '10000' },
                          ].map((prem) => (
                            <button
                              key={prem.label}
                              type="button"
                              onClick={() => setPremiumLimit(prem.val)}
                              className="px-2 py-0.5 text-[10px] font-bold bg-amber-100/70 hover:bg-amber-200 text-amber-900 rounded border border-amber-300 transition-colors"
                            >
                              {prem.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            권리금 상한선 (만원)
                          </label>
                          <input
                            type="number"
                            value={premiumLimit}
                            onChange={(e) => setPremiumLimit(e.target.value)}
                            placeholder="예: 3000 (3,000만원 또는 0: 무권리)"
                            className="w-full text-xs font-bold px-3 py-2 bg-amber-50/30 border border-amber-300 rounded-lg text-amber-950 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            권리금 상한 설정 이유
                          </label>
                          <input
                            type="text"
                            value={premiumReason}
                            onChange={(e) => setPremiumReason(e.target.value)}
                            placeholder="예: 초기 인테리어 전면 철거 필요, 창업 예산 한도 초과 불가 등"
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 최소필요 면적 & 이유 */}
                    <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          최소 필요 면적 및 그 이유
                        </label>
                        <span className="text-[11px] text-slate-400">영업 한계 마지노선</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            최소 면적 (㎡)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={minRequiredArea}
                            onChange={(e) => handleStoreMinAreaSqmChange(e.target.value)}
                            placeholder="예: 49.6"
                            className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            최소 실평수 (평)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={minRequiredAreaPy}
                            onChange={(e) => handleStoreMinAreaPyChange(e.target.value)}
                            placeholder="예: 15"
                            className="w-full text-xs font-bold px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-lg text-amber-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            최소 면적 요구 이유
                          </label>
                          <input
                            type="text"
                            value={minAreaReason}
                            onChange={(e) => setMinAreaReason(e.target.value)}
                            placeholder="예: 4인 테이블 10개 및 5평 주방 집기 배치 필수"
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 지금까지 어떤 매물들을 둘러보았고 왜 계약하지 않았는지 */}
                    <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        지금까지 둘러본 매물과 계약하지 않은 이유 (필수 질문)
                      </label>
                      <textarea
                        rows={2}
                        value={previousVisitedProps}
                        onChange={(e) => setPreviousVisitedProps(e.target.value)}
                        placeholder="예: 인근 ○○빌딩 1층 봤으나 주방 덕트 옥상입상 불가로 탈락, △△상가는 권리금 8천 요구가 과다하여 포기 등"
                        className="w-full text-xs p-2.5 bg-amber-50/20 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900"
                      />
                      <p className="text-[11px] text-amber-800">
                        ※ 손님이 계약을 포기했던 치명적 원인을 파악하면 부적합한 매물 브리핑으로 인한 시간 낭비를 사전에 100% 방지할 수 있습니다.
                      </p>
                    </div>
                  </div>
                )}

                {/* ────────────────────────────────────────────────────────── */}
                {/* 2-3. 공통 체크 사항 (절대 양보 불가 1순위 & 가장 포기하기 쉬운 조건) */}
                {/* ────────────────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* 양보 불가 조건 */}
                  <div className="p-3.5 bg-rose-50/60 rounded-xl border-2 border-rose-300 space-y-2">
                    <label className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                      <span className="p-1 rounded-md bg-rose-600 text-white text-[10px]">1순위</span>
                      절대로 양보할 수 없는 최우선 조건 하나 *
                    </label>
                    <p className="text-[11px] text-rose-800 leading-tight">
                      &quot;나열한 여러 조건 중 어떤 것이 절대 포기 못할 1순위인가요?&quot; 질문 (음성 마이크 지원)
                    </p>
                    <VoiceInput
                      value={nonNegotiableCondition}
                      onChange={setNonNegotiableCondition}
                      placeholder="예: 1층 전면 노출 필수 / 주차 최소 2대 / 예산 3천 초과 절대불가"
                      className="text-xs font-bold border-rose-300 focus:ring-rose-500 text-rose-900"
                    />
                    <div className="flex flex-wrap gap-1">
                      {['1층 전면 노출', '주차 2대 필수', '예산 초과 절대불가', '역세권 도보 5분', '즉시 입주'].map((cond) => (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => setNonNegotiableCondition(cond)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-white text-rose-700 hover:bg-rose-100 rounded border border-rose-200"
                        >
                          {cond}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 포기 가능한 조건 */}
                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border-2 border-emerald-300 space-y-2">
                    <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <span className="p-1 rounded-md bg-emerald-600 text-white text-[10px]">조율</span>
                      매물이 정말 좋을 경우 가장 포기하기 쉬운 조건 *
                    </label>
                    <p className="text-[11px] text-emerald-800 leading-tight">
                      &quot;원하는 입지나 조건이 완벽하다면 어떤 조건을 가장 먼저 양보할 수 있나요?&quot; (음성 마이크 지원)
                    </p>
                    <VoiceInput
                      value={negotiableCondition}
                      onChange={setNegotiableCondition}
                      placeholder="예: 인테리어 좋다면 월세 30만 상향 가능 / 2층도 검토 / 주차 인근 공영 활용"
                      className="text-xs font-bold border-emerald-300 focus:ring-emerald-500 text-emerald-900"
                    />
                    <div className="flex flex-wrap gap-1">
                      {['월세 20~30만 상향 가능', '2층/지하도 검토', '면적 약간 작아도 무방', '주차 인근 공영 활용', '입주시점 조율'].map((cond) => (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => setNegotiableCondition(cond)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-white text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200"
                        >
                          {cond}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ────────────────────────────────────────────────────────── */}
                {/* 2-4. [손님 브리핑 낭독 가이드] 실시간 텍스트 대본 카드 */}
                {/* ────────────────────────────────────────────────────────── */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white border-2 border-indigo-400/40 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                        <Volume2 className="w-4 h-4 text-indigo-300 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-indigo-200 flex items-center gap-1.5">
                          고객 상담 실시간 브리핑 낭독 가이드
                        </h4>
                        <span className="text-[11px] text-indigo-300/80">
                          (지금까지 파악한 조건들을 종합하여 손님에게 소리 내어 직접 읽어주세요)
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyBriefing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-95 shadow-xs"
                    >
                      {copiedBriefing ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span className="text-emerald-200">복사 완료!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>대본 복사</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-lg bg-black/40 border border-indigo-500/30 font-sans text-xs text-slate-200 leading-relaxed whitespace-pre-line select-all">
                    {generateBriefingScript()}
                  </div>

                  <p className="text-[11px] text-indigo-300/70 italic text-right">
                    💡 고객에게 파악된 조건을 구두로 낭독해 드리면 중개 전문성에 대한 신뢰도가 급상승합니다.
                  </p>
                </div>

              </div>
            )}

            {/* ────────────────────────────────────────────────────────── */}
            {/* 섹션 3. [물건 접수] 매도인 / 임대인 / 임차인(권리금) 물건 상세 정보 */}
            {/* ────────────────────────────────────────────────────────── */}
            {!isSearching && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 bg-blue-50/50 rounded-xl border-2 border-blue-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-blue-200/80 pb-2.5">
                    <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      [물건 접수 상세] 매물 종류 · 거래유형 · 희망/조정 가격 · 주소 · 특약/지원
                    </h3>
                    <span className="text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                      내놓는 물건 스펙
                    </span>
                  </div>

                  {/* 3-1. 매물 종류 & 거래 유형 & 층수/동호수 & 입주시기 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">매물 종류 *</label>
                      <select
                        value={recvPropertyType}
                        onChange={(e) => setRecvPropertyType(e.target.value as PropertyType)}
                        className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                      >
                        {PROPERTY_TYPE_ORDER.map((p) => (
                          <option key={p} value={p}>{PROPERTY_TYPE_LABELS[p]}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">거래 유형 *</label>
                      <select
                        value={recvTransactionType}
                        onChange={(e) => setRecvTransactionType(e.target.value as any)}
                        className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                      >
                        <option value="매매">매매</option>
                        <option value="전세">전세</option>
                        <option value="월세">월세</option>
                        <option value="임대">임대 (보증금/월세)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">매물 층수나 동호수</label>
                      <input
                        type="text"
                        value={recvFloorAndUnit}
                        onChange={(e) => setRecvFloorAndUnit(e.target.value)}
                        placeholder="예: 3층 301호 / 1층 전면"
                        className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">입주시기 및 오픈시기</label>
                      <input
                        type="text"
                        value={recvMoveInTiming}
                        onChange={(e) => setRecvMoveInTiming(e.target.value)}
                        placeholder="예: 즉시가능 / 협의 / 11월말"
                        className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* 3-2. 물건 주소 (도로명 / 지번 양방향 자동완성 및 우편번호 검색) */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        물건 주소 (도로명 또는 지번 입력 시 반대편 자동완성)
                      </label>
                      <button
                        type="button"
                        onClick={handleOpenRecvPostcode}
                        className="px-2.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-2xs"
                      >
                        우편번호/주소 검색
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div>
                        <span className="text-[11px] font-bold text-slate-600 block mb-1">도로명 주소</span>
                        <input
                          type="text"
                          value={recvRoadAddress}
                          onChange={(e) => handleRecvRoadAddressChange(e.target.value)}
                          placeholder="도로명 주소 입력 시 지번 자동 변환"
                          className="w-full text-xs px-3 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-600 block mb-1">지번 주소</span>
                        <input
                          type="text"
                          value={recvJibunAddress}
                          onChange={(e) => handleRecvJibunAddressChange(e.target.value)}
                          placeholder="지번 주소 입력 시 도로명 자동 변환"
                          className="w-full text-xs px-3 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={recvDetailAddress}
                        onChange={(e) => setRecvDetailAddress(e.target.value)}
                        placeholder="상세 주소 (동, 층, 호수 등)"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* 3-3. 희망 가격 (매매가 / 전세가 / 보증금 / 월세 / 권리금) & 조정할 수 있는 가격 */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-black text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        💰 희망 가격 & 조정할 수 있는 가격 (단위: 만원)
                      </span>
                      <span className="text-[11px] font-normal text-slate-500">
                        의뢰받은 희망가와 협의 가능한 한도선을 미리 기록하여 최적 매칭
                      </span>
                    </h4>

                    {/* 매매의 경우 */}
                    {recvTransactionType === '매매' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-2.5 bg-blue-50/40 rounded-lg border border-blue-200">
                          <label className="block text-xs font-bold text-blue-900 mb-1">희망 매매가액 (만원)</label>
                          <input
                            type="number"
                            value={recvPrice}
                            onChange={(e) => setRecvPrice(e.target.value)}
                            placeholder="예: 50000 (5억원)"
                            className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                          <label className="block text-xs font-bold text-slate-700 mb-1">조정할 수 있는 매매가액 (만원)</label>
                          <input
                            type="number"
                            value={recvNegoPrice}
                            onChange={(e) => setRecvNegoPrice(e.target.value)}
                            placeholder="예: 48000 (최저선 4억 8천)"
                            className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    )}

                    {/* 전세의 경우 */}
                    {recvTransactionType === '전세' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-2.5 bg-blue-50/40 rounded-lg border border-blue-200">
                          <label className="block text-xs font-bold text-blue-900 mb-1">희망 전세가액 (만원)</label>
                          <input
                            type="number"
                            value={recvJeonse}
                            onChange={(e) => setRecvJeonse(e.target.value)}
                            placeholder="예: 30000 (3억원)"
                            className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                          <label className="block text-xs font-bold text-slate-700 mb-1">조정할 수 있는 전세가액 (만원)</label>
                          <input
                            type="number"
                            value={recvNegoJeonse}
                            onChange={(e) => setRecvNegoJeonse(e.target.value)}
                            placeholder="예: 28000"
                            className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    )}

                    {/* 월세/임대의 경우 */}
                    {(recvTransactionType === '월세' || recvTransactionType === '임대') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        <div className="p-2 bg-blue-50/40 rounded-lg border border-blue-200">
                          <label className="block text-[11px] font-bold text-blue-900 mb-1">희망 보증금 (만원)</label>
                          <input
                            type="number"
                            value={recvDeposit}
                            onChange={(e) => setRecvDeposit(e.target.value)}
                            placeholder="예: 3000"
                            className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div className="p-2 bg-blue-50/40 rounded-lg border border-blue-200">
                          <label className="block text-[11px] font-bold text-blue-900 mb-1">희망 월세 (만원)</label>
                          <input
                            type="number"
                            value={recvMonthlyRent}
                            onChange={(e) => setRecvMonthlyRent(e.target.value)}
                            placeholder="예: 250"
                            className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">조정 보증금 (만원)</label>
                          <input
                            type="number"
                            value={recvNegoDeposit}
                            onChange={(e) => setRecvNegoDeposit(e.target.value)}
                            placeholder="예: 2000"
                            className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">조정 월세 (만원)</label>
                          <input
                            type="number"
                            value={recvNegoMonthlyRent}
                            onChange={(e) => setRecvNegoMonthlyRent(e.target.value)}
                            placeholder="예: 230"
                            className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    )}

                    {/* 권리금 (상가이거나 임차인(권리금원함)인 경우 또는 필요 시) */}
                    {(recvPropertyType === 'STORE' || subType === 'LESSEE_PREMIUM') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-200">
                          <label className="block text-xs font-bold text-amber-900 mb-1">희망 권리금 (만원)</label>
                          <input
                            type="number"
                            value={recvPremium}
                            onChange={(e) => setRecvPremium(e.target.value)}
                            placeholder="예: 5000 (무권리면 0 입력)"
                            className="w-full text-xs font-bold px-3 py-2 bg-white border border-amber-300 rounded-lg text-amber-950"
                          />
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                          <label className="block text-xs font-bold text-slate-700 mb-1">조정할 수 있는 권리금 (만원)</label>
                          <input
                            type="number"
                            value={recvNegoPremium}
                            onChange={(e) => setRecvNegoPremium(e.target.value)}
                            placeholder="예: 3500 (최저 수용 가능선)"
                            className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3-4. 실거래 시 지원 세부사항 (렌트프리, 인테리어비용지원 등) */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        🎁 실거래 시 지원 세부사항 (렌트프리, 인테리어비용지원 등)
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-normal">음성 마이크 지원</span>
                      </span>
                    </label>
                    <VoiceInput
                      value={recvDealSupport}
                      onChange={setRecvDealSupport}
                      placeholder="예: 렌트프리 1개월 제공 가능, 인테리어 공사기간 2주 협의, 시설비 일부 감액 등"
                      className="text-xs font-semibold"
                    />
                    <div className="flex flex-wrap gap-1">
                      {['렌트프리 1개월', '렌트프리 2개월', '인테리어 공사기간 15일 지원', '인테리어 비용 협의 지원', '시설 무상 승계'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setRecvDealSupport((prev) => prev ? `${prev}, ${tag}` : tag)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3-5. 물건 비어있음 여부 / 빈 시기나 이사시기 / 전에 하던 업종 */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        물건 공실 여부 및 이사/전 업종 정보
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRecvIsEmpty(true)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                            recvIsEmpty
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          현재 공실 상태
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecvIsEmpty(false)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                            !recvIsEmpty
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          현재 운영/거주 중
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {recvIsEmpty ? '공실이 된 시기 (빈 시기)' : '이사/퇴거 예정 시기'}
                        </label>
                        <input
                          type="text"
                          value={recvEmptyPeriod}
                          onChange={(e) => setRecvEmptyPeriod(e.target.value)}
                          placeholder={recvIsEmpty ? "예: 2024년 6월부터 공실 (약 3개월째)" : "예: 2024년 11월 30일 이사 확정"}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          전에 하던 업종 (또는 현재 업종)
                        </label>
                        <input
                          type="text"
                          value={recvPreviousBusiness}
                          onChange={(e) => setRecvPreviousBusiness(e.target.value)}
                          placeholder="예: 카페(일반음식점), 의류매장, 미용실, IT사무실 등"
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3-6. 주거용 vs 상업용 조건부 특화 항목 */}
                  {/* 주거용(아파트/주택): 반려동물/외국인 가능 여부 */}
                  {(recvPropertyType === 'APARTMENT' || recvPropertyType === 'HOUSE') ? (
                    <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-200 space-y-2.5">
                      <span className="text-xs font-black text-amber-950 block">
                        🏠 주거용 필수 확인 조건 (반려동물 및 외국인 거주)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">반려동물 가능 여부</label>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { label: '가능', val: 'YES' },
                              { label: '불가', val: 'NO' },
                              { label: '협의', val: 'DISCUSS' },
                            ].map((opt) => (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => setRecvPetAllowed(opt.val as any)}
                                className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                  recvPetAllowed === opt.val
                                    ? 'bg-amber-600 text-white border-amber-600'
                                    : 'bg-white text-slate-700 border-slate-300'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">외국인 입주 가능 여부</label>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { label: '가능', val: 'YES' },
                              { label: '불가', val: 'NO' },
                              { label: '협의', val: 'DISCUSS' },
                            ].map((opt) => (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => setRecvForeignerAllowed(opt.val as any)}
                                className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                  recvForeignerAllowed === opt.val
                                    ? 'bg-amber-600 text-white border-amber-600'
                                    : 'bg-white text-slate-700 border-slate-300'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 상가/사무실 등 나머지: 주차 가능 여부 및 상가 임차거부 업종 */
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          🚗 주차 가능 여부 및 조건
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="flex gap-1">
                            {[
                              { label: '가능', val: 'YES' },
                              { label: '불가', val: 'NO' },
                              { label: '협의', val: 'DISCUSS' },
                            ].map((opt) => (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => setRecvParkingAvailable(opt.val as any)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                  recvParkingAvailable === opt.val
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-700 border-slate-300'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              value={recvParkingCount}
                              onChange={(e) => setRecvParkingCount(e.target.value)}
                              placeholder="예: 무료 1대 가능 / 기계식 / 인근 공영주차장 이용"
                              className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 상가 임대의 경우 임차 거부 업종 */}
                      {recvPropertyType === 'STORE' && (
                        <div className="pt-2 border-t border-slate-200">
                          <label className="block text-xs font-bold text-rose-900 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              🚫 상가 임대 시 임차 거부 업종
                              <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-normal">음성 마이크 지원</span>
                            </span>
                          </label>
                          <VoiceInput
                            value={recvRestrictedBusinesses}
                            onChange={setRecvRestrictedBusinesses}
                            placeholder="예: 고기구이(냄새/연기), 유흥주점/단란주점 사절, 소음 유발 업종, 종교시설 불가 등"
                            className="text-xs font-semibold border-rose-300 focus:ring-rose-500"
                          />
                          <div className="flex flex-wrap gap-1 mt-1">
                            {['유흥/주점 불가', '고기구이(냄새/연기) 불가', '소음 유발 업종 사절', '종교시설 불가'].map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setRecvRestrictedBusinesses((prev) => prev ? `${prev}, ${r}` : r)}
                                className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200"
                              >
                                +{r}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-bold">
                {errorMsg}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isSearching ? (
              <span className="font-semibold text-indigo-700">
                ✨ 희망조건 및 브리핑 카드가 함께 저장되어 매칭과 재상담에 활용됩니다.
              </span>
            ) : (
              <span>매도/임대 고객 기본 인적사항이 등록됩니다.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
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
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all"
            >
              {submitting ? '고객 등록 처리 중...' : '신규 고객 등록 완료'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
