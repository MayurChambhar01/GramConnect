import { createContext, useContext, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gs_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (identifier, password, village, role) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { identifier, password, village, role });
      localStorage.setItem('gs_token', data.token);
      localStorage.setItem('gs_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally { setLoading(false); }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      localStorage.setItem('gs_token', data.token);
      localStorage.setItem('gs_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    } finally { setLoading(false); }
  };

  // updateUser — call after profile save so UI refreshes immediately
  const updateUser = (updates) => {
    const merged = { ...user, ...updates };
    localStorage.setItem('gs_user', JSON.stringify(merged));
    setUser(merged);
  };

  const logout = () => {
    localStorage.removeItem('gs_token');
    localStorage.removeItem('gs_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
