// src/components/auth/LoginModal.tsx
'use client';

import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  KeyRound, 
  ShieldCheck, 
  Building2, 
  ArrowRight,
  AlertCircle,
  Users
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { DEFAULT_USERS } from '@/lib/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canClose?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ 
  isOpen, 
  onClose,
  canClose = false 
}) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const result = await login(username.trim(), password.trim());
    setLoading(false);

    if (result.success) {
      if (onClose) onClose();
    } else {
      setErrorMsg(result.error || '아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const handleSelectQuickAccount = (uname: string, pw: string) => {
    setUsername(uname);
    setPassword(pw);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200/80 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-7 text-white relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-blue-600/30 border border-blue-400/40 text-blue-300 shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                참좋은 공인중개사사무소
              </span>
              <h2 className="text-xl font-black tracking-tight text-white">
                스마트 매물장 & CRM 인트라넷
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300/90 leading-relaxed mt-2">
            지정된 소속공인중개사 및 대표 관리자만 접근할 수 있는 보안 시스템입니다. 개별 계정으로 로그인하여 업무를 시작하세요.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              접속 로그 실시간 추적 중
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Lock className="w-3.5 h-3.5" />
              고객 연락처 권한 보안 적용
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-semibold">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" />
                아이디 (ID)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="지정된 아이디 입력 (예: admin, agent1 등)"
                required
                className="w-full text-sm font-medium px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
                className="w-full text-sm font-medium px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <span>{loading ? '인증 및 접속 처리 중...' : '시스템 로그인'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switcher Buttons */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                빠른 계정 선택 (테스트 및 권한 체험)
              </span>
              <span className="text-[11px] text-slate-400">클릭 시 자동 입력</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEFAULT_USERS.map((u) => {
                const isAdmin = u.role === 'ADMIN';
                const isSelected = username === u.username;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectQuickAccount(u.username, u.password)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-2xs'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        isAdmin 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isAdmin ? '👑 대표/관리자' : '👤 소공'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{u.username}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {u.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {canClose && onClose && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                닫기
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
