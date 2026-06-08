import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('expense_categories');
    localStorage.removeItem('income_sources');
    localStorage.removeItem('app_tags');
    localStorage.removeItem('app_object_groups');
    setUser(null);
  }, []);

  // Listen for forced logout from axios 401 interceptor
  useEffect(() => {
    const handleForceLogout = () => logout();
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, [logout]);

  const restoreSession = useCallback(async () => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      const profile = await authApi.getProfile();
      setUser(profile);
    } catch {
      // Access token expired — try refreshing
      if (refreshToken) {
        try {
          const data = await authApi.refresh(refreshToken);
          if (data?.access_token) {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            const profile = await authApi.getProfile();
            setUser(profile);
          }
        } catch {
          logout();
        }
      } else {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    if (!data?.access_token) throw new Error('Phản hồi đăng nhập không hợp lệ.');
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user_id', String(data.user_id));
    const profile = await authApi.getProfile();
    setUser(profile);
    return profile;
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    if (!data?.access_token) throw new Error('Phản hồi đăng ký không hợp lệ.');
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user_id', String(data.user_id));
    const profile = await authApi.getProfile();
    setUser(profile);
    return profile;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
