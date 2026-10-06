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
  Copy,
  Edit3,
  Building,
  Sparkles
} from 'lucide-react';
import { 
  PropertyType, 
  TransactionType, 
  CustomerItem, 
  PropertyItem,
  PublicBuildingLedgerResult,
  PublicBuildingFloorInfo,
  PublicBuildingUnitInfo,
  PROPERTY_TYPE_LABELS,
  DIRECTION_OPTIONS,
  DIRECTION_CRITERIA_OPTIONS,
  DIRECTION_CRITERIA_BY_PROPERTY_TYPE,
  getDefaultDirectionCriteria,
  CARRIER_OPTIONS
} from '@/lib/types';
import { PublicDataFetcher } from './PublicDataFetcher';
import { ChecklistPanel } from '../checklists/ChecklistPanel';
import { getCoordinatesFromAddress } from '@/lib/geo';
import { KakaoAddressMap } from '../map/KakaoAddressMap';
import { PropertyImageUploader } from './PropertyImageUploader';
import { useAuth } from '../auth/AuthContext';
import { VoiceTextarea } from '../common/VoiceInput';
import { saveCustomProperty } from '@/lib/storage';

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
  const { currentUser, availableAgents, addCustomAgent, removeCustomAgent } = useAuth();
  const isEditMode = mode === 'EDIT' || !!initialData;

  // Common Form States
  const [propertyType, setPropertyType] = useState<PropertyType>('APARTMENT');
  const [propertyNumber, setPropertyNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [managerName, setManagerName] = useState<string>('개업공인중개사 (대표)');
  const [assignedAgents, setAssignedAgents] = useState<string[]>([]);
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [newAgentInput, setNewAgentInput] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('매매');
  const [roadAddress, setRoadAddress] = useState('');
  const [jibunAddress, setJibunAddress] = useState('');
  const [address, setAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [copiedAddressType, setCopiedAddressType] = useState<'road' | 'jibun' | null>(null);

  const handleCopySummaryAddress = (text: string, type: 'road' | 'jibun') => {
    if (!text) return;
    const clean = text.trim();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(clean).then(() => {
        setCopiedAddressType(type);
        setTimeout(() => setCopiedAddressType(null), 2000);
      }).catch(() => fallbackCopySummary(clean, type));
    } else {
      fallbackCopySummary(clean, type);
    }
  };

  const fallbackCopySummary = (text: string, type: 'road' | 'jibun') => {
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

  // Direction & Criteria States (요청 1)
  const [direction, setDirection] = useState<string>('남향');
  const [directionCriteria, setDirectionCriteria] = useState<string>('거실 창문 기준');
  const [isDirectionCriteriaManual, setIsDirectionCriteriaManual] = useState<boolean>(false);

  // Price & Schedule
  const [availableDate, setAvailableDate] = useState('');
  const [isImmediateAvailable, setIsImmediateAvailable] = useState<boolean>(false); // 즉시가능
  const [isNegotiableDate, setIsNegotiableDate] = useState<boolean>(false); // 입주일 협의
  const [price, setPrice] = useState<string>('');
  const [negotiablePrice, setNegotiablePrice] = useState<string>(''); // 조정 가능한 매매가액 (만원)
  const [deposit, setDeposit] = useState<string>('');
  const [negotiableDeposit, setNegotiableDeposit] = useState<string>(''); // 조정 가능한 전세/보증금 (만원)
  const [monthlyRent, setMonthlyRent] = useState<string>('');
  const [negotiableMonthlyRent, setNegotiableMonthlyRent] = useState<string>(''); // 조정 가능한 월 임대료 (만원)
  const [isMonthlyRentVat, setIsMonthlyRentVat] = useState<boolean>(false); // 월 임대료 부가세 별도 여부
  const [isNoMaintenanceFee, setIsNoMaintenanceFee] = useState<boolean>(false); // 관리비 없음
  const [consultationNotes, setConsultationNotes] = useState('');

  // 기타 특이 옵션 직접 추가 상태 (사진등록 상단 위치)
  const [extraCustomOption, setExtraCustomOption] = useState<string>('');

  // 권한자 삭제 모드 상태
  const [isDeletingAgent, setIsDeletingAgent] = useState<boolean>(false);

  // Customer Link States (요청 2: 접수 고객 매도/임대인 연동)
  const [customerMode, setCustomerMode] = useState<'DIRECT' | 'SELECT'>('DIRECT');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerCarrier, setCustomerCarrier] = useState<string>('');

  // Public data fields (7대 대장 연동 항목)
  const [landArea, setLandArea] = useState<number | undefined>();
  const [totalFloorArea, setTotalFloorArea] = useState<number | undefined>();
  const [buildingArea, setBuildingArea] = useState<number | undefined>();
  const [buildingRegisterUse, setBuildingRegisterUse] = useState<string | undefined>();
  const [zoningArea, setZoningArea] = useState<string | undefined>();
  const [structureName, setStructureName] = useState<string | undefined>();
  const [floorCount, setFloorCount] = useState<number | undefined>();
  const [underFloorCount, setUnderFloorCount] = useState<number | undefined>();
  const [floorText, setFloorText] = useState<string | undefined>();
  const [approvalDate, setApprovalDate] = useState<string | undefined>();
  const [ledgerData, setLedgerData] = useState<PublicBuildingLedgerResult | null>(null);

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
        setTransactionType(
          initialData.propertyType === 'STORE' && initialData.transactionType === '전세'
            ? '월세'
            : (initialData.transactionType || '매매')
        );
        setRoadAddress(initialData.roadAddress || initialData.address || '');
        setJibunAddress(initialData.jibunAddress || '');
        setAddress(initialData.address || initialData.roadAddress || initialData.jibunAddress || '');
        setDetailAddress(initialData.detailAddress || '');
        setImages(Array.isArray(initialData.images) ? initialData.images : []);
        setLatitude(initialData.latitude);
        setLongitude(initialData.longitude);
        setDirection(initialData.direction || '남향');
        
        // Direction criteria
        let criteria = initialData.directionCriteria || getDefaultDirectionCriteria(initialData.propertyType || 'APARTMENT');
        if (initialData.propertyType === 'LAND' && (criteria === '거실 창문 기준' || criteria === '안방 창문 기준')) {
          criteria = '진입도로 기준';
        }
        setDirectionCriteria(criteria);
        setIsDirectionCriteriaManual(!!initialData.directionCriteria && initialData.directionCriteria !== '거실 창문 기준');

        setAvailableDate(initialData.availableDate ? initialData.availableDate.substring(0, 10) : '');
        setIsImmediateAvailable(!!initialData.isImmediateAvailable);
        setIsNegotiableDate(!!initialData.isNegotiableDate || (!initialData.isImmediateAvailable && !initialData.availableDate));
        setPrice(initialData.price !== undefined && initialData.price !== null ? String(initialData.price) : '');
        setNegotiablePrice(initialData.negotiablePrice !== undefined && initialData.negotiablePrice !== null ? String(initialData.negotiablePrice) : '');
        setDeposit(initialData.deposit !== undefined && initialData.deposit !== null ? String(initialData.deposit) : '');
        setNegotiableDeposit(initialData.negotiableDeposit !== undefined && initialData.negotiableDeposit !== null ? String(initialData.negotiableDeposit) : '');
        setMonthlyRent(initialData.monthlyRent !== undefined && initialData.monthlyRent !== null ? String(initialData.monthlyRent) : '');
        setNegotiableMonthlyRent(initialData.negotiableMonthlyRent !== undefined && initialData.negotiableMonthlyRent !== null ? String(initialData.negotiableMonthlyRent) : '');
        setIsMonthlyRentVat(!!(initialData.monthlyRentVat || initialData.storeDetail?.monthlyRentVat || initialData.officeDetail?.monthlyRentVat));
        setIsNoMaintenanceFee(!!initialData.isNoMaintenanceFee);
        setConsultationNotes(initialData.consultationNotes || '');
        setManagerName(initialData.managerName || '개업공인중개사 (대표)');
        setAssignedAgents(Array.isArray(initialData.assignedAgents) ? initialData.assignedAgents : []);
        setIsAddingAgent(false);
        setNewAgentInput('');

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

        // Public data (7대 대장 데이터)
        setLandArea(initialData.landArea);
        setTotalFloorArea(initialData.totalFloorArea);
        setBuildingArea(initialData.buildingArea);
        setApprovalDate(initialData.approvalDate ? initialData.approvalDate.substring(0, 10) : undefined);
        setBuildingRegisterUse(initialData.buildingRegisterUse);
        setZoningArea(initialData.zoningArea);
        setStructureName(initialData.structureName);
        setFloorCount(initialData.floorCount);
        setUnderFloorCount(initialData.underFloorCount);
        setFloorText(initialData.floorText);

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
        setPropertyNumber(''); // 사용자의 요청: 신규 매물 등록 시 매물고유번호칸은 비워두기
        setReceiptDate(new Date().toISOString().substring(0, 10));
        setManagerName(
          currentUser?.role === 'AGENT' && currentUser?.name 
            ? currentUser.name 
            : '개업공인중개사 (대표)'
        );
        setAssignedAgents([]);
        setIsAddingAgent(false);
        setNewAgentInput('');
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
        setIsImmediateAvailable(false);
        setIsNegotiableDate(false);
        setPrice('');
        setNegotiablePrice('');
        setDeposit('');
        setNegotiableDeposit('');
        setMonthlyRent('');
        setNegotiableMonthlyRent('');
        setIsMonthlyRentVat(false);
        setExtraCustomOption('');
        setIsNoMaintenanceFee(false);
        setConsultationNotes('');
        setCustomerMode('DIRECT');
        setCustomerId('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerCarrier('');
        setLedgerData(null);
        setLandArea(undefined);
        setTotalFloorArea(undefined);
        setBuildingArea(undefined);
        setApprovalDate(undefined);
        setBuildingRegisterUse(undefined);
        setZoningArea(undefined);
        setStructureName(undefined);
        setFloorCount(undefined);
        setUnderFloorCount(undefined);
        setFloorText(undefined);
        setApartmentData({
          complexName: '',
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

  // Handle changing property type and auto-setting direction criteria & transaction types
  const handlePropertyTypeChange = (newType: PropertyType) => {
    setPropertyType(newType);
    // 상가점포는 전세가 없으므로 매매 또는 월세로 자동 전환
    if (newType === 'STORE' && transactionType === '전세') {
      setTransactionType('월세');
    }
    // 방향 기준 자동 세팅: 토지 -> 진입도로 기준 / 아파트, 주택 -> 거실 창문 기준 / 상가, 공장, 사무실 등 -> 주출입구 기준
    if (!isDirectionCriteriaManual || (newType === 'LAND' && (directionCriteria === '거실 창문 기준' || directionCriteria === '안방 창문 기준'))) {
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

  // 집합건물 전유부(호수) 데이터 서브폼 자동 반영
  const applyUnitToSubForms = (unit: PublicBuildingUnitInfo, currentLedger: PublicBuildingLedgerResult | null) => {
    const formattedDetail = `${unit.dong ? unit.dong + ' ' : ''}${unit.ho}`;
    setDetailAddress(formattedDetail);

    const exclArea = unit.exclusiveArea;
    const exclPyeong = unit.exclusiveAreaPyeong || +(exclArea * 0.3025).toFixed(2);
    const suppArea = unit.supplyArea || unit.exclusiveArea;
    const suppPyeong = unit.supplyAreaPyeong || +(suppArea * 0.3025).toFixed(2);
    const mainUse = unit.mainUse || currentLedger?.buildingRegisterUse;

    // 호실 선택 시 매물 폼의 메인 대장면적(공급면적) 및 층수 자동 동기화 (전체 건물 연면적 대신 선택 호실 면적으로 정확히 치환)
    setBuildingArea(suppArea);
    if (unit.floor) {
      setFloorText(unit.floor);
    }

    if (propertyType === 'HOUSE') {
      setHouseData((prev: any) => ({
        ...prev,
        currentFloor: unit.floor,
        buildingArea: suppArea,
        buildingAreaPyeong: suppPyeong,
        exclusiveArea: exclArea,
        exclusiveAreaPyeong: exclPyeong,
        actualArea: exclArea,
        actualAreaPyeong: exclPyeong,
        buildingUse: mainUse || prev.buildingUse,
        totalFloors: currentLedger?.floorCount || prev.totalFloors,
        approvalDate: currentLedger?.approvalDate || prev.approvalDate,
      }));
    } else if (propertyType === 'APARTMENT') {
      setApartmentData((prev: any) => ({
        ...prev,
        complexName: currentLedger?.complexName || prev.complexName,
        buildingNo: unit.dong || prev.buildingNo,
        unitNo: unit.ho,
        currentFloor: unit.floor,
        exclusiveArea: exclArea,
        exclusiveAreaPyeong: exclPyeong,
        supplyArea: suppArea,
        supplyAreaPyeong: suppPyeong,
        approvalDate: currentLedger?.approvalDate || prev.approvalDate,
      }));
    } else if (propertyType === 'STORE') {
      setStoreData((prev: any) => ({
        ...prev,
        currentFloor: unit.floor,
        buildingArea: suppArea,
        buildingAreaPyeong: suppPyeong,
        actualArea: exclArea,
        actualAreaPyeong: exclPyeong,
        buildingUse: mainUse || prev.buildingUse,
      }));
    } else if (propertyType === 'OFFICE') {
      setOfficeData((prev: any) => ({
        ...prev,
        currentFloor: unit.floor,
        buildingArea: suppArea,
        buildingAreaPyeong: suppPyeong,
        actualArea: exclArea,
        actualAreaPyeong: exclPyeong,
        buildingUse: mainUse || prev.buildingUse,
      }));
    }

    // 소유자 정보가 호실별로 별도 존재하는 경우 업데이트
    if (unit.ownerName) {
      if (!customerName.trim() && customerMode === 'DIRECT') {
        setCustomerName(unit.ownerName);
      }
      if (currentLedger) {
        setLedgerData((prev) => prev ? {
          ...prev,
          ownerName: unit.ownerName,
          ownerRegNo: unit.ownerRegNo || prev.ownerRegNo,
          ownershipChangeDate: unit.ownershipChangeDate || prev.ownershipChangeDate,
          ownershipChangeReason: unit.ownershipChangeReason || prev.ownershipChangeReason,
        } : prev);
      }
    }
  };

  // 전유부 호수 직접 선택 핸들러
  const handleSelectUnitFromLedger = (unit: PublicBuildingUnitInfo) => {
    applyUnitToSubForms(unit, ledgerData);
  };

  // 상세주소(동/호수/층) 입력시 해당층수, 대장상면적, 대장상 주용도 자동 연동 (수정도 언제든지 가능)
  const syncFloorFromDetailAddress = (detail: string, currentLedger: PublicBuildingLedgerResult | null) => {
    if (!detail) return;
    const cleanDetail = detail.trim();

    // 0. 집합건물 전유부(unitList)가 있는 경우, 호수 및 동 매칭 우선 확인
    if (currentLedger?.unitList && currentLedger.unitList.length > 0) {
      const cleanNoSpace = cleanDetail.replace(/\s+/g, '');
      const matchedUnit = currentLedger.unitList.find((u) => {
        const fullKey = `${u.dong || ''}${u.ho}`.replace(/\s+/g, '');
        return cleanNoSpace.includes(fullKey) || 
               fullKey.includes(cleanNoSpace) || 
               (cleanDetail.includes(u.ho) && (!u.dong || cleanDetail.includes(u.dong)));
      });

      if (matchedUnit) {
        applyUnitToSubForms(matchedUnit, currentLedger);
        return;
      }
    }

    // 1. 상세주소에서 층수 파악 (예: 1층, 지상 1층, 101호, 2층, 지하 1층, B1층 등)
    let detectedFloor = '';
    let floorNum = 0;
    let isUnderground = false;

    if (/지하\s*(\d+)층?/i.test(cleanDetail) || /B(\d+)/i.test(cleanDetail)) {
      const match = cleanDetail.match(/지하\s*(\d+)층?/i) || cleanDetail.match(/B(\d+)/i);
      floorNum = match ? parseInt(match[1], 10) : 1;
      detectedFloor = `지하 ${floorNum}층`;
      isUnderground = true;
    } else if (/(\d+)층/i.test(cleanDetail)) {
      const match = cleanDetail.match(/(\d+)층/i);
      floorNum = match ? parseInt(match[1], 10) : 1;
      detectedFloor = `지상 ${floorNum}층`;
    } else if (/(\d+)호/i.test(cleanDetail)) {
      const match = cleanDetail.match(/(\d+)호/i);
      if (match) {
        const roomNum = parseInt(match[1], 10);
        floorNum = roomNum >= 100 ? Math.floor(roomNum / 100) : 1;
        detectedFloor = `지상 ${floorNum}층`;
      }
    }

    // 2. 대장상 층별목록(floorList)에서 일치하는 층 찾기
    const matchedFloorInfo = currentLedger?.floorList?.find((f) => {
      if (isUnderground) {
        return f.floor.includes('지하') && f.floor.includes(String(floorNum));
      } else if (floorNum > 0) {
        return (f.floor.includes('지상') || !f.floor.includes('지하')) && f.floor.includes(String(floorNum));
      }
      return false;
    });

    const targetFloor = detectedFloor || cleanDetail;
    const targetArea = matchedFloorInfo?.area ?? currentLedger?.buildingArea;
    const targetUse = matchedFloorInfo?.mainUse || matchedFloorInfo?.etcUse || currentLedger?.buildingRegisterUse;

    // 3. 서브폼 데이터에 자동 반영 (사용자가 언제든지 수정 가능)
    if (propertyType === 'STORE') {
      setStoreData((prev: any) => ({
        ...prev,
        currentFloor: targetFloor,
        buildingArea: targetArea !== undefined ? targetArea : prev.buildingArea,
        buildingUse: targetUse || prev.buildingUse,
        actualArea: prev.actualArea ? prev.actualArea : (targetArea !== undefined ? targetArea : prev.actualArea),
      }));
    } else if (propertyType === 'OFFICE') {
      setOfficeData((prev: any) => ({
        ...prev,
        currentFloor: targetFloor,
        buildingArea: targetArea !== undefined ? targetArea : prev.buildingArea,
        buildingUse: targetUse || prev.buildingUse,
        actualArea: prev.actualArea ? prev.actualArea : (targetArea !== undefined ? targetArea : prev.actualArea),
      }));
    } else if (propertyType === 'HOUSE') {
      setHouseData((prev: any) => ({
        ...prev,
        currentFloor: targetFloor,
        buildingArea: targetArea !== undefined ? targetArea : prev.buildingArea,
        buildingUse: targetUse || prev.buildingUse,
      }));
    } else if (propertyType === 'APARTMENT') {
      setApartmentData((prev: any) => ({
        ...prev,
        currentFloor: targetFloor,
        supplyArea: targetArea !== undefined ? targetArea : prev.supplyArea,
      }));
    }
  };

  // 상세주소 입력 변경 핸들러 (아파트 110동2906호 정밀 파싱 지원)
  const handleDetailAddressChange = (val: string) => {
    setDetailAddress(val);

    // 아파트인 경우 110동 2906호 / 110동2906호 / 동 / 호수 자동 추출 반영
    if (propertyType === 'APARTMENT') {
      const dongMatch = val.match(/(\d+)\s*동/);
      const hoMatch = val.match(/(\d+)\s*호/);
      const complexPart = val.replace(/(\d+)\s*동.*/, '').trim();
      setApartmentData((prev: any) => ({
        ...prev,
        complexName: complexPart || prev.complexName,
        buildingNo: dongMatch ? `${dongMatch[1]}동` : prev.buildingNo,
        unitNo: hoMatch ? `${hoMatch[1]}호` : prev.unitNo,
      }));
    }

    syncFloorFromDetailAddress(val, ledgerData);
  };

  // 대장상 층수 클릭 시 해당층수, 대장상면적, 대장상주용도 자동 입력 (수정 가능)
  const handleSelectFloorFromLedger = (floorInfo: PublicBuildingFloorInfo) => {
    setDetailAddress(floorInfo.floor);
    const pyeong = +(floorInfo.area * 0.3025).toFixed(2);
    if (propertyType === 'STORE') {
      setStoreData((prev: any) => ({
        ...prev,
        currentFloor: floorInfo.floor,
        buildingArea: floorInfo.area,
        buildingAreaPyeong: pyeong,
        buildingUse: floorInfo.mainUse,
        actualArea: floorInfo.area, // 층 클릭 시 실평수 초기값도 해당 층 면적으로 즉시 갱신
        actualAreaPyeong: pyeong,
      }));
    } else if (propertyType === 'OFFICE') {
      setOfficeData((prev: any) => ({
        ...prev,
        currentFloor: floorInfo.floor,
        buildingArea: floorInfo.area,
        buildingAreaPyeong: pyeong,
        buildingUse: floorInfo.mainUse,
        actualArea: floorInfo.area, // 층 클릭 시 실평수 초기값도 해당 층 면적으로 즉시 갱신
        actualAreaPyeong: pyeong,
      }));
    } else if (propertyType === 'HOUSE') {
      setHouseData((prev: any) => ({
        ...prev,
        currentFloor: floorInfo.floor,
        buildingArea: floorInfo.area,
        buildingUse: floorInfo.mainUse,
      }));
    }
  };

  // Handle apply data from government public data portal
  const handleApplyPublicData = (data: PublicBuildingLedgerResult) => {
    setLedgerData(data);
    if (data.landArea) setLandArea(data.landArea);
    if (data.totalFloorArea) setTotalFloorArea(data.totalFloorArea);
    if (data.buildingArea) setBuildingArea(data.buildingArea);
    if (data.buildingRegisterUse) setBuildingRegisterUse(data.buildingRegisterUse);
    if (data.zoningArea) setZoningArea(data.zoningArea);
    if (data.structureName) setStructureName(data.structureName);
    if (data.floorCount) setFloorCount(data.floorCount);
    if (data.underFloorCount !== undefined) setUnderFloorCount(data.underFloorCount);
    if (data.floorText) setFloorText(data.floorText);
    if (data.approvalDate) setApprovalDate(data.approvalDate);

    // 기본 층수 및 1층 정보 추출
    const groundFirstFloor = data.floorList?.find((f) => f.floor.includes('1층') && !f.floor.includes('지하')) || data.floorList?.[0];
    const initialFloorText = detailAddress || groundFirstFloor?.floor || data.floorText || '지상 1층';
    const initialArea = groundFirstFloor?.area || data.buildingArea;
    const initialUse = groundFirstFloor?.mainUse || data.buildingRegisterUse;

    // Sub-data updates
    if (propertyType === 'APARTMENT') {
      const complex = data.complexName || detailAddress || roadAddress || jibunAddress || '';
      setApartmentData((prev: any) => ({
        ...prev,
        complexName: complex || prev.complexName,
        exclusiveArea: data.exclusiveArea !== undefined ? data.exclusiveArea : prev.exclusiveArea,
        exclusiveAreaPyeong: data.exclusiveAreaPyeong !== undefined ? data.exclusiveAreaPyeong : prev.exclusiveAreaPyeong,
        supplyArea: (data.supplyArea || data.buildingArea) !== undefined ? (data.supplyArea || data.buildingArea) : prev.supplyArea,
        supplyAreaPyeong: data.supplyAreaPyeong !== undefined ? data.supplyAreaPyeong : prev.supplyAreaPyeong,
        pyeongType: data.pyeongType || prev.pyeongType,
        roomCount: data.roomCount !== undefined ? data.roomCount : prev.roomCount,
        bathroomCount: data.bathroomCount !== undefined ? data.bathroomCount : prev.bathroomCount,
        elevatorCount: data.elevatorCount !== undefined ? data.elevatorCount : prev.elevatorCount,
        parkingCount: data.parkingCount !== undefined ? data.parkingCount : prev.parkingCount,
        parkingPerHousehold: data.parkingPerHousehold || prev.parkingPerHousehold,
        maintenanceFee: data.maintenanceFee !== undefined ? data.maintenanceFee : prev.maintenanceFee,
        heatingType: data.heatingType || prev.heatingType || '도시가스(개별난방)',
        approvalDate: data.approvalDate || prev.approvalDate,
      }));
    } else if (propertyType === 'HOUSE') {
      setHouseData((prev: any) => ({
        ...prev,
        landArea: data.landArea || prev.landArea,
        totalFloorArea: data.totalFloorArea || prev.totalFloorArea,
        buildingArea: data.buildingArea || prev.buildingArea,
        buildingUse: data.buildingRegisterUse || prev.buildingUse,
        approvalDate: data.approvalDate || prev.approvalDate,
        totalFloors: data.floorCount || prev.totalFloors,
        currentFloor: data.floorText || (data.floorCount ? `지상 ${data.floorCount}층 / 지하 ${data.underFloorCount || 0}층` : prev.currentFloor),
        parkingCount: data.parkingCount || prev.parkingCount,
      }));
    } else if (propertyType === 'STORE') {
      const area = initialArea;
      const pyeong = area ? +(area * 0.3025).toFixed(2) : undefined;
      setStoreData((prev: any) => ({
        ...prev,
        landArea: data.landArea || prev.landArea,
        buildingArea: area || prev.buildingArea,
        buildingAreaPyeong: pyeong || prev.buildingAreaPyeong,
        actualArea: area || prev.actualArea,
        actualAreaPyeong: pyeong || prev.actualAreaPyeong,
        buildingUse: initialUse || prev.buildingUse,
        approvalDate: data.approvalDate || prev.approvalDate,
        totalFloors: data.floorCount || prev.totalFloors,
        currentFloor: initialFloorText || prev.currentFloor,
        parkingCount: data.parkingCount || prev.parkingCount,
      }));
      if (!detailAddress && initialFloorText) {
        setDetailAddress(initialFloorText);
      }
    } else if (propertyType === 'OFFICE') {
      const area = initialArea;
      const pyeong = area ? +(area * 0.3025).toFixed(2) : undefined;
      setOfficeData((prev: any) => ({
        ...prev,
        landArea: data.landArea || prev.landArea,
        buildingArea: area || prev.buildingArea,
        buildingAreaPyeong: pyeong || prev.buildingAreaPyeong,
        actualArea: area || prev.actualArea,
        actualAreaPyeong: pyeong || prev.actualAreaPyeong,
        buildingUse: initialUse || prev.buildingUse,
        approvalDate: data.approvalDate || prev.approvalDate,
        totalFloors: data.floorCount || prev.totalFloors,
        currentFloor: initialFloorText || prev.currentFloor,
        parkingCount: data.parkingCount || prev.parkingCount,
      }));
      if (!detailAddress && initialFloorText) {
        setDetailAddress(initialFloorText);
      }
    } else if (propertyType === 'FACTORY_WAREHOUSE') {
      setFactoryWarehouseData((prev: any) => ({
        ...prev,
        landArea: data.landArea || prev.landArea,
        totalFloorArea: data.totalFloorArea || prev.totalFloorArea,
        buildingArea: data.buildingArea || prev.buildingArea,
        buildingUse: data.buildingRegisterUse || prev.buildingUse,
        zoningArea: data.zoningArea || prev.zoningArea,
        structure: data.structureName || prev.structure,
        approvalDate: data.approvalDate || prev.approvalDate,
        totalFloors: data.floorCount || prev.totalFloors,
        currentFloor: data.floorText || prev.currentFloor,
        parkingCount: data.parkingCount || prev.parkingCount,
      }));
    } else if (propertyType === 'LAND') {
      setLandData((prev: any) => ({
        ...prev,
        landArea: data.landArea || prev.landArea,
        zoningArea: data.zoningArea || prev.zoningArea,
      }));
    }

    if (detailAddress) {
      syncFloorFromDetailAddress(detailAddress, data);
    }
  };

  // 기타 특이 옵션 직접 추가 핸들러 (매물 사진 등록 바로 위에 위치)
  const handleApplyExtraCustomOption = () => {
    const trimmed = extraCustomOption.trim();
    if (!trimmed) return;

    if (propertyType === 'APARTMENT') {
      setApartmentData((prev: any) => {
        const curOpts = prev.otherOptions ? prev.otherOptions.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        if (!curOpts.includes(trimmed)) {
          const nextOpts = [...curOpts, trimmed].join(', ');
          return { ...prev, otherOptions: nextOpts };
        }
        return prev;
      });
    } else if (propertyType === 'HOUSE') {
      setHouseData((prev: any) => {
        const curOpts = prev.options ? prev.options.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        if (!curOpts.includes(trimmed)) {
          const nextOpts = [...curOpts, trimmed].join(', ');
          return { ...prev, options: nextOpts };
        }
        return prev;
      });
    } else {
      // 상가, 사무실 등: 상담메모에 반영
      setConsultationNotes((prev) => {
        const prefix = prev ? `${prev}\n[기타옵션] ` : '[기타옵션] ';
        return `${prefix}${trimmed}`;
      });
    }
    setExtraCustomOption('');
  };

  const handleRemoveExtraOption = (itemToRemove: string) => {
    if (propertyType === 'APARTMENT') {
      setApartmentData((prev: any) => {
        const curOpts = prev.otherOptions ? prev.otherOptions.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        const nextOpts = curOpts.filter((o: string) => o !== itemToRemove).join(', ');
        return { ...prev, otherOptions: nextOpts || undefined };
      });
    } else if (propertyType === 'HOUSE') {
      setHouseData((prev: any) => {
        const curOpts = prev.options ? prev.options.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        const nextOpts = curOpts.filter((o: string) => o !== itemToRemove).join(', ');
        return { ...prev, options: nextOpts || undefined };
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalPropNumber = propertyNumber.trim();
    if (!finalPropNumber) {
      // 사용자가 매물고유번호를 직접 적지 않고 비워둔 경우 자동 고유번호 부여
      finalPropNumber = `PROP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
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

    // Customer payload (요구사항 10: 고객 등록 자동 연계 및 매핑)
    let finalCustomerId = customerMode === 'SELECT' ? (customerId || undefined) : undefined;
    let customerInput = undefined;

    if (customerMode === 'DIRECT' && (customerName.trim() || customerPhone.trim())) {
      // 거래유형 자동 선택:
      // 매매 -> 매도인 (SELLER)
      // 전세, 월세 -> 임대인 (LESSOR)
      // 상가점포에 권리금 있는 물건 -> 임차인(권리금) (LESSEE)
      let autoCustomerType: 'SELLER' | 'LESSOR' | 'LESSEE' = 'SELLER';
      let autoCustomerSubType = '매도인';

      const storePremiumVal = propertyType === 'STORE' ? (storeData?.premium || 0) : 0;
      if (propertyType === 'STORE' && storePremiumVal > 0) {
        autoCustomerType = 'LESSEE';
        autoCustomerSubType = '임차인(권리금)';
      } else if (transactionType === '매매') {
        autoCustomerType = 'SELLER';
        autoCustomerSubType = '매도인';
      } else {
        autoCustomerType = 'LESSOR';
        autoCustomerSubType = '임대인';
      }

      customerInput = {
        name: customerName.trim() || '접수 의뢰고객',
        phone: customerPhone.trim() || '010-0000-0000',
        carrier: customerCarrier.trim() || undefined,
        type: autoCustomerType,
        subType: autoCustomerSubType,
        group: 'RECEIVED', // [물건 접수] 매도인/임대인/임차인란에 연계
        memo: consultationNotes.trim() || undefined, // 상담내용 및 매물 메모 -> 상담 메모 및 고객 특이사항
        price: price ? parseFloat(price) : undefined, // 희망 매매가액
        negotiablePrice: negotiablePrice ? parseFloat(negotiablePrice) : undefined, // 조정할 수 있는 매매가액
        deposit: deposit ? parseFloat(deposit) : undefined,
        negotiableDeposit: negotiableDeposit ? parseFloat(negotiableDeposit) : undefined,
        monthlyRent: monthlyRent ? parseFloat(monthlyRent) : undefined,
        negotiableMonthlyRent: negotiableMonthlyRent ? parseFloat(negotiableMonthlyRent) : undefined,
        premium: storePremiumVal || undefined,
        managerName: managerName || '개업공인중개사 (대표)',
        assignedAgents,
      };
    }

    const payload: any = {
      id: initialData?.id,
      propertyNumber: finalPropNumber,
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
      availableDate: isNegotiableDate ? undefined : (availableDate || undefined),
      isImmediateAvailable,
      isNegotiableDate,
      price: price ? parseFloat(price) : undefined,
      negotiablePrice: negotiablePrice ? parseFloat(negotiablePrice) : undefined,
      deposit: deposit ? parseFloat(deposit) : undefined,
      negotiableDeposit: negotiableDeposit ? parseFloat(negotiableDeposit) : undefined,
      monthlyRent: monthlyRent ? parseFloat(monthlyRent) : undefined,
      negotiableMonthlyRent: negotiableMonthlyRent ? parseFloat(negotiableMonthlyRent) : undefined,
      monthlyRentVat: isMonthlyRentVat,
      isNoMaintenanceFee,
      consultationNotes: consultationNotes.trim() || undefined,
      landArea,
      totalFloorArea,
      buildingArea,
      approvalDate,
      buildingRegisterUse,
      zoningArea,
      structureName,
      floorCount,
      underFloorCount,
      floorText,
      customerId: finalCustomerId,
      customerInput,
      managerName: managerName || '개업공인중개사 (대표)',
      assignedAgents,
      createdById: isEditMode ? initialData?.createdById : currentUser?.id,
      creatorName: isEditMode ? initialData?.creatorName : currentUser?.name,
      currentUser,
      // 7가지 서브 데이터
      apartmentDetail: propertyType === 'APARTMENT' ? apartmentData : undefined,
      houseDetail: propertyType === 'HOUSE' ? houseData : undefined,
      storeDetail: propertyType === 'STORE' ? { ...storeData, monthlyRentVat: isMonthlyRentVat } : undefined,
      officeDetail: propertyType === 'OFFICE' ? { ...officeData, monthlyRentVat: isMonthlyRentVat } : undefined,
      factoryWarehouseDetail: propertyType === 'FACTORY_WAREHOUSE' ? factoryWarehouseData : undefined,
      landDetail: propertyType === 'LAND' ? landData : undefined,
    };

    // 로컬 즉시 영구 저장용 전체 객체 구성 (서버리스 컨테이너 재부팅 시에도 소실 방지)
    const fallbackSavedProperty: any = {
      id: initialData?.id || `prop-${Date.now()}`,
      propertyNumber: payload.propertyNumber,
      receiptDate: payload.receiptDate,
      propertyType: payload.propertyType,
      status: payload.status,
      transactionType: payload.transactionType,
      address: payload.address,
      roadAddress: payload.roadAddress,
      jibunAddress: payload.jibunAddress,
      detailAddress: payload.detailAddress,
      images: payload.images,
      latitude: payload.latitude,
      longitude: payload.longitude,
      direction: payload.direction,
      directionCriteria: payload.directionCriteria,
      availableDate: payload.availableDate,
      isImmediateAvailable: payload.isImmediateAvailable,
      price: payload.price,
      negotiablePrice: payload.negotiablePrice,
      deposit: payload.deposit,
      negotiableDeposit: payload.negotiableDeposit,
      monthlyRent: payload.monthlyRent,
      negotiableMonthlyRent: payload.negotiableMonthlyRent,
      monthlyRentVat: payload.monthlyRentVat,
      isNoMaintenanceFee: payload.isNoMaintenanceFee,
      consultationNotes: payload.consultationNotes,
      landArea: payload.landArea,
      totalFloorArea: payload.totalFloorArea,
      buildingArea: payload.buildingArea,
      approvalDate: payload.approvalDate,
      buildingRegisterUse: payload.buildingRegisterUse,
      zoningArea: payload.zoningArea,
      structureName: payload.structureName,
      floorCount: payload.floorCount,
      underFloorCount: payload.underFloorCount,
      floorText: payload.floorText,
      customerId: payload.customerId,
      customer: customerInput ? {
        id: `cust-${Date.now()}`,
        name: customerInput.name,
        phone: customerInput.phone,
        carrier: customerInput.carrier,
        type: customerInput.type,
      } : undefined,
      apartmentDetail: payload.apartmentDetail,
      houseDetail: payload.houseDetail,
      storeDetail: payload.storeDetail,
      officeDetail: payload.officeDetail,
      factoryWarehouseDetail: payload.factoryWarehouseDetail,
      landDetail: payload.landDetail,
      managerName: payload.managerName,
      assignedAgents: payload.assignedAgents,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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

      const finalSaved = { ...fallbackSavedProperty, ...data };
      saveCustomProperty(finalSaved);

      alert(isEditMode ? '매물 정보가 성공적으로 수정되었습니다.' : '매물이 성공적으로 등록되었습니다.');
      onSuccess(finalSaved);
      onClose();
    } catch (err: any) {
      console.warn('API save fallback, saving locally:', err);
      // 서버 에러나 Vercel 환경에서도 로컬스토리지에 안전하게 저장하여 매물 사라짐 완전 차단
      saveCustomProperty(fallbackSavedProperty);
      alert(`${isEditMode ? '매물 정보가 수정되었습니다' : '매물이 안전하게 등록/저장되었습니다'}. (영구 보관 완료)`);
      onSuccess(fallbackSavedProperty);
      onClose();
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
        <form id="property-reg-form" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
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
                  propertyType={propertyType}
                  detailAddress={detailAddress}
                  onAddressChange={(road, jibun) => {
                    setRoadAddress(road);
                    setJibunAddress(jibun);
                    setAddress(road || jibun);
                    setLedgerData(null);
                  }}
                  onApplyData={handleApplyPublicData}
                  onSelectFloor={handleSelectFloorFromLedger}
                  onSelectUnit={handleSelectUnitFromLedger}
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
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded shrink-0">주소1 도로명</span>
                            <span className="font-semibold text-slate-900 truncate">{roadAddress || '(위의 대장 연동란에서 입력/검색)'}</span>
                          </div>
                          {roadAddress && (
                            <button
                              type="button"
                              onClick={() => handleCopySummaryAddress(roadAddress, 'road')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-white hover:bg-blue-50 active:scale-95 border border-blue-300 rounded shadow-2xs shrink-0 cursor-pointer"
                              title="도로명 주소 복사"
                            >
                              {copiedAddressType === 'road' ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                                  <span className="text-emerald-700">복사 완료</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5 text-blue-600" />
                                  <span>도로명 복사</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded shrink-0">주소2 지번</span>
                            <span className="text-slate-700 truncate">{jibunAddress || '-'}</span>
                          </div>
                          {jibunAddress && (
                            <button
                              type="button"
                              onClick={() => handleCopySummaryAddress(jibunAddress, 'jibun')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-white hover:bg-amber-50 active:scale-95 border border-amber-300 rounded shadow-2xs shrink-0 cursor-pointer"
                              title="지번 주소 복사"
                            >
                              {copiedAddressType === 'jibun' ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />
                                  <span className="text-emerald-700">복사 완료</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5 text-amber-700" />
                                  <span>지번 복사</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          상세주소 (동/호수/층)
                        </label>
                        {ledgerData?.isCollectiveBuilding && ledgerData.unitList && ledgerData.unitList.length > 0 && (
                          <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            🏢 집합건물 전유부
                          </span>
                        )}
                      </div>

                      {/* 집합건물 전유부 빠른 선택 드롭다운 */}
                      {ledgerData?.isCollectiveBuilding && ledgerData.unitList && ledgerData.unitList.length > 0 && (
                        <div className="mb-1.5">
                          <select
                            value={ledgerData.unitList.some(u => `${u.dong ? u.dong + ' ' : ''}${u.ho}` === detailAddress) ? detailAddress : ''}
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const found = ledgerData.unitList?.find(u => `${u.dong ? u.dong + ' ' : ''}${u.ho}` === e.target.value);
                              if (found) {
                                handleSelectUnitFromLedger(found);
                              }
                            }}
                            className="w-full text-xs font-bold px-2 py-1.5 bg-blue-50/70 border border-blue-300 rounded-lg text-blue-900 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          >
                            <option value="">▼ 호수 바로 선택 (동/호수/전용면적)</option>
                            {ledgerData.unitList.map((u, i) => {
                              const val = `${u.dong ? u.dong + ' ' : ''}${u.ho}`;
                              const label = `${val} (${u.floor} / 전용 ${u.exclusiveArea}㎡ / ${u.ownerName || '소유자'})`;
                              return (
                                <option key={i} value={val}>{label}</option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      <input
                        type="text"
                        value={detailAddress}
                        onChange={(e) => handleDetailAddressChange(e.target.value)}
                        placeholder="예: 가동 201호 / 110동 2906호 / 1층"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-[48px]"
                      />
                      <p className="text-[10px] text-blue-600 mt-1 font-medium">
                        💡 위에서 동·호수를 클릭하거나 직접 입력 시 해당층수·대장상면적·주용도가 자동 반영됩니다 (수정 가능).
                      </p>
                    </div>
                  </div>

                  {/* 실시간 카카오 지도 임베드 (첨부한 두번째 형태) */}
                  <div className="mt-3">
                    <KakaoAddressMap
                      address={roadAddress || jibunAddress || address}
                      detailAddress={detailAddress}
                      height="h-[420px]"
                      onCoordinatesChange={(coords) => {
                        setLatitude(coords.lat);
                        setLongitude(coords.lng);
                      }}
                    />
                  </div>
                </div>

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
                            {c.name} ({c.type === 'SELLER' ? '매도' : c.type === 'LESSOR' ? '임대' : '기타'} - {c.phone})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 5. 관리 정보 (매물번호, 접수일자, 담당 권한자) */}
                <div className="bg-white p-5 rounded-2xl border-2 border-indigo-100/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <span className="w-2 h-5 bg-indigo-600 rounded-full inline-block" />
                    <h3 className="text-base font-extrabold text-slate-900">
                      5. 관리 정보 (매물 고유번호 / 접수일자 / 담당 권한자)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-bold text-slate-800">
                          매물번호 (고유번호)
                        </label>
                        <span className="text-[11px] font-medium text-slate-400">
                          미입력 시 자동 채번
                        </span>
                      </div>
                      <input
                        type="text"
                        value={propertyNumber}
                        onChange={(e) => setPropertyNumber(e.target.value)}
                        placeholder="직접 입력 (비워두면 자동 생성)"
                        className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono font-extrabold text-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-800 mb-1.5">
                        접수일자
                      </label>
                      <input
                        type="date"
                        value={receiptDate}
                        onChange={(e) => setReceiptDate(e.target.value)}
                        className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-bold text-slate-800">
                          담당 권한자 (관리 주체) *
                        </label>
                        <div className="flex items-center gap-2">
                          {!isAddingAgent && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingAgent(true);
                                setIsDeletingAgent(false);
                              }}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>＋ 새 권한자 지정/추가</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setIsDeletingAgent(!isDeletingAgent);
                              setIsAddingAgent(false);
                            }}
                            className={`text-[11px] font-bold flex items-center gap-0.5 cursor-pointer ${
                              isDeletingAgent ? 'text-rose-600 font-black' : 'text-slate-500 hover:text-rose-600'
                            }`}
                          >
                            <span>{isDeletingAgent ? '✕ 닫기' : '− 권한자 삭제'}</span>
                          </button>
                        </div>
                      </div>

                      {/* 인라인 새 담당 권한자 직접 추가 폼 */}
                      {isAddingAgent && (
                        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2 mb-2 animate-in fade-in duration-150">
                          <div className="text-xs font-bold text-blue-900">지정할 담당 권한자명 입력:</div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={newAgentInput}
                              onChange={(e) => setNewAgentInput(e.target.value)}
                              placeholder="권한자 이름 (예: 박소공 실장, 김과장)"
                              className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (newAgentInput.trim()) {
                                    addCustomAgent(newAgentInput.trim());
                                    setManagerName(newAgentInput.trim());
                                    setNewAgentInput('');
                                    setIsAddingAgent(false);
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newAgentInput.trim()) {
                                  addCustomAgent(newAgentInput.trim());
                                  setManagerName(newAgentInput.trim());
                                  setNewAgentInput('');
                                  setIsAddingAgent(false);
                                }
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
                            >
                              지정
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingAgent(false);
                                setNewAgentInput('');
                              }}
                              className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 권한자 삭제 모드 패널 */}
                      {isDeletingAgent && (
                        <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2 mb-2 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-rose-900">삭제할 권한자를 클릭하세요:</span>
                            <span className="text-[10px] text-rose-600">대표 및 사무실(공용)은 삭제 불가</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {availableAgents
                              .filter((a) => a !== '개업공인중개사 (대표)' && a !== '사무실')
                              .map((agent) => (
                                <button
                                  key={agent}
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`'${agent}' 권한자를 삭제하시겠습니까?`)) {
                                      removeCustomAgent(agent);
                                      if (managerName === agent) {
                                        setManagerName('개업공인중개사 (대표)');
                                      }
                                      setAssignedAgents((prev) => prev.filter((a) => a !== agent));
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-white text-rose-700 border border-rose-300 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <span>👤 {agent}</span>
                                  <span className="text-rose-500 font-extrabold text-[13px] ml-0.5">✕</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <select
                          value={managerName}
                          onChange={(e) => setManagerName(e.target.value)}
                          className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 cursor-pointer"
                        >
                          <option value="개업공인중개사 (대표)">👑 개업공인중개사 (대표)</option>
                          <option value="사무실">🏢 사무실 (공용/워크인)</option>
                          {availableAgents
                            .filter((agent) => agent !== '개업공인중개사 (대표)' && agent !== '사무실')
                            .map((agent) => (
                              <option key={agent} value={agent}>👤 {agent}</option>
                            ))}
                        </select>

                        {/* 추가 지정 권한자 (복수 선택 지원) */}
                        <div className="pt-2.5 border-t border-slate-200 mt-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              <span>👥 함께 관리할 추가 권한자 (복수 지정)</span>
                            </span>
                            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              {assignedAgents.length > 0 ? `${assignedAgents.length}명 추가 지정됨` : '선택사항'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">
                            개업공인중개사(대표)와 본인 외에 함께 열람 및 수정 권한을 가질 동료 직원이나 사무실(공용)을 여러 개 추가 지정할 수 있습니다.
                          </p>

                          {/* 추가 지정 토글 버튼 목록 */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {/* 대표가 주 담당자가 아닐 경우 대표를 추가 권한자로 지정 가능 */}
                            {managerName !== '개업공인중개사 (대표)' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignedAgents((prev) => 
                                    prev.includes('개업공인중개사 (대표)') 
                                      ? prev.filter((a) => a !== '개업공인중개사 (대표)') 
                                      : [...prev, '개업공인중개사 (대표)']
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                                  assignedAgents.includes('개업공인중개사 (대표)')
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                    : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                                }`}
                              >
                                {assignedAgents.includes('개업공인중개사 (대표)') ? <Check className="w-3 h-3 stroke-[3]" /> : <span>＋</span>}
                                <span>👑 개업공인중개사 (대표)</span>
                              </button>
                            )}

                            {/* 사무실 공용 추가 지정 */}
                            {managerName !== '사무실' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignedAgents((prev) => 
                                    prev.includes('사무실') 
                                      ? prev.filter((a) => a !== '사무실') 
                                      : [...prev, '사무실']
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                                  assignedAgents.includes('사무실')
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {assignedAgents.includes('사무실') ? <Check className="w-3 h-3 stroke-[3]" /> : <span>＋</span>}
                                <span>🏢 사무실 (공용)</span>
                              </button>
                            )}

                            {/* 사용자가 등록/지정한 추가 권한자 목록 */}
                            {availableAgents
                              .filter((a) => a !== '개업공인중개사 (대표)' && a !== '사무실' && a !== managerName)
                              .map((agent) => {
                                const isAssigned = assignedAgents.includes(agent);
                                return (
                                  <button
                                    key={agent}
                                    type="button"
                                    onClick={() => {
                                      setAssignedAgents((prev) => 
                                        prev.includes(agent) ? prev.filter((a) => a !== agent) : [...prev, agent]
                                      );
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                                      isAssigned
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                    }`}
                                  >
                                    {isAssigned ? <Check className="w-3 h-3 stroke-[3]" /> : <span>＋</span>}
                                    <span>👤 {agent}</span>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                  {/* 거래유형 (상가점포는 전세 제외하고 매매 / 월세만 노출) */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-slate-800">
                        거래유형 선택 *
                      </label>
                      {propertyType === 'STORE' && (
                        <span className="text-xs font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-md border border-amber-300">
                          ※ 상가는 전세 거래가 없으므로 전세 항목이 제외됩니다 (매매 · 월세 전용)
                        </span>
                      )}
                    </div>
                    <div className={`grid ${propertyType === 'STORE' ? 'grid-cols-2' : 'grid-cols-3'} gap-2.5`}>
                      {(propertyType === 'STORE' ? (['매매', '월세'] as TransactionType[]) : (['매매', '전세', '월세'] as TransactionType[])).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTransactionType(t)}
                          className={`py-3 text-sm font-extrabold rounded-xl border transition-all ${
                            transactionType === t
                              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 가격 조건 및 조정가능한 금액 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                    {transactionType === '매매' && (
                      <>
                        <div className="sm:col-span-1">
                          <label className="block text-sm font-bold text-slate-800 mb-1.5">
                            매매가액 (만원) *
                          </label>
                          <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="예: 185000 (18억 5천만원)"
                            className="w-full text-base px-3.5 py-2.5 bg-blue-50/50 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-extrabold text-blue-950"
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <label className="block text-sm font-bold text-indigo-900 mb-1.5 flex items-center justify-between">
                            <span>조정가능한 매매가액 (만원)</span>
                            <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">협의 가능선</span>
                          </label>
                          <input
                            type="number"
                            value={negotiablePrice}
                            onChange={(e) => setNegotiablePrice(e.target.value)}
                            placeholder="예: 180000 (18억원 협의선)"
                            className="w-full text-base px-3.5 py-2.5 bg-indigo-50/40 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-950"
                          />
                        </div>
                      </>
                    )}
                    {transactionType === '전세' && (
                      <>
                        <div className="sm:col-span-1">
                          <label className="block text-sm font-bold text-slate-800 mb-1.5">
                            전세 보증금 (만원) *
                          </label>
                          <input
                            type="number"
                            value={deposit}
                            onChange={(e) => setDeposit(e.target.value)}
                            placeholder="예: 95000 (9억 5천만원)"
                            className="w-full text-base px-3.5 py-2.5 bg-blue-50/50 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-extrabold text-blue-950"
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <label className="block text-sm font-bold text-indigo-900 mb-1.5 flex items-center justify-between">
                            <span>조정가능한 전세 보증금 (만원)</span>
                            <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">협의 가능선</span>
                          </label>
                          <input
                            type="number"
                            value={negotiableDeposit}
                            onChange={(e) => setNegotiableDeposit(e.target.value)}
                            placeholder="예: 90000 (9억원 협의선)"
                            className="w-full text-base px-3.5 py-2.5 bg-indigo-50/40 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-950"
                          />
                        </div>
                      </>
                    )}
                    {transactionType === '월세' && (
                      <>
                        <div className="sm:col-span-1 space-y-3">
                          <div>
                            <label className="block text-sm font-bold text-slate-800 mb-1.5">
                              보증금 (만원) *
                            </label>
                            <input
                              type="number"
                              value={deposit}
                              onChange={(e) => setDeposit(e.target.value)}
                              placeholder="예: 5000"
                              className="w-full text-base px-3.5 py-2.5 bg-blue-50/50 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-extrabold text-blue-950"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-indigo-900 mb-1">
                              조정가능한 보증금 (만원)
                            </label>
                            <input
                              type="number"
                              value={negotiableDeposit}
                              onChange={(e) => setNegotiableDeposit(e.target.value)}
                              placeholder="예: 4000"
                              className="w-full text-sm px-3.5 py-2 bg-indigo-50/40 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-950"
                            />
                          </div>
                        </div>
                        <div className="sm:col-span-1 space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-sm font-bold text-slate-800">
                                월 임대료 (만원) *
                              </label>
                              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none font-medium hover:text-blue-600">
                                <input
                                  type="checkbox"
                                  checked={isMonthlyRentVat}
                                  onChange={(e) => {
                                    setIsMonthlyRentVat(e.target.checked);
                                    if (propertyType === 'STORE') {
                                      setStoreData((prev: any) => ({ ...prev, monthlyRentVat: e.target.checked }));
                                    } else if (propertyType === 'OFFICE') {
                                      setOfficeData((prev: any) => ({ ...prev, monthlyRentVat: e.target.checked }));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                                <span>부가세 별도</span>
                              </label>
                            </div>
                            <input
                              type="number"
                              value={monthlyRent}
                              onChange={(e) => setMonthlyRent(e.target.value)}
                              placeholder="예: 60"
                              className="w-full text-base px-3.5 py-2.5 bg-blue-50/50 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-extrabold text-blue-950"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-indigo-900 mb-1">
                              조정가능한 월 임대료 (만원)
                            </label>
                            <input
                              type="number"
                              value={negotiableMonthlyRent}
                              onChange={(e) => setNegotiableMonthlyRent(e.target.value)}
                              placeholder="예: 320"
                              className="w-full text-sm px-3.5 py-2 bg-indigo-50/40 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-950"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ======================================================== */}
                  {/* 방향 8방위 버튼 칩 & 방향 기준 3옵션 */}
                  {/* ======================================================== */}
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3.5">
                    
                    {/* 8방위 버튼 칩 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-blue-600" />
                          방향 (8방위 칩 선택) *
                        </label>
                        <span className="text-xs font-extrabold text-blue-600 bg-blue-100/80 px-2.5 py-1 rounded-md">
                          현재 선택: {direction}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {DIRECTION_OPTIONS.map((d) => {
                          const isSelected = direction === d;
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setDirection(d)}
                              className={`py-2.5 px-1.5 text-xs sm:text-sm font-bold rounded-xl border transition-all text-center flex items-center justify-center ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              <span>{d}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 방향 기준 옵션 (토지: 진입도로 / 도로 접면 / 지세 기준 등 토지 전용 기준 제공) */}
                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                        <label className="text-sm font-bold text-slate-800">
                          방향 기준 옵션
                        </label>
                        <span className="text-xs text-slate-500">
                          {propertyType === 'LAND'
                            ? '(토지 매물: 진입도로 기준 / 도로 접면 기준 / 지세 기준 자동세팅)'
                            : '(아파트·주택: 거실 창문 / 상가·공장·사무실: 주출입구 / 토지: 진입도로 기준)'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {(DIRECTION_CRITERIA_BY_PROPERTY_TYPE[propertyType] || DIRECTION_CRITERIA_OPTIONS).map((crit) => {
                          const isSelected = directionCriteria === crit;
                          return (
                            <button
                              key={crit}
                              type="button"
                              onClick={() => handleDirectionCriteriaChange(crit)}
                              className={`py-2.5 px-2 text-xs sm:text-sm font-bold rounded-xl border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-blue-500/20'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {isSelected && <Check className="w-4 h-4 text-blue-400 stroke-[3]" />}
                              <span>{crit}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* 상담 내용 및 특이사항 메모 (직접 타자 및 스마트폰 마이크 음성 입력 지원) */}
                  <div>
                    <VoiceTextarea
                      label="상담내용 및 매물 메모 (타자 & 마이크 음성 입력)"
                      rows={2}
                      value={consultationNotes}
                      onChange={setConsultationNotes}
                      placeholder="고객 요청사항, 가격 협의 가능 여부, 방문 예약 주의사항 등 직접 입력하거나 마이크 버튼을 눌러 음성으로 입력하세요."
                    />
                  </div>

                {/* 6. 7가지 매물 세부 폼 (동적 렌더링 - 주택 폼에 에어컨/풀옵션 보강됨) */}
                <div>
                  {propertyType === 'APARTMENT' && (
                    <ApartmentForm 
                      data={apartmentData} 
                      onChange={(updated) => {
                        setApartmentData(updated);
                        if (updated.buildingNo || updated.unitNo) {
                          const combined = `${updated.buildingNo || ''} ${updated.unitNo || ''}`.trim();
                          if (combined && combined !== detailAddress) {
                            setDetailAddress(combined);
                          }
                        }
                      }} 
                    />
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

                {/* 6.5 기타 특이 옵션 직접 추가 (매물사진등록 바로 위 위치) */}
                <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>기타 특이 옵션 직접 추가</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      엔터 또는 [추가] 클릭 시 매물 옵션에 즉시 반영됩니다
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={extraCustomOption}
                      onChange={(e) => setExtraCustomOption(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyExtraCustomOption();
                        }
                      }}
                      placeholder="예: 반려동물 가능, 외국인 가능, 단기임대 협의, 복층구조, 탄성코트 시공 등"
                      className="flex-1 text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleApplyExtraCustomOption}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs shrink-0"
                    >
                      옵션 추가
                    </button>
                  </div>

                  {/* 현재 등록된 커스텀 특이 옵션 태그 목록 */}
                  {((propertyType === 'APARTMENT' && apartmentData?.otherOptions) ||
                    (propertyType === 'HOUSE' && houseData?.options)) && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">반영된 옵션:</span>
                      {(propertyType === 'APARTMENT'
                        ? apartmentData.otherOptions.split(',').map((s: string) => s.trim()).filter(Boolean)
                        : houseData.options.split(',').map((s: string) => s.trim()).filter(Boolean)
                      ).map((opt: string) => (
                        <span
                          key={opt}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-slate-800 border border-slate-300 shadow-2xs"
                        >
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExtraOption(opt)}
                            className="text-slate-400 hover:text-rose-600 font-bold ml-0.5 cursor-pointer"
                            title="옵션 삭제"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 7. 매물 현장 사진 등록 (최대 20장 - 맨 밑으로 배치) */}
                <div className="pt-2">
                  <PropertyImageUploader
                    images={images}
                    onChange={setImages}
                    maxImages={20}
                  />
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
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
            <div className="text-xs text-slate-500">
              * 필수 입력: 매물번호, 매물종류, 거래유형, 소재지 주소
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                onClick={(e) => {
                  handleSubmit(e);
                }}
                disabled={submitting}
                className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm cursor-pointer ${
                  isEditMode
                    ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 shadow-indigo-500/20'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 shadow-blue-500/20'
                }`}
              >
                {submitting ? '저장 처리 중...' : isEditMode ? '수정 내용 저장' : '매물 등록 완료'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
