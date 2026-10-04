'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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

type MainViewTab = 'HOME' | 'ALL_PROPERTIES' | 'RECEIVED_GROUP' | 'SEARCHING_GROUP';

const DashboardContent: React.FC = () => {
  const { currentUser } = useAuth();

  // Main view state:
  // HOME: 깔끔한 대시보드 요약 화면 (중복 목록 미노출)
  // ALL_PROPERTIES: 자세한 매물현황 (필터 + 목록 + 지도)
  // RECEIVED_GROUP: 자세한 고객현황 [물건 접수] 매도인 / 임대인
  // SEARCHING_GROUP: 자세한 고객현황 [물건 찾음] 매수인 / 임차인
  const [activeTab, setActiveTab] = useState<MainViewTab>('HOME');

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

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-16">
      
      {/* 1. Global Navigation Header */}
      <Header
        propertyCount={properties.length}
        receivedCustomerCount={receivedCustomers.length}
        searchingCustomerCount={searchingCustomers.length}
        onOpenNewProperty={handleOpenNewProperty}
        onOpenNewCustomer={() => setIsCustomerRegOpen(true)}
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
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400">
              실시간 데이터베이스 집계
            </span>
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
        <section className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50/40 p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-300/90 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-2xs text-xs sm:text-sm font-bold">🏢</span>
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
        {/* 섹션 3. 👥 고객 관리 섹션 (사용자 요청 세로 줄 순서대로 배치) */}
        {/* 줄 1: 고객 등록란 */}
        {/* 줄 2: [물건 접수] 매도인 / 임대인 / 임차인(권리금 원함) */}
        {/* 줄 3: [물건 찾음] 매수인 / 임차인 / 임차인(권리금 가능) */}
        {/* 줄 4: 고객 검색(조건 필터) */}
        {/* ────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-b from-blue-50/90 via-sky-50/50 to-indigo-50/70 p-3.5 sm:p-5 rounded-2xl border-2 border-blue-200/90 shadow-2xs space-y-3">
          
          {/* 1) 그 밑에 줄에: 고객 등록란 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white/95 p-3 rounded-xl border border-blue-200 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-600 text-white shadow-2xs text-xs font-bold">👥</span>
              <div>
                <span className="text-xs sm:text-sm font-black text-blue-950 block">
                  고객 등록란
                </span>
                <span className="text-[11px] text-blue-800">
                  의뢰인 기본정보, 상담 메모 및 특이사항, 음성(STT) 입력 지원
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCustomerRegOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer shrink-0"
            >
              <span>＋ 고객 등록</span>
            </button>
          </div>

          {/* 2) 그 밑에: [물건 접수] 매도인/임대인/임차인(권리금 원함) */}
          <div>
            <button
              type="button"
              onClick={() => handleSelectTabWithScroll('RECEIVED_GROUP')}
              className={`w-full flex items-center justify-between py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer border-2 ${
                activeTab === 'RECEIVED_GROUP'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/30 ring-2 ring-blue-400'
                  : 'bg-white hover:bg-blue-50/70 text-blue-950 border-blue-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2.5 text-left">
                <span className={`w-3 h-3 rounded-full shrink-0 ${activeTab === 'RECEIVED_GROUP' ? 'bg-white' : 'bg-blue-600'}`}></span>
                <span className="leading-tight">
                  [물건 접수] 매도인 / 임대인 / 임차인(권리금 원함)
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black shrink-0 ${
                activeTab === 'RECEIVED_GROUP' ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                {receivedCustomers.length}명
              </span>
            </button>
          </div>

          {/* 3) 그 밑에: [물건 찾음] 매수인/임차인/임차인(권리금 가능) */}
          <div>
            <button
              type="button"
              onClick={() => handleSelectTabWithScroll('SEARCHING_GROUP')}
              className={`w-full flex items-center justify-between py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer border-2 ${
                activeTab === 'SEARCHING_GROUP'
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400'
                  : 'bg-white hover:bg-indigo-50/70 text-indigo-950 border-indigo-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-2.5 text-left">
                <span className={`w-3 h-3 rounded-full shrink-0 ${activeTab === 'SEARCHING_GROUP' ? 'bg-white' : 'bg-indigo-600'}`}></span>
                <span className="leading-tight">
                  [물건 찾음] 매수인 / 임차인 / 임차인(권리금 가능)
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black shrink-0 ${
                activeTab === 'SEARCHING_GROUP' ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {searchingCustomers.length}명
              </span>
            </button>
          </div>

          {/* 4) 그 밑에: 고객 검색(조건 필터) */}
          <div className="bg-white/95 p-3 rounded-xl border border-blue-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="text-blue-600 font-black text-xs sm:text-sm">🔍 고객 검색 (조건 필터):</span>
              <span className="text-slate-500 text-[11px] sm:text-xs">
                매도/임대인 및 매수/임차인 이름, 연락처, 메모, 전담 권한자 실시간 필터링
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSelectTabWithScroll(activeTab === 'ALL_PROPERTIES' ? 'RECEIVED_GROUP' : activeTab)}
                className="w-full sm:w-auto px-3.5 py-1.5 font-black text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer text-center"
              >
                고객 조건 필터 즉시 열기 →
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
              onClick={() => handleSelectTabWithScroll(activeTab === 'SEARCHING_GROUP' ? 'SEARCHING_GROUP' : 'RECEIVED_GROUP')}
              className={`flex items-center justify-between py-3.5 px-5 rounded-xl font-black text-sm sm:text-base transition-all cursor-pointer border-2 ${
                activeTab === 'RECEIVED_GROUP' || activeTab === 'SEARCHING_GROUP'
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
                  activeTab === 'RECEIVED_GROUP' || activeTab === 'SEARCHING_GROUP'
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
          
          {/* A. 자세한 고객현황 (물건 접수 / 물건 찾음) */}
          {(activeTab === 'RECEIVED_GROUP' || activeTab === 'SEARCHING_GROUP') && (
            <div className="space-y-4 animate-in fade-in duration-200 bg-white/70 p-3 sm:p-5 rounded-2xl border-2 border-blue-200 shadow-sm">
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                  <span className="text-xs sm:text-sm font-black text-blue-950">
                    [자세한 고객현황] {activeTab === 'RECEIVED_GROUP' ? '매도·임대·권리금 접수 고객 관리장' : '매수·임차·권리금 탐색 고객 관리장'}
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

              {activeTab === 'RECEIVED_GROUP' ? (
                <CustomerList
                  customers={customers}
                  activeGroup="RECEIVED"
                  onSelectCustomer={(c) => setSelectedCustomer(c)}
                  onOpenNewCustomer={() => setIsCustomerRegOpen(true)}
                />
              ) : (
                <CustomerList
                  customers={customers}
                  activeGroup="SEARCHING"
                  onSelectCustomer={(c) => setSelectedCustomer(c)}
                  onOpenNewCustomer={() => setIsCustomerRegOpen(true)}
                />
              )}
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
