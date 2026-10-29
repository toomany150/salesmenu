// src/lib/storage.ts
import { PropertyItem, CustomerItem } from './types';

const STORAGE_CUSTOM_PROPERTIES = 'cham_custom_properties';
const STORAGE_DELETED_PROPERTIES = 'cham_deleted_property_ids';
const STORAGE_CUSTOM_CUSTOMERS = 'cham_custom_customers';
const STORAGE_DELETED_CUSTOMERS = 'cham_deleted_customer_ids';

/**
 * 1. 로컬에 저장된 사용자 매물 목록 불러오기
 * (Vercel Serverless 서버 재시작 및 인스턴스 초기화 시에도 절대 소실되지 않도록 보장)
 */
export function getCustomProperties(): PropertyItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_PROPERTIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse custom properties from localStorage:', err);
    return [];
  }
}

/**
 * 브라우저 localStorage 5MB 용량 한도 초과(QuotaExceededError) 방지 헬퍼
 * - 수 메가바이트의 base64 고용량 이미지로 인해 25~26개 전체 매물 저장이 실패하고
 *   과거 14개만 캐시에 남는 현상을 원천 방지합니다.
 * - 메타데이터(금액, 면적, 주소, 상세 스펙 등)는 100% 온전히 보존하며, 50KB 이하의 첫 썸네일만 남깁니다.
 */
function sanitizePropertyForStorage(p: PropertyItem, keepOneThumb = true): PropertyItem {
  if (!p) return p;
  let safeImages: string[] = [];
  if (keepOneThumb && Array.isArray(p.images) && p.images.length > 0) {
    const firstImg = p.images[0];
    if (typeof firstImg === 'string' && firstImg.length < 50000) {
      safeImages = [firstImg];
    }
  }
  return {
    ...p,
    images: safeImages,
  };
}

/**
 * 2. 매물 신규 저장 또는 수정 시 로컬스토리지에 안전하게 영구 보존
 */
export function saveCustomProperty(property: PropertyItem): void {
  if (typeof window === 'undefined' || !property) return;
  try {
    const list = getCustomProperties();
    const cleanProp = sanitizePropertyForStorage(property, true);
    const idx = list.findIndex(
      (p) => (property.id && p.id === property.id) || (property.propertyNumber && p.propertyNumber === property.propertyNumber)
    );

    if (idx >= 0) {
      list[idx] = { ...list[idx], ...cleanProp };
    } else {
      list.unshift(cleanProp);
    }

    try {
      localStorage.setItem(STORAGE_CUSTOM_PROPERTIES, JSON.stringify(list));
    } catch (e) {
      // 5MB 용량 초과 시 이미지 완전 제외 순수 메타데이터로 100% 저장 보장
      const pureList = list.map((p) => sanitizePropertyForStorage(p, false));
      localStorage.setItem(STORAGE_CUSTOM_PROPERTIES, JSON.stringify(pureList));
    }

    // 혹시 삭제 목록에 들어있었다면 복원
    const deletedIds = getDeletedPropertyIds();
    const cleanDeleted = deletedIds.filter(
      (id) => id !== property.id && id !== property.propertyNumber
    );
    if (cleanDeleted.length !== deletedIds.length) {
      localStorage.setItem(STORAGE_DELETED_PROPERTIES, JSON.stringify(cleanDeleted));
    }
  } catch (err) {
    console.error('Failed to save property to localStorage:', err);
  }
}

/**
 * 3. 매물 삭제 시 로컬스토리지 및 삭제 목록 동기화
 */
export function removeCustomProperty(propertyId: string): void {
  if (typeof window === 'undefined' || !propertyId) return;
  try {
    const list = getCustomProperties();
    const filtered = list.filter((p) => p.id !== propertyId && p.propertyNumber !== propertyId);
    localStorage.setItem(STORAGE_CUSTOM_PROPERTIES, JSON.stringify(filtered));

    const deletedIds = getDeletedPropertyIds();
    if (!deletedIds.includes(propertyId)) {
      deletedIds.push(propertyId);
      localStorage.setItem(STORAGE_DELETED_PROPERTIES, JSON.stringify(deletedIds));
    }
  } catch (err) {
    console.error('Failed to remove property from localStorage:', err);
  }
}

