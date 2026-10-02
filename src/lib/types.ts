// src/lib/types.ts
// 스마트 매물장 및 고객관리(CRM) 타입 정의

export type CustomerGroup = 'RECEIVED' | 'SEARCHING'; 
// RECEIVED: [물건 접수] 매도인 / 임대인
// SEARCHING: [물건 찾음] 매수인 / 임차인

export type CustomerType = 'SELLER' | 'BUYER' | 'LESSOR' | 'LESSEE';
// SELLER(매도), BUYER(매수), LESSOR(임대), LESSEE(임차)

export type MobileCarrier = 
  | 'SK' 
  | 'SK알뜰폰' 
  | 'LG' 
  | 'LG알뜰폰' 
  | 'KT' 
  | 'KT알뜰폰';

export const CARRIER_OPTIONS: MobileCarrier[] = [
  'SK',
  'SK알뜰폰',
  'KT',
  'KT알뜰폰',
  'LG',
  'LG알뜰폰',
];

export type PropertyType = 
  | 'APARTMENT' 
  | 'HOUSE' 
  | 'STORE' 
  | 'OFFICE' 
  | 'FACTORY_WAREHOUSE' 
  | 'LAND' 
  | 'ETC';

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: '아파트',
  HOUSE: '주택',
  STORE: '상가점포',
  OFFICE: '사무실',
  FACTORY_WAREHOUSE: '공장/창고',
  LAND: '토지',
  ETC: '기타',
};

export type TransactionType = '매매' | '전세' | '월세';

export type PropertyStatus = 'AVAILABLE' | 'CONTRACTED' | 'HOLD' | 'CANCELLED';

