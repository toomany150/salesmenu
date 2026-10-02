'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Share2, 
  Search, 
  Filter, 
  PlusCircle, 
  Layers,
  ChevronRight,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { 
  PropertyItem, 
  PropertyType, 
  TransactionType, 
  PROPERTY_TYPE_LABELS, 
  STATUS_LABELS 
} from '@/lib/types';
import { shareViaKakao, generateSmsLink } from '@/lib/kakao';

interface PropertyListProps {
  properties: PropertyItem[];
  onSelectProperty: (property: PropertyItem) => void;
  onOpenNewProperty: () => void;
}

export const PropertyList: React.FC<PropertyListProps> = ({
  properties,
  onSelectProperty,
  onOpenNewProperty,
}) => {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedTrans, setSelectedTrans] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering
  const filtered = properties.filter((p) => {
    if (selectedType !== 'ALL' && p.propertyType !== selectedType) return false;
    if (selectedTrans !== 'ALL' && p.transactionType !== selectedTrans) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = p.propertyNumber.toLowerCase().includes(q);
      const matchAddr = p.address.toLowerCase().includes(q);
      const matchDetail = p.detailAddress?.toLowerCase().includes(q);
      const matchCust = p.customer?.name.toLowerCase().includes(q);
      const matchNotes = p.consultationNotes?.toLowerCase().includes(q);
      if (!matchNum && !matchAddr && !matchDetail && !matchCust && !matchNotes) return false;
    }
    return true;
  });

  const getPriceDisplay = (p: PropertyItem) => {
    if (p.transactionType === '매매') {
      return p.price ? `${p.price.toLocaleString()} 만원` : '협의';
    } else if (p.transactionType === '전세') {
      return p.deposit ? `${p.deposit.toLocaleString()} 만원` : '협의';
    } else {
      return `${p.deposit ? p.deposit.toLocaleString() + '만' : '0'} / ${p.monthlyRent ? p.monthlyRent.toLocaleString() + '만' : '0'}`;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Filtering and Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        {/* Top Filter: 7 Types Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
              selectedType === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            전체 ({properties.length})
          </button>
          {(['APARTMENT', 'HOUSE', 'STORE', 'OFFICE', 'FACTORY_WAREHOUSE', 'LAND'] as PropertyType[]).map((type) => {
            const count = properties.filter((p) => p.propertyType === type).length;
            const isSel = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
                  isSel
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {PROPERTY_TYPE_LABELS[type]} ({count})
              </button>
            );
          })}
        </div>

        {/* Search & Transaction Type Dropdowns */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="매물번호, 소재지 주소, 의뢰인명, 메모 검색..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 font-medium">거래:</span>
              {(['ALL', '매매', '전세', '월세'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTrans(t)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                    selectedTrans === t
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t === 'ALL' ? '전체' : t}
                </button>
              ))}
            </div>

            <button
              onClick={onOpenNewProperty}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>새 매물 등록</span>
            </button>
          </div>
        </div>
      </div>

      {/* Property Grid Cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((property) => {
            const statusInfo = STATUS_LABELS[property.status] || { label: property.status, color: 'bg-slate-100 text-slate-800' };

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

            const onShareKakao = (e: React.MouseEvent) => {
              e.stopPropagation();
              shareViaKakao({
                title: `${PROPERTY_TYPE_LABELS[property.propertyType]} (${property.transactionType})`,
                description: property.consultationNotes || property.address,
                priceText: `${property.transactionType} ${getPriceDisplay(property)}`,
                address: property.address,
                propertyNumber: property.propertyNumber,
                propertyType: PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType,
              });
            };

            return (
              <div
                key={property.id}
                onClick={() => onSelectProperty(property)}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all p-4.5 flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  {/* Card Header: Type Badge, Transaction Type, Property Number */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-blue-600 text-white">
                        {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 text-slate-800">
                        {property.transactionType}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        #{property.propertyNumber}
                      </span>
                    </div>
                  </div>

                  {/* Title / Address */}
                  <h4 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors text-sm line-clamp-1">
                    {property.apartmentDetail?.complexName ||
                     property.storeDetail?.storeName ||
                     property.officeDetail?.officeName ||
                     property.factoryWarehouseDetail?.companyName ||
                     property.landDetail?.companyName ||
                     property.address}
                  </h4>

                  <p className="text-xs text-slate-600 flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{property.address} {property.detailAddress || ''}</span>
                  </p>

                  {/* Price */}
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">거래금액</span>
                    <span className="text-base font-black text-blue-900">
                      {getPriceDisplay(property)}
                    </span>
                  </div>

                  {/* Quick specs snippet */}
                  <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px] text-slate-600">
                    <div className="bg-slate-50/70 p-1.5 rounded-md truncate">
                      <span className="text-slate-400">방향:</span> {property.direction || '미정'}
                    </div>
                    <div className="bg-slate-50/70 p-1.5 rounded-md truncate">
                      <span className="text-slate-400">입주:</span> {property.availableDate ? property.availableDate.substring(0, 10) : '즉시/협의'}
                    </div>
                  </div>

                  {/* Customer / Owner Info */}
                  {property.customer && (
                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span className="font-medium text-slate-700">
                        의뢰인: {property.customer.name} ({property.customer.carrier})
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {property.customer.phone}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Action Row: [📞 전화] [💬 문자] [🟡 카톡 공유] */}
                <div 
                  className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1">
                    {property.customer?.phone && (
                      <a
                        href={`tel:${property.customer.phone}`}
                        title="고객 전화걸기"
                        className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <a
                      href={smsLink}
                      title="문자로 매물정보 전송"
                      className="p-1.5 rounded-lg text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={onShareKakao}
                      title="카카오톡으로 공유"
                      className="p-1.5 rounded-lg text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => onSelectProperty(property)}
                    className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    <span>상세보기</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800">조회된 매물이 없습니다.</h4>
          <p className="text-xs text-slate-500 mt-1">
            필터 조건을 변경하거나 [새 매물 등록] 버튼을 눌러 첫 매물을 추가하세요.
          </p>
          <button
            onClick={onOpenNewProperty}
            className="mt-4 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
          >
            ＋ 새 매물 등록하기
          </button>
        </div>
      )}

    </div>
  );
};
