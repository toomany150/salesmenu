// src/components/crm/CustomerList.tsx
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Phone, 
  MessageSquare, 
  User, 
  Building, 
  Target, 
  Search, 
  Lock, 
  ChevronRight,
  UserCheck,
  Filter,
  Users,
  Building2,
  Check
} from 'lucide-react';
import { CustomerItem, CustomerGroup, PROPERTY_TYPE_LABELS } from '@/lib/types';
import { useAuth } from '../auth/AuthContext';
import { maskPhoneNumber, canViewCustomerContact, canAccessItem } from '@/lib/auth';
import { CustomerFilterPanel, CustomerFilterCriteria, INITIAL_CUSTOMER_FILTER_CRITERIA } from './CustomerFilterPanel';

export type CustomerListGroupMode = 'ALL' | CustomerGroup;

interface CustomerListProps {
  customers: CustomerItem[];
  activeGroup?: CustomerListGroupMode;
  initialShowFilter?: boolean;
  onSelectCustomer: (customer: CustomerItem) => void;
  onOpenNewCustomer: () => void;
  onGroupChange?: (group: CustomerListGroupMode) => void;
  onFilterToggle?: (isOpen: boolean) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  activeGroup = 'ALL',
  initialShowFilter = false,
  onSelectCustomer,
  onOpenNewCustomer,
  onGroupChange,
  onFilterToggle,
}) => {
  const { currentUser, availableAgents } = useAuth();
  const [currentGroup, setCurrentGroup] = useState<CustomerListGroupMode>(activeGroup);
  const [showFilterPanel, setShowFilterPanel] = useState(initialShowFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [managerFilter, setManagerFilter] = useState('ALL');
  const [filteredFromPanel, setFilteredFromPanel] = useState<CustomerItem[] | null>(null);
  const [filterCriteria, setFilterCriteria] = useState<CustomerFilterCriteria | null>(null);

  // Sync activeGroup when changed from parent
  useEffect(() => {
    setCurrentGroup(activeGroup);
  }, [activeGroup]);

  // Sync initialShowFilter when changed from parent
  useEffect(() => {
    if (initialShowFilter !== undefined) {
      setShowFilterPanel(initialShowFilter);
    }
  }, [initialShowFilter]);

  const handleGroupTabClick = (group: CustomerListGroupMode) => {
    setCurrentGroup(group);
    if (onGroupChange) {
      onGroupChange(group);
    }
  };

  const handleToggleFilter = () => {
    const next = !showFilterPanel;
    setShowFilterPanel(next);
    if (onFilterToggle) {
      onFilterToggle(next);
    }
  };

  // Group counts
  const totalCount = customers.length;
  const receivedCount = useMemo(() => customers.filter((c) => c.group === 'RECEIVED').length, [customers]);
  const searchingCount = useMemo(() => customers.filter((c) => c.group === 'SEARCHING').length, [customers]);

  // Base list filtered by currentGroup tab
  const baseGroupCustomers = useMemo(() => {
    if (currentGroup === 'ALL') return customers;
    return customers.filter((c) => c.group === currentGroup);
  }, [customers, currentGroup]);

  // Handle filter changes from CustomerFilterPanel
  const handleFilterPanelChange = useCallback((filtered: CustomerItem[], criteria: CustomerFilterCriteria) => {
    setFilteredFromPanel(filtered);
    setFilterCriteria(criteria);
  }, []);

  // Available managers list
  const allManagers = useMemo(() => {
    const set = new Set<string>();
    set.add('사무실');
    customers.forEach((c) => {
      if (c.managerName && c.managerName.trim()) set.add(c.managerName.trim());
    });
    availableAgents.forEach((a) => set.add(a));
    return Array.from(set);
  }, [customers, availableAgents]);

  // Final filtered list
  const filteredCustomers = useMemo(() => {
    // 1. If panel filter applied, intersect with baseGroupCustomers
    let list = baseGroupCustomers;
    if (showFilterPanel && filteredFromPanel) {
      const panelIds = new Set(filteredFromPanel.map((c) => c.id));
      list = list.filter((c) => panelIds.has(c.id));
    }

    return list.filter((c) => {
      // 0. 보안 접근 제어
      if (!canAccessItem(currentUser, c)) {
        return false;
      }

      // 1. Manager filter
      if (managerFilter !== 'ALL') {
        const mgr = c.managerName || '사무실';
        if (mgr !== managerFilter) return false;
      }

      // 2. Search query (quick bar)
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.memo && c.memo.toLowerCase().includes(q)) ||
        (c.managerName && c.managerName.toLowerCase().includes(q))
      );
    });
  }, [baseGroupCustomers, showFilterPanel, filteredFromPanel, currentUser, managerFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. 그룹 전환 탭 ([전체 고객] / [물건 접수] / [물건 찾음]) & 조건검색 필터 토글 */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        
        {/* 그룹 전환 탭 버튼들 */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleGroupTabClick('ALL')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              currentGroup === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                : 'text-slate-700 hover:bg-white hover:text-blue-600'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>전체 고객</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              currentGroup === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {totalCount}명
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleGroupTabClick('RECEIVED')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              currentGroup === 'RECEIVED'
                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                : 'text-slate-700 hover:bg-white hover:text-blue-600'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>물건 접수 (매도·임대)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              currentGroup === 'RECEIVED' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {receivedCount}명
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleGroupTabClick('SEARCHING')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              currentGroup === 'SEARCHING'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500'
                : 'text-slate-700 hover:bg-white hover:text-indigo-600'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>물건 찾음 (매수·임차)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              currentGroup === 'SEARCHING' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {searchingCount}명
            </span>
          </button>
        </div>

        {/* 조건 필터 토글 버튼 & 새 고객 등록 버튼 */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleFilter}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border-2 ${
              showFilterPanel
                ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20 ring-2 ring-slate-800'
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-900 border-blue-300 shadow-2xs'
            }`}
          >
            <Filter className={`w-3.5 h-3.5 ${showFilterPanel ? 'text-blue-400' : 'text-blue-600'}`} />
            <span>조건 필터 검색</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
              showFilterPanel ? 'bg-blue-600 text-white' : 'bg-blue-200/80 text-blue-900'
            }`}>
              {showFilterPanel ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenNewCustomer}
            className="px-3.5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            ＋ 새 고객 등록
          </button>
        </div>

      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. 고객 조건 필터 패널 (토글 시 노출) */}
      {/* ────────────────────────────────────────────────────────── */}
      {showFilterPanel && (
        <div className="animate-in fade-in duration-200">
          <CustomerFilterPanel
            customers={baseGroupCustomers}
            onFilterChange={handleFilterPanelChange}
          />
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. 상단 퀵 검색 및 담당자 필터 바 */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="고객 이름, 전화번호, 메모, 희망조건 검색..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
            />
          </div>

          {/* Manager / Assignee Filter Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <UserCheck className="w-4 h-4 text-slate-500" />
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">전체 권한자 ({baseGroupCustomers.length}명)</option>
              <option value="사무실">🏢 사무실 (공용/워크인)</option>
              {allManagers.filter((m) => m !== '사무실').map((mgr) => (
                <option key={mgr} value={mgr}>👤 {mgr}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            검색 결과: <span className="font-extrabold text-blue-600 text-sm">{filteredCustomers.length}</span>명
          </span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. 고객 카드 그리드 */}
      {/* ────────────────────────────────────────────────────────── */}
      {filteredCustomers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const isReceived = customer.group === 'RECEIVED';
            const typeLabel = 
              customer.type === 'SELLER' ? '매도인' :
              customer.type === 'LESSOR' ? '임대인' :
              customer.type === 'BUYER' ? '매수인' : '임차인';

            // 권한 체크: 소속공인중개사(AGENT)는 타인 고객 연락처 마스킹
            const canViewContact = canViewCustomerContact(currentUser, customer);
            const displayPhone = canViewContact ? customer.phone : maskPhoneNumber(customer.phone);
            const managerName = customer.managerName || '사무실';

            return (
              <div
                key={customer.id}
                className="bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:shadow-md transition-all p-4.5 flex flex-col justify-between group cursor-pointer"
                onClick={() => onSelectCustomer(customer)}
              >
                <div>
                  {/* Top: Name, Carrier badge, Group Badge, Manager Badge, Type badge */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* 물건 접수 vs 물건 찾음 뱃지 */}
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-md ${
                          isReceived
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                        }`}>
                          {isReceived ? '접수 의뢰' : '물건 탐색'}
                        </span>

                        <span className="font-black text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                          {customer.name}
                        </span>

                        {customer.carrier && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                            {customer.carrier}
                          </span>
                        )}

                        {/* 담당자 뱃지 */}
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                          managerName.includes('개업공인중개사')
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : managerName === '사무실'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {managerName.includes('개업공인중개사')
                            ? '👑 개업공인중개사'
                            : managerName === '사무실'
                            ? '🏢 사무실'
                            : `👤 ${managerName}`}
                        </span>

                        {/* 추가 권한자 뱃지 */}
                        {Array.isArray(customer.assignedAgents) && customer.assignedAgents.length > 0 && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-700 rounded border border-blue-200">
                            👥 {customer.assignedAgents.join(', ')}
                          </span>
                        )}
                      </div>

                      {/* 전화번호 & 마스킹 알림 */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <p className="font-mono text-sm font-bold text-slate-800">
                          {displayPhone}
                        </p>
                        {!canViewContact && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                            <Lock className="w-3 h-3 text-amber-600" />
                            비공개
                          </span>
                        )}
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 text-xs font-black rounded-lg shrink-0 ${
                      customer.type === 'SELLER' ? 'bg-blue-100 text-blue-800' :
                      customer.type === 'LESSOR' ? 'bg-sky-100 text-sky-800' :
                      customer.type === 'BUYER' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {typeLabel}
                    </span>
                  </div>

                  {/* Middle: Content summary */}
                  {isReceived ? (
                    <div className="mt-2.5 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="flex items-center gap-1 font-bold">
                          <Building className="w-3.5 h-3.5 text-blue-600" />
                          내놓은 매물
                        </span>
                        <span className="font-bold text-slate-900">
                          {customer.properties?.length || 0}건
                        </span>
                      </div>
                      {customer.properties && customer.properties.length > 0 ? (
                        <p className="text-slate-800 font-semibold truncate">
                          {customer.properties[0].address} ({customer.properties[0].transactionType})
                        </p>
                      ) : (
                        <p className="text-slate-400">매물 등록 대기중</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2.5 text-xs bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                      <div className="flex items-center justify-between text-indigo-800 mb-1">
                        <span className="flex items-center gap-1 font-bold">
                          <Target className="w-3.5 h-3.5 text-indigo-600" />
                          희망 탐색조건
                        </span>
                        <span className="font-bold text-indigo-950">
                          {customer.demands?.length || 0}건
                        </span>
                      </div>
                      {customer.demands && customer.demands.length > 0 ? (
                        <p className="text-slate-800 font-semibold truncate">
                          {PROPERTY_TYPE_LABELS[customer.demands[0].targetPropertyType]} ({customer.demands[0].targetTransactionType}) - {customer.demands[0].targetRegion || '지역무관'}
                        </p>
                      ) : (
                        <p className="text-slate-400">희망 조건 등록 대기</p>
                      )}
                    </div>
                  )}

                  {/* Consultation Memo */}
                  {customer.memo && (
                    <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                      "{customer.memo}"
                    </p>
                  )}
                </div>

                {/* Bottom Row: [📞 전화걸기] and Quick Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    {canViewContact ? (
                      <>
                        <a
                          href={`tel:${customer.phone}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-all active:scale-95"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>📞 전화</span>
                        </a>

                        <a
                          href={`sms:${customer.phone}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                          <span>문자</span>
                        </a>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-400 bg-slate-100 rounded-lg border border-slate-200">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>연락처 비공개</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectCustomer(customer)}
                    className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <span>상세보기</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">
            조건에 일치하는 고객이 없습니다.
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            조건 필터나 검색어를 변경해보시거나, 새로운 고객을 등록해주세요.
          </p>
          <button
            onClick={onOpenNewCustomer}
            className="mt-4 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
          >
            ＋ 첫 고객 등록하기
          </button>
        </div>
      )}
    </div>
  );
};
