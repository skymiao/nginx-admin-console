import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, theme, Button, Avatar, Dropdown, Badge, Tooltip } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  SafetyOutlined,
  SettingOutlined,
  CloudServerOutlined,
  SunOutlined,
  MoonOutlined,
  BellOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useAuth } from '../utils/auth';

const { Header, Sider, Content } = AntLayout;

const Layout = ({ isDarkMode, setIsDarkMode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, permissions } = useAuth();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const allMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
      requiredPermission: null,
    },
    {
      type: 'divider',
    },
    {
      key: '/configs',
      icon: <FileTextOutlined />,
      label: '配置文件',
      requiredPermission: 'config:read',
    },
    {
      key: '/upstreams',
      icon: <CloudServerOutlined />,
      label: 'Upstream 管理',
      requiredPermission: 'upstream:read',
    },
    {
      key: '/servers',
      icon: <CloudServerOutlined />,
      label: '服务器管理',
      requiredPermission: 'server:read',
    },
    {
      key: '/stats',
      icon: <ThunderboltOutlined />,
      label: '性能统计',
      requiredPermission: 'stats:read',
    },
    {
      key: '/logs',
      icon: <UnorderedListOutlined />,
      label: '日志查看',
      requiredPermission: 'log:read',
    },
    {
      key: '/log-statistics',
      icon: <BarChartOutlined />,
      label: '日志统计',
      requiredPermission: 'log:statistics',
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: '历史记录',
      requiredPermission: 'history:read',
    },
    {
      type: 'divider',
    },
    {
      key: '/users',
      icon: <TeamOutlined />,
      label: '用户管理',
      requiredPermission: 'user:manage',
    },
    {
      key: '/roles',
      icon: <SafetyOutlined />,
      label: '角色管理',
      requiredPermission: 'role:manage',
    },
    {
      type: 'divider',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      requiredPermission: 'system:manage',
    },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.type === 'divider') return true;
    if (!item.requiredPermission) return true;
    return permissions.includes(item.requiredPermission);
  });

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }} className="app-layout">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="app-sider"
        width={240}
        style={{
          background: isDarkMode ? '#0F172A' : '#1E293B',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000,
        }}
      >
        <div className="logo-container" style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 18 : 22,
          fontWeight: 700,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        onClick={() => navigate('/dashboard')}
        >
          {collapsed ? (
            <span style={{ fontSize: 24, fontWeight: 800 }}>N</span>
          ) : (
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              fontSize: 20,
              fontWeight: 700 
            }}>
              <span style={{ fontSize: 24 }}>⚡</span>
              Nginx Admin
            </span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
            border: 'none',
            marginTop: 16,
          }}
          className="app-menu"
        />
      </Sider>
      <AntLayout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s ease' }}>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64,
            borderBottom: '1px solid #E2E8F0',
            position: 'sticky',
            top: 0,
            zIndex: 999,
          }}
          className="app-header"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '18px',
                width: 48,
                height: 48,
                borderRadius: '8px',
                transition: 'all 0.2s ease',
              }}
              className="menu-toggle-btn"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Tooltip title="切换主题">
              <Button
                type="text"
                icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                onClick={() => setIsDarkMode(!isDarkMode)}
                style={{
                  fontSize: '18px',
                  width: 40,
                  height: 40,
                  borderRadius: '8px',
                  color: isDarkMode ? '#FBBF24' : '#64748B',
                }}
                className="theme-toggle-btn"
              />
            </Tooltip>
            <Tooltip title="通知">
              <Badge count={0} showZero={false}>
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  style={{
                    fontSize: '18px',
                    width: 40,
                    height: 40,
                    borderRadius: '8px',
                    color: '#64748B',
                  }}
                />
              </Badge>
            </Tooltip>
            <Dropdown 
              menu={{ items: userMenuItems }} 
              placement="bottomRight"
              trigger={['click']}
              overlayClassName="user-dropdown-menu"
            >
              <div 
                style={{ 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  border: '1px solid transparent',
                  minWidth: 'fit-content',
                }}
                className="user-dropdown"
              >
                <Avatar 
                  icon={<UserOutlined />} 
                  size={32}
                  style={{ 
                    backgroundColor: '#3B82F6',
                    border: '2px solid #E2E8F0',
                    flexShrink: 0,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.3, minWidth: 0 }}>
                  <span style={{ 
                    fontWeight: 600, 
                    color: '#1E293B',
                    fontSize: 14,
                    whiteSpace: 'nowrap',
                  }}>
                    {user?.username || 'Admin'}
                  </span>
                  <span style={{ 
                    fontSize: 12, 
                    color: '#64748B',
                    whiteSpace: 'nowrap',
                  }}>
                    {user?.role || 'admin'}
                  </span>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: 0,
            minHeight: 'calc(100vh - 112px)',
            background: 'transparent',
          }}
          className="app-content"
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;