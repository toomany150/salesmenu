'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Building2 } from 'lucide-react';
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
import { initKakao } from '@/lib/kakao';

type MainViewTab = 'RECEIVED_GROUP' | 'SEARCHING_GROUP' | 'ALL_PROPERTIES';

const DashboardContent: React.FC = () => {
  const { currentUser } = useAuth();

  // Main view state:
  // RECEIVED_GROUP: [물건 접수] 매도인 / 임대인
  // SEARCHING_GROUP: [물건 찾음] 매수인 / 임차인
  // ALL_PROPERTIES: 통합 매물장
  const [activeTab, setActiveTab] = useState<MainViewTab>('RECEIVED_GROUP');

  // Data States
  const [customers, setCustomers] = useState<CustomerItem[]>(INITIAL_CUSTOMERS);
  const [properties, setProperties] = useState<PropertyItem[]>(INITIAL_PROPERTIES);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [isPropertyRegOpen, setIsPropertyRegOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);
  const [isCustomerRegOpen, setIsCustomerRegOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);

  // Auth & Admin Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAdminLogsOpen, setIsAdminLogsOpen] = useState(false);

  // Init Kakao SDK on mount
  useEffect(() => {
    initKakao();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers: HeadersInit = {};
      if (currentUser) {
        headers['x-user-role'] = currentUser.role;
        headers['x-user-id'] = currentUser.id;
        headers['x-user-name'] = currentUser.name;
      }
      const [custRes, propRes] = await Promise.all([
        fetch('/api/customers', { headers }),
        fetch('/api/properties', { headers }),
      ]);
      if (custRes.ok) {
        const cData = await custRes.json();
        if (Array.isArray(cData)) setCustomers(cData);
      }
      if (propRes.ok) {
        const pData = await propRes.json();
        if (Array.isArray(pData)) setProperties(pData);
      }
    } catch (err) {
      console.warn('DB fetch error, using initial mock data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handlePropertySaved = (savedProp: PropertyItem) => {
    setProperties((prev) => {
      const idx = prev.findIndex((p) => p.id === savedProp.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedProp;
        return next;
      }
      return [savedProp, ...prev];
    });
    fetchData();
  };

  const handleCustomerCreated = (newCust: CustomerItem) => {
    setCustomers((prev) => [newCust, ...prev]);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-16">
      
      {/* 1. Global Navigation Header */}
      {/* 1. Global Navigation Header */}
      <Header
        propertyCount={properties.length}
        receivedCustomerCount={receivedCustomers.length}
        searchingCustomerCount={searchingCustomers.length}
        onOpenNewProperty={handleOpenNewProperty}
        onOpenNewCustomer={() => setIsCustomerRegOpen(true)}
        onOpenAdminLogs={() => setIsAdminLogsOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onGoHome={() => setActiveTab('RECEIVED_GROUP')}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        
        {/* ────────────────────────────────────────────────────────── */}
        {/* 섹션 1. 📊 전체 현황 (2번째 첨부 이미지 반영) */}
        {/* 매물장 검색 카드는 삭제하고 3개 카드로 구성 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="bg-white/90 backdrop-blur-xs p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">📊</span>
              <span>전체 현황</span>
            </h2>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400">
              실시간 데이터베이스 집계
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
            {/* 카드 1: 전체 등록 매물 */}
            <div 
              onClick={() => setActiveTab('ALL_PROPERTIES')}
              className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer ${
                activeTab === 'ALL_PROPERTIES' 
                  ? 'bg-emerald-50/70 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20' 
                  : 'bg-slate-50/60 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-emerald-950">전체 등록 매물</span>
                <span className="text-[10px] sm:text-xs font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">실시간 가동</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-900">{properties.length}<span className="text-sm font-normal text-emerald-700 ml-1">건</span></span>
                <span className="text-xs font-semibold text-emerald-700">매물 보기 →</span>
              </div>
            </div>

            {/* 카드 2: [물건 접수] 매도, 임대, 임차인(권리금원함) */}
            <div 
              onClick={() => setActiveTab('RECEIVED_GROUP')}
              className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer ${
                activeTab === 'RECEIVED_GROUP' 
                  ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-2 ring-blue-500/20' 
                  : 'bg-slate-50/60 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-blue-950 truncate">
                  [물건 접수] 매도, 임대, 임차인(권리금원함)
                </span>
                <span className="text-[10px] sm:text-xs font-black text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full shrink-0 ml-1">의뢰 고객</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl sm:text-3xl font-black text-blue-900">{receivedCustomers.length}<span className="text-sm font-normal text-blue-700 ml-1">명</span></span>
                <span className="text-xs font-semibold text-blue-700">접수장 보기 →</span>
              </div>
            </div>

            {/* 카드 3: [물건 찾음] 매수, 임차, 임차인(권리금 가능) */}
            <div 
              onClick={() => setActiveTab('SEARCHING_GROUP')}
              className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer ${
                activeTab === 'SEARCHING_GROUP' 
                  ? 'bg-indigo-50/80 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20' 
                  : 'bg-slate-50/60 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-indigo-950 truncate">
                  [물건 찾음] 매수, 임차, 임차인(권리금 가능)
                </span>
                <span className="text-[10px] sm:text-xs font-black text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full shrink-0 ml-1">탐색 고객</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl sm:text-3xl font-black text-indigo-900">{searchingCustomers.length}<span className="text-sm font-normal text-indigo-700 ml-1">명</span></span>
                <span className="text-xs font-semibold text-indigo-700">찾음장 보기 →</span>
              </div>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 섹션 2. 🏢 매물 관리 & 검색 (새매물등록 / 매물장 검색(조건 필터)) */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-sky-50/30 p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-200/80 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs text-xs">🏢</span>
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
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <span>＋ 새 매물 등록</span>
              </button>

              {/* 매물장 검색 (조건 필터) 버튼 */}
              <button
                type="button"
                onClick={() => setActiveTab('ALL_PROPERTIES')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer ${
                  activeTab === 'ALL_PROPERTIES'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-800'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs'
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
        {/* 섹션 3. 👥 고객 관리 & 접수/찾음 & 고객 검색 */}
        {/* 1) 고객 등록 */}
        {/* 2) [물건 접수] 매도인/임대인/임차인(권리금 원함) */}
        {/* 3) [물건 찾음] 매수인/임차인/임차인(권리금 가능) */}
        {/* 4) 고객 검색(조건 필터) */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/40 p-3.5 sm:p-4 rounded-2xl border-2 border-blue-200/90 shadow-2xs space-y-2.5">
          
          {/* 상단 라인: 고객 등록 헤더 & 등록 버튼 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs text-xs">👥</span>
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-blue-950 block">
                  고객 등록 및 심층 상담장 관리
                </span>
                <span className="text-[11px] text-blue-800">
                  의뢰인 기본정보, 심층 상담 조건, 실시간 브리핑 가이드를 작성합니다.
                </span>
              </div>
            </div>

            {/* 고객 등록란 버튼 */}
            <button
              type="button"
              onClick={() => setIsCustomerRegOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
            >
              <span>＋ 고객 등록</span>
            </button>
          </div>

          {/* 그 밑에 줄: [물건 접수] 매도인/임대인/임차인(권리금 원함) vs [물건 찾음] 매수인/임차인/임차인(권리금 가능) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-blue-100">
            {/* [물건 접수] 버튼 */}
            <button
              type="button"
              onClick={() => setActiveTab('RECEIVED_GROUP')}
              className={`flex items-center justify-between py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'RECEIVED_GROUP'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20'
                  : 'bg-white text-slate-800 hover:bg-blue-50/60 border border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 text-left">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeTab === 'RECEIVED_GROUP' ? 'bg-white' : 'bg-blue-600'}`}></span>
                <span className="leading-tight">
                  [물건 접수] 매도인 / 임대인 / 임차인(권리금 원함)
                </span>
              </div>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-black shrink-0 ${
                activeTab === 'RECEIVED_GROUP' ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                {receivedCustomers.length}명
              </span>
            </button>

            {/* [물건 찾음] 버튼 */}
            <button
              type="button"
              onClick={() => setActiveTab('SEARCHING_GROUP')}
              className={`flex items-center justify-between py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'SEARCHING_GROUP'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/20'
                  : 'bg-white text-slate-800 hover:bg-indigo-50/60 border border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 text-left">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeTab === 'SEARCHING_GROUP' ? 'bg-white' : 'bg-indigo-600'}`}></span>
                <span className="leading-tight">
                  [물건 찾음] 매수인 / 임차인 / 임차인(권리금 가능)
                </span>
              </div>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-black shrink-0 ${
                activeTab === 'SEARCHING_GROUP' ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {searchingCustomers.length}명
              </span>
            </button>
          </div>

          {/* 그 밑에 고객 검색(조건 필터) 안내/퀵 바 */}
          <div className="bg-white/90 p-2 sm:p-2.5 rounded-xl border border-blue-200/80 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="text-blue-600 font-bold">🔍 고객 검색 (조건 필터):</span>
              <span className="text-slate-500 text-[11px] hidden sm:inline">
                이름, 전화번호, 상담 메모, 전담 권한자별 실시간 필터링
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'ALL_PROPERTIES' ? 'RECEIVED_GROUP' : activeTab)}
                className="px-2.5 py-1 font-bold text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
              >
                고객 필터 즉시 열기 →
              </button>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 섹션 4. 📋 매물현황 & 고객현황 상세페이지 전환 버튼 바 */}
        {/* 누를 경우 해당 등록된 현황 상세페이지/뷰로 즉시 전환 */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="bg-white p-2.5 sm:p-3 rounded-2xl border-2 border-slate-300 shadow-sm">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <span>📑 등록 현황 상세페이지 바로가기</span>
              <span className="text-[10px] font-normal text-slate-500">(버튼 클릭 시 해당 상세 내역으로 즉시 이동)</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* 매물현황 버튼 */}
            <button
              type="button"
              onClick={() => setActiveTab('ALL_PROPERTIES')}
              className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'ALL_PROPERTIES'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/25 ring-2 ring-slate-800'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <Building2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-400" />
              <span>매물현황 상세페이지</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'ALL_PROPERTIES' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {properties.length}건
              </span>
            </button>

            {/* 고객현황 버튼 */}
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'ALL_PROPERTIES') {
                  setActiveTab('RECEIVED_GROUP');
                }
              }}
              className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab !== 'ALL_PROPERTIES'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <span className="text-sm sm:text-base">👥</span>
              <span>고객현황 상세페이지</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab !== 'ALL_PROPERTIES' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {customers.length}명
              </span>
            </button>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────── */}
        {/* 섹션 5. 등록된 현황 상세페이지 콘텐츠 영역 */}
        {/* ────────────────────────────────────────────────────────── */}
        {activeTab === 'RECEIVED_GROUP' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <CustomerList
              customers={customers}
              activeGroup="RECEIVED"
              onSelectCustomer={(c) => setSelectedCustomer(c)}
              onOpenNewCustomer={() => setIsCustomerRegOpen(true)}
            />
          </div>
        )}

        {activeTab === 'SEARCHING_GROUP' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <CustomerList
              customers={customers}
              activeGroup="SEARCHING"
              onSelectCustomer={(c) => setSelectedCustomer(c)}
              onOpenNewCustomer={() => setIsCustomerRegOpen(true)}
            />
          </div>
        )}

        {activeTab === 'ALL_PROPERTIES' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <PropertyList
              properties={properties}
              customers={customers}
              onSelectProperty={(p) => setSelectedProperty(p)}
              onOpenNewProperty={handleOpenNewProperty}
              onEditProperty={handleOpenEditProperty}
            />
          </div>
        )}

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

      {/* 2) 신규 고객 등록 폼 */}
      <CustomerFormModal
        isOpen={isCustomerRegOpen}
        onClose={() => setIsCustomerRegOpen(false)}
        onSuccess={handleCustomerCreated}
        defaultGroup={activeTab === 'SEARCHING_GROUP' ? 'SEARCHING' : 'RECEIVED'}
      />

      {/* 3) 매물 상세 모달 (문자 발송 링크 + 카톡 공유 API + 전화걸기 + 대장 정보 + 수정하기 + 삭제) */}
      <PropertyDetailModal
        property={selectedProperty}
        isOpen={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onEditProperty={handleOpenEditProperty}
        onPropertyDeleted={(deletedId) => {
          setProperties((prev) => prev.filter((p) => p.id !== deletedId));
          setSelectedProperty(null);
          fetchData();
        }}
      />

      {/* 4) 고객 상세 모달 (전화걸기 href="tel:..." + 접수매물/탐색조건 + 삭제) */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onSelectProperty={(prop) => {
          setSelectedCustomer(null);
          setSelectedProperty(prop);
        }}
        onCustomerDeleted={(deletedId) => {
          setCustomers((prev) => prev.filter((c) => c.id !== deletedId));
          setSelectedCustomer(null);
          fetchData();
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
