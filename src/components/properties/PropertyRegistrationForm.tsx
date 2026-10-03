'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  PlusCircle, 
  Compass, 
  MapPin, 
  UserPlus, 
  Users, 
  Check, 
  Edit3
} from 'lucide-react';
import { 
  PropertyType, 
  TransactionType, 
  CustomerItem, 
  PropertyItem,
  PublicBuildingLedgerResult,
  PROPERTY_TYPE_LABELS,
  DIRECTION_OPTIONS,
  DIRECTION_CRITERIA_OPTIONS,
  getDefaultDirectionCriteria,
  CARRIER_OPTIONS
} from '@/lib/types';
import { PublicDataFetcher } from './PublicDataFetcher';
import { ChecklistPanel } from '../checklists/ChecklistPanel';
import { getCoordinatesFromAddress } from '@/lib/geo';
import { KakaoAddressMap } from '../map/KakaoAddressMap';
import { PropertyImageUploader } from './PropertyImageUploader';

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
  onSuccess: (savedProperty: PropertyItem) => void;
  initialData?: PropertyItem | null;
  mode?: 'CREATE' | 'EDIT';
}

export const PropertyRegistrationForm: React.FC<PropertyRegistrationFormProps> = ({
  customers,
  isOpen,
  onClose,
  onSuccess,
  initialData,
  mode = 'CREATE',
}) => {
  const isEditMode = mode === 'EDIT' || !!initialData;

  // Common Form States
  const [propertyType, setPropertyType] = useState<PropertyType>('APARTMENT');
  const [propertyNumber, setPropertyNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('매매');
  const [roadAddress, setRoadAddress] = useState('');
  const [jibunAddress, setJibunAddress] = useState('');
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();

  // Direction & Criteria States (요청 1)
  const [direction, setDirection] = useState<string>('남향');
  const [directionCriteria, setDirectionCriteria] = useState<string>('거실 창문 기준');
  const [isDirectionCriteriaManual, setIsDirectionCriteriaManual] = useState<boolean>(false);

  // Price & Schedule
  const [availableDate, setAvailableDate] = useState('');
  const [price, setPrice] = useState<string>('');
  const [deposit, setDeposit] = useState<string>('');
  const [monthlyRent, setMonthlyRent] = useState<string>('');
  const [consultationNotes, setConsultationNotes] = useState('');

  // Customer Link States (요청 2: 접수 고객 매도/임대인 연동)
  const [customerMode, setCustomerMode] = useState<'DIRECT' | 'SELECT'>('DIRECT');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerCarrier, setCustomerCarrier] = useState<string>('');

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

  // Initialize or reset states when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Edit Mode
        setPropertyType(initialData.propertyType || 'APARTMENT');
        setPropertyNumber(initialData.propertyNumber || '');
        setReceiptDate(initialData.receiptDate ? initialData.receiptDate.substring(0, 10) : new Date().toISOString().substring(0, 10));
        setTransactionType(initialData.transactionType || '매매');
        setRoadAddress(initialData.roadAddress || initialData.address || '');
        setJibunAddress(initialData.jibunAddress || '');
        setAddress(initialData.address || initialData.roadAddress || initialData.jibunAddress || '');
        setDetailAddress(initialData.detailAddress || '');
        setImages(Array.isArray(initialData.images) ? initialData.images : []);
        setLatitude(initialData.latitude);
        setLongitude(initialData.longitude);
        setDirection(initialData.direction || '남향');
        
        // Direction criteria
        const criteria = initialData.directionCriteria || getDefaultDirectionCriteria(initialData.propertyType || 'APARTMENT');
        setDirectionCriteria(criteria);
        setIsDirectionCriteriaManual(!!initialData.directionCriteria);

        setAvailableDate(initialData.availableDate ? initialData.availableDate.substring(0, 10) : '');
        setPrice(initialData.price !== undefined && initialData.price !== null ? String(initialData.price) : '');
        setDeposit(initialData.deposit !== undefined && initialData.deposit !== null ? String(initialData.deposit) : '');
        setMonthlyRent(initialData.monthlyRent !== undefined && initialData.monthlyRent !== null ? String(initialData.monthlyRent) : '');
        setConsultationNotes(initialData.consultationNotes || '');

        // Customer
        if (initialData.customer) {
          setCustomerMode('SELECT');
          setCustomerId(initialData.customer.id);
          setCustomerName(initialData.customer.name || '');
          setCustomerPhone(initialData.customer.phone || '');
          setCustomerCarrier(initialData.customer.carrier || '');
        } else if (initialData.customerId) {
          setCustomerMode('SELECT');
          setCustomerId(initialData.customerId);
        } else {
          setCustomerMode('DIRECT');
          setCustomerId('');
          setCustomerName('');
          setCustomerPhone('');
          setCustomerCarrier('');
        }

        // Public data
        setLandArea(initialData.landArea);
        setTotalFloorArea(initialData.totalFloorArea);
        setApprovalDate(initialData.approvalDate ? initialData.approvalDate.substring(0, 10) : undefined);
        setBuildingRegisterUse(initialData.buildingRegisterUse);

        // Sub-details
        setApartmentData(initialData.apartmentDetail || {
          complexName: initialData.address,
          supplyArea: 112.4,
          exclusiveArea: 84.9,
          roomCount: 3,
          bathroomCount: 2,
          elevatorCount: 2,
          heatingType: '도시가스(개별난방)',
        });
        setHouseData(initialData.houseDetail || {});
        setStoreData(initialData.storeDetail || {});
        setOfficeData(initialData.officeDetail || {});
        setFactoryWarehouseData(initialData.factoryWarehouseDetail || {});
        setLandData(initialData.landDetail || {});
      } else {
        // Create Mode - Defaults
        setPropertyType('APARTMENT');
        setPropertyNumber(`PROP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
        setReceiptDate(new Date().toISOString().substring(0, 10));
        setTransactionType('매매');
        setRoadAddress('');
        setJibunAddress('');
        setAddress('');
        setDetailAddress('');
        setImages([]);
        setLatitude(undefined);
        setLongitude(undefined);
        setDirection('남향');
        setDirectionCriteria('거실 창문 기준'); // 아파트 기본값
        setIsDirectionCriteriaManual(false);
        setAvailableDate('');
        setPrice('');
        setDeposit('');
        setMonthlyRent('');
        setConsultationNotes('');
        setCustomerMode('DIRECT');
        setCustomerId('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerCarrier('');
        setLandArea(undefined);
        setTotalFloorArea(undefined);
        setApprovalDate(undefined);
        setBuildingRegisterUse(undefined);
        setApartmentData({
          complexName: '',
          supplyArea: 112.4,
          exclusiveArea: 84.9,
          roomCount: 3,
          bathroomCount: 2,
          elevatorCount: 2,
          heatingType: '도시가스(개별난방)',
        });
        setHouseData({});
        setStoreData({});
        setOfficeData({});
        setFactoryWarehouseData({});
        setLandData({});
      }
      setErrorMsg(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Handle changing property type and auto-setting direction criteria
  const handlePropertyTypeChange = (newType: PropertyType) => {
    setPropertyType(newType);
    // 방향 기준 자동 세팅: 아파트, 주택 -> 거실 창문 기준 / 상가, 공장, 사무실 등 -> 주출입구 기준
    if (!isDirectionCriteriaManual) {
      setDirectionCriteria(getDefaultDirectionCriteria(newType));
    }
  };

  // Handle manual change of direction criteria
  const handleDirectionCriteriaChange = (criteria: string) => {
    setDirectionCriteria(criteria);
    setIsDirectionCriteriaManual(true);
  };

  // Format phone number with auto hyphens
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    let formatted = raw;
    if (raw.length > 3 && raw.length <= 7) {
      formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
    } else if (raw.length > 7) {
      formatted = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
    }
    setCustomerPhone(formatted);
  };

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
    const finalAddress = roadAddress.trim() || jibunAddress.trim() || address.trim();
    if (!finalAddress) {
      setErrorMsg('소재지 주소(주소1 도로명 또는 주소2 지번)를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    // Ensure coordinates
    let finalLat = latitude;
    let finalLng = longitude;
    if (!finalLat || !finalLng) {
      const fallback = getCoordinatesFromAddress(finalAddress);
      finalLat = fallback.lat;
      finalLng = fallback.lng;
    }

    // Customer payload
    let finalCustomerId = customerMode === 'SELECT' ? (customerId || undefined) : undefined;
    let customerInput = undefined;

    if (customerMode === 'DIRECT' && (customerName.trim() || customerPhone.trim())) {
      customerInput = {
        name: customerName.trim() || '접수 의뢰고객',
        phone: customerPhone.trim() || '연락처 미등록',
        carrier: customerCarrier.trim() || undefined,
      };
    }

    const payload: any = {
      id: initialData?.id,
      propertyNumber: propertyNumber.trim(),
      receiptDate,
      propertyType,
      transactionType,
      status: initialData?.status || 'AVAILABLE',
      address: finalAddress,
      roadAddress: roadAddress.trim() || undefined,
      jibunAddress: jibunAddress.trim() || undefined,
      detailAddress: detailAddress.trim() || undefined,
      images: images.length > 0 ? images : undefined,
      latitude: finalLat,
      longitude: finalLng,
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
      customerId: finalCustomerId,
      customerInput,
      // 7가지 서브 데이터
      apartmentDetail: propertyType === 'APARTMENT' ? apartmentData : undefined,
      houseDetail: propertyType === 'HOUSE' ? houseData : undefined,
      storeDetail: propertyType === 'STORE' ? storeData : undefined,
      officeDetail: propertyType === 'OFFICE' ? officeData : undefined,
      factoryWarehouseDetail: propertyType === 'FACTORY_WAREHOUSE' ? factoryWarehouseData : undefined,
      landDetail: propertyType === 'LAND' ? landData : undefined,
    };

    try {
      const endpoint = '/api/properties';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `${isEditMode ? '매물 수정' : '매물 등록'}에 실패했습니다.`);
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
            <div className={`p-2 rounded-xl text-white shadow-md ${isEditMode ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-blue-600 shadow-blue-500/20'}`}>
              {isEditMode ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditMode ? `매물 정보 수정 (#${propertyNumber})` : '새 매물 등록 및 물건 접수'}
              </h2>
              <p className="text-xs text-slate-500">
                8방위 버튼 선택, 카카오 지도 실시간 연동, 접수고객 CRM 자동등록, 7대 유형별 세부 옵션을 지원합니다.
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
                      onClick={() => handlePropertyTypeChange(type)}
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
                
                {/* 2. 공공데이터 대장 자동 조회 & 주소1(도로명)/주소2(지번) 상호 자동완성 */}
                <PublicDataFetcher
                  roadAddress={roadAddress}
                  jibunAddress={jibunAddress}
                  onAddressChange={(road, jibun) => {
                    setRoadAddress(road);
                    setJibunAddress(jibun);
                    setAddress(road || jibun);
                  }}
                  onApplyData={handleApplyPublicData}
                />

                {/* 3. 소재지 주소 확인 및 실시간 카카오 지도 연동 */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      소재지 주소 확인 및 실시간 카카오 지도 위치
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      주소를 입력하면 지도가 즉시 해당 위치로 이동합니다.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        선택된 주소 요약
                      </label>
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded shrink-0">주소1 도로명</span>
                          <span className="font-semibold text-slate-900 truncate">{roadAddress || '(위의 대장 연동란에서 입력/검색)'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded shrink-0">주소2 지번</span>
                          <span className="text-slate-700 truncate">{jibunAddress || '-'}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        상세주소 (동/호수/층)
                      </label>
                      <input
                        type="text"
                        value={detailAddress}
                        onChange={(e) => setDetailAddress(e.target.value)}
                        placeholder="예: 104동 1502호 / 2층 일부"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-[56px]"
                      />
                    </div>
                  </div>

                  {/* 실시간 카카오 지도 임베드 */}
                  <div className="mt-2">
                    <KakaoAddressMap
                      address={roadAddress || jibunAddress || address}
                      detailAddress={detailAddress}
                      height="h-56"
                      onCoordinatesChange={(coords) => {
                        setLatitude(coords.lat);
                        setLongitude(coords.lng);
                      }}
                    />
                  </div>
                </div>

                {/* 3-1. 매물 현장 사진 (최대 20장 등록) */}
                <PropertyImageUploader
                  images={images}
                  onChange={setImages}
                  maxImages={20}
                />

                {/* 4. 접수 고객 (매도/임대인 연동) (요청 2) */}
                <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-blue-100 text-blue-700">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          접수 고객 (매도인 / 임대인 연동)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          이름, 통신사(선택), 연락처를 입력하면 고객관리(CRM) 매도/임대인 탭에 자동 저장됩니다.
                        </p>
                      </div>
                    </div>

                    {/* Mode Toggle: [신규 고객 직접 입력] vs [기존 고객에서 선택] */}
                    <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setCustomerMode('DIRECT')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-bold transition-all ${
                          customerMode === 'DIRECT'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>직접 입력 (신규 연동)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerMode('SELECT')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-bold transition-all ${
                          customerMode === 'SELECT'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>기존 고객 선택</span>
                      </button>
                    </div>
                  </div>

                  {customerMode === 'DIRECT' ? (
                    <div className="p-3.5 bg-white rounded-xl border border-blue-200/80 shadow-2xs space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            고객명 (성함)
                          </label>
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="예: 홍길동 (소유자/임대인)"
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            연락처 (휴대폰 번호)
                          </label>
                          <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            placeholder="010-1234-5678"
                            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900"
                          />
                        </div>
                      </div>

                      {/* 통신사 선택 칩 (선택사항) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-slate-700">
                            통신사 <span className="text-slate-400 font-normal">(선택할 수도 있고, 안할 수도 있음)</span>
                          </label>
                          {customerCarrier && (
                            <button
                              type="button"
                              onClick={() => setCustomerCarrier('')}
                              className="text-[11px] text-slate-400 hover:text-slate-600"
                            >
                              선택 취소
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCustomerCarrier('')}
                            className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all text-center ${
                              !customerCarrier
                                ? 'bg-slate-800 text-white border-slate-800 font-bold'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            선택안함
                          </button>
                          {CARRIER_OPTIONS.map((carrier) => (
                            <button
                              key={carrier}
                              type="button"
                              onClick={() => setCustomerCarrier(carrier)}
                              className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all text-center ${
                                customerCarrier === carrier
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {carrier}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 text-[11px] text-blue-700 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>
                          매물 등록 시 <strong>{transactionType === '매매' ? '매도인' : '임대인'}</strong> 고객으로 자동 등록되어 <strong>[물건 접수] 매도·임대인 CRM</strong> 목록에서 바로 전화/문자 연동됩니다.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        기존 등록된 고객 선택
                      </label>
                      <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">고객 미지정 (직접 접수)</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.type === 'SELLER' ? '매도' : c.type === 'LESSOR' ? '임대' : c.type} / {c.carrier ? `[${c.carrier}] ` : ''}{c.phone})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 5. 기본 매물 및 거래 정보 */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                    기본 매물 및 거래 정보
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        매물번호 (수동 직접 입력) *
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
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
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

                  {/* ======================================================== */}
                  {/* 방향 8방위 버튼 칩 & 방향 기준 3옵션 (요청 1) */}
                  {/* ======================================================== */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3">
                    
                    {/* 8방위 버튼 칩 */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-blue-600" />
                          방향 (8방위 칩 선택) *
                        </label>
                        <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          선택: {direction}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                        {DIRECTION_OPTIONS.map((d) => {
                          const isSelected = direction === d;
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setDirection(d)}
                              className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center flex items-center justify-center gap-1 ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              <span>{d}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 방향 기준 옵션: [거실 창문 기준], [주출입구 기준], [안방 창문 기준] */}
                    <div className="pt-2.5 border-t border-slate-100">
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          방향 기준 옵션
                        </label>
                        <span className="text-[11px] text-slate-500">
                          (아파트·주택: 거실 창문 기준 / 상가·공장·사무실: 주출입구 기준 자동세팅)
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {DIRECTION_CRITERIA_OPTIONS.map((crit) => {
                          const isSelected = directionCriteria === crit;
                          return (
                            <button
                              key={crit}
                              type="button"
                              onClick={() => handleDirectionCriteriaChange(crit)}
                              className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all text-center flex items-center justify-center gap-1.5 ${
                                isSelected
                                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 stroke-[3]" />}
                              <span>{crit}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 입주가능일 */}
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">입주가능일</label>
                      <input
                        type="date"
                        value={availableDate}
                        onChange={(e) => setAvailableDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

                {/* 6. 7가지 매물 세부 폼 (동적 렌더링 - 주택 폼에 에어컨/풀옵션 보강됨) */}
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
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm ${
                isEditMode
                  ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 shadow-indigo-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 shadow-blue-500/20'
              }`}
            >
              {submitting ? '저장 처리 중...' : isEditMode ? '수정 내용 저장' : '매물 등록 완료'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
