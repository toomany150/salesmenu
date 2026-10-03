'use client';

import React from 'react';
import { 
  Building2, 
  Users, 
  PlusCircle 
} from 'lucide-react';

interface HeaderProps {
  propertyCount: number;
  receivedCustomerCount: number;
  searchingCustomerCount: number;
  onOpenNewProperty: () => void;
  onOpenNewCustomer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  propertyCount,
  receivedCustomerCount,
  searchingCustomerCount,
  onOpenNewProperty,
  onOpenNewCustomer,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Office Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">
                  스마트 매물장 <span className="text-blue-600 font-extrabold">&</span> CRM
                </span>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  개업공인중개사용 PRO
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                매물 접수부터 고객 매칭, 공공대장 연동, 필수 체크리스트까지 원스톱 운영
              </p>
            </div>
          </div>

          {/* Real-time Counts & Status */}
          <div className="hidden lg:flex items-center space-x-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-600 font-medium">관리 매물:</span>
              <span className="font-bold text-slate-900 text-sm">{propertyCount}건</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50/70 border border-blue-200/70">
              <span className="text-blue-700 font-medium">[접수] 매도·임대:</span>
              <span className="font-bold text-blue-900 text-sm">{receivedCustomerCount}명</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50/70 border border-indigo-200/70">
              <span className="text-indigo-700 font-medium">[찾음] 매수·임차:</span>
              <span className="font-bold text-indigo-900 text-sm">{searchingCustomerCount}명</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenNewProperty}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-sm shadow-blue-500/20 active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>새 매물 등록</span>
            </button>
            <button
              onClick={onOpenNewCustomer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>고객 등록</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
