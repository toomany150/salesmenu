'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Megaphone, 
  Check, 
  Save, 
  RotateCcw, 
  Sparkles,
  Globe,
  FileText,
  Compass,
  Building2,
  Share2,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { PropertyItem, ADVERTISING_PLATFORMS, parseAdvertisingPlatforms, AdvertisingProgressData } from '@/lib/types';
import { saveCustomProperty } from '@/lib/storage';
import { useAuth } from '../auth/AuthContext';

interface PropertyAdProgressModalProps {
  property: PropertyItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updatedProperty: PropertyItem) => void;
}

export const PropertyAdProgressModal: React.FC<PropertyAdProgressModalProps> = ({
  property,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { currentUser } = useAuth();
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [etcText, setEtcText] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && property) {
      const parsed = parseAdvertisingPlatforms(property.advertisingPlatforms);
      setSelectedChannels(parsed.channels || []);
      setEtcText(parsed.etcText || '');
      setSaveSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, property?.id, property?.advertisingPlatforms]);

  if (!isOpen || !property) return null;

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) => {
      if (prev.includes(channelId)) {
        return prev.filter((c) => c !== channelId);
      } else {
        return [...prev, channelId];
      }
    });
  };

  const handleSelectAll = () => {
    const allIds = ADVERTISING_PLATFORMS.map((p) => p.id);
    setSelectedChannels(allIds);
  };

  const handleClearAll = () => {
    setSelectedChannels([]);
    setEtcText('');
  };

  const handleSave = async () => {
    if (!property) return;
    setIsSaving(true);
    setErrorMessage(null);

    const payloadData: AdvertisingProgressData = {
      channels: selectedChannels,
      etcText: selectedChannels.includes('기타') ? etcText.trim() : undefined,
    };
    const jsonString = JSON.stringify(payloadData);

    const updatedProperty: PropertyItem = {
      ...property,
      advertisingPlatforms: jsonString,
    };

    try {
      let localUser = currentUser;
      if (!localUser && typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('cham_real_estate_user');
          if (stored) localUser = JSON.parse(stored);
        } catch {}
      }

      const activeUser = localUser || { id: 'admin', role: 'ADMIN', name: '개업공인중개사 (대표)', canAccessAllData: true };

      const res = await fetch('/api/properties', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': activeUser.id || '',
          'x-user-name': encodeURIComponent(activeUser.name || ''),
          'x-user-role': activeUser.role || 'ADMIN',
          'x-user-can-access-all': activeUser.canAccessAllData ? 'true' : 'false',
        },
        body: JSON.stringify({
          id: property.id,
          propertyNumber: property.propertyNumber,
          advertisingPlatforms: jsonString,
          currentUser: activeUser,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `저장 실패 (${res.status})`);
      }

      // 로컬 스토리지 동기화
      saveCustomProperty(updatedProperty);

      if (onSaved) {
        onSaved(updatedProperty);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('광고진행 저장 오류:', err);
      // 로컬에 동기화
      saveCustomProperty(updatedProperty);
      if (onSaved) {
        onSaved(updatedProperty);
      }
      setErrorMessage(`저장 중 안내: ${err.message || '서버 오류'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const isEtcSelected = selectedChannels.includes('기타');

  return (
    <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Megaphone className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                <span>광고진행 상황 관리</span>
                {selectedChannels.length > 0 && (
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {selectedChannels.length}개 진행중
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[260px] sm:max-w-xs mt-0.5">
                #{property.propertyNumber} {property.roadAddress || property.address}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 안내 배너 */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2 text-xs text-amber-900 leading-relaxed">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-black">광고 채널 체크:</span> 현재 매물이 노출 및 홍보 중인 채널을 체크해 두시면 매물 카드에서 즉시 광고 현황을 확인할 수 있습니다.
            </div>
          </div>

          {/* 빠른 전체 선택/해제 */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="font-bold text-slate-700">홍보 진행 플랫폼 선택</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                전체 선택
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
              >
                전체 해제
              </button>
            </div>
          </div>

          {/* 7개 플랫폼 체크 그리드 */}
          <div className="grid grid-cols-2 gap-2.5">
            {ADVERTISING_PLATFORMS.map((platform) => {
              const isSelected = selectedChannels.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => toggleChannel(platform.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left cursor-pointer active:scale-98 ${
                    isSelected
                      ? 'bg-amber-50 border-amber-500 shadow-xs ring-1 ring-amber-400'
                      : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${platform.dotClass}`} />
                    <span className={`font-black text-xs truncate ${isSelected ? 'text-amber-950' : 'text-slate-800'}`}>
                      {platform.label}
                    </span>
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-amber-500 text-white' : 'border border-slate-300 bg-white text-transparent'
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* 기타 직접 입력 영역 */}
          {isEtcSelected && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 animate-in fade-in duration-150">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>기타 광고 매체 직접 입력</span>
              </label>
              <input
                type="text"
                value={etcText}
                onChange={(e) => setEtcText(e.target.value)}
                placeholder="예: 벼룩시장, 인스타그램, 현수막, 교차로, 전단지 등"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium text-slate-900"
              />
            </div>
          )}

          {/* 미리보기 */}
          {selectedChannels.length > 0 && (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 block mb-1.5">매물 카드 노출 미리보기:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedChannels.map((ch) => {
                  const plat = ADVERTISING_PLATFORMS.find((p) => p.id === ch);
                  const isEtc = ch === '기타';
                  const displayText = isEtc && etcText.trim() ? `기타(${etcText.trim()})` : ch;
                  return (
                    <span
                      key={ch}
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                        plat ? plat.badgeClass : 'bg-slate-100 text-slate-800 border-slate-300'
                      }`}
                    >
                      {displayText}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {errorMessage}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || saveSuccess}
            className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-black text-white rounded-xl shadow-md transition-all active:scale-95 cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
            }`}
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>저장 완료!</span>
              </>
            ) : isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>저장 중...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>저장하기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
