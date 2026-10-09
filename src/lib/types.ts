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

// 사용자가 지정한 표준 매물 종류 정렬 순서
export const PROPERTY_TYPE_ORDER: PropertyType[] = [
  'APARTMENT',
  'HOUSE',
  'STORE',
  'OFFICE',
  'FACTORY_WAREHOUSE',
  'LAND',
  'ETC',
];

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
  '진입도로 기준',
  '도로 접면 기준',
  '지세(지형) 기준',
  '거실 창문 기준',
  '주출입구 기준',
  '안방 창문 기준',
] as const;
export type DirectionCriteriaOption = typeof DIRECTION_CRITERIA_OPTIONS[number];

export const DIRECTION_CRITERIA_BY_PROPERTY_TYPE: Record<PropertyType, DirectionCriteriaOption[]> = {
  APARTMENT: ['거실 창문 기준', '주출입구 기준', '안방 창문 기준'],
  HOUSE: ['거실 창문 기준', '주출입구 기준', '안방 창문 기준'],
  STORE: ['주출입구 기준', '진입도로 기준'],
  OFFICE: ['주출입구 기준', '진입도로 기준'],
  FACTORY_WAREHOUSE: ['주출입구 기준', '진입도로 기준'],
  LAND: ['진입도로 기준', '도로 접면 기준', '지세(지형) 기준', '주출입구 기준'],
  ETC: ['진입도로 기준', '주출입구 기준'],
};

/**
 * 매물 종류에 따른 기본 방향 기준 세팅값
 * - 토지: '진입도로 기준'
 * - 아파트, 주택: '거실 창문 기준'
 * - 상가점포, 공장, 사무실 등: '주출입구 기준'
 */
export function getDefaultDirectionCriteria(propertyType: PropertyType): DirectionCriteriaOption {
  if (propertyType === 'LAND') {
    return '진입도로 기준';
  }
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
      '외국인 가능',
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
  {
    category: '기타 특이 옵션',
    items: [
      '반려동물 가능',
      '외국인 가능',
      '단기임대 가능',
    ],
  },
];

