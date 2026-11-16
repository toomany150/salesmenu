'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Copy, 
  CheckCircle2, 
  MessageSquare, 
  Share2, 
  FileText, 
  MapPin, 
  Building2,
  Check,
  Send,
  Sparkles
} from 'lucide-react';
import { PropertyItem, PROPERTY_TYPE_LABELS, getPropertyDisplayName } from '@/lib/types';
import { generatePropertyTextSummary } from '@/lib/propertySummary';
import { shareViaKakao, handleSmartSms } from '@/lib/kakao';

interface PropertyTextSummaryModalProps {
  property: PropertyItem | null;
  onClose: () => void;
}

export const PropertyTextSummaryModal: React.FC<PropertyTextSummaryModalProps> = ({
  property,
  onClose,
}) => {
  const [includeFullAddress, setIncludeFullAddress] = useState(true);
  const [includeBrokerInfo, setIncludeBrokerInfo] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [customText, setCustomText] = useState<string | null>(null);

  // 자동 생성된 텍스트
  const defaultSummaryText = useMemo(() => {
    if (!property) return '';
    return generatePropertyTextSummary(property, {
      includeFullAddress,
      includeBrokerInfo,
    });
  }, [property, includeFullAddress, includeBrokerInfo]);

  // 사용자가 수정한 경우 해당 내용, 아니면 자동 생성 텍스트 사용
  const currentText = customText !== null ? customText : defaultSummaryText;

  if (!property) return null;

  const propType = PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType;
  const propTitle = getPropertyDisplayName(property);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(currentText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = currentText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      alert('클립보드 복사 중 오류가 발생했습니다.');
    }
  };

  const handleKakaoShare = async () => {
    const originalName =
      (property as any).storeDetail?.storeName ||
      (property as any).apartmentDetail?.complexName ||
      (property as any).officeDetail?.officeName ||
      (property as any).factoryWarehouseDetail?.companyName ||
      (property as any).landDetail?.companyName ||
      '';
    await shareViaKakao({
      id: property.id,
      title: originalName || propTitle,
      description: `${property.address} ${property.detailAddress || ''}`,
      priceText: `${property.transactionType}`,
      address: property.address,
      detailAddress: property.detailAddress,
      propertyNumber: property.propertyNumber,
      propertyType: propType,
      property: property,
      addressMode: includeFullAddress ? 'full' : 'dong',
      hidePropertyName: false,
    });
  };

  const handleSmsSend = () => {
    handleSmartSms(property, undefined, includeFullAddress ? 'full' : 'dong', false);
  };

  const handleResetText = () => {
    setCustomText(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white px-5 py-3.5 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight truncate">
                  매물 정보 텍스트 요약
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-white font-mono text-[11px] font-bold shrink-0">
                  #{property.propertyNumber}
                </span>
              </div>
              <p className="text-xs text-indigo-100 truncate mt-0.5 font-medium">
                {propTitle} · {propType} ({property.transactionType})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 상단 옵션 설정 바 */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs font-semibold text-slate-700 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeFullAddress}
                onChange={(e) => {
                  setIncludeFullAddress(e.target.checked);
                  setCustomText(null);
                }}
                className="w-3.5 h-3.5 rounded-sm text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span>전체 상세주소 공개</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeBrokerInfo}
                onChange={(e) => {
                  setIncludeBrokerInfo(e.target.checked);
                  setCustomText(null);
                }}
                className="w-3.5 h-3.5 rounded-sm text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span>중개사무소 정보 포함</span>
            </label>
          </div>
          {customText !== null && (
            <button
              type="button"
              onClick={handleResetText}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
            >
              원본 텍스트로 초기화
            </button>
          )}
        </div>

        {/* 요약 텍스트 본문 (편집 가능 Textarea) */}
        <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto">
          <div className="relative h-full flex flex-col">
            <div className="flex items-center justify-between mb-1.5 text-xs text-slate-500">
              <span className="font-bold flex items-center gap-1 text-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                텍스트 브리핑 내용 (복사 전 직접 수정 가능)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {currentText.length}자
              </span>
            </div>
            <textarea
              value={currentText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={14}
              className="w-full flex-1 p-3.5 text-xs sm:text-sm font-mono leading-relaxed bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden text-slate-800 shadow-inner resize-none select-text"
              placeholder="매물 요약 내용이 생성됩니다..."
              spellCheck={false}
            />
          </div>
        </div>

        {/* 하단 액션 버튼 바 */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 sm:px-5 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            {/* 카카오톡 공유 */}
            <button
              type="button"
              onClick={handleKakaoShare}
              className="py-2 px-3 rounded-xl bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] font-extrabold text-xs shadow-2xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              title="카카오톡으로 매물 요약 전송"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-[#191919]" />
              <span>카카오톡 전송</span>
            </button>
            {/* 문자 발송 */}
            <button
              type="button"
              onClick={handleSmsSend}
              className="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              title="스마트폰 문자(SMS) 앱 실행 또는 문자 내용 복사"
            >
              <Send className="w-3.5 h-3.5" />
              <span>문자 전송</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* 텍스트 전체 복사 버튼 */}
            <button
              type="button"
              onClick={handleCopy}
              className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl font-black text-xs sm:text-sm shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isCopied
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
              }`}
            >
              {isCopied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>복사 완료! (붙여넣기 가능)</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>📋 텍스트 전체 복사</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
