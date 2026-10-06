'use client';

import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  MessageSquare, 
  Share2, 
  Printer, 
  MapPin, 
  Calendar, 
  Compass, 
  Building, 
  User, 
  ExternalLink,
  FileCheck,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Camera,
  ZoomIn,
  ImageIcon,
  Lock,
  Trash2,
  Building2,
  Copy,
  Check
} from 'lucide-react';
import { PropertyItem, PROPERTY_TYPE_LABELS, STATUS_LABELS } from '@/lib/types';
import { shareViaKakao, generateSmsLink, copyPropertyShareLink, handleSmartSms } from '@/lib/kakao';
import { getKakaoMapUrl, getNaverMapUrl } from '@/lib/geo';
import { useAuth } from '../auth/AuthContext';
import { maskPhoneNumber, canViewCustomerContact, canDeleteItem, canEditItem } from '@/lib/auth';
import { KakaoAddressMap } from '../map/KakaoAddressMap';
import { SharePropertyModal } from './SharePropertyModal';

interface PropertyDetailModalProps {
  property: PropertyItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEditProperty?: (property: PropertyItem) => void;
  onPropertyDeleted?: (propertyId: string) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  onClose,
  onEditProperty,
  onPropertyDeleted,
}) => {
  const { currentUser } = useAuth();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedAddressType, setCopiedAddressType] = useState<'road' | 'jibun' | null>(null);

  const handleCopyPropertyAddress = (text: string, type: 'road' | 'jibun') => {
    if (!text) return;
    const clean = text.trim();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(clean).then(() => {
        setCopiedAddressType(type);
        setTimeout(() => setCopiedAddressType(null), 2000);
      }).catch(() => fallbackCopy(clean, type));
    } else {
      fallbackCopy(clean, type);
    }
  };

  const fallbackCopy = (text: string, type: 'road' | 'jibun') => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedAddressType(type);
      setTimeout(() => setCopiedAddressType(null), 2000);
    } catch {
      alert('주소 복사에 실패했습니다.');
    }
  };

  if (!isOpen || !property) return null;

  const canEdit = canEditItem(currentUser, property);
  const canDelete = canDeleteItem(currentUser);
  const canViewContact = canViewCustomerContact(currentUser, property) || (property.customer ? canViewCustomerContact(currentUser, property.customer as any) : false);
  const managerName = property.managerName || '사무실';

  const handleDeleteProperty = async () => {
    if (!canDelete) {
      alert('매물 삭제 권한은 개업공인중개사(대표)에게만 있습니다.');
      return;
    }
    if (!confirm(`정말로 매물 #${property.propertyNumber} (${property.address})을 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const safeUserName = currentUser?.name ? encodeURIComponent(currentUser.name) : encodeURIComponent('관리자');
      const res = await fetch(`/api/properties?id=${property.id}&userName=${safeUserName}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser?.role || 'ADMIN',
          'x-user-id': currentUser?.id || '',
          'x-user-name': safeUserName,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '매물 삭제에 실패했습니다.');
      }
      alert('매물이 정상적으로 삭제되었습니다.');
      if (onPropertyDeleted) onPropertyDeleted(property.id);
      onClose();
    } catch (err: any) {
      alert(err.message || '매물 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const images = property.images && property.images.length > 0 ? property.images : [];
  const currentPhotoIndex = activePhotoIndex < images.length ? activePhotoIndex : 0;
  const statusInfo = STATUS_LABELS[property.status] || { label: property.status, color: 'bg-slate-100 text-slate-800' };

  let priceText = '';
  if (property.transactionType === '매매') {
    priceText = property.price ? `${property.price.toLocaleString()} 만원` : '협의';
  } else if (property.transactionType === '전세') {
    priceText = property.deposit ? `${property.deposit.toLocaleString()} 만원` : '협의';
  } else {
    const isVat = property.monthlyRentVat || property.storeDetail?.monthlyRentVat || property.officeDetail?.monthlyRentVat;
    const vatText = isVat ? ' (부가세 별도)' : '';
    priceText = `보증금 ${property.deposit ? property.deposit.toLocaleString() + '만' : '0'} / 월세 ${property.monthlyRent ? property.monthlyRent.toLocaleString() + '만' : '0'}${vatText}`;
  }

  const smsLink = generateSmsLink({
    propertyNumber: property.propertyNumber,
    propertyType: PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType,
    transactionType: property.transactionType,
    price: property.price,
    deposit: property.deposit,
    monthlyRent: property.monthlyRent,
    address: property.address,
    detailAddress: property.detailAddress,
  });

  const handleKakaoShare = async () => {
    await shareViaKakao({
      id: property.id,
      title: `${PROPERTY_TYPE_LABELS[property.propertyType]} (${property.transactionType})`,
      description: `${property.address} ${property.detailAddress || ''}`,
      priceText: `${property.transactionType} ${priceText}`,
      address: `${property.address} ${property.detailAddress || ''}`,
      propertyNumber: property.propertyNumber,
      propertyType: PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType,
      property: property,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200 bg-slate-50/90 gap-2">
          {/* 배지 및 담당자 */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
            <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-xs shrink-0">
              {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
            </span>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border shrink-0 ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <span className="font-mono text-xs font-bold text-slate-500 shrink-0">
              #{property.propertyNumber}
            </span>

            {/* 담당 권한자 뱃지 */}
            <span className={`px-2 py-0.5 text-xs font-bold rounded-md shrink-0 ${
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
            {Array.isArray(property.assignedAgents) && property.assignedAgents.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 shrink-0">
                <span>👥 추가권한:</span>
                <span className="font-bold">{property.assignedAgents.join(', ')}</span>
              </span>
            )}
          </div>

          {/* 우측 조작 버튼 그룹: 모바일에서 절대 줄바꿈되거나 세로로 찌그러지지 않도록 shrink-0 및 whitespace-nowrap 적용 */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            {/* 수정 버튼: 대표 또는 지정 권한자만 가능 */}
            {onEditProperty && (
              canEdit ? (
                <button
                  onClick={() => onEditProperty(property)}
                  title="매물 정보 수정"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs whitespace-nowrap shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>수정</span>
                </button>
              ) : (
                <div
                  title="개업공인중개사(대표) 및 지정된 권한자만 수정할 수 있습니다."
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>수정불가</span>
                </div>
              )
            )}

            {/* 삭제 버튼: 오직 관리자(대표)만 가능 */}
            {canDelete && (
              <button
                onClick={handleDeleteProperty}
                disabled={isDeleting}
                title="매물 영구 삭제 (관리자 전용)"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 rounded-lg transition-colors shadow-2xs whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{isDeleting ? '삭제 중...' : '매물 삭제'}</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              title="매물 브리핑 출력"
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors shrink-0"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          
          {/* Main Title & Price Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-blue-50/70 via-sky-50/40 to-slate-50 border border-blue-200/70">
            <div className="min-w-0">
              <div className="space-y-1.5 text-slate-500 text-xs mb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 도로명 주소 & 도로명 복사 */}
                    <div className="flex items-center gap-1.5 bg-blue-50/80 px-2 py-1 rounded-lg border border-blue-200">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-1 rounded">도로명</span>
                      <span className="font-bold text-slate-900 break-keep">
                        {property.roadAddress || property.address}
                      </span>
                      {property.detailAddress && (
                        <span className="text-slate-600 font-medium">({property.detailAddress})</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyPropertyAddress(property.roadAddress || property.address, 'road')}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 bg-white hover:bg-blue-100 active:scale-95 border border-blue-300 rounded shadow-2xs cursor-pointer ml-1"
                        title="도로명 주소 복사"
                      >
                        {copiedAddressType === 'road' ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                            <span className="text-emerald-700 font-extrabold">복사 완료</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5 text-blue-600" />
                            <span>도로명 복사</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* 지번 주소 & 지번 복사 */}
                    {property.jibunAddress && (
                      <div className="flex items-center gap-1.5 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200">
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1 rounded">지번</span>
                        <span className="font-semibold text-slate-800 break-keep">
                          {property.jibunAddress}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyPropertyAddress(property.jibunAddress || '', 'jibun')}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 bg-white hover:bg-amber-100 active:scale-95 border border-amber-300 rounded shadow-2xs cursor-pointer ml-1"
                          title="지번 주소 복사"
                        >
                          {copiedAddressType === 'jibun' ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                              <span className="text-emerald-700 font-extrabold">복사 완료</span>
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

                  {/* 지도 바로가기 버튼 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={getKakaoMapUrl(property.address, property.latitude, property.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-[#FEE500] text-[#191919] hover:bg-[#FADA0A] transition-colors shadow-2xs whitespace-nowrap"
                    >
                      <span>🟡 카카오지도</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href={getNaverMapUrl(property.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-[#03C75A] text-white hover:bg-[#02b350] transition-colors shadow-2xs whitespace-nowrap"
                    >
                      <span>🟢 네이버지도</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight break-keep">
                {property.apartmentDetail?.complexName || 
                 property.storeDetail?.storeName || 
                 property.officeDetail?.officeName || 
                 property.factoryWarehouseDetail?.companyName || 
                 property.landDetail?.companyName || 
                 `${PROPERTY_TYPE_LABELS[property.propertyType]} 매물`}
              </h3>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-sm inline-block">
                {property.transactionType}
              </span>
              <div className="text-xl sm:text-2xl font-black text-blue-900 mt-0.5 break-keep tracking-tight">
                {priceText}
              </div>
            </div>
          </div>

          {/* Quick Share Action Row: [📞 전화걸기] [💬 문자로 전송] [🟡 카톡 공유] */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-600">접수 고객(의뢰인):</span>
              {property.customer ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">
                    {canViewContact ? property.customer.name : '*** (비공개)'}
                  </span>
                  {canViewContact && property.customer.carrier && (
                    <span className="text-[11px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-sm">
                      {property.customer.carrier}
                    </span>
                  )}
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {canViewContact ? property.customer.phone : '010-****-****'}
                  </span>
                  {!canViewContact && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                      <Lock className="w-3 h-3 text-amber-600" />
                      연락처 비공개
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-400">직접 접수 (연결 고객 없음)</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {property.customer?.phone && canViewContact && (
                <a
                  href={`tel:${property.customer.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>📞 고객 전화걸기</span>
                </a>
              )}

              {/* 스마트폰 전용 문자 전송 버튼 (PC 환경에서는 사용자의 요청에 따라 완전 삭제/숨김) */}
              <button
                type="button"
                onClick={() => {
                  const savedMode = (typeof window !== 'undefined' ? localStorage.getItem('pref_address_share_mode') : null) as any || 'dong';
                  handleSmartSms(property, undefined, savedMode);
                }}
                className="inline-flex md:hidden items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-all active:scale-95"
                title="스마트폰 문자 앱 즉시 실행"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>💬 문자로 전송</span>
              </button>

              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95"
                title="주소 옵션 선택 후 매물 링크 및 요약 복사"
              >
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                <span>🔗 링크 복사</span>
              </button>

              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-all active:scale-95"
                title="주소 공개 범위(동까지만/전체/비공개) 선택 후 카카오톡 전송"
              >
                <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                <span>🟡 카톡 공유</span>
              </button>
            </div>
          </div>

          {/* Property Photos Carousel / Gallery (최대 20장 지원) */}
          {images.length > 0 ? (
            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800">
              <div className="relative aspect-16/9 sm:aspect-21/9 max-h-[380px] bg-black flex items-center justify-center">
                <img
                  src={images[currentPhotoIndex]}
                  alt={`매물 사진 ${currentPhotoIndex + 1}`}
                  className="max-h-[380px] w-full object-contain cursor-zoom-in"
                  onClick={() => setIsPhotoLightboxOpen(true)}
                />
                
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-bold">
                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                  <span>{currentPhotoIndex + 1} / {images.length}장</span>
                  {currentPhotoIndex === 0 && (
                    <span className="ml-1 text-[10px] bg-amber-400 text-black px-1.5 py-0.2 rounded font-extrabold">대표</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsPhotoLightboxOpen(true)}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition-colors"
                  title="크게 보기"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePhotoIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails Bar */}
              {images.length > 1 && (
                <div className="p-2.5 bg-slate-950 flex gap-2 overflow-x-auto">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentPhotoIndex
                          ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/30'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-blue-600/90 text-[9px] text-white font-bold text-center">대표</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4 text-slate-400" />
              <span>등록된 매물 사진이 없습니다. [수정] 버튼을 눌러 사진(최대 20장)을 등록할 수 있습니다.</span>
            </div>
          )}

          {/* 소재지 위치 및 실시간 카카오지도 (7대 매물 종류 공통 연동) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>소재지 위치 및 실시간 카카오지도</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                {property.roadAddress || property.address} {property.detailAddress || ''}
              </span>
            </div>
            <KakaoAddressMap
              address={property.roadAddress || property.jibunAddress || property.address}
              detailAddress={property.detailAddress}
              height="h-[420px]"
            />
          </div>

          {/* Key Specs Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              기본 스펙 및 방향/일정/관리비
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">방향 / 기준</span>
                <span className="font-semibold text-slate-800">
                  {property.direction || '미정'} ({property.directionCriteria || (property.propertyType === 'LAND' ? '진입도로 기준' : '기준없음')})
                </span>
              </div>
              {property.propertyType !== 'LAND' && (property.availableDate || property.isImmediateAvailable || property.isNegotiableDate) && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">입주 가능일</span>
                  <span className="font-semibold text-slate-800">
                    {property.isImmediateAvailable ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-emerald-800 bg-emerald-100 border border-emerald-300">
                        ⚡ 즉시입주
                      </span>
                    ) : property.isNegotiableDate ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-blue-800 bg-blue-100 border border-blue-300">
                        🤝 입주일협의
                      </span>
                    ) : (
                      property.availableDate ? property.availableDate.substring(0, 10) : ''
                    )}
                  </span>
                </div>
              )}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">관리비</span>
                <span className="font-semibold text-slate-800">
                  {property.isNoMaintenanceFee || property.storeDetail?.isNoMaintenanceFee || property.officeDetail?.isNoMaintenanceFee ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-emerald-800 bg-emerald-100 border border-emerald-300">
                      ✓ 관리비 없음
                    </span>
                  ) : property.storeDetail?.maintenanceFee ? (
                    `${property.storeDetail.maintenanceFee}만원`
                  ) : property.officeDetail?.maintenanceFee ? (
                    `${property.officeDetail.maintenanceFee}만원`
                  ) : property.apartmentDetail?.maintenanceFee ? (
                    `${property.apartmentDetail.maintenanceFee}만원`
                  ) : (
                    '별도 협의'
                  )}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">등록 상태</span>
                <span className="font-semibold text-slate-800">{statusInfo.label}</span>
              </div>
            </div>
          </div>

          {/* Public Data / Building Ledger Information */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-blue-600" />
              정부 건축물대장 / 토지대장 등록 정보
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">대지면적</span>
                <span className="font-bold text-slate-900">
                  {property.landArea ? `${property.landArea} ㎡` : '-'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">연면적</span>
                <span className="font-bold text-slate-900">
                  {property.totalFloorArea ? `${property.totalFloorArea} ㎡` : '-'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">대장상 주용도</span>
                <span className="font-bold text-slate-900">
                  {property.buildingRegisterUse || '-'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">사용승인일</span>
                <span className="font-bold text-slate-900">
                  {property.approvalDate ? property.approvalDate.substring(0, 10) : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Type-Specific Detailed Breakdown */}
          {property.apartmentDetail && (
            <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2.5">
                아파트 단지 및 시설 옵션
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">단지 / 동 / 호</span>
                  <span className="font-semibold text-slate-800">
                    {property.apartmentDetail.complexName} {property.apartmentDetail.buildingNo || ''} {property.apartmentDetail.unitNo || ''}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">공급 / 전용면적</span>
                  <span className="font-semibold text-slate-800">
                    {property.apartmentDetail.supplyArea || '-'}㎡ / {property.apartmentDetail.exclusiveArea || '-'}㎡
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">방 / 욕실수</span>
                  <span className="font-semibold text-slate-800">
                    방 {property.apartmentDetail.roomCount || '-'}개 / 욕실 {property.apartmentDetail.bathroomCount || '-'}개
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">관리비 / 난방</span>
                  <span className="font-semibold text-slate-800">
                    {property.apartmentDetail.maintenanceFee ? `${property.apartmentDetail.maintenanceFee}만원` : '-'} / {property.apartmentDetail.heatingType || '-'}
                  </span>
                </div>
              </div>
              {/* 설치 옵션 뱃지 리스트 */}
              {(() => {
                const optionBadges: string[] = [];
                if (property.apartmentDetail.otherOptions) {
                  property.apartmentDetail.otherOptions.split(',').forEach((opt) => {
                    const trimmed = opt.trim();
                    if (trimmed && !optionBadges.includes(trimmed)) {
                      optionBadges.push(trimmed);
                    }
                  });
                }
                // 기존 데이터 하위 호환
                if (property.apartmentDetail.systemAircon && !optionBadges.some(b => b.includes('에어콘') || b.includes('에어컨'))) {
                  optionBadges.unshift('시스템에어콘');
                }
                if (property.apartmentDetail.heatExchanger && !optionBadges.includes('전열교환기')) {
                  optionBadges.push('전열교환기');
                }
                if (property.apartmentDetail.induction && !optionBadges.some(b => b.includes('인덕션'))) {
                  optionBadges.push('인덕션');
                }
                if (property.apartmentDetail.roomLivingOption && !optionBadges.includes(property.apartmentDetail.roomLivingOption)) {
                  optionBadges.push(property.apartmentDetail.roomLivingOption);
                }

                if (optionBadges.length === 0) return null;

                return (
                  <div className="mt-3 pt-3 border-t border-blue-200/60">
                    <span className="text-[11px] font-bold text-blue-900 block mb-1.5">
                      설치 옵션 ({optionBadges.length}개)
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {optionBadges.map((badge, idx) => {
                        const isAircon = badge.includes('에어콘') || badge.includes('에어컨');
                        return (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold shadow-2xs ${
                              isAircon
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-slate-800 border border-blue-200'
                            }`}
                          >
                            <span className={isAircon ? 'text-blue-200' : 'text-emerald-600'}>✓</span>
                            <span>{badge}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {property.houseDetail && (
            <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2.5">
                주택 세부 스펙 및 풀옵션 시설
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">층수 (해당 / 총층)</span>
                  <span className="font-semibold text-slate-800">
                    {property.houseDetail.currentFloor || '-'} / {property.houseDetail.totalFloors ? `${property.houseDetail.totalFloors}층` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">방수 / 욕실수</span>
                  <span className="font-semibold text-slate-800">
                    방 {property.houseDetail.roomCount || '-'}개 / 욕실 {property.houseDetail.bathroomCount || '-'}개
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">주차 / 난방</span>
                  <span className="font-semibold text-slate-800">
                    {property.houseDetail.parkingCount ? `${property.houseDetail.parkingCount}대` : '주차불가'} / {property.houseDetail.heatingType || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">관리비</span>
                  <span className="font-semibold text-slate-800">
                    {property.houseDetail.maintenanceFeeCommon ? `공용 ${property.houseDetail.maintenanceFeeCommon}만` : '없음/실비'}
                  </span>
                </div>
              </div>

              {property.houseDetail.currentLeaseStatus && (
                <div className="mt-2.5 pt-2.5 border-t border-emerald-200/60 text-xs text-slate-700">
                  <span className="font-bold text-emerald-900">현재 임대현황:</span> {property.houseDetail.currentLeaseStatus}
                </div>
              )}

              {/* 주택/원룸 풀옵션 뱃지 리스트 */}
              {(() => {
                if (!property.houseDetail.options) return null;
                const optionBadges = property.houseDetail.options.split(',').map((s) => s.trim()).filter(Boolean);
                if (optionBadges.length === 0) return null;

                return (
                  <div className="mt-3 pt-3 border-t border-emerald-200/60">
                    <span className="text-[11px] font-bold text-emerald-900 block mb-1.5">
                      설치 옵션 ({optionBadges.length}개)
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {optionBadges.map((badge, idx) => {
                        const isAircon = badge.includes('에어컨') || badge.includes('에어콘');
                        return (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold shadow-2xs ${
                              isAircon
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white text-slate-800 border border-emerald-200'
                            }`}
                          >
                            <span className={isAircon ? 'text-emerald-200' : 'text-emerald-600'}>✓</span>
                            <span>{badge}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 상가 점포 상세 브리핑 */}
          {property.storeDetail && (
            <div className="p-5 rounded-2xl bg-amber-50/50 border-2 border-amber-300/80 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  상가 점포 세부 스펙 및 정밀 체크 내역
                </h4>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  {property.storeDetail.businessType || '일반상가'}
                </span>
              </div>

              {/* 기본 스펙 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-[11px] text-slate-500 block">상호명 / 층수</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {property.storeDetail.storeName || '-'} ({property.storeDetail.currentFloor || '-'})
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-[11px] text-slate-500 block">실평수 (전용)</span>
                  <span className="font-extrabold text-amber-950 text-sm">
                    {property.storeDetail.actualArea ? `${property.storeDetail.actualArea} ㎡` : '-'}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-[11px] text-slate-500 block">권리금</span>
                  <span className="font-extrabold text-amber-950 text-sm">
                    {property.storeDetail.premium ? `${property.storeDetail.premium.toLocaleString()} 만원` : '무권리'}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-[11px] text-slate-500 block">일평균 매출</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {property.storeDetail.dailyRevenue ? `약 ${property.storeDetail.dailyRevenue}만원` : '-'}
                  </span>
                </div>
              </div>

              {/* 설비 및 공간 조건 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-white p-3 rounded-xl border border-amber-200">
                <div>
                  <span className="text-[11px] text-slate-500 block">방 / 화장실</span>
                  <span className="font-semibold text-slate-800">
                    방 {property.storeDetail.roomCount ?? 0}개 / {property.storeDetail.bathroomCount ?? 1}개 ({property.storeDetail.toiletGenderType || '남녀구분'})
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">전기 설비</span>
                  <span className="font-semibold text-slate-800">
                    {property.storeDetail.electricityCapacity || '15kW'} ({property.storeDetail.electricityType || '개별'})
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">수도 / 가스</span>
                  <span className="font-semibold text-slate-800">
                    수도 {property.storeDetail.waterType || '개별'} / {property.storeDetail.gasType || '도시가스'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">주차 여부</span>
                  <span className="font-semibold text-slate-800">
                    {property.storeDetail.isParkingImpossible ? (
                      <span className="text-rose-600 font-bold">주차 불가</span>
                    ) : (
                      `${property.storeDetail.parkingCount ?? 0}대 가능`
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">테이블수 / 종업원</span>
                  <span className="font-semibold text-slate-800">
                    테이블 {property.storeDetail.tableCount ?? '-'}개 / {property.storeDetail.employeeCount ?? '-'}명
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">영업기간 / 갱신권</span>
                  <span className="font-semibold text-slate-800">
                    {property.storeDetail.operationPeriod || '-'} / {property.storeDetail.renewalPeriodRemain || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">위반건축물</span>
                  <span className="font-semibold text-slate-800">
                    {property.storeDetail.violationBuilding || '없음(정상)'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">사업자 & 명의일치</span>
                  <span className="font-semibold text-slate-800">
                    {property.storeDetail.operatorContractorMatch || '일치'}
                  </span>
                </div>
              </div>

              {/* 계약 핵심 특약 및 주류대출/인상조건 */}
              <div className="space-y-2 text-xs">
                {property.storeDetail.liquorLoan && (
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                    <span className="font-bold text-violet-900 block">🍷 주류대출여부:</span>
                    <span className="text-slate-800">{property.storeDetail.liquorLoan}</span>
                  </div>
                )}
                {property.storeDetail.rentIncreaseCondition && (
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                    <span className="font-bold text-blue-900 block">📈 임대료 인상조건:</span>
                    <span className="text-slate-800">{property.storeDetail.rentIncreaseCondition}</span>
                  </div>
                )}
                {property.storeDetail.restorationTerms && (
                  <div className="p-2.5 bg-amber-100/70 rounded-lg border border-amber-300">
                    <span className="font-bold text-amber-950 block">✨ 원상복구특약:</span>
                    <span className="text-slate-900 font-medium">{property.storeDetail.restorationTerms}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-700">
                    <span className="font-bold">📢 점포광고:</span> {property.storeDetail.storeAdStatus || '공개광고가능'}
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-700">
                    <span className="font-bold">🏢 타부동산:</span> {property.storeDetail.otherAgencyAdStatus || '타부동산없음'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 사무실 상세 브리핑 */}
          {property.officeDetail && (
            <div className="p-5 rounded-2xl bg-blue-50/50 border-2 border-blue-300/80 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                <h4 className="text-sm font-extrabold text-blue-950 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  사무실 세부 스펙 및 시설 조건
                </h4>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                  업무시설
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-blue-200">
                  <span className="text-[11px] text-slate-500 block">실평수 / 룸수</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {property.officeDetail.actualArea || '-'}㎡ / 룸 {property.officeDetail.roomCount || '-'}개
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-blue-200">
                  <span className="text-[11px] text-slate-500 block">화장실</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {property.officeDetail.bathroomCount || 1}개 ({property.officeDetail.toiletGenderType || '남녀분리'})
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-blue-200">
                  <span className="text-[11px] text-slate-500 block">주차 대수</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {property.officeDetail.isParkingImpossible ? (
                      <span className="text-rose-600 font-bold">주차 불가</span>
                    ) : (
                      `${property.officeDetail.parkingCount || 0}대`
                    )}
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-blue-200">
                  <span className="text-[11px] text-slate-500 block">냉난방 방식</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {property.officeDetail.hvacSystem || '개별'}
                  </span>
                </div>
              </div>

              {/* 추가 조건 */}
              <div className="space-y-2 text-xs">
                {property.officeDetail.rentIncreaseCondition && (
                  <div className="p-2.5 bg-white rounded-lg border border-blue-200">
                    <span className="font-bold text-blue-900 block">📈 임대료 인상조건:</span>
                    <span className="text-slate-800">{property.officeDetail.rentIncreaseCondition}</span>
                  </div>
                )}
                {property.officeDetail.restorationTerms && (
                  <div className="p-2.5 bg-blue-100/70 rounded-lg border border-blue-300">
                    <span className="font-bold text-blue-950 block">✨ 원상복구특약:</span>
                    <span className="text-slate-900 font-medium">{property.officeDetail.restorationTerms}</span>
                  </div>
                )}
              </div>
            </div>
          )}



        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="hidden sm:inline text-xs text-slate-500">
            개업공인중개사 스마트 매물장 PRO
          </span>
          <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
            {onEditProperty && (
              canEdit ? (
                <button
                  onClick={() => onEditProperty(property)}
                  className="px-3 sm:px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>매물 수정하기</span>
                </button>
              ) : (
                <div
                  title="개업공인중개사(대표) 및 지정된 권한자만 수정할 수 있습니다."
                  className="px-3 py-2 text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-not-allowed whitespace-nowrap"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>수정 권한 없음</span>
                </div>
              )
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 whitespace-nowrap"
            >
              닫기
            </button>
          </div>
        </div>

      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {isPhotoLightboxOpen && images.length > 0 && (
        <div className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setIsPhotoLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-slate-300 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            title="닫기"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <img
              src={images[currentPhotoIndex]}
              alt={`매물 사진 ${currentPhotoIndex + 1}`}
              className="max-h-[82vh] max-w-[90vw] object-contain rounded-lg"
            />
            <div className="mt-3 text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full">
              {currentPhotoIndex + 1} / {images.length}장
              {currentPhotoIndex === 0 && ' (★ 대표사진)'}
            </div>
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/40 p-3 rounded-full transition-colors"
                title="이전 사진"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={() => setActivePhotoIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/40 p-3 rounded-full transition-colors"
                title="다음 사진"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Share & Address Disclosure Options Modal */}
      <SharePropertyModal
        property={property}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
};
