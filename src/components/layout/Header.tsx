// src/components/layout/Header.tsx
'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  PlusCircle, 
  ShieldCheck, 
  LogOut, 
  UserCircle2,
  Lock,
  User,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

interface HeaderProps {
  propertyCount?: number;
  receivedCustomerCount?: number;
  searchingCustomerCount?: number;
  onOpenNewProperty: () => void;
  onOpenNewCustomer: () => void;
  onOpenAdminLogs?: () => void;
  onOpenLogin?: () => void;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewProperty,
  onOpenNewCustomer,
  onOpenAdminLogs,
  onGoHome,
}) => {
  const { currentUser, login, logout } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Inline Agent Login form state
  const [agentId, setAgentId] = useState('');
  const [agentPassword, setAgentPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleAgentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId.trim() || !agentPassword.trim()) {
      setLoginError('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await login(agentId.trim(), agentPassword.trim());
      if (res.success) {
        setAgentId('');
        setAgentPassword('');
        setLoginError('');
      } else {
        setLoginError(res.error || '로그인 실패');
      }
    } catch (err: any) {
      setLoginError(err.message || '오류 발생');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* 1. Logo & Office Brand + admin 버튼 (클릭 시 홈화면 이동) */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              type="button"
              onClick={onGoHome}
              title="참좋은 공인중개사사무소 홈으로 이동"
              className="flex items-center space-x-3 text-left group cursor-pointer focus:outline-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                참좋은 공인중개사사무소
              </span>
            </button>
            
            {/* admin 란 (관리자 접속 및 관리) */}
            <button
              type="button"
              onClick={onOpenAdminLogs}
              title="관리자(Admin) 접속 및 계정·보안로그 관리 (초기비번: 1234)"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black bg-slate-900 hover:bg-indigo-600 text-white rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer border border-slate-800"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
              <span>admin</span>
            </button>
          </div>

          {/* 2. 소공(소속공인중개사) 아이디/비밀번호 입력칸 & 로그인 세션 */}
          <div className="flex items-center justify-end flex-1 gap-2 flex-wrap sm:flex-nowrap">
            {!currentUser ? (
              <form onSubmit={handleAgentLogin} className="flex items-center gap-1.5 bg-slate-50/90 p-1 rounded-xl border border-slate-200">
                <div className="relative">
                  <User className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={agentId}
                    onChange={(e) => {
                      setAgentId(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="소공 아이디"
                    className="w-24 sm:w-28 pl-6 pr-2 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-900 placeholder:text-slate-400"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={agentPassword}
                    onChange={(e) => {
                      setAgentPassword(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="비밀번호"
                    className="w-20 sm:w-24 pl-6 pr-2 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-900 placeholder:text-slate-400"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-2xs shrink-0 cursor-pointer"
                >
                  {isLoggingIn ? '접속중' : '로그인'}
                </button>

                {loginError && (
                  <span 
                    title={loginError}
                    className="flex items-center gap-0.5 text-[11px] font-bold text-rose-600 px-1 shrink-0"
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span className="hidden md:inline">{loginError}</span>
                  </span>
                )}
              </form>
            ) : (
              /* 로그인 완료된 상태 */
              <div className="flex items-center gap-2 bg-slate-100/90 pl-3 pr-1.5 py-1 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5">
                  <UserCircle2 className={`w-4 h-4 ${isAdmin ? 'text-purple-600' : 'text-blue-600'}`} />
                  <span className="font-extrabold text-slate-900">{currentUser.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {isAdmin ? '👑 대표' : '👤 소공'}
                  </span>
                </div>

                {isAdmin && onOpenAdminLogs && (
                  <button
                    onClick={onOpenAdminLogs}
                    title="접속 로그 및 중개사 계정 관리"
                    className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-2xs transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden md:inline">관리</span>
                  </button>
                )}

                <button
                  onClick={logout}
                  title="로그아웃"
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Action Buttons (새 매물 등록, 고객 등록) */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                onClick={onOpenNewProperty}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">새 매물 등록</span>
                <span className="sm:hidden">매물</span>
              </button>
              <button
                onClick={onOpenNewCustomer}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-2xs cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">고객 등록</span>
                <span className="sm:hidden">고객</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