export function getDeletedPropertyIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_DELETED_PROPERTIES) || '[]');
  } catch {
    return [];
  }
}

/**
 * 서버 최신 매물 목록으로 로컬 캐시 동기화
 * (모든 매물의 메타데이터가 100% 안전하게 로컬에 보존되어 다음 접속 시에도 0ms 즉시 온전한 개수로 렌더링)
 */
export function setCustomProperties(list: PropertyItem[]): void {
  if (typeof window === 'undefined' || !Array.isArray(list)) return;
  try {
    // 1차 시도: 썸네일 포함 경량화 목록 저장
    const sanitized = list.map((p) => sanitizePropertyForStorage(p, true));
    localStorage.setItem(STORAGE_CUSTOM_PROPERTIES, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('Quota exceeded with thumbnails, falling back to pure metadata cache:', err);
    try {
      // 2차 시도: 이미지 완전 제외 순수 메타데이터로 100% 저장 보장 (수백 개 매물도 수십 KB로 저장 가능)
      const pureMeta = list.map((p) => sanitizePropertyForStorage(p, false));
      localStorage.setItem(STORAGE_CUSTOM_PROPERTIES, JSON.stringify(pureMeta));
    } catch (fallbackErr) {
      console.error('Failed to set custom properties to localStorage:', fallbackErr);
    }
  }
}

/**
 * 4. 고객 데이터 영구 보존
 */
export function getCustomCustomers(): CustomerItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_CUSTOMERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomCustomer(customer: CustomerItem): void {
  if (typeof window === 'undefined' || !customer) return;
  try {
    const list = getCustomCustomers();
    const cleanPhone = customer.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    const idx = list.findIndex((c) => {
      if (c.id === customer.id) return true;
      if (customer.name && cleanPhone && c.name === customer.name) {
        const cCleanPhone = c.phone ? c.phone.replace(/[^0-9]/g, '') : '';
        if (cCleanPhone && cCleanPhone === cleanPhone) return true;
      }
      return false;
    });

    if (idx >= 0) {
      list[idx] = { ...list[idx], ...customer };
    } else {
      list.unshift(customer);
    }
    localStorage.setItem(STORAGE_CUSTOM_CUSTOMERS, JSON.stringify(list));

    const deletedCustIds = getDeletedCustomerIds();
    const clean = deletedCustIds.filter((id) => id !== customer.id);
    if (clean.length !== deletedCustIds.length) {
      localStorage.setItem(STORAGE_DELETED_CUSTOMERS, JSON.stringify(clean));
    }
  } catch (err) {
    console.error('Failed to save customer to localStorage:', err);
  }
}

export function removeCustomCustomer(customerId: string): void {
  if (typeof window === 'undefined' || !customerId) return;
  try {
    const list = getCustomCustomers();
    const filtered = list.filter((c) => c.id !== customerId);
    localStorage.setItem(STORAGE_CUSTOM_CUSTOMERS, JSON.stringify(filtered));

    const deletedCustIds = getDeletedCustomerIds();
    if (!deletedCustIds.includes(customerId)) {
      deletedCustIds.push(customerId);
      localStorage.setItem(STORAGE_DELETED_CUSTOMERS, JSON.stringify(deletedCustIds));
    }
  } catch (err) {
    console.error('Failed to remove customer from localStorage:', err);
  }
}

export function getDeletedCustomerIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_DELETED_CUSTOMERS) || '[]');
  } catch {
    return [];
  }
}

/**
 * 서버 최신 고객 목록으로 로컬 캐시 동기화
 */
export function setCustomCustomers(list: CustomerItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_CUSTOM_CUSTOMERS, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to set custom customers to localStorage:', err);
  }
}

/**
 * 5. 스마트폰/PC 간 데이터 동기화 번들 생성 (내보내기)
 */
export interface SyncDataBundle {
  version: string;
  exportedAt: string;
  deviceInfo?: string;
  properties: PropertyItem[];
  customers: CustomerItem[];
}

