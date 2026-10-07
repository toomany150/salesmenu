'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Building2, Users } from 'lucide-react';
import { CustomerItem, PropertyItem } from '@/lib/types';
import { INITIAL_CUSTOMERS, INITIAL_PROPERTIES } from '@/lib/mockData';
import { Header } from '../layout/Header';
import { PropertyList } from '../properties/PropertyList';
import { CustomerList } from '../crm/CustomerList';
import { PropertyRegistrationForm } from '../properties/PropertyRegistrationForm';
import { CustomerFormModal } from '../crm/CustomerFormModal';
import { PropertyDetailModal } from '../properties/PropertyDetailModal';
import { CustomerDetailModal } from '../crm/CustomerDetailModal';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { LoginModal } from '../auth/LoginModal';
import { AdminLogModal } from '../auth/AdminLogModal';
import { CustomerPropertyBriefing } from '../properties/CustomerPropertyBriefing';
import { initKakao, AddressShareMode } from '@/lib/kakao';
import { 
  getCustomProperties, 
  saveCustomProperty, 
  removeCustomProperty, 
  getDeletedPropertyIds,
  getCustomCustomers, 
  saveCustomCustomer, 
  removeCustomCustomer, 
  getDeletedCustomerIds 
} from '@/lib/storage';

function fromUtf8Base64(b64: string): string {
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(b64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return '';
  }
}

type MainViewTab = 'HOME' | 'ALL_PROPERTIES' | 'RECEIVED_GROUP' | 'SEARCHING_GROUP' | 'ALL_CUSTOMERS' | 'CUSTOMER_SEARCH';

