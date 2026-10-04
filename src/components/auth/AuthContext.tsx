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

  // 초기 로드 시 localStorage에서 세션 복원 (없을 경우 개업공인중개사(대표)를 기본 세션으로 설정)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cham_real_estate_user');
      const isExplicitLoggedOut = localStorage.getItem('cham_explicit_logged_out');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          setCurrentUser(parsed);
        } else {
          setCurrentUser(DEFAULT_ADMIN_USER);
        }
      } else if (isExplicitLoggedOut === 'true') {
        setCurrentUser(null);
      } else {
        setCurrentUser(DEFAULT_ADMIN_USER);
      }
    } catch (e) {
      console.warn('Failed to parse stored user, fallback to default admin:', e);
      setCurrentUser(DEFAULT_ADMIN_USER);
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
    } catch (e) {}

    // 서버에서 활성 사용자 목록 가져와 합치기 (더미 실장 제외, 지정된 실제 유저만)
    fetch('/api/users')
      .then((res) => res.json())
      .then((users: UserItem[]) => {
        if (Array.isArray(users) && users.length > 0) {
          const validAgentNames = users
            .filter((u) => u.isActive)
            .map((u) => (u.role === 'ADMIN' ? '개업공인중개사 (대표)' : u.name))
            .filter((name) => !name.includes('소공 실장')); // 임의의 더미 실장 필터링
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
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || '로그인에 실패했습니다.' };
      }

      setCurrentUser(data.user);
      localStorage.setItem('cham_real_estate_user', JSON.stringify(data.user));
      localStorage.removeItem('cham_explicit_logged_out');
      return { success: true };
    } catch (err: any) {
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
