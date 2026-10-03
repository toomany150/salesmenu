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

// 8방위 방향 목록 및 기준 옵션 정의
export const DIRECTION_OPTIONS = [
  '남향',
  '남동향',
  '남서향',
  '동향',
  '서향',
  '북동향',
  '북서향',
  '북향',
] as const;
export type DirectionOption = typeof DIRECTION_OPTIONS[number];

export const DIRECTION_CRITERIA_OPTIONS = [
  '거실 창문 기준',
  '주출입구 기준',
  '안방 창문 기준',
] as const;
export type DirectionCriteriaOption = typeof DIRECTION_CRITERIA_OPTIONS[number];

/**
 * 매물 종류에 따른 기본 방향 기준 세팅값
 * - 아파트, 주택: '거실 창문 기준'
 * - 상가점포, 공장, 사무실, 토지 등: '주출입구 기준'
 */
export function getDefaultDirectionCriteria(propertyType: PropertyType): DirectionCriteriaOption {
  if (propertyType === 'APARTMENT' || propertyType === 'HOUSE') {
    return '거실 창문 기준';
  }
  return '주출입구 기준';
}

// 주택(원룸/투룸/풀옵션) 옵션 카테고리 및 항목 정의
export const HOUSE_AIRCON_TYPES = [
  '시스템에어컨',
  '벽걸이에어컨',
  '스탠드에어컨',
  '투인원(2in1)',
] as const;

export const HOUSE_AIRCON_ROOMS = ['거실', '안방', '방1', '방2', '원룸/전실'] as const;

export interface HouseOptionGroup {
  category: string;
  items: string[];
}

export const HOUSE_OPTION_CATEGORIES: HouseOptionGroup[] = [
  {
    category: '주방가전 / 빌트인',
    items: [
      '냉장고',
      '빌트인 냉장고',
      '세탁기',
      '건조기',
      '워시타워',
      '인덕션',
      '가스레인지',
      '하이라이트',
      '전자레인지',
      '식기세척기',
      '음식물처리기',
      '싱크대/아일랜드식탁',
    ],
  },
  {
    category: '수납 / 가구 / 현관',
    items: [
      '붙박이장',
      '옷장',
      '신발장',
      '침대',
      '책상/의자',
      'TV/모니터',
      'TV수납장',
      '도어락(디지털키)',
      '중문',
      '블라인드/커튼',
      '빨래건조대',
    ],
  },
  {
    category: '기타 특이 옵션',
    items: [
      '엘리베이터',
      'CCTV/보안현관',
      '비디오폰/인터폰',
      '무인택배함',
      '베란다/발코니',
      '테라스/옥상단독사용',
      '보일러(개별난방)',
      '주차가능',
      '반려동물가능',
      '단기임대가능',
    ],
  },
];

// 아파트 옵션 카테고리 및 항목 정의
export const APARTMENT_AIRCON_ROOMS = ['거실', '안방', '방1', '방2', '방3'] as const;

export interface ApartmentOptionGroup {
  category: string;
  items: string[];
}

