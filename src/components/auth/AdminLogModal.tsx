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
  FileText
} from 'lucide-react';
import { AccessLogItem, UserItem } from '@/lib/types';
import { useAuth } from './AuthContext';

interface AdminLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLogModal: React.FC<AdminLogModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'LOGS' | 'USERS'>('LOGS');

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

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      fetchUsers();
    }
  }, [isOpen]);

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          name: newName.trim(),
          phone: newPhone.trim() || undefined,
          role: newRole,
          adminUser: currentUser,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '중개사 계정 등록에 실패했습니다.');
      }

      setUserMsg({ type: 'success', text: `[${newName}] 중개사 계정이 성공적으로 등록되었습니다!` });
      setNewUsername('');
      setNewName('');
      setNewPhone('');
      fetchUsers();
      fetchLogs();
    } catch (err: any) {
      setUserMsg({ type: 'error', text: err.message || '등록 중 오류가 발생했습니다.' });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (user.role === 'ADMIN') {
      alert('대표 관리자 계정은 삭제할 수 없습니다.');
      return;
    }
    if (!confirm(`정말로 "${user.name}" (${user.username}) 중개사 계정을 삭제하시겠습니까?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/users?id=${user.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser?.role || 'ADMIN',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '삭제 실패');
      alert(`[${user.name}] 중개사 계정이 삭제되었습니다.`);
      fetchUsers();
      fetchLogs();
    } catch (err: any) {
      alert(err.message || '계정 삭제 중 오류가 발생했습니다.');
    }
  };

  if (!isOpen) return null;

  const filteredLogs = logs.filter((l) => {
    if (actionFilter === 'ALL') return true;
    return l.action === actionFilter;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-md">로그인 성공</span>;
      case 'LOGIN_FAILED':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-800 rounded-md">로그인 실패</span>;
      case 'LOGOUT':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 rounded-md">로그아웃</span>;
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
      default:
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-800 rounded-md">{action}</span>;
    }
  };

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
                  대표/관리자 전용
                </span>
              </div>
              <p className="text-xs text-slate-300">
                접속 및 작업 감사 로그 실시간 추적 및 소속공인중개사 계정 관리
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

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-3 pt-3">
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-all ${
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
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'USERS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>소속공인중개사 계정 관리 ({users.length}명)</span>
          </button>
        </div>

        {/* Tab 1: Access Logs */}
        {activeTab === 'LOGS' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            
            {/* Filter & Refresh Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  작업 유형 필터:
                </span>
                {[
                  { id: 'ALL', label: '전체 로그' },
                  { id: 'LOGIN_SUCCESS', label: '로그인' },
                  { id: 'CREATE_PROPERTY', label: '매물등록' },
                  { id: 'UPDATE_PROPERTY', label: '매물수정' },
                  { id: 'DELETE_PROPERTY', label: '매물삭제' },
                  { id: 'CREATE_CUSTOMER', label: '고객등록' },
                  { id: 'DELETE_CUSTOMER', label: '고객삭제' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActionFilter(item.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      actionFilter === item.id
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs"
              >
                <RotateCw className={`w-3.5 h-3.5 text-blue-600 ${loadingLogs ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
            </div>

            {/* Logs Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">일시</th>
                      <th className="py-3 px-4">작업자 (실명 / 역할)</th>
                      <th className="py-3 px-4">작업 분류</th>
                      <th className="py-3 px-4">상세 내용</th>
                      <th className="py-3 px-4">접속 IP / 브라우저</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {new Date(log.createdAt).toLocaleString('ko-KR')}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-slate-900">{log.userName}</span>
                            <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              log.userRole === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {log.userRole === 'ADMIN' ? '대표/관리자' : '소공'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {getActionBadge(log.action)}
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {log.details || '-'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {log.ipAddress || '127.0.0.1'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          기록된 접속 및 작업 감사 로그가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Manage Agents */}
        {activeTab === 'USERS' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* New Agent Registration Form */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                신규 소속공인중개사 계정 발급
              </h4>

              {userMsg && (
                <div className={`p-3 rounded-xl mb-4 text-xs font-bold ${
                  userMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {userMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    비밀번호 *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="초기 비밀번호"
                    required
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    실명 (담당자명) *
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
                  const isAdmin = u.role === 'ADMIN';

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
                              isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isAdmin ? '👑 대표/관리자' : '👤 소속공인중개사'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-1">
                            아이디: <span className="font-bold text-slate-800">{u.username}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="활성 계정"></span>
                          {!isAdmin && (
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
                          {isAdmin ? '전체 수정/삭제 권한' : '작성/본인물건수정 권한'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
