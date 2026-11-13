'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useTransition,
} from 'react';
import { apiFetch, ApiError } from './api-client';
import type { CurrentUserProfile, TenantMembership, UserProfile } from './types';

interface AuthContextType {
  user: UserProfile | null;
  activeTenant: { id: string; name: string; slug: string } | null;
  memberships: TenantMembership[];
  permissions: string[];
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTenant, setActiveTenant] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [, startTransition] = useTransition();

  const refreshUser = useCallback(async () => {
    setRefreshIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadUser() {
      try {
        const data = await apiFetch<CurrentUserProfile>('/auth/me');
        if (!ignore) {
          startTransition(() => {
            setUser(data.user);
            setActiveTenant(data.activeTenant);
            setMemberships(data.memberships);
            setPermissions(data.permissions);
            setError(null);
          });
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof ApiError && (err.statusCode === 401 || err.statusCode === 403)) {
            setUser(null);
            setActiveTenant(null);
            setMemberships([]);
            setPermissions([]);
          } else {
            const msg = err instanceof Error ? err.message : 'Không thể tải thông tin người dùng';
            setError(msg);
          }
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadUser();
    return () => {
      ignore = true;
    };
  }, [refreshIndex]);

  const switchTenant = useCallback(async (tenantId: string) => {
    try {
      setIsLoading(true);
      const data = await apiFetch<CurrentUserProfile>('/auth/active-tenant', {
        method: 'POST',
        body: JSON.stringify({ tenantId }),
      });
      setUser(data.user);
      setActiveTenant(data.activeTenant);
      setMemberships(data.memberships);
      setPermissions(data.permissions);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể chuyển đổi không gian làm việc';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async () => {
    try {
      const data = await apiFetch<{ authorizationUrl: string }>('/auth/login');
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khởi tạo đăng nhập';
      setError(msg);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch<{ message: string }>('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setActiveTenant(null);
      setMemberships([]);
      setPermissions([]);
      window.location.href = '/login';
    }
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await apiFetch<{ message: string }>('/auth/logout-all', { method: 'POST' });
    } finally {
      setUser(null);
      setActiveTenant(null);
      setMemberships([]);
      setPermissions([]);
      window.location.href = '/login';
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        activeTenant,
        memberships,
        permissions,
        isLoading,
        error,
        refreshUser,
        switchTenant,
        login,
        logout,
        logoutAll,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
}
