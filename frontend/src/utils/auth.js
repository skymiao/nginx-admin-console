import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      loadUserInfo();
    }
    setLoading(false);
  }, []);

  const loadUserInfo = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data;
      setUser(userData);
      setPermissions(userData.permissions || []);
    } catch (error) {
      console.error('Failed to load user info:', error);
      setUser({ username: 'admin', role: 'admin' });
      setPermissions([]);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
      setUser(user);
      setPermissions(user.permissions || []);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '登录失败',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    setPermissions([]);
  };

  const value = {
    isAuthenticated,
    user,
    permissions,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
