// src/components/layout/Header.tsx
'use client';

import React from 'react';
import { 
  Building2, 
  Users, 
  PlusCircle, 
  ShieldCheck, 
  LogOut, 
  LogIn, 
  UserCircle2 
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

interface HeaderProps {
  propertyCount: number;
  receivedCustomerCount: number;
  searchingCustomerCount: number;
  onOpenNewProperty: () => void;
  onOpenNewCustomer: () => void;
  onOpenAdminLogs?: () => void;
  onOpenLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  propertyCount,
  receivedCustomerCount,
  searchingCustomerCount,
  onOpenNewProperty,
  onOpenNewCustomer,
  onOpenAdminLogs,
  onOpenLogin,
}) => {
  const { currentUser, logout } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

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
                <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                  참좋은 공인중개사사무소
                </span>
                <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  매물장 & CRM PRO
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                소속공인중개사별 권한 분리 · 접속 감사로그 추적 · 7대 매물 원스톱 중개지원
              </p>
            </div>
          </div>

          {/* Real-time Counts & Status */}
          <div className="hidden xl:flex items-center space-x-2 text-xs">
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

          {/* Action Buttons & User Profile */}
          <div className="flex items-center space-x-2">
            
            {/* User Session Info */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-100/90 pl-3 pr-1.5 py-1 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5">
                  <UserCircle2 className={`w-4 h-4 ${isAdmin ? 'text-purple-600' : 'text-blue-600'}`} />
                  <span className="font-extrabold text-slate-900">{currentUser.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {isAdmin ? '👑 대표' : '소공'}
                  </span>
                </div>

                {isAdmin && onOpenAdminLogs && (
                  <button
                    onClick={onOpenAdminLogs}
                    title="접속 로그 및 중개사 계정 관리"
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-2xs transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden md:inline">보안 관리</span>
                  </button>
                )}

                <button
                  onClick={logout}
                  title="로그아웃"
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-600" />
                <span>로그인</span>
              </button>
            )}

            {/* Quick Action Buttons */}
            <button
              onClick={onOpenNewProperty}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-sm shadow-blue-500/20 active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">새 매물 등록</span>
              <span className="sm:hidden">매물</span>
            </button>
            <button
              onClick={onOpenNewCustomer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">고객 등록</span>
              <span className="sm:hidden">고객</span>
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
