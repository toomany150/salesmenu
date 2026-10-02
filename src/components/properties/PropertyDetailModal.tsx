'use client';

import React from 'react';
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
  ShieldCheck,
  CheckCircle,
  FileCheck
} from 'lucide-react';
import { PropertyItem, PROPERTY_TYPE_LABELS, STATUS_LABELS } from '@/lib/types';
import { shareViaKakao, generateSmsLink } from '@/lib/kakao';
import { getKakaoMapUrl, getNaverMapUrl } from '@/lib/geo';

interface PropertyDetailModalProps {
  property: PropertyItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !property) return null;

  const statusInfo = STATUS_LABELS[property.status] || { label: property.status, color: 'bg-slate-100 text-slate-800' };

  let priceText = '';
  if (property.transactionType === '매매') {
    priceText = property.price ? `${property.price.toLocaleString()} 만원` : '협의';
  } else if (property.transactionType === '전세') {
    priceText = property.deposit ? `${property.deposit.toLocaleString()} 만원` : '협의';
  } else {
    priceText = `보증금 ${property.deposit ? property.deposit.toLocaleString() + '만' : '0'} / 월세 ${property.monthlyRent ? property.monthlyRent.toLocaleString() + '만' : '0'}`;
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
    consultationNotes: property.consultationNotes,
  });

  const handleKakaoShare = async () => {
    await shareViaKakao({
      title: `${PROPERTY_TYPE_LABELS[property.propertyType]} (${property.transactionType})`,
      description: property.consultationNotes || `${property.address} ${property.detailAddress || ''}`,
      priceText: `${property.transactionType} ${priceText}`,
      address: `${property.address} ${property.detailAddress || ''}`,
      propertyNumber: property.propertyNumber,
      propertyType: PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-xs">
              {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
            </span>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <span className="font-mono text-xs font-bold text-slate-500">
              #{property.propertyNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="매물 브리핑 출력"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Main Title & Price Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50/70 via-sky-50/40 to-slate-50 border border-blue-200/70">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-slate-500 text-xs mb-1.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-800">{property.address}</span>
                  {property.detailAddress && (
                    <span className="text-slate-600">{property.detailAddress}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
                  <a
                    href={getKakaoMapUrl(property.address, property.latitude, property.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEE500] text-[#191919] hover:bg-[#FADA0A] transition-colors shadow-2xs"
                  >
                    <span>🟡 카카오지도</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <a
                    href={getNaverMapUrl(property.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#03C75A] text-white hover:bg-[#02b350] transition-colors shadow-2xs"
                  >
                    <span>🟢 네이버지도</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {property.apartmentDetail?.complexName || 
                 property.storeDetail?.storeName || 
                 property.officeDetail?.officeName || 
                 property.factoryWarehouseDetail?.companyName || 
                 property.landDetail?.companyName || 
                 `${PROPERTY_TYPE_LABELS[property.propertyType]} 매물`}
              </h3>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-sm">
                {property.transactionType}
              </span>
              <div className="text-2xl font-black text-blue-900 mt-0.5">
                {priceText}
              </div>
            </div>
          </div>

          {/* Quick Share Action Row: [📞 전화걸기] [💬 문자로 전송] [🟡 카톡 공유] */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-xs text-slate-600">접수 고객(의뢰인):</span>
              {property.customer ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{property.customer.name}</span>
                  {property.customer.carrier && (
                    <span className="text-[11px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-sm">
                      {property.customer.carrier}
                    </span>
                  )}
                  <span className="text-xs font-mono text-slate-700">{property.customer.phone}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">직접 접수 (연결 고객 없음)</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {property.customer?.phone && (
                <a
                  href={`tel:${property.customer.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>📞 고객 전화걸기</span>
                </a>
              )}

              <a
                href={smsLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-all active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>💬 문자로 전송</span>
              </a>

              <button
                type="button"
                onClick={handleKakaoShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-all active:scale-95"
              >
                <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                <span>🟡 카톡 공유</span>
              </button>
            </div>
          </div>

          {/* Key Specs Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              기본 스펙 및 방향/일정
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">방향 / 기준</span>
                <span className="font-semibold text-slate-800">
                  {property.direction || '미정'} ({property.directionCriteria || '기준없음'})
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">입주 가능일</span>
                <span className="font-semibold text-slate-800">
                  {property.availableDate ? property.availableDate.substring(0, 10) : '즉시입주 / 협의'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">접수일자</span>
                <span className="font-semibold text-slate-800">
                  {property.receiptDate ? property.receiptDate.substring(0, 10) : '-'}
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
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {property.apartmentDetail.systemAircon && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-sm font-medium">✓ 시스템에어컨</span>
                )}
                {property.apartmentDetail.heatExchanger && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-sm font-medium">✓ 전열교환기</span>
                )}
                {property.apartmentDetail.induction && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-sm font-medium">✓ 인덕션</span>
                )}
                {property.apartmentDetail.roomLivingOption && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-sm">
                    {property.apartmentDetail.roomLivingOption}
                  </span>
                )}
                {property.apartmentDetail.otherOptions && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-sm">
                    {property.apartmentDetail.otherOptions}
                  </span>
                )}
              </div>
            </div>
          )}

          {property.storeDetail && (
            <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2.5">
                상가 점포 정보 및 확인 내역
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                <div>
                  <span className="text-[11px] text-slate-500 block">상호 / 업종</span>
                  <span className="font-semibold text-slate-800">
                    {property.storeDetail.storeName || '-'} ({property.storeDetail.businessType || '-'})
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">권리금</span>
                  <span className="font-bold text-amber-900">
                    {property.storeDetail.premium ? `${property.storeDetail.premium.toLocaleString()} 만원` : '무권리'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">실평수</span>
                  <span className="font-semibold text-slate-800">
                    {property.storeDetail.actualArea ? `${property.storeDetail.actualArea} ㎡` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">일매출</span>
                  <span className="font-semibold text-slate-800">
                    {property.storeDetail.dailyRevenue ? `약 ${property.storeDetail.dailyRevenue}만원` : '-'}
                  </span>
                </div>
              </div>
              {property.storeDetail.adminActionChecked && (
                <p className="text-xs text-slate-600 bg-white p-2 rounded-sm border border-amber-200">
                  <span className="font-bold">행정처분 확인:</span> {property.storeDetail.adminActionChecked}
                </p>
              )}
            </div>
          )}

          {property.officeDetail && (
            <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2.5">
                사무실 정보 및 시설 조건
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">실평수 / 룸수</span>
                  <span className="font-semibold text-slate-800">
                    {property.officeDetail.actualArea || '-'}㎡ / 룸 {property.officeDetail.roomCount || '-'}개
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">관리비</span>
                  <span className="font-semibold text-slate-800">
                    {property.officeDetail.maintenanceFee ? `${property.officeDetail.maintenanceFee}만원` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">주차 대수</span>
                  <span className="font-semibold text-slate-800">
                    {property.officeDetail.parkingCount ? `${property.officeDetail.parkingCount}대` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">냉난방 방식</span>
                  <span className="font-semibold text-slate-800">
                    {property.officeDetail.hvacSystem || '-'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Consultation Notes */}
          {property.consultationNotes && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                상담 및 특이사항 메모
              </h4>
              <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {property.consultationNotes}
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            개업공인중개사 스마트 매물장 PRO
          </span>
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
