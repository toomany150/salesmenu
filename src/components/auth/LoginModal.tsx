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
  Users,
  Key,
  CheckCircle2,
  X
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
  const [tab, setTab] = useState<'LOGIN' | 'CHANGE_PASSWORD'>('LOGIN');

  // Login form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState(''); // 비밀번호 자동 입력 방지
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Change password state
  const [cpUsername, setCpUsername] = useState('admin');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cpLoading, setCpLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await login(username.trim(), password.trim());
    setLoading(false);

    if (result.success) {
      if (onClose) onClose();
    } else {
      setErrorMsg(result.error || '아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const handleSelectQuickAccount = (uname: string) => {
    setUsername(uname);
    setCpUsername(uname);
    // 비밀번호는 자동으로 채우지 않고 사용자가 직접 입력하도록 비움
    setPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!cpUsername.trim() || !currentPassword.trim() || !newPassword.trim()) {
      setErrorMsg('모든 항목을 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMsg('새 비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    setCpLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cpUsername.trim(),
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '비밀번호 변경에 실패했습니다.');
      }

      setSuccessMsg(data.message || '비밀번호가 성공적으로 변경되었습니다. 변경된 비밀번호로 로그인하세요.');
      setUsername(cpUsername);
      setPassword(newPassword);
      setTab('LOGIN');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || '비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setCpLoading(false);
    }
  };

  const isAdminInitialPassword = username === 'admin' && password === '159753tma#';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200/80 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-6 sm:p-7 text-white relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
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
            {canClose && onClose && (
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
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

        {/* Tab switcher: 로그인 vs 비밀번호 변경 */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setTab('LOGIN');
              setErrorMsg(null);
            }}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              tab === 'LOGIN'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>시스템 로그인</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('CHANGE_PASSWORD');
              setCpUsername(username || 'admin');
              if (password === '159753tma#') {
                setCurrentPassword('159753tma#');
              }
              setErrorMsg(null);
            }}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              tab === 'CHANGE_PASSWORD'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>비밀번호 변경</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-semibold">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-semibold">{successMsg}</div>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {tab === 'LOGIN' && (
            <>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                      비밀번호
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setTab('CHANGE_PASSWORD');
                        setCpUsername(username);
                        if (password === '159753tma#') setCurrentPassword('159753tma#');
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      비밀번호 변경하기 →
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={username === 'admin' ? '초기 비밀번호: 159753tma#' : '비밀번호를 입력하세요'}
                    required
                    className="w-full text-sm font-medium px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden transition-all"
                  />
                  {username === 'admin' && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      ※ 대표 관리자 초기 비밀번호는 <code className="bg-slate-100 text-blue-700 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200">159753tma#</code> 입니다.
                    </p>
                  )}
                </div>

                {/* Initial password notice & change prompt */}
                {isAdminInitialPassword && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <span>🔑</span>
                      <span>대표 관리자 초기 비밀번호가 입력되었습니다.</span>
                    </div>
                    <p className="text-amber-800 text-[11px]">
                      보안을 위해 로그인 후 또는 지금 바로 상단의 <strong>[비밀번호 변경]</strong> 탭에서 원하시는 안전한 비밀번호로 변경하실 수 있습니다.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setTab('CHANGE_PASSWORD');
                        setCpUsername('admin');
                        setCurrentPassword('159753tma#');
                      }}
                      className="text-xs font-extrabold text-blue-700 hover:text-blue-900 underline block"
                    >
                      지금 바로 비밀번호 변경하기 →
                    </button>
                  </div>
                )}

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
                    빠른 계정 선택
                  </span>
                  <span className="text-[11px] text-slate-400">비밀번호는 직접 입력</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEFAULT_USERS.map((u) => {
                    const isAdmin = u.role === 'ADMIN';
                    const isSelected = username === u.username;

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectQuickAccount(u.username)}
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
            </>
          )}

          {/* TAB 2: CHANGE PASSWORD */}
          {tab === 'CHANGE_PASSWORD' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-indigo-600" />
                  비밀번호 변경 안내
                </p>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  대표 관리자 초기 비밀번호(<code className="font-mono font-bold text-blue-700 bg-white px-1 rounded">159753tma#</code>) 또는 소속공인중개사의 현재 비밀번호를 입력하여 새 비밀번호로 안전하게 변경합니다.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  아이디 (ID) *
                </label>
                <input
                  type="text"
                  value={cpUsername}
                  onChange={(e) => setCpUsername(e.target.value)}
                  placeholder="예: admin"
                  required
                  className="w-full text-sm font-medium px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  현재 비밀번호 *
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호 (초기: 159753tma#)"
                  required
                  className="w-full text-sm font-medium px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  변경할 새 비밀번호 *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 입력 (4자 이상)"
                  required
                  className="w-full text-sm font-medium px-4 py-2.5 bg-white border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  새 비밀번호 확인 *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호 재입력"
                  required
                  className="w-full text-sm font-medium px-4 py-2.5 bg-white border border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTab('LOGIN')}
                  className="w-1/3 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  취소 (로그인 탭)
                </button>
                <button
                  type="submit"
                  disabled={cpLoading}
                  className="w-2/3 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{cpLoading ? '변경 처리 중...' : '비밀번호 변경 완료'}</span>
                </button>
              </div>
            </form>
          )}

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