const DashboardContent: React.FC = () => {
  const { currentUser } = useAuth();

  // Main view state:
  // HOME: 깔끔한 대시보드 요약 화면 (중복 목록 미노출)
  // ALL_PROPERTIES: 자세한 매물현황 (필터 + 목록 + 지도)
  // ALL_CUSTOMERS: 자세한 고객현황 (전체 등록 고객 관리장)
  // CUSTOMER_SEARCH: 고객장 실시간 조건 검색 (조건 필터 패널 노출)
  // RECEIVED_GROUP: 자세한 고객현황 [물건 접수] 매도인 / 임대인
  // SEARCHING_GROUP: 자세한 고객현황 [물건 찾음] 매수인 / 임차인
  const [activeTab, setActiveTab] = useState<MainViewTab>('HOME');
  const [customerFilterOpen, setCustomerFilterOpen] = useState(false);

  // Data States
  const [customers, setCustomers] = useState<CustomerItem[]>(INITIAL_CUSTOMERS);
  const [properties, setProperties] = useState<PropertyItem[]>(INITIAL_PROPERTIES);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [isPropertyRegOpen, setIsPropertyRegOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);
  const [isCustomerRegOpen, setIsCustomerRegOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);

  // Customer Briefing View State (외부 공유 링크로 들어온 고객 전용 안내장 화면)
  const [customerBriefingProp, setCustomerBriefingProp] = useState<PropertyItem | null>(null);
  const [customerBriefingAddrMode, setCustomerBriefingAddrMode] = useState<AddressShareMode>('dong');
  const [isCustomerMode, setIsCustomerMode] = useState(false);

  // Auth & Admin Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAdminLogsOpen, setIsAdminLogsOpen] = useState(false);

  // Init Kakao SDK on mount
  useEffect(() => {
    initKakao();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const deletedPropIds = getDeletedPropertyIds();
    const deletedCustIds = getDeletedCustomerIds();

    // 1. 로컬에 안전하게 보관된 사용자 등록 매물 및 고객 불러오기
    const localCustomProps = getCustomProperties().filter(
      (p) => !deletedPropIds.includes(p.id) && !deletedPropIds.includes(p.propertyNumber)
    );
    const localCustomCusts = getCustomCustomers().filter(
      (c) => !deletedCustIds.includes(c.id)
    );

    try {
      const headers: HeadersInit = {};
      if (currentUser) {
        headers['x-user-role'] = currentUser.role;
        headers['x-user-id'] = currentUser.id;
        headers['x-user-name'] = encodeURIComponent(currentUser.name || '');
      }
      const [custRes, propRes] = await Promise.all([
        fetch('/api/customers', { headers }),
        fetch('/api/properties', { headers }),
      ]);

      if (custRes.ok) {
        const cData = await custRes.json();
        if (Array.isArray(cData)) {
          const custMap = new Map<string, CustomerItem>();
          cData.forEach((c: any) => {
            if (!deletedCustIds.includes(c.id)) custMap.set(c.id, c);
          });
          localCustomCusts.forEach((c) => {
            if (!deletedCustIds.includes(c.id)) custMap.set(c.id, c);
          });
          setCustomers(Array.from(custMap.values()));
        }
      } else if (localCustomCusts.length > 0) {
        setCustomers(localCustomCusts);
      }

      if (propRes.ok) {
        const pData = await propRes.json();
        if (Array.isArray(pData)) {
          const propMap = new Map<string, PropertyItem>();
          
          // 1) 서버 매물 추가
          pData.forEach((p: any) => {
            const key = p.propertyNumber || p.id;
            if (!deletedPropIds.includes(p.id) && !deletedPropIds.includes(p.propertyNumber)) {
              propMap.set(key, p);
            }
          });

          // 2) 로컬스토리지 영구 보관 매물 오버레이 (Vercel 서버리스 재부팅 시에도 절대 매물이 사라지지 않음)
          localCustomProps.forEach((cp) => {
            const key = cp.propertyNumber || cp.id;
            if (!deletedPropIds.includes(cp.id) && !deletedPropIds.includes(cp.propertyNumber)) {
              propMap.set(key, cp);
            }
          });

          const merged = Array.from(propMap.values());
          merged.sort((a, b) => {
            const tA = new Date(a.receiptDate || a.createdAt || 0).getTime();
            const tB = new Date(b.receiptDate || b.createdAt || 0).getTime();
            return tB - tA;
          });
          setProperties(merged);

          // 3) 백그라운드 서버 재동기화: 서버리스 DB 초기화로 서버에 없는 매물 조용히 복원
          const serverPropKeys = new Set(pData.map((p: any) => p.propertyNumber || p.id));
          localCustomProps.forEach((cp) => {
            const key = cp.propertyNumber || cp.id;
            if (!serverPropKeys.has(key)) {
              fetch('/api/properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify(cp),
              }).catch(() => {});
            }
          });
        }
      } else if (localCustomProps.length > 0) {
        setProperties(localCustomProps);
      }
    } catch (err) {
      console.warn('DB fetch error, using local storage cache:', err);
      if (localCustomProps.length > 0) {
        setProperties(localCustomProps);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasAutoOpenedPropRef = useRef(false);

  // 카카오톡 등 외부 공유 링크로 접근 시 (?propertyId=... 또는 ?pData=...) 
  // 접속자가 누구든(대표님이 직접 확인하든, 고객이 열든) 100% 안전한 '고객 전용 매물 브리핑 안내장'을 기본 화면으로 표시합니다.
  useEffect(() => {
    if (typeof window === 'undefined' || hasAutoOpenedPropRef.current) return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const propId = searchParams.get('propertyId');
      const pDataRaw = searchParams.get('pData');
      const addrMode = (searchParams.get('addrMode') as AddressShareMode) || 'dong';
      setCustomerBriefingAddrMode(addrMode);

      if (!propId && !pDataRaw) return;

      const applyOpenedProperty = (targetProp: PropertyItem) => {
        hasAutoOpenedPropRef.current = true;
        // 공유 링크로 접속한 경우: 무조건 안전한 고객 전용 매물 안내장(CustomerPropertyBriefing)으로 표시
        setCustomerBriefingProp(targetProp);
        setIsCustomerMode(true);
      };

      // 1) URL에 직렬화된 pData 매물 정보가 있는 경우: 즉시 모달 열람 (스마트폰 카톡 링크 클릭 시 100% 즉시 열림 보장)
      if (pDataRaw) {
        try {
          const jsonStr = fromUtf8Base64(pDataRaw);
          if (jsonStr) {
            const parsedProp: PropertyItem = JSON.parse(jsonStr);
            if (parsedProp && (parsedProp.id || parsedProp.propertyNumber)) {
              applyOpenedProperty(parsedProp);
              // 매물 목록에도 추가
              setProperties((prev) => {
                const exists = prev.some(
                  (p) =>
                    (parsedProp.id && p.id === parsedProp.id) ||
                    (parsedProp.propertyNumber && p.propertyNumber === parsedProp.propertyNumber)
                );
                return exists ? prev : [parsedProp, ...prev];
              });
              return;
            }
          }
        } catch (err) {
          console.warn('pData parse error:', err);
        }
      }

      // 2) 현재 메모리/로컬스토리지에 있는 매물 목록에서 검색
      if (propId && properties.length > 0) {
        const found = properties.find((p) => p.id === propId || p.propertyNumber === propId);
        if (found) {
          applyOpenedProperty(found);
          return;
        }
      }

      // 3) 만약 현재 목록에 없는 매물번호/ID라면 서버 API에서 직접 단건 검색 시도
      if (propId && !hasAutoOpenedPropRef.current) {
        fetch(`/api/properties?search=${encodeURIComponent(propId)}`)
          .then((res) => res.json())
          .then((items) => {
            if (Array.isArray(items) && items.length > 0 && !hasAutoOpenedPropRef.current) {
              const matched = items.find((p: any) => p.id === propId || p.propertyNumber === propId) || items[0];
              if (matched) {
                applyOpenedProperty(matched);
              }
            }
          })
          .catch(() => {});
      }
    } catch (e) {}
  }, [properties, currentUser]);

  const receivedCustomers = customers.filter((c) => c.group === 'RECEIVED');
  const searchingCustomers = customers.filter((c) => c.group === 'SEARCHING');

  const handleOpenNewProperty = () => {
    setEditingProperty(null);
    setIsPropertyRegOpen(true);
  };

  const handleOpenEditProperty = (prop: PropertyItem) => {
    setEditingProperty(prop);
    setIsPropertyRegOpen(true);
    setSelectedProperty(null);
  };

  const handlePropertySaved = (savedProp: PropertyItem, createdCustomer?: CustomerItem) => {
    saveCustomProperty(savedProp);
    if (createdCustomer) {
      saveCustomCustomer(createdCustomer);
      setCustomers((prev) => {
        const idx = prev.findIndex((c) => c.id === createdCustomer.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = createdCustomer;
          return next;
        }
        return [createdCustomer, ...prev];
      });
    }
    setProperties((prev) => {
      const idx = prev.findIndex((p) => p.id === savedProp.id || p.propertyNumber === savedProp.propertyNumber);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedProp;
        return next;
      }
      return [savedProp, ...prev];
    });
    fetchData();
  };

  const handleOpenNewCustomer = () => {
    setEditingCustomer(null);
    setIsCustomerRegOpen(true);
  };

  const handleOpenEditCustomer = (cust: CustomerItem) => {
    setEditingCustomer(cust);
    setIsCustomerRegOpen(true);
    setSelectedCustomer(null);
  };

  const handleCustomerSaved = (savedCust: CustomerItem) => {
    saveCustomCustomer(savedCust);
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === savedCust.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedCust;
        return next;
      }
      return [savedCust, ...prev];
    });
    fetchData();
  };

  const detailSectionRef = useRef<HTMLDivElement>(null);

  const scrollToDetail = () => {
    setTimeout(() => {
      detailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleSelectTabWithScroll = (tab: MainViewTab) => {
    setActiveTab(tab);
    scrollToDetail();
  };

  // 고객 전용 매물 브리핑 안내장 뷰
  // (외부 공유 링크 접속 시 대표님이든 고객이든 안전한 고객 브리핑 화면 우선 표시)
  if (isCustomerMode && customerBriefingProp) {
    return (
      <>
        <CustomerPropertyBriefing
          property={customerBriefingProp}
          addressMode={customerBriefingAddrMode}
          currentUser={currentUser}
          onSwitchToAdmin={() => {
            setIsCustomerMode(false);
            setSelectedProperty(customerBriefingProp);
          }}
          onOpenLogin={() => setIsLoginOpen(true)}
        />
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          canClose={true}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-16">
      
      {/* 1. Global Navigation Header */}
      <Header
        propertyCount={properties.length}
        receivedCustomerCount={receivedCustomers.length}
        searchingCustomerCount={searchingCustomers.length}
        onOpenNewProperty={handleOpenNewProperty}
        onOpenNewCustomer={handleOpenNewCustomer}
        onOpenAdminLogs={() => setIsAdminLogsOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onGoHome={() => setActiveTab('HOME')}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        
        {/* ────────────────────────────────────────────────────────── */}
        {/* 섹션 1. 📊 전체 현황 (2번째 첨부 이미지 반영) */}
        {/* 매물장 검색(조건필터)란은 삭제하고 3개 카드로 구성 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="bg-white/95 backdrop-blur-xs p-3.5 sm:p-5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">📊</span>
              <span>전체 현황</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
            {/* 카드 1: 전체 등록 매물 */}
            <div 
              onClick={() => handleSelectTabWithScroll('ALL_PROPERTIES')}
              className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer ${
                activeTab === 'ALL_PROPERTIES' 
                  ? 'bg-emerald-50/90 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20' 
                  : 'bg-emerald-50/30 border-emerald-200/80 hover:border-emerald-400 hover:bg-emerald-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-emerald-950">전체 등록 매물</span>
                <span className="text-[10px] sm:text-xs font-black text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">실시간 가동</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-900">{properties.length}<span className="text-sm font-normal text-emerald-700 ml-1">건</span></span>
                <span className="text-xs font-semibold text-emerald-700">매물 보기 →</span>
              </div>
            </div>

            {/* 카드 2: [물건 접수] 매도, 임대, 임차인(권리금원함) */}
            <div 
              onClick={() => handleSelectTabWithScroll('RECEIVED_GROUP')}
              className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer ${
                activeTab === 'RECEIVED_GROUP' 
                  ? 'bg-blue-50/90 border-blue-500 shadow-xs ring-2 ring-blue-500/20' 
                  : 'bg-blue-50/30 border-blue-200/80 hover:border-blue-400 hover:bg-blue-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-blue-950 truncate">
                  [물건 접수] 매도,임대,임차인(권리금원함)
                </span>
                <span className="text-[10px] sm:text-xs font-black text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-full shrink-0 ml-1">의뢰 고객</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl sm:text-3xl font-black text-blue-900">{receivedCustomers.length}<span className="text-sm font-normal text-blue-700 ml-1">명</span></span>
                <span className="text-xs font-semibold text-blue-700">접수장 보기 →</span>
              </div>
            </div>

            {/* 카드 3: [물건 찾음] 매수, 임차, 임차인(권리금 가능) */}
            <div 
              onClick={() => handleSelectTabWithScroll('SEARCHING_GROUP')}
              className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer ${
                activeTab === 'SEARCHING_GROUP' 
                  ? 'bg-indigo-50/90 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20' 
                  : 'bg-indigo-50/30 border-indigo-200/80 hover:border-indigo-400 hover:bg-indigo-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-indigo-950 truncate">
                  [물건 찾음] 매수,임차,임차인(권리금 가능)
                </span>
                <span className="text-[10px] sm:text-xs font-black text-indigo-700 bg-indigo-100/90 px-2 py-0.5 rounded-full shrink-0 ml-1">탐색 고객</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl sm:text-3xl font-black text-indigo-900">{searchingCustomers.length}<span className="text-sm font-normal text-indigo-700 ml-1">명</span></span>
                <span className="text-xs font-semibold text-indigo-700">찾음장 보기 →</span>
              </div>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 섹션 2. 🏢 새매물등록 / 매물장 검색(조건 필터) */}
        {/* (2번째 첨부 이미지 바로 밑에 위치) */}
        {/* ────────────────────────────────────────────────────────── */}
        {/* ────────────────────────────────────────────────────────── */}
        {/* 섹션 2. 🏢 새매물등록 / 매물장 검색(조건 필터) */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50/40 p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-300/90 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-2xs text-xs sm:text-sm font-bold shrink-0">🏢</span>
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-950 block">
                  매물 관리 및 실시간 조건 검색
                </span>
                <span className="text-[11px] text-emerald-800">
                  신규 매물 등록과 함께 시/구/동 지역 및 층수별 실시간 조건 검색을 실행합니다.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* 새매물등록 버튼 */}
              <button
                type="button"
                onClick={handleOpenNewProperty}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <span>＋ 새 매물 등록</span>
              </button>

              {/* 매물장 검색 (조건 필터) 버튼 */}
              <button
                type="button"
                onClick={() => handleSelectTabWithScroll('ALL_PROPERTIES')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer ${
                  activeTab === 'ALL_PROPERTIES'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/25 ring-2 ring-slate-800'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-2 border-emerald-300 shadow-2xs'
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-500" />
                <span>매물장 검색 (조건 필터)</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-800">
                  {properties.length}건
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 섹션 3. 👥 고객 관리 및 실시간 조건 검색 (매물 관리와 1:1 완벽 통일) */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-r from-blue-50 via-sky-50/70 to-blue-50/40 p-3.5 sm:p-4 rounded-2xl border-2 border-blue-300/90 shadow-2xs">
          
          {/* 상단 통일 헤더 (2번째 매물 관리 이미지와 완벽히 동일한 구조/위치/높이/버튼 구성) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-600 text-white shadow-2xs text-xs sm:text-sm font-bold shrink-0">👥</span>
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-blue-950 block">
                  고객 관리 및 실시간 조건 검색
                </span>
                <span className="text-[11px] text-blue-800">
                  신규 고객 등록과 함께 매도·임대 및 매수·임차 고객 조건 검색을 실행합니다.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* 고객등록 버튼 (2번째 이미지와 나란히 배치) */}
              <button
                type="button"
                onClick={handleOpenNewCustomer}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              >
                <span>＋ 새 고객 등록</span>
              </button>

              {/* 고객검색(조건필터) 버튼 (2번째 이미지와 나란히 배치) */}
              <button
                type="button"
                onClick={() => {
                  setCustomerFilterOpen(true);
                  handleSelectTabWithScroll('CUSTOMER_SEARCH');
                }}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer ${
                  activeTab === 'CUSTOMER_SEARCH' || (customerFilterOpen && (activeTab === 'ALL_CUSTOMERS' || activeTab === 'RECEIVED_GROUP' || activeTab === 'SEARCHING_GROUP'))
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/25 ring-2 ring-slate-800'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-2 border-blue-300 shadow-2xs'
                }`}
              >
                <Users className="w-4 h-4 text-blue-500" />
                <span>고객장 검색 (조건 필터)</span>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-800">
                  {customers.length}명
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 섹션 4. 📋 매물현황과 고객현황 */}
        {/* (요청사항: '매물현황', '고객현황'으로 명칭 변경 및 클릭 시 자세한 현황으로 이동) */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="bg-white p-3.5 sm:p-5 rounded-2xl border-2 border-slate-300 shadow-sm">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">📑</span>
              <span>등록 현황 바로가기</span>
            </span>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500">
              버튼을 누르면 해당 자세한 현황 페이지로 전환됩니다.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* 1) 매물현황 버튼 (요청대로 '매물현황'으로 명칭 변경) */}
            <button
              type="button"
              onClick={() => handleSelectTabWithScroll('ALL_PROPERTIES')}
              className={`flex items-center justify-between py-3.5 px-5 rounded-xl font-black text-sm sm:text-base transition-all cursor-pointer border-2 ${
                activeTab === 'ALL_PROPERTIES'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/25 ring-2 ring-slate-800 scale-[1.01]'
                  : 'bg-gradient-to-r from-emerald-50/70 to-teal-50/50 hover:from-emerald-100/80 hover:to-teal-100/60 text-slate-900 border-emerald-300 hover:border-emerald-500 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className={`w-5 h-5 ${activeTab === 'ALL_PROPERTIES' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span>매물현황</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                  activeTab === 'ALL_PROPERTIES' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-900'
                }`}>
                  {properties.length}건
                </span>
                <span className="text-xs font-semibold opacity-70">자세히 보기 →</span>
              </div>
            </button>

            {/* 2) 고객현황 버튼 (요청대로 '고객현황'으로 명칭 변경) */}
            <button
              type="button"
              onClick={() => {
                setCustomerFilterOpen(false);
                handleSelectTabWithScroll('ALL_CUSTOMERS');
              }}
              className={`flex items-center justify-between py-3.5 px-5 rounded-xl font-black text-sm sm:text-base transition-all cursor-pointer border-2 ${
                activeTab === 'ALL_CUSTOMERS' || activeTab === 'RECEIVED_GROUP' || activeTab === 'SEARCHING_GROUP' || activeTab === 'CUSTOMER_SEARCH'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-lg shadow-blue-500/25 ring-2 ring-blue-400 scale-[1.01]'
                  : 'bg-gradient-to-r from-blue-50/70 to-indigo-50/50 hover:from-blue-100/80 hover:to-indigo-100/60 text-slate-900 border-blue-300 hover:border-blue-500 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">👥</span>
                <span>고객현황</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                  activeTab === 'ALL_CUSTOMERS' || activeTab === 'RECEIVED_GROUP' || activeTab === 'SEARCHING_GROUP' || activeTab === 'CUSTOMER_SEARCH'
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-200/80 text-blue-900'
                }`}>
                  {customers.length}명
                </span>
                <span className="text-xs font-semibold opacity-70">자세히 보기 →</span>
              </div>
            </button>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 섹션 5. 자세한 현황 콘텐츠 영역 (버튼 클릭 시에만 노출) */}
        {/* (첫번째 이미지인 중복 고객목록은 기본 홈화면에서 삭제됨!) */}
        {/* ────────────────────────────────────────────────────────── */}
        <div ref={detailSectionRef} className="scroll-mt-20">
          
          {/* A. 자세한 고객현황 (전체 고객 / 조건 검색 / 물건 접수 / 물건 찾음) */}
          {(activeTab === 'ALL_CUSTOMERS' || activeTab === 'CUSTOMER_SEARCH' || activeTab === 'RECEIVED_GROUP' || activeTab === 'SEARCHING_GROUP') && (
            <div className="space-y-4 animate-in fade-in duration-200 bg-white/70 p-3 sm:p-5 rounded-2xl border-2 border-blue-200 shadow-sm">
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                  <span className="text-xs sm:text-sm font-black text-blue-950">
                    {activeTab === 'CUSTOMER_SEARCH'
                      ? '[자세한 고객현황] 고객장 실시간 조건 검색 (물건종류·거래형태·면적·지역·입주시기·주차)'
                      : activeTab === 'ALL_CUSTOMERS'
                      ? '[자세한 고객현황] 등록 고객 전체 관리장'
                      : activeTab === 'RECEIVED_GROUP'
                      ? '[자세한 고객현황] 매도·임대·권리금 접수 고객 관리장'
                      : '[자세한 고객현황] 매수·임차·권리금 탐색 고객 관리장'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('HOME');
                    setCustomerFilterOpen(false);
                  }}
                  className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                >
                  ✕ 현황판 접기
                </button>
              </div>

              <CustomerList
                customers={customers}
                activeGroup={
                  activeTab === 'RECEIVED_GROUP'
                    ? 'RECEIVED'
                    : activeTab === 'SEARCHING_GROUP'
                    ? 'SEARCHING'
                    : 'ALL'
                }
                initialShowFilter={activeTab === 'CUSTOMER_SEARCH' || customerFilterOpen}
                onGroupChange={(grp) => {
                  if (grp === 'ALL') setActiveTab('ALL_CUSTOMERS');
                  else if (grp === 'RECEIVED') setActiveTab('RECEIVED_GROUP');
                  else if (grp === 'SEARCHING') setActiveTab('SEARCHING_GROUP');
                }}
                onFilterToggle={(isOpen) => setCustomerFilterOpen(isOpen)}
                onSelectCustomer={(c) => setSelectedCustomer(c)}
                onOpenNewCustomer={handleOpenNewCustomer}
              />
            </div>
          )}

          {/* B. 자세한 매물현황 (통합 매물장 + 실시간 지도) */}
          {activeTab === 'ALL_PROPERTIES' && (
            <div className="space-y-4 animate-in fade-in duration-200 bg-white/70 p-3 sm:p-5 rounded-2xl border-2 border-emerald-300 shadow-sm">
              <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span className="text-xs sm:text-sm font-black text-emerald-950">
                    [자세한 매물현황] 전체 등록 매물 목록 및 실시간 카카오/GIS 지도
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('HOME')}
                  className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                >
                  ✕ 현황판 접기
                </button>
              </div>

              <PropertyList
                properties={properties}
                customers={customers}
                onSelectProperty={(p) => setSelectedProperty(p)}
                onOpenNewProperty={handleOpenNewProperty}
                onEditProperty={handleOpenEditProperty}
              />
            </div>
          )}

        </div>

      </main>

      {/* 4. Modals */}
      {/* 1) 새 매물 등록 및 수정 폼 */}
      <PropertyRegistrationForm
        customers={customers}
        isOpen={isPropertyRegOpen}
        initialData={editingProperty}
        mode={editingProperty ? 'EDIT' : 'CREATE'}
        onClose={() => {
          setIsPropertyRegOpen(false);
          setEditingProperty(null);
        }}
        onSuccess={handlePropertySaved}
      />

      {/* 2) 신규 고객 등록 및 수정 폼 */}
      <CustomerFormModal
        isOpen={isCustomerRegOpen}
        initialData={editingCustomer}
        mode={editingCustomer ? 'EDIT' : 'CREATE'}
        onClose={() => {
          setIsCustomerRegOpen(false);
          setEditingCustomer(null);
        }}
        onSuccess={handleCustomerSaved}
        defaultGroup={activeTab === 'SEARCHING_GROUP' ? 'SEARCHING' : 'RECEIVED'}
      />

      {/* 3) 매물 상세 모달 (문자 발송 링크 + 카톡 공유 API + 전화걸기 + 대장 정보 + 수정하기 + 삭제) */}
      <PropertyDetailModal
        property={selectedProperty}
        isOpen={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onEditProperty={handleOpenEditProperty}
        onPropertyDeleted={(deletedId) => {
          setProperties((prev) => prev.filter((p) => p.id !== deletedId && p.propertyNumber !== deletedId));
          setSelectedProperty(null);
          removeCustomProperty(deletedId);
        }}
      />

      {/* 4) 고객 상세 모달 (전화걸기 href="tel:..." + 접수매물/탐색조건 + 수정하기 + 삭제) */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onEditCustomer={handleOpenEditCustomer}
        onSelectProperty={(prop) => {
          setSelectedCustomer(null);
          setSelectedProperty(prop);
        }}
        onCustomerDeleted={(deletedId) => {
          setCustomers((prev) => prev.filter((c) => c.id !== deletedId));
          setSelectedCustomer(null);
          removeCustomCustomer(deletedId);
        }}
      />

      {/* 5) 개별 ID/비밀번호 로그인 모달 */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />

      {/* 6) 관리자 보안 감사 로그 & 소속공인중개사 계정 관리 콘솔 */}
      <AdminLogModal
        isOpen={isAdminLogsOpen}
        onClose={() => setIsAdminLogsOpen(false)}
      />

    </div>
  );
};

export const MainDashboard: React.FC = () => {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
};
