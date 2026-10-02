'use client';

import React, { useState } from 'react';
import { 
  X, 
  PlusCircle, 
  Building2, 
  Home, 
  Store, 
  Briefcase, 
  Factory, 
  Compass, 
  FileText,
  UserCheck,
  Calendar,
  DollarSign,
  Compass as DirectionIcon
} from 'lucide-react';
import { 
  PropertyType, 
  TransactionType, 
  CustomerItem, 
  PublicBuildingLedgerResult,
  PROPERTY_TYPE_LABELS 
} from '@/lib/types';
import { PublicDataFetcher } from './PublicDataFetcher';
import { ChecklistPanel } from '../checklists/ChecklistPanel';
import { getCoordinatesFromAddress } from '@/lib/geo';

// Subforms
import { ApartmentForm } from './forms/ApartmentForm';
import { HouseForm } from './forms/HouseForm';
import { StoreForm } from './forms/StoreForm';
import { OfficeForm } from './forms/OfficeForm';
import { FactoryWarehouseForm } from './forms/FactoryWarehouseForm';
import { LandForm } from './forms/LandForm';

interface PropertyRegistrationFormProps {
  customers: CustomerItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProperty: any) => void;
}

export const PropertyRegistrationForm: React.FC<PropertyRegistrationFormProps> = ({
  customers,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Common Form States
  const [propertyType, setPropertyType] = useState<PropertyType>('APARTMENT');
  const [propertyNumber, setPropertyNumber] = useState(`PROP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().substring(0, 10));
  const [transactionType, setTransactionType] = useState<TransactionType>('매매');
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [direction, setDirection] = useState('남향');
  const [directionCriteria, setDirectionCriteria] = useState('거실기준');
  const [availableDate, setAvailableDate] = useState('');
  const [price, setPrice] = useState<string>('');
  const [deposit, setDeposit] = useState<string>('');
  const [monthlyRent, setMonthlyRent] = useState<string>('');
  const [consultationNotes, setConsultationNotes] = useState('');
  const [customerId, setCustomerId] = useState<string>('');

  // Public data fields
  const [landArea, setLandArea] = useState<number | undefined>();
  const [totalFloorArea, setTotalFloorArea] = useState<number | undefined>();
  const [approvalDate, setApprovalDate] = useState<string | undefined>();
  const [buildingRegisterUse, setBuildingRegisterUse] = useState<string | undefined>();

  // Subform Specific States
  const [apartmentData, setApartmentData] = useState<any>({
    complexName: '',
    supplyArea: 112.4,
    exclusiveArea: 84.9,
    roomCount: 3,
    bathroomCount: 2,
    elevatorCount: 2,
    heatingType: '도시가스(개별난방)',
  });
  const [houseData, setHouseData] = useState<any>({});
  const [storeData, setStoreData] = useState<any>({});
  const [officeData, setOfficeData] = useState<any>({});
  const [factoryWarehouseData, setFactoryWarehouseData] = useState<any>({});
  const [landData, setLandData] = useState<any>({});

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle apply data from government public data portal
  const handleApplyPublicData = (data: PublicBuildingLedgerResult) => {
    if (data.landArea) setLandArea(data.landArea);
    if (data.totalFloorArea) setTotalFloorArea(data.totalFloorArea);
    if (data.approvalDate) setApprovalDate(data.approvalDate);
    if (data.buildingRegisterUse) setBuildingRegisterUse(data.buildingRegisterUse);

    // Sub-data updates
    if (propertyType === 'APARTMENT') {
      setApartmentData((prev: any) => ({
        ...prev,
        approvalDate: data.approvalDate || prev.approvalDate,
      }));
    } else if (propertyType === 'HOUSE') {
      setHouseData((prev: any) => ({
        ...prev,
        landArea: data.landArea,
        totalFloorArea: data.totalFloorArea,
        buildingArea: data.buildingArea,
        buildingUse: data.buildingRegisterUse,
        approvalDate: data.approvalDate,
        totalFloors: data.floorCount,
      }));
    } else if (propertyType === 'STORE') {
      setStoreData((prev: any) => ({
        ...prev,
        landArea: data.landArea,
        buildingArea: data.buildingArea,
        buildingUse: data.buildingRegisterUse,
        approvalDate: data.approvalDate,
        totalFloors: data.floorCount,
      }));
    } else if (propertyType === 'OFFICE') {
      setOfficeData((prev: any) => ({
        ...prev,
        landArea: data.landArea,
        buildingArea: data.buildingArea,
        buildingUse: data.buildingRegisterUse,
        approvalDate: data.approvalDate,
        totalFloors: data.floorCount,
      }));
    } else if (propertyType === 'FACTORY_WAREHOUSE') {
      setFactoryWarehouseData((prev: any) => ({
        ...prev,
        landArea: data.landArea,
        totalFloorArea: data.totalFloorArea,
        buildingArea: data.buildingArea,
        buildingUse: data.buildingRegisterUse,
        approvalDate: data.approvalDate,
        totalFloors: data.floorCount,
      }));
    } else if (propertyType === 'LAND') {
      setLandData((prev: any) => ({
        ...prev,
        landArea: data.landArea,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyNumber.trim()) {
      setErrorMsg('매물번호를 입력해주세요.');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('소재지 주소를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const coords = getCoordinatesFromAddress(address.trim());

    const payload: any = {
      propertyNumber: propertyNumber.trim(),
      receiptDate,
      propertyType,
      transactionType,
      address: address.trim(),
      detailAddress: detailAddress.trim() || undefined,
      latitude: coords.lat,
      longitude: coords.lng,
      direction,
      directionCriteria,
      availableDate: availableDate || undefined,
      price: price ? parseFloat(price) : undefined,
      deposit: deposit ? parseFloat(deposit) : undefined,
      monthlyRent: monthlyRent ? parseFloat(monthlyRent) : undefined,
      consultationNotes: consultationNotes.trim() || undefined,
      landArea,
      totalFloorArea,
      approvalDate,
      buildingRegisterUse,
      customerId: customerId || undefined,
      // 7가지 서브 데이터
      apartmentDetail: propertyType === 'APARTMENT' ? apartmentData : undefined,
      houseDetail: propertyType === 'HOUSE' ? houseData : undefined,
      storeDetail: propertyType === 'STORE' ? storeData : undefined,
      officeDetail: propertyType === 'OFFICE' ? officeData : undefined,
      factoryWarehouseDetail: propertyType === 'FACTORY_WAREHOUSE' ? factoryWarehouseData : undefined,
      landDetail: propertyType === 'LAND' ? landData : undefined,
    };

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '매물 등록에 실패했습니다.');
      }
      onSuccess(data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasChecklist = ['STORE', 'OFFICE', 'FACTORY_WAREHOUSE', 'LAND'].includes(propertyType);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                새 매물 등록 및 물건 접수
              </h2>
              <p className="text-xs text-slate-500">
                7가지 매물 유형별 맞춤 필드와 공공데이터포털 대장 자동 연동을 지원합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area with Split Layout for Checklist */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="property-reg-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. 7가지 매물 종류 선택 탭 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. 매물 종류 선택 (7대 유형)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                {(['APARTMENT', 'HOUSE', 'STORE', 'OFFICE', 'FACTORY_WAREHOUSE', 'LAND', 'ETC'] as PropertyType[]).map((type) => {
                  const isSelected = propertyType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPropertyType(type)}
                      className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-500/30'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <span>{PROPERTY_TYPE_LABELS[type]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Grid: Left Form, Right Sticky Checklist (if applicable) */}
            <div className={`grid gap-6 ${hasChecklist ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
              
              {/* Main Form Fields */}
              <div className={`space-y-5 ${hasChecklist ? 'lg:col-span-8' : ''}`}>
                
                {/* 2. 공공데이터 대장 자동 조회 */}
                <PublicDataFetcher
                  address={address}
                  onAddressChange={setAddress}
                  onApplyData={handleApplyPublicData}
                />

                {/* 3. 공통 매물 정보 */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                    기본 매물 및 거래 정보
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        매물번호 (수동 입력) *
                      </label>
                      <input
                        type="text"
                        value={propertyNumber}
                        onChange={(e) => setPropertyNumber(e.target.value)}
                        placeholder="예: APT-2026-001"
                        required
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">접수일자</label>
                      <input
                        type="date"
                        value={receiptDate}
                        onChange={(e) => setReceiptDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        접수 고객 (매도/임대인 연동)
                      </label>
                      <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">고객 미지정 (직접 접수)</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.type === 'SELLER' ? '매도' : c.type === 'LESSOR' ? '임대' : c.type} / {c.phone})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">상세주소 (동/호수/층)</label>
                      <input
                        type="text"
                        value={detailAddress}
                        onChange={(e) => setDetailAddress(e.target.value)}
                        placeholder="예: 104동 1502호 또는 1층 일부"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">거래유형 *</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['매매', '전세', '월세'] as TransactionType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTransactionType(t)}
                            className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                              transactionType === t
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 가격 조건 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                    {transactionType === '매매' && (
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-bold text-slate-800 mb-1">매매가 (만원)</label>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="예: 185000 (18억 5천만원)"
                          className="w-full text-xs px-3 py-2 bg-blue-50/50 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                        />
                      </div>
                    )}
                    {transactionType === '전세' && (
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-bold text-slate-800 mb-1">전세 보증금 (만원)</label>
                        <input
                          type="number"
                          value={deposit}
                          onChange={(e) => setDeposit(e.target.value)}
                          placeholder="예: 95000 (9억 5천만원)"
                          className="w-full text-xs px-3 py-2 bg-blue-50/50 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                        />
                      </div>
                    )}
                    {transactionType === '월세' && (
                      <>
                        <div className="sm:col-span-1">
                          <label className="block text-xs font-bold text-slate-800 mb-1">보증금 (만원)</label>
                          <input
                            type="number"
                            value={deposit}
                            onChange={(e) => setDeposit(e.target.value)}
                            placeholder="예: 5000"
                            className="w-full text-xs px-3 py-2 bg-blue-50/50 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-800 mb-1">월세 (만원)</label>
                          <input
                            type="number"
                            value={monthlyRent}
                            onChange={(e) => setMonthlyRent(e.target.value)}
                            placeholder="예: 350"
                            className="w-full text-xs px-3 py-2 bg-blue-50/50 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* 방향 및 입주가능일 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">방향</label>
                      <select
                        value={direction}
                        onChange={(e) => setDirection(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="남향">남향</option>
                        <option value="남동향">남동향</option>
                        <option value="동향">동향</option>
                        <option value="남서향">남서향</option>
                        <option value="서향">서향</option>
                        <option value="북향">북향</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">방향 기준</label>
                      <select
                        value={directionCriteria}
                        onChange={(e) => setDirectionCriteria(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="거실기준">거실기준</option>
                        <option value="안방기준">안방기준</option>
                        <option value="주출입구기준">주출입구기준</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">입주가능일</label>
                      <input
                        type="date"
                        value={availableDate}
                        onChange={(e) => setAvailableDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 상담 내용 및 특이사항 메모 */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">상담내용 및 매물 메모</label>
                    <textarea
                      rows={2}
                      value={consultationNotes}
                      onChange={(e) => setConsultationNotes(e.target.value)}
                      placeholder="고객 요청사항, 가격 협의 가능 여부, 방문 예약 주의사항 등"
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 4. 7가지 매물 세부 폼 (동적 렌더링) */}
                <div>
                  {propertyType === 'APARTMENT' && (
                    <ApartmentForm data={apartmentData} onChange={setApartmentData} />
                  )}
                  {propertyType === 'HOUSE' && (
                    <HouseForm data={houseData} onChange={setHouseData} />
                  )}
                  {propertyType === 'STORE' && (
                    <StoreForm data={storeData} onChange={setStoreData} />
                  )}
                  {propertyType === 'OFFICE' && (
                    <OfficeForm data={officeData} onChange={setOfficeData} />
                  )}
                  {propertyType === 'FACTORY_WAREHOUSE' && (
                    <FactoryWarehouseForm data={factoryWarehouseData} onChange={setFactoryWarehouseData} />
                  )}
                  {propertyType === 'LAND' && (
                    <LandForm data={landData} onChange={setLandData} />
                  )}
                  {propertyType === 'ETC' && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                      기타 매물은 공통 정보 및 상담 메모란을 활용하여 등록해 주세요.
                    </div>
                  )}
                </div>

              </div>

              {/* Right: Sticky Fixed Checklist Panel (상가, 사무실, 공장, 토지) */}
              {hasChecklist && (
                <div className="lg:col-span-4 lg:sticky lg:top-4 self-start">
                  <ChecklistPanel propertyType={propertyType} />
                </div>
              )}

            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-700 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500">
            * 필수 입력: 매물번호, 매물종류, 거래유형, 소재지 주소
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              form="property-reg-form"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg shadow-sm shadow-blue-500/20"
            >
              {submitting ? '매물 등록 저장중...' : '매물 등록 완료'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
