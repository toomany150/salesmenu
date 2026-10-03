'use client';

import React, { useState, useEffect } from 'react';
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
import { initKakao } from '@/lib/kakao';

type MainViewTab = 'RECEIVED_GROUP' | 'SEARCHING_GROUP' | 'ALL_PROPERTIES';

export const MainDashboard: React.FC = () => {
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

  // Init Kakao SDK on mount
  useEffect(() => {
    initKakao();
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, propRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/properties'),
      ]);
      if (custRes.ok) {
        const cData = await custRes.json();
        if (Array.isArray(cData) && cData.length > 0) setCustomers(cData);
      }
      if (propRes.ok) {
        const pData = await propRes.json();
        if (Array.isArray(pData) && pData.length > 0) setProperties(pData);
      }
    } catch (err) {
      console.warn('DB fetch error, using initial mock data:', err);
    } finally {
      setLoading(false);
    }
  };

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
      <Header
        propertyCount={properties.length}
        receivedCustomerCount={receivedCustomers.length}
        searchingCustomerCount={searchingCustomers.length}
        onOpenNewProperty={handleOpenNewProperty}
        onOpenNewCustomer={() => setIsCustomerRegOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Top Summary Banner */}
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">전체 등록 매물</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900">{properties.length}</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">실시간 가동</span>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('RECEIVED_GROUP')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'RECEIVED_GROUP' 
                ? 'bg-blue-50/70 border-blue-400 shadow-xs ring-2 ring-blue-500/20' 
                : 'bg-white border-slate-200 hover:border-blue-300'
            }`}
          >
            <span className="text-xs font-semibold text-blue-800 block">[물건 접수] 매도·임대</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-blue-900">{receivedCustomers.length}</span>
              <span className="text-xs text-blue-600 font-semibold">의뢰 고객</span>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('SEARCHING_GROUP')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'SEARCHING_GROUP' 
                ? 'bg-indigo-50/70 border-indigo-400 shadow-xs ring-2 ring-indigo-500/20' 
                : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}
          >
            <span className="text-xs font-semibold text-indigo-800 block">[물건 찾음] 매수·임차</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-indigo-900">{searchingCustomers.length}</span>
              <span className="text-xs text-indigo-600 font-semibold">탐색 고객</span>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('ALL_PROPERTIES')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeTab === 'ALL_PROPERTIES' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className={`text-xs font-semibold block ${activeTab === 'ALL_PROPERTIES' ? 'text-slate-300' : 'text-slate-500'}`}>
              7대 매물장 전체조회
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-2xl font-black ${activeTab === 'ALL_PROPERTIES' ? 'text-white' : 'text-slate-900'}`}>
                {properties.length}
              </span>
              <span className={`text-xs font-semibold ${activeTab === 'ALL_PROPERTIES' ? 'text-blue-300' : 'text-slate-600'}`}>
                유형별 필터 →
              </span>
            </div>
          </div>
        </div>

        {/* 2. Core Tab Bar: [물건 접수] vs [물건 찾음] vs [전체 매물장] */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            
            {/* Tab 1: [물건 접수] 매도인 / 임대인 */}
            <button
              onClick={() => setActiveTab('RECEIVED_GROUP')}
              className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'RECEIVED_GROUP'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-500/20'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activeTab === 'RECEIVED_GROUP' ? 'bg-white' : 'bg-blue-600'}`}></span>
                <span>[물건 접수] 매도인 / 임대인</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'RECEIVED_GROUP' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                {receivedCustomers.length}명
              </span>
            </button>

            {/* Tab 2: [물건 찾음] 매수인 / 임차인 */}
            <button
              onClick={() => setActiveTab('SEARCHING_GROUP')}
              className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'SEARCHING_GROUP'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/20'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activeTab === 'SEARCHING_GROUP' ? 'bg-white' : 'bg-indigo-600'}`}></span>
                <span>[물건 찾음] 매수인 / 임차인</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'SEARCHING_GROUP' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {searchingCustomers.length}명
              </span>
            </button>

            {/* Tab 3: 통합 매물장 (7가지 매물) */}
            <button
              onClick={() => setActiveTab('ALL_PROPERTIES')}
              className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'ALL_PROPERTIES'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>통합 매물장 (7대 유형)</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'ALL_PROPERTIES' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {properties.length}건
              </span>
            </button>

          </div>
        </div>

        {/* 3. Main Dynamic Content View */}
        {activeTab === 'RECEIVED_GROUP' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-500/10 via-sky-500/5 to-transparent p-4 rounded-xl border border-blue-200/60 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-blue-950 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  [물건 접수] 매도인 / 임대인 고객관리장
                </h3>
                <p className="text-xs text-blue-800/80 mt-0.5">
                  내놓을 매물 정보(소재지 주소, 대장 연동 정보, 희망 가격)와 함께 고객을 관리합니다.
                </p>
              </div>
              <button
                onClick={() => setIsCustomerRegOpen(true)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                ＋ 매도/임대인 등록
              </button>
            </div>

            <CustomerList
              customers={customers}
              activeGroup="RECEIVED"
              onSelectCustomer={(c) => setSelectedCustomer(c)}
              onOpenNewCustomer={() => setIsCustomerRegOpen(true)}
            />
          </div>
        )}

        {activeTab === 'SEARCHING_GROUP' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-4 rounded-xl border border-indigo-200/60 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-indigo-950 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  [물건 찾음] 매수인 / 임차인 고객관리장
                </h3>
                <p className="text-xs text-indigo-800/80 mt-0.5">
                  희망하는 매물 유형, 지역, 예산(매매가/보증금/월세), 입주 희망 조건과 함께 관리합니다.
                </p>
              </div>
              <button
                onClick={() => setIsCustomerRegOpen(true)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                ＋ 매수/임차인 등록
              </button>
            </div>

            <CustomerList
              customers={customers}
              activeGroup="SEARCHING"
              onSelectCustomer={(c) => setSelectedCustomer(c)}
              onOpenNewCustomer={() => setIsCustomerRegOpen(true)}
            />
          </div>
        )}

        {activeTab === 'ALL_PROPERTIES' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-slate-900/5 via-slate-800/5 to-transparent p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  스마트 매물장 (아파트·주택·상가·사무실·공장창고·토지)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  각 매물별로 [📞 전화걸기], [💬 문자로 전송], [🟡 카톡 공유] 버튼이 바로 제공됩니다.
                </p>
              </div>
              <button
                onClick={handleOpenNewProperty}
                className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                ＋ 새 매물 등록
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

      {/* 3) 매물 상세 모달 (문자 발송 링크 + 카톡 공유 API + 전화걸기 + 대장 정보 + 수정하기) */}
      <PropertyDetailModal
        property={selectedProperty}
        isOpen={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onEditProperty={handleOpenEditProperty}
      />

      {/* 4) 고객 상세 모달 (전화걸기 href="tel:..." + 접수매물/탐색조건) */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onSelectProperty={(prop) => {
          setSelectedCustomer(null);
          setSelectedProperty(prop);
        }}
      />

    </div>
  );
};
