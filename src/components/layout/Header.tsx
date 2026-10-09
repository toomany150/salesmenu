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
  onOpenNewProperty?: () => void;
  onOpenNewCustomer?: () => void;
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
  const { currentUser, login, logout, loginAsDefaultAdmin } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Inline Agent Login form state
  const [agentId, setAgentId] = useState('');
  const [agentPassword, setAgentPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleLogout = async () => {
    if (confirm(`${currentUser?.name || '현재'} 계정에서 로그아웃하시겠습니까?`)) {
      await logout();
    }
  };

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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 sm:py-0 sm:h-16 gap-2 sm:gap-3">
          
          {/* 1. Logo & Office Brand + admin 버튼 (클릭 시 홈화면 이동) */}
          <div className="flex items-center justify-between sm:justify-start space-x-2.5 shrink-0">
            <button
              type="button"
              onClick={onGoHome}
              title="참좋은 공인중개사사무소 홈으로 이동"
              className="flex items-center space-x-2.5 text-left group cursor-pointer focus:outline-hidden"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-sm sm:text-base md:text-lg text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors whitespace-nowrap">
                참좋은 공인중개사사무소
              </span>
            </button>
            
            {/* admin 란 (관리자 접속 및 관리) */}
            <button
              type="button"
              onClick={onOpenAdminLogs}
              title="관리자(Admin) 접속 및 계정·보안로그 관리"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black bg-slate-900 hover:bg-indigo-600 text-white rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer border border-slate-800 shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
              <span>admin</span>
            </button>
          </div>

          {/* 2. 소공/대표 아이디/비밀번호 입력칸 & 로그인 세션 */}
          <div className="flex items-center justify-end flex-1 gap-2 flex-wrap sm:flex-nowrap">
            {!currentUser ? (
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <form onSubmit={handleAgentLogin} className="flex items-center gap-1.5 bg-slate-50/90 p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="relative">
                    <User className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={agentId}
                      onChange={(e) => {
                        setAgentId(e.target.value);
                        if (loginError) setLoginError('');
                      }}
                      placeholder="소공/대표 ID"
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

                {/* 원클릭 대표(기본값) 접속 버튼 */}
                <button
                  type="button"
                  onClick={loginAsDefaultAdmin}
                  title="개업공인중개사(대표) 기본 세션으로 바로 접속"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-purple-900 hover:text-white hover:bg-purple-700 bg-purple-100/90 border border-purple-300 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <span>👑 대표 기본 접속</span>
                </button>
              </div>
            ) : (
              /* 로그인 완료된 상태 */
              <div className="flex items-center gap-2 bg-slate-100/90 pl-3 pr-2 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <UserCircle2 className={`w-4 h-4 ${isAdmin ? 'text-purple-600' : 'text-blue-600'}`} />
                  <span className="font-extrabold text-slate-900">{currentUser.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isAdmin ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {isAdmin ? '👑 대표' : '👤 소공'}
                  </span>
                </div>

                {isAdmin && onOpenAdminLogs && (
                  <button
                    type="button"
                    onClick={onOpenAdminLogs}
                    title="접속 로그 및 중개사 계정 관리"
                    className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">관리</span>
                  </button>
                )}

                {/* 눈에 잘 띄는 선명한 로그아웃 버튼 */}
                <button
                  type="button"
                  onClick={handleLogout}
                  title="현재 계정에서 로그아웃"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer ml-0.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>로그아웃</span>
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