// 7가지 매물 스펙 세부 모델 인터페이스
export interface ApartmentData {
  complexName: string;
  buildingNo?: string;
  unitNo?: string;
  supplyArea?: number;
  supplyAreaPyeong?: number;
  pyeongType?: string;
  exclusiveArea?: number;
  exclusiveAreaPyeong?: number;
  roomCount?: number;
  bathroomCount?: number;
  approvalDate?: string;
  elevatorCount?: number;
  parkingCount?: number; // 공부상 총 주차대수
  parkingPerHousehold?: string | number; // 세대당 주차대수
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
  buildingArea?: number; // 대장상 면적 (㎡)
  buildingAreaPyeong?: number; // 대장상 면적 (평)
  actualArea?: number; // 실평수 (전용 ㎡)
  actualAreaPyeong?: number; // 실평수 (평)
  exclusiveArea?: number;
  exclusiveAreaPyeong?: number;
  buildingUse?: string;
  zoningArea?: string;
  structure?: string;
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

export interface StoreLeaseUnitItem {
  id: string;
  floorHo: string; // 층별 호수 (예: 1층 101호, 2층 등)
  contractStartDate?: string; // 계약기간 시작일 (YYYY-MM-DD 등)
  evictionPossible?: string; // 명도여부 가능 ('명도 가능', '명도 협의', '만기 퇴거 예정', '재계약 유지')
  deposit?: number; // 임차보증금 (만원)
  monthlyRent?: number; // 월세 (만원)
  isVacant?: boolean; // 공실 여부
}

export interface StoreData {
  storeName?: string;
  businessType?: string;
  totalFloors?: number;
  currentFloor?: string;
  landArea?: number;
  totalFloorArea?: number;
  buildingArea?: number;
  buildingAreaPyeong?: number;
  buildingUse?: string;
  zoningArea?: string;
  structure?: string;
  actualArea?: number;
  actualAreaPyeong?: number;
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
  negotiablePremium?: number; // 조정가능한 권리금 (만원)
  isNoPremium?: boolean; // 권리금 없음 여부
  maintenanceFee?: number;
  isNoMaintenanceFee?: boolean; // 관리비 없음 여부
  maintenanceFeeVat?: boolean;
  managementFeeDetails?: string; // 관리비 내역 (직접 입력)
  restrictedBusinessTypes?: string; // 입점 안되는 업종 / 제한 업종 (직접 입력)
  // 매매 시 층별 호수별 임대차 현황 (보증금/월세/명도/공실)
  leaseStatusList?: StoreLeaseUnitItem[];
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
  administrativeDisposition?: string; // 행정처분이력 (영업정지/과징금 등)
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
  // 상가 임대 시 인허가 및 비품/렌탈 승계
  businessLicenseTransfer?: string; // 업종인허가승계
  equipmentRentalTransfer?: string; // 비품/렌탈승계
  equipmentList?: string; // 비품 항목 (직접 기입)
  rentalList?: string; // 렌탈 항목 (직접 기입)
}

export interface OfficeData {
  officeName?: string;
  totalFloors?: number;
  currentFloor?: string;
  landArea?: number;
  totalFloorArea?: number;
  buildingArea?: number;
  buildingAreaPyeong?: number;
  buildingUse?: string;
  zoningArea?: string;
  structure?: string;
  actualArea?: number;
  actualAreaPyeong?: number;
  roomCount?: number;
  bathroomCount?: number;
  toiletGenderType?: string; // 남녀구분 (남녀분리, 남녀공용, 층별분리)
  approvalDate?: string;
  parkingCount?: number;
  isParkingImpossible?: boolean; // 주차 불가능 여부
  // 엘리베이터 유무 및 대수
  hasElevator?: boolean; // 엘리베이터 유무
  elevatorPassengerCount?: number; // 승객용 대수
  elevatorFreightCount?: number; // 화물/비상용 대수
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
  violationBuilding?: string; // 위반건축물 체크란
  violationBuildingDetail?: string; // 위반건축물 세부내용
  operatorContractorMatch?: string; // 명의 일치 여부
  storeAdStatus?: string; // 광고 노출 여부
  otherAgencyAdStatus?: string; // 타부동산 광고 여부
  rentIncreaseCondition?: string; // 임대료 인상조건 및 인상액/비율
  restorationTerms?: string; // 원상복구특약
  // 체크리스트
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
  isNegotiableDate?: boolean; // 입주일 협의
  price?: number;
  negotiablePrice?: number; // 조정 가능한 매매가액 (만원)
  deposit?: number;
  negotiableDeposit?: number; // 조정 가능한 보증금/전세금 (만원)
  monthlyRent?: number;
  negotiableMonthlyRent?: number; // 조정 가능한 월 임대료 (만원)
  monthlyRentVat?: boolean; // 월 임대료 부가세 별도 여부
  maintenanceFee?: number; // 관리비 (만원)
  isNoMaintenanceFee?: boolean; // 관리비 없음
  maintenanceFeeVat?: boolean; // 관리비 부가세 별도 여부
  maintenanceFeeDetails?: string; // 관리비 내역 (직접 입력)
  restrictedBusinessTypes?: string; // 입점 안되는 업종 / 제한 업종 (직접 입력)
  consultationNotes?: string;
  landArea?: number;
  totalFloorArea?: number;
  buildingArea?: number;
  approvalDate?: string;
  buildingRegisterUse?: string;
  zoningArea?: string;
  structureName?: string;
  floorCount?: number;
  underFloorCount?: number;
  floorText?: string;
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
  managerName?: string; // 주 담당 권한자 (예: 개업공인중개사(대표) 또는 소속공인중개사)
  assignedAgents?: string[]; // 추가 지정 권한자 목록 (복수 추가 지정 가능)
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
  maxBudgetReason?: string;
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

// [물건 접수] 매도인/임대인/임차인(권리금) 접수 물건 상세 규격
export interface CustomerReceivedPropertyDetail {
  propertyType?: PropertyType;
  transactionType?: string; // '매매' | '전세' | '월세' | '임대'
  // 희망 가격
  price?: number; // 매매가액
  jeonse?: number; // 전세가액
  deposit?: number; // 보증금
  monthlyRent?: number; // 월세
  premium?: number; // 권리금
  // 조정할 수 있는 가격 (조정 가능선)
  negotiablePrice?: number;
  negotiableJeonse?: number;
  negotiableDeposit?: number;
  negotiableMonthlyRent?: number;
  negotiablePremium?: number;
  // 위치 및 층수
  floorAndUnit?: string; // 매물층수나 동호수
  moveInTiming?: string; // 입주시기 및 오픈시기
  roadAddress?: string; // 도로명 주소
  jibunAddress?: string; // 지번 주소
  detailAddress?: string; // 상세 주소
  // 실거래 지원
  dealSupportDetails?: string; // 실거래시 지원 세부사항 (렌트프리, 인테리어 비용 지원 등)
  // 공실 및 이전 업종
  isEmpty?: boolean; // 물건 비어있음 여부
  emptyPeriodOrMoveOutDate?: string; // 빈 시기나 이사시기
  previousBusiness?: string; // 전에 하던 업종
  // 주거용 특화 (아파트/주택)
  petAllowed?: boolean | string; // 반려동물 가능 여부 ('YES' | 'NO' | 'DISCUSS')
  foreignerAllowed?: boolean | string; // 외국인 가능 여부 ('YES' | 'NO' | 'DISCUSS')
  // 상가/사무실 등 상업/업무용 특화
  parkingAvailable?: boolean | string; // 주차 가능 여부 ('YES' | 'NO' | 'DISCUSS')
  parkingDetails?: string; // 주차 상세
  // 상가 임대 특화
  restrictedBusinesses?: string; // 임차거부 업종
}

// 고객 인터페이스 (매수자/임차인은 통신사 정보 불필요)
export interface CustomerItem {
  id: string;
  name: string;
  carrier?: MobileCarrier;
  phone: string;
  type: CustomerType;
  subType?: string; // '매도인' | '임대인' | '임차인(권리금)' | '매수인' | '임차인' | '임차인(권리금가능)'
  group: CustomerGroup;
  memo?: string;
  // [물건 접수] 상세 정보 및 가격 연계
  price?: number; // 희망 매매가액
  negotiablePrice?: number; // 조정할 수 있는 매매가액
  deposit?: number; // 희망 보증금 / 전세가액
  negotiableDeposit?: number; // 조정할 수 있는 보증금 / 전세가액
  monthlyRent?: number; // 희망 월세
  negotiableMonthlyRent?: number; // 조정할 수 있는 월세
  premium?: number; // 권리금
  negotiablePremium?: number; // 조정할 수 있는 권리금
  transactionType?: string; // 거래유형
  receivedDetail?: CustomerReceivedPropertyDetail;
  // 담당 권한자 및 등록자 정보
  managerName?: string; // 주 담당 권한자 (예: 개업공인중개사(대표) 또는 소속공인중개사)
  assignedAgents?: string[]; // 추가 지정 권한자 목록 (복수 추가 지정 가능)
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

// 층별 용도 및 면적 규격
export interface PublicBuildingFloorInfo {
  floor: string; // 예: "지상 1층", "지하 1층"
  area: number; // 면적 (㎡)
  mainUse: string; // 주용도 (예: "제1·2종근린생활시설", "다가구주택")
  etcUse?: string; // 세부/기타용도 (예: "소매점, 일반음식점")
}

// 집합건물 전유부(각 동/호수) 정보 규격
export interface PublicBuildingUnitInfo {
  dong?: string; // 예: "가동", "101동"
  ho: string; // 예: "101호", "201호"
  floor: string; // 예: "지상 2층", "2층"
  exclusiveArea: number; // 전유(전용)면적 (㎡)
  exclusiveAreaPyeong?: number; // 전유(전용)면적 (평)
  supplyArea?: number; // 공급/공용합산면적 (㎡)
  supplyAreaPyeong?: number; // 공급면적 (평)
  mainUse: string; // 전유부 주용도 (예: "다세대주택", "공동주택(아파트)", "제1종근린생활시설")
  ownerName?: string; // 소유자명 (예: "김철수")
  ownerRegNo?: string; // 주민(법인)등록번호 마스킹
  ownershipChangeDate?: string; // 소유권 변동일 (예: "2021-03-15")
  ownershipChangeReason?: string; // 소유권 변동원인 (예: "매매")
}

// 공공데이터 API 응답 규격
export interface PublicBuildingLedgerResult {
  address: string;
  landArea?: number; // 대지면적 (㎡)
  totalFloorArea?: number; // 연면적 (㎡)
  buildingArea?: number; // 건축면적 (㎡)
  buildingRegisterUse?: string; // 주용도 (예: 다가구주택, 근린생활시설)
  zoningArea?: string; // 지역 (예: 2종일반주거지역)
  structureName?: string; // 주구조 (예: 철근콘크리트조, 벽돌조)
  floorCount?: number; // 지상층수
  underFloorCount?: number; // 지하층수
  floorText?: string; // 층수 표기 (예: 지하 1층, 지상 3층)
  buildingCoverageRatio?: number; // 건폐율 (%)
  floorAreaRatio?: number; // 용적률 (%)
  approvalDate?: string; // 사용승인일 (YYYY-MM-DD)
  height?: number; // 높이 (m)
  isViolation?: boolean; // 위반건축물 여부
  source: 'API' | 'MOCK_DEMO' | 'USER_CUSTOM';
  message?: string;
  // 소유자 정보 (Image 2 연동)
  ownerName?: string; // 소유자 성명 (예: "임정원")
  ownerRegNo?: string; // 주민(법인)등록번호 (예: "590917-1******")
  ownershipChangeDate?: string; // 소유권 변동일 (예: "2015-04-20")
  ownershipChangeReason?: string; // 소유권 변동원인 (예: "매매")
  // 공부상 주차대수
  parkingCount?: number; // 공부상 총 주차대수 (예: 3)
  parkingDetail?: string; // 주차 상세 표기 (예: "총 3대 (자주식 옥외 3대)")
  parkingPerHousehold?: string | number; // 세대당 주차대수 (예: "1.25대")
  // 아파트 단지 스펙 (웹 크롤링/단지 DB 연계)
  complexName?: string; // 단지명 (예: "사상강변동원아파트")
  supplyArea?: number; // 공급면적 (㎡)
  supplyAreaPyeong?: number; // 공급면적 (평)
  exclusiveArea?: number; // 전용면적 (㎡)
  exclusiveAreaPyeong?: number; // 전용면적 (평)
  pyeongType?: string; // 평타입 (예: "34평형 A타입")
  roomCount?: number; // 방수
  bathroomCount?: number; // 욕실수
  elevatorCount?: number; // 엘리베이터 수
  maintenanceFee?: number; // 관리비
  heatingType?: string; // 난방방식
  // 층수별 용도 및 면적
  floorList?: PublicBuildingFloorInfo[];
  // 집합건물(아파트, 다세대, 연립, 구분상가 등) 여부 및 전유부(각 동호수) 목록
  isCollectiveBuilding?: boolean;
  buildingCategoryName?: '일반건축물' | '집합건축물';
  dongList?: string[];
  unitList?: PublicBuildingUnitInfo[];
}

// 매물 및 고객의 수정 권한 판별 함수 (auth.ts와 통일)
export { canEditItem } from './auth';