export const APARTMENT_OPTION_CATEGORIES: ApartmentOptionGroup[] = [
  {
    category: '냉난방 / 공조 / 환기',
    items: [
      '개별 난방 제어기',
      '공기순환기',
      '전열교환기',
      '실링펜',
    ],
  },
  {
    category: '주방 가전 / 빌트인',
    items: [
      '인덕션',
      '하이라이트',
      '가스쿡탑',
      '식기세척기',
      '오븐',
      '빌트인 냉장고',
      '김치냉장고',
      '음식물처리기',
    ],
  },
  {
    category: '인테리어 / 조명 / 창호',
    items: [
      '우물천정',
      '간접조명',
      '중문',
      '발코니확장',
      '이중창',
      '탄성코드',
      '줄눈',
    ],
  },
  {
    category: '수납 / 가구 / 현관',
    items: [
      '붙박이장',
      '드레스룸 시스템장',
      '신발장',
      '현관창고',
    ],
  },
];

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
  systemAirconRooms?: string[]; // ['거실', '안방', '방1', '방2', '방3']
  roomLivingOption?: string;
  heatExchanger?: boolean;
  induction?: boolean;
  otherOptions?: string;
  optionsList?: string[];
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
  optionsList?: string[];
  airconType?: string;
  airconRooms?: string[];
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
  toiletGenderType?: string; // 남녀구분 (남녀분리, 남녀공용, 내부전용, 외부공용)
  approvalDate?: string;
  parkingCount?: number;
  isParkingImpossible?: boolean; // 주차 불가능 여부
  // 설비 스펙
  electricityCapacity?: string; // 전기용량 (kW)
  electricityType?: string; // 전기구분 (개별, 공용)
  waterType?: string; // 수도구분 (개별, 공용)
  gasType?: string; // 가스구분 (도시가스, LPG, 없음)
  monthlyRentVat?: boolean;
  premium?: number;
  maintenanceFee?: number;
  isNoMaintenanceFee?: boolean; // 관리비 없음 여부
  maintenanceFeeVat?: boolean;
  // 운영 및 계약 조건
  tableCount?: number; // 총 테이블수
  tableCountHall?: number;
  tableCountRoom?: number;
  employeeCount?: number; // 종업원수
  operationPeriod?: string; // 영업기간
  contractYear?: string; // 계약년도
  renewalPeriodRemain?: string; // 계약갱신권 잔여기간
  violationBuilding?: string; // 위반건축물 여부
  businessRegistrationStatus?: string; // 사업자등록여부
  operatorContractorMatch?: string; // 실제운영자/임대차계약자/사업자명의 일치 여부
  liquorLoan?: string; // 주류대출여부
  rentIncreaseCondition?: string; // 임대료 인상조건 및 인상액/비율
  storeAdStatus?: string; // 점포 자체 광고 여부 (광고진행, 비공개)
  otherAgencyAdStatus?: string; // 타부동산 광고 여부
  restorationTerms?: string; // 원상복구특약
  // 체크리스트
  adminActionChecked?: string;
  contractPeriod?: string;
  parkingRequirement?: string;
  rentIncreaseStatus?: string;
  advertisementStatus?: string;
  dailyRevenue?: number;
  equipmentStatus?: string;
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
  toiletGenderType?: string; // 남녀구분 (남녀분리, 남녀공용, 층별분리)
  approvalDate?: string;
  parkingCount?: number;
  isParkingImpossible?: boolean; // 주차 불가능 여부
  // 설비 스펙
  electricityCapacity?: string; // 전기용량 (kW)
  electricityType?: string; // 전기구분 (개별, 공용)
  waterType?: string; // 수도구분 (개별, 공용)
  gasType?: string; // 가스구분
  monthlyRentVat?: boolean;
  maintenanceFee?: number;
  isNoMaintenanceFee?: boolean; // 관리비 없음 여부
  maintenanceFeeVat?: boolean;
  // 계약 및 운영 조건
  contractYear?: string; // 계약년도
  renewalPeriodRemain?: string; // 계약갱신권 잔여기간
  operatorContractorMatch?: string; // 명의 일치 여부
  storeAdStatus?: string; // 광고 노출 여부
  otherAgencyAdStatus?: string; // 타부동산 광고 여부
  rentIncreaseCondition?: string; // 임대료 인상조건 및 인상액/비율
  restorationTerms?: string; // 원상복구특약
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
  roadAddress?: string;
  jibunAddress?: string;
  detailAddress?: string;
  images?: string[];
  latitude?: number;
  longitude?: number;
  direction?: string;
  directionCriteria?: string;
  availableDate?: string;
  isImmediateAvailable?: boolean; // 즉시가능
  price?: number;
  deposit?: number;
  monthlyRent?: number;
  isNoMaintenanceFee?: boolean; // 관리비 없음
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
    carrier?: MobileCarrier;
    type: CustomerType;
  };
  apartmentDetail?: ApartmentData;
  houseDetail?: HouseData;
  storeDetail?: StoreData;
  officeDetail?: OfficeData;
  factoryWarehouseDetail?: FactoryWarehouseData;
  landDetail?: LandData;
  // 담당 권한자 및 등록자 정보
  managerName?: string; // '사무실' 또는 소속공인중개사 이름
  createdById?: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

// 고객 요구조건 및 심층 상담장
export interface CustomerDemandItem {
  id: string;
  customerId: string;
  targetPropertyType: PropertyType;
  targetTransactionType: TransactionType;
  targetRegion?: string;
  regionReason?: string;
  minBudget?: number;
  maxBudget?: number;
  targetPrice?: number;
  targetJeonse?: number;
  targetDeposit?: number;
  targetMonthlyRent?: number;
  minDeposit?: number;
  maxDeposit?: number;
  minMonthlyRent?: number;
  maxMonthlyRent?: number;
  preferredFloor?: string;
  preferredArea?: number;
  preferredAreaPy?: number;
  parkingRequirement?: string;
  moveInTiming?: string;
  moveInReason?: string;
  nonNegotiableCondition?: string;
  negotiableCondition?: string;
  premiumLimit?: number;
  premiumReason?: string;
  minRequiredArea?: number;
  minRequiredAreaPy?: number;
  minAreaReason?: string;
  previousVisitedProps?: string;
  moveInDate?: string;
  requirements?: string;
  status: 'ACTIVE' | 'MATCHED' | 'HOLD';
  createdAt: string;
  updatedAt: string;
}

// 고객 인터페이스 (매수자/임차인은 통신사 정보 불필요)
export interface CustomerItem {
  id: string;
  name: string;
  carrier?: MobileCarrier;
  phone: string;
  type: CustomerType;
  group: CustomerGroup;
  memo?: string;
  // 담당 권한자 및 등록자 정보
  managerName?: string; // '사무실' 또는 소속공인중개사 이름
  createdById?: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
  properties?: PropertyItem[];
  demands?: CustomerDemandItem[];
}

// 사용자(소속공인중개사 및 대표/관리자) 역할 및 인터페이스
export type UserRole = 'ADMIN' | 'AGENT';

export interface UserItem {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 접속 및 작업 감사 로그 인터페이스
export interface AccessLogItem {
  id: string;
  userId?: string;
  userName: string;
  userRole: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
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
