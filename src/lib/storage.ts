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
 * 2. 매물 신규 저장 또는 수정 시 로컬스토리지에 안전하게 영구 보존
 */
export function saveCustomProperty(property: PropertyItem): void {
  if (typeof window === 'undefined' || !property) return;
  try {
    const list = getCustomProperties();
    const idx = list.findIndex(
      (p) => (property.id && p.id === property.id) || (property.propertyNumber && p.propertyNumber === property.propertyNumber)
    );

    if (idx >= 0) {
      list[idx] = { ...list[idx], ...property };
    } else {
      list.unshift(property);
    }

    localStorage.setItem(STORAGE_CUSTOM_PROPERTIES, JSON.stringify(list));

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
    const idx = list.findIndex((c) => c.id === customer.id);
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