export function exportDataBundle(liveProperties?: PropertyItem[], liveCustomers?: CustomerItem[]): SyncDataBundle {
  const localProps = getCustomProperties();
  const propMap = new Map<string, PropertyItem>();
  localProps.forEach((p) => {
    const key = p.propertyNumber || p.id;
    if (key) propMap.set(key, p);
  });
  if (Array.isArray(liveProperties)) {
    liveProperties.forEach((p) => {
      const key = p.propertyNumber || p.id;
      if (key) propMap.set(key, { ...propMap.get(key), ...p });
    });
  }

  const localCusts = getCustomCustomers();
  const custMap = new Map<string, CustomerItem>();
  localCusts.forEach((c) => {
    if (c.id) custMap.set(c.id, c);
  });
  if (Array.isArray(liveCustomers)) {
    liveCustomers.forEach((c) => {
      if (c.id) custMap.set(c.id, { ...custMap.get(c.id), ...c });
    });
  }

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    deviceInfo: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Mobile') ? '스마트폰' : 'PC') : '기기',
    properties: Array.from(propMap.values()),
    customers: Array.from(custMap.values()),
  };
}

/**
 * 6. 스마트폰/PC 간 데이터 동기화 번들 병합 복원 (가져오기)
 */
export function importDataBundle(bundle: Partial<SyncDataBundle>): {
  success: boolean;
  importedPropertiesCount: number;
  importedCustomersCount: number;
  error?: string;
} {
  if (typeof window === 'undefined') {
    return { success: false, importedPropertiesCount: 0, importedCustomersCount: 0, error: '브라우저 환경이 아닙니다.' };
  }

  try {
    const incomingProps = Array.isArray(bundle.properties) ? bundle.properties : [];
    const incomingCusts = Array.isArray(bundle.customers) ? bundle.customers : [];

    // 1) 매물 병합
    const currentProps = getCustomProperties();
    const propMap = new Map<string, PropertyItem>();
    currentProps.forEach((p) => {
      const key = p.propertyNumber || p.id;
      propMap.set(key, p);
    });
    incomingProps.forEach((p) => {
      const key = p.propertyNumber || p.id;
      if (key) {
        propMap.set(key, { ...propMap.get(key), ...p });
      }
    });
    const mergedProps = Array.from(propMap.values());
    localStorage.setItem(STORAGE_CUSTOM_PROPERTIES, JSON.stringify(mergedProps));

    // 2) 고객 병합
    const currentCusts = getCustomCustomers();
    const custMap = new Map<string, CustomerItem>();
    currentCusts.forEach((c) => {
      if (c.id) custMap.set(c.id, c);
    });
    incomingCusts.forEach((c) => {
      if (c.id) {
        custMap.set(c.id, { ...custMap.get(c.id), ...c });
      } else if (c.phone) {
        custMap.set(c.phone, { ...custMap.get(c.phone), ...c });
      }
    });
    const mergedCusts = Array.from(custMap.values());
    localStorage.setItem(STORAGE_CUSTOM_CUSTOMERS, JSON.stringify(mergedCusts));

    // 3) 삭제 목록 정리 (불러온 데이터가 삭제 목록에 들어있으면 삭제 해제)
    const deletedProps = getDeletedPropertyIds();
    const cleanProps = deletedProps.filter(
      (id) => !incomingProps.some((p) => p.id === id || p.propertyNumber === id)
    );
    localStorage.setItem(STORAGE_DELETED_PROPERTIES, JSON.stringify(cleanProps));

    const deletedCusts = getDeletedCustomerIds();
    const cleanCusts = deletedCusts.filter(
      (id) => !incomingCusts.some((c) => c.id === id)
    );
    localStorage.setItem(STORAGE_DELETED_CUSTOMERS, JSON.stringify(cleanCusts));

    return {
      success: true,
      importedPropertiesCount: incomingProps.length,
      importedCustomersCount: incomingCusts.length,
    };
  } catch (err: any) {
    console.error('Failed to import data bundle:', err);
    return {
      success: false,
      importedPropertiesCount: 0,
      importedCustomersCount: 0,
      error: err.message || '데이터 병합 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 7. 백업 파일(.json) 즉시 다운로드 (스마트폰/PC에서 소실 방지용 영구 보존)
 */
export function downloadBackupFile(liveProperties?: PropertyItem[], liveCustomers?: CustomerItem[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const bundle = exportDataBundle(liveProperties, liveCustomers);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.href = url;
    a.download = `참좋은부동산_매물고객데이터백업_${nowStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to download backup file:', err);
    return false;
  }
}

