import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ConfigFiles from './pages/ConfigFiles';
import Logs from './pages/Logs';
import LogStatistics from './pages/LogStatistics';
import History from './pages/History';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Settings from './pages/Settings';
import Upstreams from './pages/Upstreams';
import Servers from './pages/Servers';
import Stats from './pages/Stats';
import LogFormats from './pages/LogFormats';
import Profile from './pages/Profile';
import Health from './pages/Health';
import { AuthProvider, useAuth } from './utils/auth';
import { lightTheme, darkTheme } from './theme';
import './styles/global.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <AuthProvider>
      <ConfigProvider
        theme={isDarkMode ? darkTheme : lightTheme}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/health" element={<Health />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="configs" element={<ConfigFiles />} />
            <Route path="logs" element={<Logs />} />
            <Route path="log-statistics" element={<LogStatistics />} />
            <Route path="history" element={<History />} />
            <Route path="users" element={<Users />} />
            <Route path="roles" element={<Roles />} />
            <Route path="settings" element={<Settings />} />
            <Route path="upstreams" element={<Upstreams />} />
            <Route path="servers" element={<Servers />} />
            <Route path="log-formats" element={<LogFormats />} />
            <Route path="stats" element={<Stats />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;
