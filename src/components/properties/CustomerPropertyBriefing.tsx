// src/components/properties/CustomerPropertyBriefing.tsx
'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Share2, 
  Calendar, 
  Compass, 
  Car, 
  Layers, 
  CheckCircle, 
  Camera, 
  ZoomIn, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  LogIn, 
  Copy,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import { PropertyItem, PROPERTY_TYPE_LABELS, STATUS_LABELS } from '@/lib/types';
import { 
  AddressShareMode, 
  formatAddressByMode, 
  BROKER_OFFICE_INFO, 
  copyPropertyShareLink 
} from '@/lib/kakao';
import { getKakaoMapUrl, getNaverMapUrl } from '@/lib/geo';
import { KakaoAddressMap } from '../map/KakaoAddressMap';

interface CustomerPropertyBriefingProps {
  property: PropertyItem;
  addressMode?: AddressShareMode;
  currentUser?: any;
  onSwitchToAdmin?: () => void;
  onOpenLogin?: () => void;
}

export const CustomerPropertyBriefing: React.FC<CustomerPropertyBriefingProps> = ({
  property,
  addressMode = 'dong',
  currentUser,
  onSwitchToAdmin,
  onOpenLogin,
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const images = property.images && property.images.length > 0 ? property.images : [];
  const currentPhotoIndex = activePhotoIndex < images.length ? activePhotoIndex : 0;
  const propType = PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType;

  // 주소 마스킹 계산
  const effectiveMode: AddressShareMode = 
    (property as any).addressMode || addressMode || ((property as any).isAddressHidden ? 'hidden' : 'dong');
  const { displayAddress, isApproximate, isHidden } = formatAddressByMode(
    property.address, 
    property.detailAddress, 
    effectiveMode
  );

  // 금액 포맷
  let priceMainText = '';
  let priceSubText = '';
  if (property.transactionType === '매매') {
    priceMainText = property.price ? `${property.price.toLocaleString()} 만원` : '협의';
  } else if (property.transactionType === '전세') {
    priceMainText = property.deposit ? `${property.deposit.toLocaleString()} 만원` : '협의';
  } else {
    const isVat = property.monthlyRentVat || property.storeDetail?.monthlyRentVat || property.officeDetail?.monthlyRentVat;
    const vatText = isVat ? ' (부가세 별도)' : '';
    priceMainText = `보증금 ${property.deposit ? property.deposit.toLocaleString() + '만' : '0'} / 월세 ${property.monthlyRent ? property.monthlyRent.toLocaleString() + '만' : '0'}${vatText}`;
  }

  // 관리비
  let maintenanceText = '관리비 정보 없음';
  if (property.isNoMaintenanceFee || property.storeDetail?.isNoMaintenanceFee || property.officeDetail?.isNoMaintenanceFee) {
    maintenanceText = '관리비 없음';
  } else {
    const mFee = property.storeDetail?.maintenanceFee ?? property.officeDetail?.maintenanceFee;
    if (mFee !== undefined && mFee !== null && mFee > 0) {
      maintenanceText = `월 ${mFee.toLocaleString()} 만원`;
    }
  }

  // 권리금 (상가)
  let premiumText = '';
  if (property.storeDetail?.isNoPremium) {
    premiumText = '✨ 무권리금 (권리금 없음)';
  } else if (property.storeDetail?.premium) {
    premiumText = `권리금 ${property.storeDetail.premium.toLocaleString()} 만원`;
  }

  const handleCopyLink = async () => {
    const success = await copyPropertyShareLink(property, effectiveMode);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const smsInquiryText = `[${BROKER_OFFICE_INFO.officeName} 매물 #${property.propertyNumber} 문의]\n매물명: ${propType} (${property.transactionType})\n소재지: ${displayAddress}\n\n위 매물에 대해 상담 문의드립니다.`;
  const smsHref = `sms:${BROKER_OFFICE_INFO.tel}?body=${encodeURIComponent(smsInquiryText)}`;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white pb-24 sm:pb-12">
      
      {/* 1. Top Navigation Bar (공인중개사 브랜드 헤더) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                {BROKER_OFFICE_INFO.officeName}
              </span>
              <span className="hidden sm:inline-block text-[11px] text-blue-600 font-semibold ml-2 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                공식 매물 안내장
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 대표님(중개사)이 로그인된 상태에서 링크를 열었을 때: 원클릭 관리/수정 모드 전환 버튼 */}
            {currentUser && onSwitchToAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                title="중개사 관리자 화면으로 전환하여 매물 수정 및 전체 정보 관리"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span className="whitespace-nowrap">중개사 관리</span>
              </button>
            )}

            <a
              href={`tel:${BROKER_OFFICE_INFO.tel}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">📞 전화 상담</span>
            </a>

            {!currentUser && onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                title="중개사 전용 로그인"
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">중개사 로그인</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* 2. 매물 타이틀 & 금액 요약 카드 */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-2xs">
              {propType}
            </span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              {property.transactionType}
            </span>
            <span className="font-mono text-xs font-bold text-slate-400">
              매물번호 #{property.propertyNumber}
            </span>
            {isApproximate && (
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                대략적 위치 안내
              </span>
            )}
          </div>

          <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mb-2 break-keep leading-snug">
            {property.apartmentDetail?.complexName || 
             property.storeDetail?.storeName || 
             property.officeDetail?.officeName || 
             property.factoryWarehouseDetail?.companyName || 
             property.landDetail?.companyName || 
             `${propType} (${property.transactionType}) 추천 매물`}
          </h1>

          {/* 소재지 표시 */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-4 break-keep">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-semibold text-slate-800">{displayAddress}</span>

            {!isHidden && (
              <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
                <a
                  href={getKakaoMapUrl(property.address, property.latitude, property.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEE500] text-[#191919] hover:bg-[#FADA0A] transition-colors"
                >
                  <span>카카오지도</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a
                  href={getNaverMapUrl(property.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#03C75A] text-white hover:bg-[#02b350] transition-colors"
                >
                  <span>네이버지도</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}
          </div>

          {/* 금액 하이라이트 박스 (모바일 글자 크기 및 줄바꿈 최적화) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-sky-50/60 to-indigo-50/70 border border-blue-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="min-w-0">
              <span className="text-xs font-bold text-blue-800 block mb-0.5">
                {property.transactionType} 조건
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black text-blue-950 tracking-tight break-keep whitespace-normal sm:whitespace-nowrap">
                {priceMainText}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {premiumText && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-100/90 border border-amber-300 text-amber-950 font-bold text-xs shadow-2xs">
                  {premiumText}
                </div>
              )}
              {maintenanceText && (
                <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs shadow-2xs">
                  관리비: {maintenanceText}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. 매물 사진 갤러리 */}
        {images.length > 0 && (
          <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-800">
            <div className="relative aspect-16/9 sm:aspect-21/9 max-h-[420px] bg-black flex items-center justify-center">
              <img
                src={images[currentPhotoIndex]}
                alt={`매물 사진 ${currentPhotoIndex + 1}`}
                className="max-h-[420px] w-full object-contain cursor-zoom-in"
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
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
                title="사진 크게 보기"
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
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. 매물 핵심 제원 (스펙 그리드) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-4 rounded-full bg-blue-600"></span>
            매물 주요 제원 및 건축물 정보
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* 면적 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block">전용 / 공급 면적</span>
              <span className="font-bold text-slate-900 text-sm">
                {property.storeDetail?.actualArea || property.officeDetail?.actualArea || property.totalFloorArea || '-'} ㎡
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {property.storeDetail?.actualArea 
                  ? `(약 ${(property.storeDetail.actualArea * 0.3025).toFixed(1)}평)`
                  : property.officeDetail?.actualArea 
                  ? `(약 ${(property.officeDetail.actualArea * 0.3025).toFixed(1)}평)`
                  : ''}
              </span>
            </div>

            {/* 층수 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block">해당층 / 총층수</span>
              <span className="font-bold text-slate-900 text-sm">
                {property.storeDetail?.currentFloor || property.officeDetail?.currentFloor || property.floorText || '-'}
                {property.floorCount ? ` / 총 ${property.floorCount}층` : ''}
              </span>
            </div>

            {/* 방향 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block">방향 (기준)</span>
              <span className="font-bold text-slate-900 text-sm">
                {property.direction || '남향'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {property.directionCriteria || '주출입구 기준'}
              </span>
            </div>

            {/* 주차 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block">주차 여부</span>
              <span className="font-bold text-slate-900 text-sm">
                {property.officeDetail?.isParkingImpossible ? (
                  <span className="text-rose-600">주차 불가</span>
                ) : (
                  `${property.officeDetail?.parkingCount || property.storeDetail?.parkingCount || 1}대 가능`
                )}
              </span>
            </div>

            {/* 입주가능일 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block">입주 가능일</span>
              <span className="font-bold text-slate-900">
                {property.isImmediateAvailable ? '✨ 즉시 입주 가능' : property.availableDate || '협의 입주'}
              </span>
            </div>

            {/* 건축물용도 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block">건축물 용도</span>
              <span className="font-bold text-slate-900">
                {property.buildingRegisterUse || '근린생활시설'}
              </span>
            </div>

            {/* 사용승인일 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block">사용승인일</span>
              <span className="font-bold text-slate-900">
                {property.approvalDate || '-'}
              </span>
            </div>

            {/* 위반건축물 여부 */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 block">위반건축물</span>
              <span className="font-bold text-emerald-700">
                {property.storeDetail?.violationBuilding || '해당없음(정상)'}
              </span>
            </div>
          </div>
        </div>

        {/* 5. 상가/사무실 맞춤 추가 스펙 (안내용) */}
        {property.storeDetail && (
          <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              상가점포 시설 및 추천 조건
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                <span className="text-[10px] text-slate-400 block">현재/추천업종</span>
                <span className="font-bold text-slate-800">
                  {property.storeDetail.businessType || '근생 자유업종'}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                <span className="text-[10px] text-slate-400 block">화장실</span>
                <span className="font-bold text-slate-800">
                  {property.storeDetail.toiletGenderType || '남녀구분'}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                <span className="text-[10px] text-slate-400 block">전기/가스/수도</span>
                <span className="font-bold text-slate-800">
                  {property.storeDetail.electricityCapacity || '개별'} 완비
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                <span className="text-[10px] text-slate-400 block">임대인 명의</span>
                <span className="font-bold text-slate-800">
                  {property.storeDetail.operatorContractorMatch || '정상 일치'}
                </span>
              </div>
            </div>
          </div>
        )}

        {property.officeDetail && (
          <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              사무실 내부 시설 및 냉난방
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-blue-200">
                <span className="text-[10px] text-slate-400 block">내부 룸 개수</span>
                <span className="font-bold text-slate-800">
                  룸 {property.officeDetail.roomCount || '-'}개
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-blue-200">
                <span className="text-[10px] text-slate-400 block">냉난방 방식</span>
                <span className="font-bold text-slate-800">
                  {property.officeDetail.hvacSystem || '개별 시스템'}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-blue-200">
                <span className="text-[10px] text-slate-400 block">화장실</span>
                <span className="font-bold text-slate-800">
                  {property.officeDetail.toiletGenderType || '남녀분리'}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-blue-200">
                <span className="text-[10px] text-slate-400 block">주차 여건</span>
                <span className="font-bold text-slate-800">
                  {property.officeDetail.isParkingImpossible ? '주차 불가' : `${property.officeDetail.parkingCount || 1}대 가능`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 6. 지도 뷰어 (주소가 숨김이 아닐 경우) */}
        {!isHidden && property.address && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                위치 및 주변 인프라
              </h2>
              {isApproximate && (
                <span className="text-[11px] text-slate-500">
                  * 보안을 위해 동/읍/면 기준 대략적 위치로 표시됩니다.
                </span>
              )}
            </div>
            
            <div className="rounded-xl overflow-hidden border border-slate-200 h-[280px] sm:h-[320px]">
              <KakaoAddressMap
                address={property.address}
                detailAddress={property.detailAddress}
                height="100%"
              />
            </div>
          </div>
        )}

        {/* 7. 공인중개사사무소 신뢰 보증 카드 & 문의처 */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>책임중개 보증 · 정식 등록 공인중개사</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {BROKER_OFFICE_INFO.officeName}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                대표: {BROKER_OFFICE_INFO.ceoName} · 등록번호: {BROKER_OFFICE_INFO.registrationNumber}
                <br />
                소재지: {BROKER_OFFICE_INFO.address}
              </p>
            </div>

            {/* Direct Call & Message Actions */}
            <div className="flex flex-col xs:flex-row sm:flex-col gap-2.5 shrink-0">
              <a
                href={`tel:${BROKER_OFFICE_INFO.tel}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>📞 지금 바로 전화 상담</span>
              </a>

              <a
                href={smsHref}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-transform active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>💬 문자 문의하기</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 font-medium text-xs transition-colors"
              >
                {isCopied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">링크 복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>🔗 매물 링크 공유</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 8. 개인정보 안심 안내 푸터 */}
        <div className="text-center text-xs text-slate-400 py-4 space-y-1">
          <p>© {new Date().getFullYear()} {BROKER_OFFICE_INFO.officeName}. All rights reserved.</p>
          <p className="text-[11px] text-slate-400">
            본 안내장은 의뢰 고객의 확인을 위해 발급된 공인중개사 매물 브리핑 문서입니다.
          </p>
        </div>

      </main>

      {/* 9. Mobile Sticky CTA Bottom Bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-slate-500 font-semibold block">{propType} ({property.transactionType})</span>
          <span className="text-sm font-black text-blue-950">{priceMainText}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={smsHref}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-colors"
            title="문자 문의"
          >
            <MessageSquare className="w-4 h-4" />
          </a>
          <a
            href={`tel:${BROKER_OFFICE_INFO.tel}`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 active:scale-95 transition-transform"
          >
            <Phone className="w-4 h-4" />
            <span>전화 상담</span>
          </a>
        </div>
      </div>

      {/* 10. Photo Lightbox Modal */}
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

    </div>
  );
};
