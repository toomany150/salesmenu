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
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  availableAgents: [],
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableAgents, setAvailableAgents] = useState<string[]>([
    '김소공 실장',
    '이소공 실장',
    '박소공 실장',
    '최소공 실장',
    '정소공 실장',
  ]);

  // 초기 로드 시 localStorage에서 세션 복원 및 사용자 목록 조회
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cham_real_estate_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          setCurrentUser(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored user:', e);
    } finally {
      setIsLoading(false);
    }

    // 서버에서 에이전트 목록 가져오기
    fetch('/api/users')
      .then((res) => res.json())
      .then((users: UserItem[]) => {
        if (Array.isArray(users) && users.length > 0) {
          const agentNames = users
            .filter((u) => u.role === 'AGENT' && u.isActive)
            .map((u) => u.name);
          if (agentNames.length > 0) {
            setAvailableAgents(agentNames);
          }
        }
      })
      .catch((err) => console.warn('Could not load user list:', err));
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
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        login,
        logout,
        availableAgents,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
