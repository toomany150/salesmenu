// src/components/auth/AdminLogModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  History, 
  Users, 
  UserPlus, 
  RotateCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Lock,
  Trash2,
  FileText,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { AccessLogItem, UserItem } from '@/lib/types';
import { useAuth } from './AuthContext';

interface AdminLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLogModal: React.FC<AdminLogModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, login, addCustomAgent } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'LOGS' | 'USERS' | 'PASSWORD'>('LOGS');

  // Admin Login Gateway State (for non-admin users)
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Users state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('1234');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'AGENT' | 'ADMIN'>('AGENT');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userMsg, setUserMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchLogs();
      fetchUsers();
    }
  }, [isOpen, isAdmin]);

  const handleAdminGateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError('');
    setIsAdminLoggingIn(true);

    try {
      const res = await login('admin', adminPasswordInput);
      if (res.success) {
        setAdminPasswordInput('');
        fetchLogs();
        fetchUsers();
      } else {
        setAdminLoginError(res.error || '관리자 비밀번호가 일치하지 않습니다.');
      }
    } catch (err: any) {
      setAdminLoginError(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/logs?limit=100');
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Error fetching logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      setUserMsg({ type: 'error', text: '아이디, 비밀번호, 실명을 모두 입력해주세요.' });
      return;
    }

    setIsCreatingUser(true);
    setUserMsg(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': 'ADMIN',
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          name: newName.trim(),
          phone: newPhone.trim(),
          role: newRole,
          adminUser: currentUser || { id: 'usr-admin', name: '개업공인중개사 (대표)', role: 'ADMIN' },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '계정 생성에 실패했습니다.');
      }

      // 새 권한자 목록에도 자동 반영
      if (newName.trim()) {
        addCustomAgent(newName.trim());
      }

      setUserMsg({ type: 'success', text: `[${newName}] 소공 계정이 성공적으로 발급되었습니다!` });
      setNewUsername('');
      setNewPassword('1234');
      setNewName('');
      setNewPhone('');
      fetchUsers();
    } catch (err: any) {
      setUserMsg({ type: 'error', text: err.message || '계정 생성 중 오류가 발생했습니다.' });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userToDelete: UserItem) => {
    if (!confirm(`'${userToDelete.name} (${userToDelete.username})' 계정을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users?id=${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': 'ADMIN',
        },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '계정 삭제에 실패했습니다.');
        return;
      }
      fetchUsers();
    } catch (err) {
      alert('계정 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: '현재 비밀번호를 입력해주세요.' });
      return;
    }
    if (!newPasswordVal) {
      setPasswordMsg({ type: 'error', text: '새 비밀번호를 입력해주세요.' });
      return;
    }
    if (newPasswordVal !== confirmPasswordVal) {
      setPasswordMsg({ type: 'error', text: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.' });
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          oldPassword: currentPassword,
          newPassword: newPasswordVal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '비밀번호 변경에 실패했습니다.');
      }

      setPasswordMsg({ type: 'success', text: '관리자 비밀번호가 성공적으로 변경되었습니다.' });
      setCurrentPassword('');
      setNewPasswordVal('');
      setConfirmPasswordVal('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || '비밀번호 변경 중 오류가 발생했습니다.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (actionFilter === 'ALL') return true;
    return log.action === actionFilter;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-md">로그인</span>;
      case 'LOGIN_FAILED':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-800 rounded-md">로그인 실패</span>;
      case 'LOGOUT':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-800 rounded-md">로그아웃</span>;
      case 'CREATE_PROPERTY':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-800 rounded-md">매물 등록</span>;
      case 'UPDATE_PROPERTY':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-100 text-indigo-800 rounded-md">매물 수정</span>;
      case 'DELETE_PROPERTY':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-800 rounded-md">매물 삭제</span>;
      case 'CREATE_CUSTOMER':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-md">고객 등록</span>;
      case 'UPDATE_CUSTOMER':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-purple-100 text-purple-800 rounded-md">고객 수정</span>;
      case 'DELETE_CUSTOMER':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-800 rounded-md">고객 삭제</span>;
      case 'CREATE_USER':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-teal-100 text-teal-800 rounded-md">계정 생성</span>;
      case 'PASSWORD_CHANGED':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-violet-100 text-violet-800 rounded-md">비밀번호 변경</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-800 rounded-md">{action}</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  참좋은 공인중개사사무소 보안 관리자 콘솔
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-bold bg-purple-600/30 text-purple-300 rounded-full border border-purple-400/40">
                  admin 전용
                </span>
              </div>
              <p className="text-xs text-slate-300">
                소속공인중개사 계정 발급, 접속 감사로그 추적 및 관리자 보안 설정
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. If not authenticated as ADMIN: Show Admin Gate Login */}
        {!isAdmin ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-black text-slate-900">관리자(Admin) 전용 접속</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                대표 관리자 계정으로 접속하여 소공 계정 관리, 감사로그 열람 및 관리자 설정을 이용하실 수 있습니다.
              </p>
              <div className="inline-block mt-2 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-semibold">
                🔑 초기 비밀번호: <strong className="font-black text-blue-900">1234</strong> (접속 후 비밀번호 변경 가능)
              </div>
            </div>

            <form onSubmit={handleAdminGateLogin} className="w-full space-y-3">
              <div>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="관리자 비밀번호 입력"
                  className="w-full text-center px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  autoFocus
                  required
                />
              </div>

              {adminLoginError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{adminLoginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isAdminLoggingIn}
                className="w-full py-3 bg-slate-900 hover:bg-indigo-600 text-white text-sm font-extrabold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                {isAdminLoggingIn ? '접속 확인 중...' : '관리자 콘솔 접속하기'}
              </button>
            </form>
          </div>
        ) : (
          /* 2. When Authenticated as ADMIN */
          <>
            {/* Tab Selection */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-3 pt-3 flex-wrap">
              <button
                onClick={() => setActiveTab('LOGS')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'LOGS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <History className="w-4 h-4" />
                <span>접속 및 감사 로그 추적 ({logs.length}건)</span>
              </button>

              <button
                onClick={() => setActiveTab('USERS')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'USERS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>소속공인중개사 계정 관리 ({users.length}명)</span>
              </button>

              <button
                onClick={() => setActiveTab('PASSWORD')}
                className={`flex items-center gap-2 pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'PASSWORD'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>🔑 관리자 비밀번호 변경</span>
              </button>
            </div>

            {/* Tab 1: Access Logs */}
            {activeTab === 'LOGS' && (
              <div className="p-6 overflow-y-auto space-y-4 max-h-[calc(92vh-160px)]">
                {/* Control bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">작업 유형 필터:</span>
                    <select
                      value={actionFilter}
                      onChange={(e) => setActionFilter(e.target.value)}
                      className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">전체 작업 ({logs.length}건)</option>
                      <option value="LOGIN">로그인</option>
                      <option value="LOGIN_FAILED">로그인 실패</option>
                      <option value="CREATE_PROPERTY">매물 등록</option>
                      <option value="UPDATE_PROPERTY">매물 수정</option>
                      <option value="DELETE_PROPERTY">매물 삭제</option>
                      <option value="CREATE_CUSTOMER">고객 등록</option>
                      <option value="UPDATE_CUSTOMER">고객 수정</option>
                      <option value="DELETE_CUSTOMER">고객 삭제</option>
                      <option value="CREATE_USER">계정 생성</option>
                      <option value="PASSWORD_CHANGED">비밀번호 변경</option>
                    </select>
                  </div>

                  <button
                    onClick={fetchLogs}
                    disabled={loadingLogs}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                    <span>새로고침</span>
                  </button>
                </div>

                {/* Table of logs */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                  <table className="w-full text-xs text-left text-slate-600">
                    <thead className="bg-slate-50 text-slate-800 font-extrabold border-b border-slate-200 uppercase text-[11px]">
                      <tr>
                        <th className="px-4 py-3">일시</th>
                        <th className="px-4 py-3">작업자</th>
                        <th className="px-4 py-3">권한</th>
                        <th className="px-4 py-3">작업 구분</th>
                        <th className="px-4 py-3">상세 내용</th>
                        <th className="px-4 py-3">접속 IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLogs.length > 0 ? (
                        filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString('ko-KR')}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                              {log.userName}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                log.userRole === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {log.userRole === 'ADMIN' ? '관리자' : '소공'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {getActionBadge(log.action)}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-slate-800 max-w-md truncate">
                              {log.details || '-'}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                              {log.ipAddress || '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                            기록된 접속 및 작업 로그가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 2: Users Management */}
            {activeTab === 'USERS' && (
              <div className="p-6 overflow-y-auto space-y-6 max-h-[calc(92vh-160px)]">
                {/* User registration box */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-blue-600" />
                        신규 소속공인중개사 계정 발급
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        발급된 아이디와 비밀번호로 해당 중개사가 바로 로그인하여 매물과 고객을 등록·관리할 수 있습니다.
                      </p>
                    </div>
                  </div>

                  {userMsg && (
                    <div className={`p-3 rounded-xl text-xs font-bold ${
                      userMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                      {userMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        아이디 (ID) *
                      </label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="예: agent6"
                        required
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        초기 비밀번호 *
                      </label>
                      <input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="기본: 1234"
                        required
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        중개사 실명 *
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="예: 강소공 실장"
                        required
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        연락처
                      </label>
                      <input
                        type="text"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="010-0000-0000"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={isCreatingUser}
                        className="w-full py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{isCreatingUser ? '등록 중...' : '계정 발급하기'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Current Users List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-700" />
                    등록된 중개사 계정 목록 ({users.length}명)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {users.map((u) => {
                      const isUserAdmin = u.role === 'ADMIN';

                      return (
                        <div
                          key={u.id}
                          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-900">{u.name}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isUserAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {isUserAdmin ? '👑 대표/관리자' : '👤 소속공인중개사'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 font-mono mt-1">
                                아이디: <span className="font-bold text-slate-800">{u.username}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="활성 계정"></span>
                              {!isUserAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                  title="계정 삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>{u.phone || '연락처 미등록'}</span>
                            <span className="text-[11px] text-slate-400">
                              {isUserAdmin ? '전체 관리/수정 권한' : '소공 전용 권한'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* Tab 3: Password Change */}
            {activeTab === 'PASSWORD' && (
              <div className="p-6 sm:p-10 max-w-lg mx-auto space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto shadow-2xs">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900">관리자(Admin) 비밀번호 변경</h4>
                  <p className="text-xs text-slate-500">
                    관리자 계정(admin)의 비밀번호를 안전하게 변경합니다.
                    <br />
                    초기 비밀번호는 <strong className="font-bold text-slate-800">1234</strong> 입니다.
                  </p>
                </div>

                {passwordMsg && (
                  <div className={`p-3 rounded-xl text-xs font-bold text-center ${
                    passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {passwordMsg.text}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      현재 비밀번호 (초기: 1234) *
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="현재 관리자 비밀번호"
                      required
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      새 비밀번호 *
                    </label>
                    <input
                      type="password"
                      value={newPasswordVal}
                      onChange={(e) => setNewPasswordVal(e.target.value)}
                      placeholder="새로운 비밀번호 입력"
                      required
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      새 비밀번호 확인 *
                    </label>
                    <input
                      type="password"
                      value={confirmPasswordVal}
                      onChange={(e) => setConfirmPasswordVal(e.target.value)}
                      placeholder="새로운 비밀번호 재입력"
                      required
                      className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50"
                  >
                    {isChangingPassword ? '변경 저장 중...' : '비밀번호 변경 저장하기'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};
