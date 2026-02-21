import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './utils/auth';
import { lightTheme, darkTheme } from './theme';
import './styles/global.css';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ConfigFiles = lazy(() => import('./pages/ConfigFiles'));
const Logs = lazy(() => import('./pages/Logs'));
const LogStatistics = lazy(() => import('./pages/LogStatistics'));
const History = lazy(() => import('./pages/History'));
const Users = lazy(() => import('./pages/Users'));
const Roles = lazy(() => import('./pages/Roles'));
const Settings = lazy(() => import('./pages/Settings'));
const Upstreams = lazy(() => import('./pages/Upstreams'));
const Servers = lazy(() => import('./pages/Servers'));
const Stats = lazy(() => import('./pages/Stats'));
const Profile = lazy(() => import('./pages/Profile'));

const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
);

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
      <ConfigProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
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
              <Route path="stats" element={<Stats />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </Suspense>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;
