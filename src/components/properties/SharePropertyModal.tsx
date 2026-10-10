// src/components/properties/SharePropertyModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  MessageSquare, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Building2,
  ExternalLink,
  Phone,
  Lock
} from 'lucide-react';
import { PropertyItem, PROPERTY_TYPE_LABELS } from '@/lib/types';
import { 
  AddressShareMode, 
  shareViaKakao, 
  copyPropertyShareLink, 
  generateSmsLink, 
  formatAddressByMode,
  BROKER_OFFICE_INFO,
  getAppBaseUrl,
  handleSmartSms 
} from '@/lib/kakao';

interface SharePropertyModalProps {
  property: PropertyItem | null;
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AddressShareMode;
}

export const SharePropertyModal: React.FC<SharePropertyModalProps> = ({
  property,
  isOpen,
  onClose,
  initialMode = 'dong',
}) => {
  const [addressMode, setAddressMode] = useState<AddressShareMode>(initialMode);
  const [hidePropertyName, setHidePropertyName] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isSendingKakao, setIsSendingKakao] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAddr = localStorage.getItem('pref_address_share_mode') as AddressShareMode | null;
      if (savedAddr && (savedAddr === 'full' || savedAddr === 'dong' || savedAddr === 'hidden')) {
        setAddressMode(savedAddr);
      }
      const savedHideName = localStorage.getItem('pref_hide_property_name');
      if (savedHideName !== null) {
        setHidePropertyName(savedHideName === 'true');
      }
    }
  }, [isOpen]);

  if (!isOpen || !property) return null;

  const handleModeChange = (mode: AddressShareMode) => {
    setAddressMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pref_address_share_mode', mode);
    }
  };

  const handleHideNameChange = (hide: boolean) => {
    setHidePropertyName(hide);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pref_hide_property_name', String(hide));
    }
  };

  const propType = PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType;
  
  let priceStr = '';
  if (property.transactionType === '매매') {
    priceStr = property.price ? `${property.price.toLocaleString()} 만원` : '협의';
  } else if (property.transactionType === '전세') {
    priceStr = property.deposit ? `${property.deposit.toLocaleString()} 만원` : '협의';
  } else {
    const isVat = property.monthlyRentVat || property.storeDetail?.monthlyRentVat || property.officeDetail?.monthlyRentVat;
    const vatText = isVat ? ' (부가세 별도)' : '';
    priceStr = `보증금 ${property.deposit ? property.deposit.toLocaleString() + '만' : '0'} / 월세 ${property.monthlyRent ? property.monthlyRent.toLocaleString() + '만' : '0'}${vatText}`;
    if (property.propertyType === 'STORE') {
      const isNoPrem = !!(property.storeDetail?.isNoPremium || property.isNoPremium || (property.storeDetail && property.storeDetail.premium === 0));
      const premVal = isNoPrem
        ? 0
        : (property.storeDetail?.premium ?? property.premium ?? (property.propertyNumber === '구만족발보쌈' ? 10000 : (property.propertyNumber === '왕돈까스' ? 3000 : undefined)));
      if (isNoPrem) {
        priceStr += ' · 무권리';
      } else if (premVal !== undefined && premVal !== null) {
        const shortPrem = premVal >= 10000 ? `${(premVal / 10000).toFixed(premVal % 10000 === 0 ? 0 : 1)}억` : `${premVal.toLocaleString()}만`;
        priceStr += ` · 권리 ${shortPrem}`;
      }
    }
  }

  const { displayAddress } = formatAddressByMode(property.address, property.detailAddress, addressMode);

  const originalName = property.apartmentDetail?.complexName || 
    property.storeDetail?.storeName || 
    property.officeDetail?.officeName || 
    property.factoryWarehouseDetail?.companyName || 
    property.landDetail?.companyName || '';

  const transactionItemTitle = property.transactionType === '매매' 
    ? '매매물건' 
    : property.transactionType === '전세' 
      ? '전세물건' 
      : '월세물건';

  const displayTitle = hidePropertyName ? transactionItemTitle : (originalName || transactionItemTitle);
  const previewTitle = `[매물 #${property.propertyNumber}] ${displayTitle}`;

  const handleKakao = async () => {
    setIsSendingKakao(true);
    try {
      await shareViaKakao({
        id: property.id,
        title: originalName || transactionItemTitle,
        description: `${property.address} ${property.detailAddress || ''}`,
        priceText: `${property.transactionType} ${priceStr}`,
        address: property.address,
        detailAddress: property.detailAddress,
        propertyNumber: property.propertyNumber,
        propertyType: displayTitle,
        property: property,
        addressMode: addressMode,
        hidePropertyName: hidePropertyName,
      });
    } finally {
      setIsSendingKakao(false);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyPropertyShareLink(property, addressMode, hidePropertyName);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const smsLink = generateSmsLink(property, addressMode, hidePropertyName);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                매물 카톡 전송 & 고객 브리핑 설정
              </h3>
              <p className="text-xs text-slate-500">
                매물 #{property.propertyNumber} · {propType} ({property.transactionType})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">

          {/* 1. Address Disclosure Options */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>고객 전송 시 주소 공개 범위 설정</span>
            </label>
            
            <div className="space-y-2">
              {/* Option 1: Dong level (Recommended) */}
              <label 
                className={`flex items-start gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                  addressMode === 'dong'
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
                onClick={() => handleModeChange('dong')}
              >
                <input
                  type="radio"
                  name="addressMode"
                  value="dong"
                  checked={addressMode === 'dong'}
                  onChange={() => handleModeChange('dong')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      동/읍/면까지만 공개
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-600 text-white">
                      추천 (직거래 방지)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    상세 번지와 호수를 감추어 고객의 직접 방문 및 타 중개업소 유출을 방지합니다.
                  </p>
                  <p className="text-[11px] font-mono text-blue-800 bg-white/80 px-2 py-0.5 rounded border border-blue-200 mt-1">
                    표시 예: {formatAddressByMode(property.address, property.detailAddress, 'dong').displayAddress}
                  </p>
                </div>
              </label>

              {/* Option 2: Full Address */}
              <label 
                className={`flex items-start gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                  addressMode === 'full'
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
                onClick={() => handleModeChange('full')}
              >
                <input
                  type="radio"
                  name="addressMode"
                  value="full"
                  checked={addressMode === 'full'}
                  onChange={() => handleModeChange('full')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      전체 주소 공개
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
                      상세 호수 포함
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    도로명/지번 및 상세 동·호수까지 고객에게 전체 공개합니다.
                  </p>
                  <p className="text-[11px] font-mono text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-slate-200 mt-1">
                    표시 예: {formatAddressByMode(property.address, property.detailAddress, 'full').displayAddress}
                  </p>
                </div>
              </label>

              {/* Option 3: Hidden */}
              <label 
                className={`flex items-start gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                  addressMode === 'hidden'
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
                onClick={() => handleModeChange('hidden')}
              >
                <input
                  type="radio"
                  name="addressMode"
                  value="hidden"
                  checked={addressMode === 'hidden'}
                  onChange={() => handleModeChange('hidden')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      주소 비공개 (유선 문의 안내)
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold">
                      보안 최고
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    소재지를 일체 숨기고 유선 상담 시 안내하도록 유도합니다.
                  </p>
                  <p className="text-[11px] font-mono text-amber-800 bg-white/80 px-2 py-0.5 rounded border border-amber-200 mt-1">
                    표시 예: {formatAddressByMode(property.address, property.detailAddress, 'hidden').displayAddress}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 1.5. 매물명(상호/단지명) 표기 방식 선택 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span>매물명(상호/단지명) 표기 방식 선택</span>
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* 옵션 1: 매물명 숨김 (매매물건/전세물건/월세물건) */}
              <label 
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                  hidePropertyName
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
                onClick={() => handleHideNameChange(true)}
              >
                <input
                  type="radio"
                  name="hidePropertyName"
                  checked={hidePropertyName}
                  onChange={() => handleHideNameChange(true)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      [{transactionItemTitle}]으로 표기
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-600 text-white">
                      보안 추천
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    상호명/단지명을 가려 검색을 통한 위치 유출 및 직거래를 방지합니다.
                  </p>
                  <p className="text-[11px] font-mono font-bold text-blue-800 bg-white/80 px-2 py-0.5 rounded border border-blue-200 mt-1">
                    미리보기: {transactionItemTitle}
                  </p>
                </div>
              </label>

              {/* 옵션 2: 원래 매물명 표시 (상호명/단지명 노출) */}
              <label 
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                  !hidePropertyName
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
                onClick={() => handleHideNameChange(false)}
              >
                <input
                  type="radio"
                  name="hidePropertyName"
                  checked={!hidePropertyName}
                  onChange={() => handleHideNameChange(false)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      원래 매물명 표시
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    상호명이나 단지명을 고객에게 그대로 보여줍니다.
                  </p>
                  <p className="text-[11px] font-mono text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-slate-200 mt-1 truncate">
                    미리보기: {originalName || transactionItemTitle}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 2. Security Shield Notice: 매물주(의뢰인) 정보 철저 배제 확인 */}
          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">매물주(의뢰인) 개인정보 보호 철저:</span>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                매물주(의뢰인) 성명({property.customer?.name ? '***' : '없음'})과 연락처는 카톡/문자/링크에서 완전히 제외되며, 공인중개사사무소 연락처만 전송됩니다.
              </p>
            </div>
          </div>

          {/* 2.5 중개사 내부 참고용 상담 메모 (중개사는 화면에서 확인하되, 고객 전송 시엔 100% 미포함) */}
          {property.consultationNotes && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="flex items-center justify-between font-bold text-amber-900">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>중개사 내부 참고용 상담 메모 (고객 카톡/문자 전송 시 자동 제외)</span>
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-extrabold">대외비</span>
              </div>
              <p className="text-slate-800 whitespace-pre-wrap font-medium bg-white p-2.5 rounded-lg border border-amber-100">
                {property.consultationNotes}
              </p>
              <p className="text-[10px] text-amber-700">
                ※ 이 메모는 중개사 브리핑 참고용이며, 고객에게 전송되는 카카오톡이나 문자에는 절대 포함되지 않습니다.
              </p>
            </div>
          )}

          {/* 3. Live Preview Card */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>카카오톡 및 링크 전송 미리보기</span>
              </label>
            </div>

            <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-300 text-xs font-mono space-y-1.5">
              <div className="font-bold text-slate-900">{previewTitle}</div>
              <div className="text-blue-700 font-bold">● 금액: {priceStr}</div>
              <div className="text-slate-700">● 위치: {displayAddress}</div>
              <div className="text-slate-600">● 문의: {BROKER_OFFICE_INFO.officeName} (☎ {BROKER_OFFICE_INFO.tel})</div>
              <div className="pt-1 text-[11px] text-slate-400">👉 [매물 상세안내 보기] 링크 포함</div>
            </div>
          </div>

        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2">
          {/* Kakao Share Button */}
          <button
            type="button"
            onClick={handleKakao}
            disabled={isSendingKakao}
            className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] font-extrabold text-xs shadow-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#191919]"></span>
            <span>{isSendingKakao ? '카톡 전송 중...' : '🟡 카카오톡으로 전송'}</span>
          </button>

          {/* Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-transform active:scale-95"
          >
            {isCopied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600" />
                <span>🔗 안내문구 + 링크 복사</span>
              </>
            )}
          </button>

          {/* SMS Button (모바일 스마트폰 전용, PC에서는 삭제/숨김) */}
          <button
            type="button"
            onClick={() => {
              handleSmartSms(property, undefined, addressMode, hidePropertyName);
            }}
            className="flex md:hidden w-full sm:w-auto py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            title="스마트폰 문자 앱 즉시 실행"
          >
            <MessageSquare className="w-4 h-4" />
            <span>💬 문자로 전송</span>
          </button>
        </div>

      </div>
    </div>
  );
};
