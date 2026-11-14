'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  BarChart3, 
  Users, 
  Building2, 
  Calendar, 
  TrendingUp, 
  Printer, 
  Download,
  Filter,
  CheckCircle2,
  PieChart
} from 'lucide-react';
import { PropertyItem, CustomerItem, PROPERTY_TYPE_LABELS } from '@/lib/types';
import * as XLSX from 'xlsx';

export const STANDARD_CHANNELS = [
  '당근',
  '직방',
  '네이버',
  '직접방문',
  '워크인',
  '블로그',
  '홈페이지',
  '유선전화',
  '문자',
] as const;

interface StatsSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: PropertyItem[];
  customers: CustomerItem[];
  initialTab?: 'PROPERTIES' | 'CUSTOMERS';
}

export const StatsSummaryModal: React.FC<StatsSummaryModalProps> = ({
  isOpen,
  onClose,
  properties,
  customers,
  initialTab = 'PROPERTIES',
}) => {
  const [activeTab, setActiveTab] = useState<'PROPERTIES' | 'CUSTOMERS'>(initialTab);

  // Sync tab when opened
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Extract all distinct years from both datasets
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear().toString();
    years.add(currentYear);

    properties.forEach((p) => {
      const d = p.receiptDate || (p as any).createdAt;
      if (d) {
        const y = new Date(d).getFullYear();
        if (!isNaN(y)) years.add(y.toString());
      }
    });

    customers.forEach((c) => {
      const d = c.receiptDate || c.createdAt;
      if (d) {
        const y = new Date(d).getFullYear();
        if (!isNaN(y)) years.add(y.toString());
      }
    });

    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [properties, customers]);

  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return new Date().getFullYear().toString();
  });

  // Normalize channel helper
  const normalizeChannel = (rawChannel?: string): string => {
    if (!rawChannel || !rawChannel.trim()) return '미지정';
    const trimmed = rawChannel.trim();
    if ((STANDARD_CHANNELS as readonly string[]).includes(trimmed)) {
      return trimmed;
    }
    return trimmed; // custom text
  };

  // Group channels into categories: standard ones, custom ones, and unassigned
  const allChannelsList = useMemo(() => {
    const customChannels = new Set<string>();
    const dataset = activeTab === 'PROPERTIES' ? properties : customers;

    dataset.forEach((item) => {
      const ch = item.inflowPath?.trim();
      if (ch && !(STANDARD_CHANNELS as readonly string[]).includes(ch)) {
        customChannels.add(ch);
      }
    });

    return [
      ...STANDARD_CHANNELS,
      ...Array.from(customChannels).sort(),
      '미지정',
    ];
  }, [activeTab, properties, customers]);

  // Filtered dataset by year
  const filteredData = useMemo(() => {
    const dataset = activeTab === 'PROPERTIES' ? properties : customers;
    if (selectedYear === 'ALL') return dataset;

    return dataset.filter((item) => {
      const rawDate = item.receiptDate || (item as any).createdAt;
      if (!rawDate) return false;
      const y = new Date(rawDate).getFullYear().toString();
      return y === selectedYear;
    });
  }, [activeTab, properties, customers, selectedYear]);

  // Matrix calculation: channel x month (1..12)
  const statsMatrix = useMemo(() => {
    // initialize: channel -> [0..11] months
    const matrix: Record<string, number[]> = {};
    allChannelsList.forEach((ch) => {
      matrix[ch] = Array(12).fill(0);
    });

    const monthTotals = Array(12).fill(0);
    let grandTotal = 0;

    filteredData.forEach((item) => {
      const rawDate = item.receiptDate || (item as any).createdAt;
      if (!rawDate) return;
      const dateObj = new Date(rawDate);
      const m = dateObj.getMonth(); // 0..11
      if (isNaN(m) || m < 0 || m > 11) return;

      const ch = normalizeChannel(item.inflowPath);
      if (!matrix[ch]) {
        matrix[ch] = Array(12).fill(0);
      }
      matrix[ch][m] += 1;
      monthTotals[m] += 1;
      grandTotal += 1;
    });

    // Row totals and percentages
    const rowStats = allChannelsList.map((ch) => {
      const monthly = matrix[ch] || Array(12).fill(0);
      const total = monthly.reduce((a, b) => a + b, 0);
      const percentage = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) : '0.0';
      return {
        channel: ch,
        monthly,
        total,
        percentage: Number(percentage),
      };
    });

    // Sort: standard channels first, then by total descending, '미지정' last
    rowStats.sort((a, b) => {
      if (a.channel === '미지정') return 1;
      if (b.channel === '미지정') return -1;
      return b.total - a.total;
    });

    // Top channel
    const activeRows = rowStats.filter((r) => r.channel !== '미지정' && r.total > 0);
    const topChannel = activeRows.length > 0 ? activeRows[0] : null;

    // Current month count
    const currentMonthIdx = new Date().getMonth();
    const currentMonthTotal = monthTotals[currentMonthIdx];

    return {
      rowStats,
      monthTotals,
      grandTotal,
      topChannel,
      currentMonthTotal,
    };
  }, [filteredData, allChannelsList]);

  // Secondary breakdown (by property type or customer group)
  const secondaryStats = useMemo(() => {
    if (activeTab === 'PROPERTIES') {
      const typeCounts: Record<string, number> = {};
      const txCounts: Record<string, number> = { '매매': 0, '전세': 0, '월세': 0 };
      let contracted = 0;

      (filteredData as PropertyItem[]).forEach((p) => {
        const typeLabel = PROPERTY_TYPE_LABELS[p.propertyType] || p.propertyType;
        typeCounts[typeLabel] = (typeCounts[typeLabel] || 0) + 1;

        if (p.transactionType) {
          txCounts[p.transactionType] = (txCounts[p.transactionType] || 0) + 1;
        }
        if (p.status === 'CONTRACTED') {
          contracted += 1;
        }
      });

      return {
        typeCounts,
        txCounts,
        contracted,
        contractedRate: filteredData.length > 0 ? ((contracted / filteredData.length) * 100).toFixed(1) : '0.0',
      };
    } else {
      const groupCounts: Record<string, number> = { '물건 접수(매도/임대)': 0, '물건 찾음(매수/임차)': 0 };
      const subTypeCounts: Record<string, number> = {};
      let completed = 0;

      (filteredData as CustomerItem[]).forEach((c) => {
        if (c.group === 'RECEIVED') {
          groupCounts['물건 접수(매도/임대)'] += 1;
        } else {
          groupCounts['물건 찾음(매수/임차)'] += 1;
        }

        const sub = c.subType || (c.type === 'SELLER' ? '매도인' : c.type === 'BUYER' ? '매수인' : '임대/임차');
        subTypeCounts[sub] = (subTypeCounts[sub] || 0) + 1;

        if (c.status === 'COMPLETED') {
          completed += 1;
        }
      });

      return {
        groupCounts,
        subTypeCounts,
        completed,
        completedRate: filteredData.length > 0 ? ((completed / filteredData.length) * 100).toFixed(1) : '0.0',
      };
    }
  }, [activeTab, filteredData]);

  // Excel Export
  const handleExportExcel = () => {
    const isProp = activeTab === 'PROPERTIES';
    const title = isProp ? `물건집계현황_${selectedYear}년` : `고객집계현황_${selectedYear}년`;

    const headers = [
      '구분(접수/유입경로)',
      '1월', '2월', '3월', '4월', '5월', '6월',
      '7월', '8월', '9월', '10월', '11월', '12월',
      '합계', '점유율(%)'
    ];

    const dataRows = statsMatrix.rowStats.map((r) => [
      r.channel,
      ...r.monthly,
      r.total,
      `${r.percentage}%`
    ]);

    // Footer total row
    dataRows.push([
      '월별 합계',
      ...statsMatrix.monthTotals,
      statsMatrix.grandTotal,
      '100.0%'
    ]);

    const ws = XLSX.utils.aoa_to_sheet([
      [`[${title}]`],
      headers,
      ...dataRows,
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '집계현황표');
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:max-h-none print:shadow-none print:border-none">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-blue-50/30 print:border-b-2">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl text-white shadow-xs ${activeTab === 'PROPERTIES' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
              {activeTab === 'PROPERTIES' ? <Building2 className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {activeTab === 'PROPERTIES' ? '📦 물건집계 현황표' : '👥 고객집계 현황표'}
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {selectedYear === 'ALL' ? '전체 기간' : `${selectedYear}년`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeTab === 'PROPERTIES' 
                  ? '연도별·월별 물건 접수 경로(당근, 직방, 네이버 등) 및 매물 유형별 종합 통계' 
                  : '연도별·월별 매수/임차 고객 접수 경로 및 유입 종합 집계'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              title="인쇄하기"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 text-xs font-bold"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">인쇄</span>
            </button>
            <button
              onClick={handleExportExcel}
              title="엑셀 다운로드"
              className="p-2 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 text-xs font-bold"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">엑셀 다운로드</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Controls & Filter Bar */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 print:hidden">
          {/* Main Mode Toggle: 물건 vs 고객 */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('PROPERTIES')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === 'PROPERTIES'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>물건집계 현황 (접수경로)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CUSTOMERS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === 'CUSTOMERS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>고객집계 현황 (접수경로)</span>
            </button>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              집계 연도:
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-300 rounded-lg shadow-2xs text-slate-900 focus:ring-2 focus:ring-blue-500"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
              <option value="ALL">전체 연도 합산</option>
            </select>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 block">
                {activeTab === 'PROPERTIES' ? '총 접수 물건' : '총 상담 고객'}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-slate-900">{statsMatrix.grandTotal}</span>
                <span className="text-xs text-slate-500 font-semibold">
                  {activeTab === 'PROPERTIES' ? '건' : '명'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200">
              <span className="text-[11px] font-bold text-indigo-700 block">
                {activeTab === 'PROPERTIES' ? '1위 물건접수 경로' : '1위 고객유입 경로'}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg sm:text-xl font-black text-indigo-900 truncate">
                  {statsMatrix.topChannel ? statsMatrix.topChannel.channel : '데이터 없음'}
                </span>
                {statsMatrix.topChannel && (
                  <span className="text-xs text-indigo-700 font-bold">
                    ({statsMatrix.topChannel.percentage}%)
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-700 block">
                당월 ({new Date().getMonth() + 1}월) 신규 접수
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-emerald-900">{statsMatrix.currentMonthTotal}</span>
                <span className="text-xs text-emerald-700 font-semibold">
                  {activeTab === 'PROPERTIES' ? '건' : '명'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200">
              <span className="text-[11px] font-bold text-blue-700 block">
                {activeTab === 'PROPERTIES' ? '판매완료 / 완료율' : '계약완료 / 완료율'}
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-black text-blue-900">
                  {activeTab === 'PROPERTIES' 
                    ? (secondaryStats as any).contracted 
                    : (secondaryStats as any).completed}
                </span>
                <span className="text-xs font-bold text-blue-700">
                  ({activeTab === 'PROPERTIES' 
                    ? (secondaryStats as any).contractedRate 
                    : (secondaryStats as any).completedRate}%)
                </span>
              </div>
            </div>
          </div>

          {/* Main Matrix Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {selectedYear === 'ALL' ? '전체 기간' : `${selectedYear}년`} 월별 {activeTab === 'PROPERTIES' ? '물건 접수경로' : '고객 유입경로'} 집계 매트릭스
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">단위: 건</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="px-3 py-2.5 whitespace-nowrap sticky left-0 bg-slate-100 z-10 border-r border-slate-200 min-w-[110px]">
                      경로 구분
                    </th>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <th key={m} className="px-2 py-2.5 text-center whitespace-nowrap border-r border-slate-200 min-w-[38px]">
                        {m}월
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center whitespace-nowrap bg-indigo-50/70 text-indigo-900 border-r border-slate-200 font-black min-w-[60px]">
                      연간 합계
                    </th>
                    <th className="px-3 py-2.5 text-center whitespace-nowrap bg-blue-50/70 text-blue-900 font-black min-w-[60px]">
                      점유율
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {statsMatrix.rowStats.map((row) => {
                    const isTop = statsMatrix.topChannel?.channel === row.channel && row.total > 0;
                    return (
                      <tr 
                        key={row.channel} 
                        className={`hover:bg-slate-50/80 transition-colors ${isTop ? 'bg-indigo-50/20 font-semibold' : ''}`}
                      >
                        <td className="px-3 py-2 font-bold text-slate-800 whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-200 flex items-center gap-1.5">
                          {isTop && <span className="text-amber-500 text-[10px]">👑</span>}
                          <span>{row.channel}</span>
                        </td>
                        {row.monthly.map((cnt, idx) => (
                          <td 
                            key={idx} 
                            className={`px-2 py-2 text-center border-r border-slate-200 ${cnt > 0 ? 'font-bold text-slate-900 bg-blue-50/20' : 'text-slate-300'}`}
                          >
                            {cnt > 0 ? cnt : '-'}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-black text-indigo-950 bg-indigo-50/30 border-r border-slate-200">
                          {row.total}
                        </td>
                        <td className="px-3 py-2 text-center font-black text-blue-900 bg-blue-50/30">
                          {row.percentage}%
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Row */}
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                    <td className="px-3 py-2.5 sticky left-0 bg-slate-100 z-10 border-r border-slate-300">
                      월별 총계
                    </td>
                    {statsMatrix.monthTotals.map((tot, idx) => (
                      <td key={idx} className="px-2 py-2.5 text-center border-r border-slate-200 text-slate-900 font-extrabold">
                        {tot > 0 ? tot : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center text-indigo-950 bg-indigo-100/70 border-r border-slate-300 text-sm font-black">
                      {statsMatrix.grandTotal}
                    </td>
                    <td className="px-3 py-2.5 text-center text-blue-950 bg-blue-100/70 text-sm font-black">
                      100.0%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual Channel Share Breakdown Bars */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-indigo-600" />
                <span>경로별 점유율 및 유입 현황 그래프</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">상위 순위 기준</span>
            </div>

            <div className="space-y-2 pt-1">
              {statsMatrix.rowStats.filter((r) => r.total > 0).map((r) => (
                <div key={r.channel} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {r.channel}
                    </span>
                    <span className="text-slate-900 font-bold">
                      {r.total}건 ({r.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        activeTab === 'PROPERTIES' ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, r.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
              {statsMatrix.grandTotal === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">
                  선택하신 기간({selectedYear}년)에 등록된 데이터가 없습니다.
                </p>
              )}
            </div>
          </div>

          {/* Secondary Classification Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeTab === 'PROPERTIES' ? (
              <>
                {/* 매물 종류별 현황 */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>매물 종류별 접수 현황</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries((secondaryStats as any).typeCounts).map(([k, v]) => (
                      <div key={k} className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                        <span className="text-slate-600">{k}</span>
                        <span className="font-black text-slate-900">{Number(v)}건</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 거래 유형별 현황 */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                    <span>거래 유형별 접수 현황</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {Object.entries((secondaryStats as any).txCounts).map(([k, v]) => (
                      <div key={k} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                        <span className="text-[11px] text-slate-500 block">{k}</span>
                        <span className="font-black text-slate-900 text-sm mt-0.5 block">{Number(v)}건</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 고객 그룹별 현황 */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>의뢰 구분별 고객 현황</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries((secondaryStats as any).groupCounts).map(([k, v]) => (
                      <div key={k} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                        <span className="text-slate-600">{k}</span>
                        <span className="font-black text-blue-900 text-sm">{Number(v)}명</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 세부 상담 구분별 현황 */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-indigo-600" />
                    <span>세부 상담 구분별 현황</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {Object.entries((secondaryStats as any).subTypeCounts).map(([k, v]) => (
                      <div key={k} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-center">
                        <span className="text-[11px] text-slate-500 block truncate">{k}</span>
                        <span className="font-black text-slate-900 text-sm mt-0.5 block">{Number(v)}명</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs print:hidden">
          <span className="text-slate-500">
            ※ 실시간 등록된 매물 및 고객의 접수일자·접수경로를 기준으로 자동 집계됩니다.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-xs transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

