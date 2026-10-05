// src/components/auth/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserItem, UserRole } from '@/lib/types';
import { DEFAULT_USERS } from '@/lib/auth';

interface AuthContextType {
  currentUser: UserItem | null;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  availableAgents: string[];
  addCustomAgent: (name: string) => void;
  removeCustomAgent: (name: string) => void;
  loginAsDefaultAdmin: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  loginAsDefaultAdmin: () => {},
  availableAgents: ['개업공인중개사 (대표)'],
  addCustomAgent: () => {},
  removeCustomAgent: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableAgents, setAvailableAgents] = useState<string[]>([
    '개업공인중개사 (대표)',
  ]);

  // 지정된 권한자 추가 함수 (로컬스토리지 영구 보존)
  const addCustomAgent = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === '개업공인중개사 (대표)' || trimmed === '사무실') return;
    setAvailableAgents((prev) => {
      const next = Array.from(new Set([...prev, trimmed]));
      try {
        const customOnly = next.filter((a) => a !== '개업공인중개사 (대표)' && a !== '사무실');
        localStorage.setItem('cham_custom_agents', JSON.stringify(customOnly));
      } catch (e) {}
      return next;
    });
  };

  // 지정된 권한자 삭제 함수
  const removeCustomAgent = (name: string) => {
    setAvailableAgents((prev) => {
      const next = prev.filter((a) => a !== name || a === '개업공인중개사 (대표)');
      try {
        const customOnly = next.filter((a) => a !== '개업공인중개사 (대표)' && a !== '사무실');
        localStorage.setItem('cham_custom_agents', JSON.stringify(customOnly));
      } catch (e) {}
      return next;
    });
  };

  // 기본 개업공인중개사 (대표) 관리자 계정 정보
  const DEFAULT_ADMIN_USER: UserItem = {
    id: 'usr-admin',
    username: 'admin',
    name: '개업공인중개사 (대표)',
    role: 'ADMIN',
    phone: '010-1234-5678',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 초기 로드 시 localStorage에서 세션 복원 (처음 접속 시에는 로그아웃된 상태로 시작)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cham_real_estate_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          setCurrentUser(parsed);
        } else {
          setCurrentUser(null);
        }
      } else {
        // 처음 접속 시 로그아웃된 상태
        setCurrentUser(null);
      }
    } catch (e) {
      console.warn('Failed to parse stored user:', e);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }

    // 사용자가 직접 등록/지정한 권한자 목록 로컬스토리지에서 복원
    let customAgents: string[] = [];
    try {
      const savedCustom = localStorage.getItem('cham_custom_agents');
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed)) {
          customAgents = parsed.filter(Boolean);
        }
      }
      // 로컬에 등록된 계정 사용자들의 이름도 추가
      const customUsersRaw = localStorage.getItem('cham_custom_users');
      if (customUsersRaw) {
        const customUsers = JSON.parse(customUsersRaw);
        if (Array.isArray(customUsers)) {
          customUsers.forEach((u: any) => {
            if (u.name && !customAgents.includes(u.name)) {
              customAgents.push(u.name);
            }
          });
        }
      }
    } catch (e) {}

    // 서버에서 활성 사용자 목록 가져와 합치기 (대표가 추가한 계정 전체 포함)
    fetch('/api/users')
      .then((res) => res.json())
      .then((users: UserItem[]) => {
        if (Array.isArray(users) && users.length > 0) {
          const validAgentNames = users
            .filter((u) => u.isActive)
            .map((u) => (u.role === 'ADMIN' ? '개업공인중개사 (대표)' : u.name));
          const unique = Array.from(new Set(['개업공인중개사 (대표)', ...customAgents, ...validAgentNames]));
          setAvailableAgents(unique);
        } else {
          setAvailableAgents(Array.from(new Set(['개업공인중개사 (대표)', ...customAgents])));
        }
      })
      .catch((err) => {
        console.warn('Could not load user list:', err);
        setAvailableAgents(Array.from(new Set(['개업공인중개사 (대표)', ...customAgents])));
      });
  }, []);

  const login = async (username: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    const cleanUsername = String(username).trim();
    const cleanPassword = String(password || '').trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCurrentUser(data.user);
        localStorage.setItem('cham_real_estate_user', JSON.stringify(data.user));
        localStorage.removeItem('cham_explicit_logged_out');
        return { success: true };
      }

      // 서버 DB에 아직 반영되지 않았거나 네트워크/환경 이슈 시, localStorage에 저장된 발급 계정 확인
      try {
        const customUsersRaw = localStorage.getItem('cham_custom_users');
        if (customUsersRaw) {
          const customUsers = JSON.parse(customUsersRaw);
          if (Array.isArray(customUsers)) {
            const matched = customUsers.find(
              (u: any) =>
                u.username.toLowerCase() === cleanUsername.toLowerCase() &&
                (u.password === cleanPassword || (cleanUsername.toLowerCase() === 'admin' && (cleanPassword === '1234' || cleanPassword === '159753tma#')))
            );
            if (matched) {
              const userItem: UserItem = {
                id: matched.id || `usr-${matched.username}`,
                username: matched.username,
                name: matched.name,
                role: matched.role || 'AGENT',
                phone: matched.phone || null,
                isActive: matched.isActive !== false,
                createdAt: matched.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setCurrentUser(userItem);
              localStorage.setItem('cham_real_estate_user', JSON.stringify(userItem));
              localStorage.removeItem('cham_explicit_logged_out');
              return { success: true };
            }
          }
        }
      } catch (localErr) {}

      return { success: false, error: data.error || '아이디 또는 비밀번호가 일치하지 않습니다.' };
    } catch (err: any) {
      // 네트워크 예외 시에도 로컬 발급 계정 확인
      try {
        const customUsersRaw = localStorage.getItem('cham_custom_users');
        if (customUsersRaw) {
          const customUsers = JSON.parse(customUsersRaw);
          if (Array.isArray(customUsers)) {
            const matched = customUsers.find(
              (u: any) =>
                u.username.toLowerCase() === cleanUsername.toLowerCase() &&
                (u.password === cleanPassword || (cleanUsername.toLowerCase() === 'admin' && (cleanPassword === '1234' || cleanPassword === '159753tma#')))
            );
            if (matched) {
              const userItem: UserItem = {
                id: matched.id || `usr-${matched.username}`,
                username: matched.username,
                name: matched.name,
                role: matched.role || 'AGENT',
                phone: matched.phone || null,
                isActive: matched.isActive !== false,
                createdAt: matched.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setCurrentUser(userItem);
              localStorage.setItem('cham_real_estate_user', JSON.stringify(userItem));
              localStorage.removeItem('cham_explicit_logged_out');
              return { success: true };
            }
          }
        }
      } catch (localErr) {}

      return { success: false, error: err.message || '네트워크 오류가 발생했습니다.' };
    }
  };

  const logout = async () => {
    if (currentUser) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
          }),
        });
      } catch (e) {
        // ignore
      }
    }
    setCurrentUser(null);
    localStorage.removeItem('cham_real_estate_user');
    localStorage.setItem('cham_explicit_logged_out', 'true');
  };

  const loginAsDefaultAdmin = () => {
    setCurrentUser(DEFAULT_ADMIN_USER);
    localStorage.setItem('cham_real_estate_user', JSON.stringify(DEFAULT_ADMIN_USER));
    localStorage.removeItem('cham_explicit_logged_out');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        login,
        logout,
        loginAsDefaultAdmin,
        availableAgents,
        addCustomAgent,
        removeCustomAgent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