export const STATUS_LABELS: Record<PropertyStatus, { label: string; color: string }> = {
  AVAILABLE: { label: '접수/진행중', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  CONTRACTED: { label: '계약완료', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  HOLD: { label: '보류', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  CANCELLED: { label: '취소', color: 'bg-rose-100 text-rose-800 border-rose-300' },
};

// 7가지 매물 스펙 세부 모델 인터페이스
export interface ApartmentData {
  complexName: string;
  buildingNo?: string;
  unitNo?: string;
  supplyArea?: number;
  pyeongType?: string;
  exclusiveArea?: number;
  roomCount?: number;
  bathroomCount?: number;
  approvalDate?: string;
  elevatorCount?: number;
  maintenanceFee?: number;
  heatingType?: string;
  systemAircon?: boolean;
  roomLivingOption?: string;
  heatExchanger?: boolean;
  induction?: boolean;
  otherOptions?: string;
}

export interface HouseData {
  totalFloors?: number;
  currentFloor?: string;
  landArea?: number;
  totalFloorArea?: number;
  buildingArea?: number;
  buildingUse?: string;
  approvalDate?: string;
  roomCount?: number;
  bathroomCount?: number;
  currentLeaseStatus?: string;
  parkingCount?: number;
  maintenanceFeeCommon?: number;
  maintenanceFeeWater?: number;
  maintenanceFeeElectricity?: number;
  maintenanceFeeGas?: number;
  heatingType?: string;
  options?: string;
}

export interface StoreData {
  storeName?: string;
  businessType?: string;
  totalFloors?: number;
  currentFloor?: string;
  landArea?: number;
  buildingArea?: number;
  buildingUse?: string;
  actualArea?: number;
  roomCount?: number;
  bathroomCount?: number;
  approvalDate?: string;
  parkingCount?: number;
  monthlyRentVat?: boolean;
  premium?: number;
  maintenanceFee?: number;
  maintenanceFeeVat?: boolean;
  // 체크리스트
  adminActionChecked?: string;
  violationBuilding?: string;
  operationPeriod?: string;
  contractPeriod?: string;
  parkingRequirement?: string;
  businessRegistrationStatus?: string;
  rentIncreaseStatus?: string;
  advertisementStatus?: string;
  tableCountHall?: number;
  tableCountRoom?: number;
  employeeCount?: number;
  dailyRevenue?: number;
  equipmentStatus?: string;
  liquorLoan?: string;
  fireInspectionCert?: string;
}

export interface OfficeData {
  officeName?: string;
  totalFloors?: number;
  currentFloor?: string;
  landArea?: number;
  buildingArea?: number;
  buildingUse?: string;
  actualArea?: number;
  roomCount?: number;
  bathroomCount?: number;
  approvalDate?: string;
  parkingCount?: number;
  monthlyRentVat?: boolean;
  maintenanceFee?: number;
  maintenanceFeeVat?: boolean;
  // 체크리스트
  violationBuilding?: string;
  parkingAndFee?: string;
  rentIncreaseStatus?: string;
  advertisementStatus?: string;
  prosAndCons?: string;
  hvacSystem?: string;
  elevator?: string;
  security?: string;
  restorationScope?: string;
  electricityExpansion?: string;
  specialTerms?: string;
  totalOfficeCount?: number;
}

export interface FactoryWarehouseData {
  companyName?: string;
  businessType?: string;
  totalFloors?: number;
  currentFloor?: string;
  structure?: string;
  approvalDate?: string;
  landArea?: number;
  totalFloorArea?: number;
  buildingArea?: number;
  buildingUse?: string;
  zoningArea?: string;
  landCategory?: string;
  roadAccessWidth?: string;
  ceilingHeight?: number;
  hoistCapacity?: string;
  incomingElectricity?: string;
  operatingElectricity?: string;
  parkingCount?: number;
  rentPerPyeong?: number;
  // 체크리스트
  wastewater?: string;
  airPollution?: string;
  noiseLevel?: string;
  allowedBusinessTypes?: string;
  sewageDirectConnection?: string;
}

export interface LandData {
  companyName?: string;
  businessType?: string;
  landArea?: number;
  rentPerPyeong?: number;
  zoningArea?: string;
  landCategory?: string;
  roadAccess?: string;
  // 체크리스트
  ordinancePermitted?: string;
  roadAccessConfirmed?: string;
  surfaceRights?: string;
  easementRights?: string;
  farmlandsCert?: string;
  landPermitZone?: string;
  greenBeltZone?: string;
  unauthorizedStructures?: string;
  infrastructure?: string;
  waterSewageConnection?: string;
}

// 매물 공통 인터페이스
export interface PropertyItem {
  id: string;
  propertyNumber: string;
  receiptDate: string;
  propertyType: PropertyType;
  status: PropertyStatus;
  transactionType: TransactionType;
  address: string;
  detailAddress?: string;
  direction?: string;
  directionCriteria?: string;
  availableDate?: string;
  price?: number;
  deposit?: number;
  monthlyRent?: number;
  consultationNotes?: string;
  landArea?: number;
  totalFloorArea?: number;
  approvalDate?: string;
  buildingRegisterUse?: string;
  customerId?: string;
  customer?: {
    id: string;
    name: string;
    phone: string;
    carrier: MobileCarrier;
    type: CustomerType;
  };
  apartmentDetail?: ApartmentData;
  houseDetail?: HouseData;
  storeDetail?: StoreData;
  officeDetail?: OfficeData;
  factoryWarehouseDetail?: FactoryWarehouseData;
  landDetail?: LandData;
  createdAt: string;
  updatedAt: string;
}

// 고객 요구조건
export interface CustomerDemandItem {
  id: string;
  customerId: string;
  targetPropertyType: PropertyType;
  targetTransactionType: TransactionType;
  targetRegion?: string;
  minBudget?: number;
  maxBudget?: number;
  minDeposit?: number;
  maxDeposit?: number;
  minMonthlyRent?: number;
  maxMonthlyRent?: number;
  preferredArea?: number;
  moveInDate?: string;
  requirements?: string;
  status: 'ACTIVE' | 'MATCHED' | 'HOLD';
  createdAt: string;
  updatedAt: string;
}

// 고객 인터페이스
export interface CustomerItem {
  id: string;
  name: string;
  carrier: MobileCarrier;
  phone: string;
  type: CustomerType;
  group: CustomerGroup;
  memo?: string;
  createdAt: string;
  updatedAt: string;
  properties?: PropertyItem[];
  demands?: CustomerDemandItem[];
}

// 공공데이터 API 응답 규격
export interface PublicBuildingLedgerResult {
  address: string;
  landArea?: number; // 대지면적
  totalFloorArea?: number; // 연면적
  buildingArea?: number; // 건축면적
  buildingRegisterUse?: string; // 주용도 (예: 제2종근린생활시설, 공동주택)
  approvalDate?: string; // 사용승인일 (YYYY-MM-DD)
  structureName?: string; // 주구조
  floorCount?: number; // 지상층수
  underFloorCount?: number; // 지하층수
  isViolation?: boolean; // 위반건축물 여부
  source: 'API' | 'MOCK_DEMO';
}
