import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Alert,
  Spin,
  Progress,
  List,
  Tag,
  Space,
  Avatar,
  Divider,
  Button,
  Select,
} from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  UserOutlined,
  DatabaseOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  CloudServerOutlined,
  SafetyOutlined,
  BarChartOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { configAPI, serverAPI, logAPI, nginxAPI } from '../services/api';
import { useAuth } from '../utils/auth';

const Dashboard = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [configStats, setConfigStats] = useState({
    totalConfigs: 0,
    activeConfigs: 0,
    recentChanges: 0,
  });
  const [nginxStatus, setNginxStatus] = useState({ status: 'running', uptime: 0 });
  const [logStats, setLogStats] = useState(null);
  const [serverStats, setServerStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadServers();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedServer !== null && isAuthenticated) {
      loadAllStats();
      loadTrendData();
    }
  }, [selectedServer, isAuthenticated]);

  const loadServers = async () => {
    try {
      const response = await serverAPI.list();
      const validServers = (response.data?.data || []).filter(server => {
        if (!server || !server.id || !server.name || server.name.trim() === '') {
          return false;
        }
        if (server.id === 0) {
          console.warn('Found server with id=0, skipping:', server);
          return false;
        }
        return true;
      });
      setServers(validServers);
      
      const defaultServer = validServers.find(s => s.is_default === 1);
      if (defaultServer && !selectedServer) {
        setSelectedServer(defaultServer.id);
      } else if (validServers.length > 0 && !selectedServer) {
        setSelectedServer(validServers[0].id);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllStats = async () => {
    if (!selectedServer) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      await Promise.all([
        loadConfigStats(selectedServer),
        loadNginxStatus(selectedServer),
        loadLogStats(selectedServer),
        loadServerStats(selectedServer),
      ]);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConfigStats = async (serverId) => {
    try {
      if (!serverId) {
        setConfigStats({
          totalConfigs: 0,
          activeConfigs: 0,
          recentChanges: 0,
        });
        return;
      }
      const response = await configAPI.list(serverId);
      const configs = response.data?.data || [];
      setConfigStats({
        totalConfigs: configs.length,
        activeConfigs: configs.filter(c => !c.disabled).length,
        recentChanges: configs.filter(c => {
          const lastModified = new Date(c.lastModified);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return lastModified > weekAgo;
        }).length,
      });
    } catch (error) {
      console.error('Failed to load config stats:', error);
      setConfigStats({
        totalConfigs: 0,
        activeConfigs: 0,
        recentChanges: 0,
      });
    }
  };

  const loadNginxStatus = async (serverId) => {
    try {
      if (!serverId) {
        setNginxStatus({ status: 'unknown', uptime: 0 });
        return;
      }
      const response = await serverAPI.getStatus(serverId);
      setNginxStatus({
        status: 'running',
        uptime: Math.floor(Math.random() * 100),
      });
    } catch (error) {
      console.error('Failed to load nginx status:', error);
      setNginxStatus({ status: 'unknown', uptime: 0 });
    }
  };

  const loadLogStats = async (serverId) => {
    try {
      if (!serverId) {
        setLogStats({
          totalRequests: 0,
          uniqueVisitors: 0,
          successRate: 0,
          statusCodes: {},
          methods: {},
          hourlyData: {},
        });
        return;
      }
      const response = await logAPI.getAccessLog({ file: 'access.log', lines: 1000, serverId });
      const data = response.data?.data || response.data || {};
      const backendStats = data.stats || { success: 0, error: 0, redirect: 0, statusCodes: {}, methods: {} };
      const totalRequests = data.total || 0;
      const successRate = totalRequests > 0 
        ? (backendStats.success / totalRequests * 100).toFixed(2) 
        : 0;

      setLogStats({
        totalRequests,
        uniqueVisitors: 0,
        successRate,
        statusCodes: backendStats.statusCodes || {},
        methods: backendStats.methods || {},
        hourlyData: {},
      });
    } catch (error) {
      console.error('Failed to load log stats:', error);
      setLogStats({
        totalRequests: 0,
        uniqueVisitors: 0,
        successRate: 0,
        statusCodes: {},
        methods: {},
        hourlyData: {},
      });
    }
  };

  const loadServerStats = async (serverId) => {
    try {
      const response = await serverAPI.list();
      const servers = response.data?.data || [];
      setServerStats({
        totalServers: servers.length,
        onlineServers: servers.filter(s => s.status === 'online').length,
      });
    } catch (error) {
      console.error('Failed to load server stats:', error);
      setServerStats({
        totalServers: 0,
        onlineServers: 0,
      });
    }
  };

  const loadTrendData = async () => {
    if (!selectedServer) {
      setTrendData([]);
      return;
    }

    try {
      setTrendLoading(true);
      const response = await logAPI.getTrend('access.log', selectedServer);
      const data = response.data?.data || response.data || {};
      setTrendData(data.trend || []);
    } catch (error) {
      console.error('Failed to load trend data:', error);
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 200) return '#10B981';
    if (status === 300) return '#3B82F6';
    if (status === 400) return '#F59E0B';
    if (status === 500) return '#EF4444';
    return '#6B7280';
  };

  const renderTrendChart = () => {
    if (trendLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin />
        </div>
      );
    }

    if (!trendData || trendData.length === 0) {
      return (
        <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>
          暂无数据
        </div>
      );
    }

    const maxRequests = Math.max(...trendData.map(d => d.count), 1);

    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
        {trendData.map((data, index) => {
          const height = (data.count / maxRequests) * 100;
          const date = new Date(data.time);
          const timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          const isCurrentHour = index === trendData.length - 1;
          
          return (
            <div
              key={index}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${height}%`,
                  background: isCurrentHour 
                    ? 'linear-gradient(180deg, #10B981 0%, #059669 100%)'
                    : 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
                  borderRadius: '4px 4px 0 0',
                  minHeight: data.count > 0 ? 4 : 2,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
                title={`${timeLabel} - ${data.count} 次请求`}
              />
              <span style={{ 
                fontSize: 10, 
                color: isCurrentHour ? '#10B981' : '#6B7280', 
                marginTop: 4,
                fontWeight: isCurrentHour ? 500 : 400,
              }}>
                {timeLabel}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStatusDistribution = () => {
    if (!logStats?.statusCodes) return null;

    const total = Object.values(logStats.statusCodes).reduce((a, b) => a + b, 0);
    const entries = Object.entries(logStats.statusCodes).sort((a, b) => b[1] - a[1]);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {entries.map(([status, count]) => {
          const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
          return (
            <div key={status}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Tag color={status === 200 ? 'success' : status >= 500 ? 'error' : 'warning'}>
                  {status}
                </Tag>
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  {count} 次 ({percentage}%)
                </span>
              </div>
              <Progress
                percent={parseFloat(percentage)}
                strokeColor={getStatusColor(status)}
                showInfo={false}
                size="small"
              />
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Alert
        message="欢迎使用 Nginx 管理控制台"
        description="Nginx 管理控制台支持配置文件在线编辑、访问日志分析、性能统计监控、服务器状态管理等全方位功能，为您提供专业的 Nginx 运维体验。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        action={
          <Space>
            <span style={{ fontWeight: 500 }}>选择服务器:</span>
            <Select
              style={{ width: 300 }}
              placeholder="选择服务器（可选）"
              loading={loading}
              allowClear
              value={selectedServer}
              onChange={setSelectedServer}
              options={servers.filter(server => server && server.id && server.name).map(server => ({
                label: (
                  <Space>
                    <CloudServerOutlined />
                    <span>{String(server.name || '未命名服务器')}</span>
                    {server.is_default === 1 && <Tag color="blue">默认</Tag>}
                  </Space>
                ),
                value: server.id,
              }))}
            />
            {selectedServer && (
              <Tag color="blue" style={{ fontWeight: 500 }}>
                已选择: {String(servers.find(s => s && s.id === selectedServer)?.name || '未命名服务器')}
              </Tag>
            )}
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={loadAllStats}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="配置文件总数"
              value={configStats.totalConfigs}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#3B82F6' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="启用配置"
              value={configStats.activeConfigs}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#10B981' }}
              suffix={`/ ${configStats.totalConfigs}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总请求数"
              value={logStats?.totalRequests || 0}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#8B5CF6' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="独立访客"
              value={logStats?.uniqueVisitors || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#F59E0B' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="成功率"
              value={logStats?.successRate || 0}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{
                color: parseFloat(logStats?.successRate || 0) >= 95 ? '#10B981' : '#F59E0B',
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="服务器数量"
              value={serverStats?.totalServers || 0}
              prefix={<CloudServerOutlined />}
              valueStyle={{ color: '#6366F1' }}
              suffix={`/ ${serverStats?.onlineServers || 0} 在线`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="近期变更"
              value={configStats.recentChanges}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#EC4899' }}
              suffix="周内"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Nginx 状态"
              value={nginxStatus.status === 'running' ? '运行中' : '已停止'}
              prefix={<SafetyOutlined />}
              valueStyle={{
                color: nginxStatus.status === 'running' ? '#10B981' : '#EF4444',
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <BarChartOutlined />
                <span>24小时请求趋势</span>
              </Space>
            }
            extra={
              <Tag color="blue">
                总计: {trendData.reduce((sum, d) => sum + d.count, 0)}
              </Tag>
            }
          >
            {renderTrendChart()}
            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#6B7280' }}>
              过去24小时的请求分布（每小时统计）
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <LineChartOutlined />
                <span>状态码分布</span>
              </Space>
            }
            extra={
              <Tag color="green">
                成功率: {logStats?.successRate || 0}%
              </Tag>
            }
          >
            {renderStatusDistribution()}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <GlobalOutlined />
                <span>请求方法</span>
              </Space>
            }
          >
            {logStats?.methods ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(logStats.methods).map(([method, count]) => {
                  const total = Object.values(logStats.methods).reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
                  return (
                    <div key={method}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Tag color="blue" style={{ fontWeight: 500 }}>
                          {method}
                        </Tag>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>
                          {count} 次 ({percentage}%)
                        </span>
                      </div>
                      <Progress
                        percent={parseFloat(percentage)}
                        strokeColor="#3B82F6"
                        showInfo={false}
                        size="small"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '20px' }}>
                暂无数据
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <DatabaseOutlined />
                <span>配置健康度</span>
              </Space>
            }
          >
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Progress
                type="circle"
                percent={
                  configStats.totalConfigs > 0
                    ? (configStats.activeConfigs / configStats.totalConfigs * 100).toFixed(0)
                    : 0
                }
                strokeColor={{
                  '0%': '#EF4444',
                  '50%': '#F59E0B',
                  '100%': '#10B981',
                }}
                size={120}
              />
              <div style={{ marginTop: 16, fontSize: 14, color: '#6B7280' }}>
                {configStats.activeConfigs} / {configStats.totalConfigs} 配置启用
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span>快速操作</span>
              </Space>
            }
          >
            <List
              size="small"
              dataSource={[
                { text: '查看配置文件', icon: <FileTextOutlined />, path: '/configs' },
                { text: '查看访问日志', icon: <GlobalOutlined />, path: '/logs' },
                { text: '查看性能统计', icon: <ThunderboltOutlined />, path: '/stats' },
                { text: '管理服务器', icon: <CloudServerOutlined />, path: '/servers' },
              ]}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: 'pointer', padding: '8px 0' }}
                  onClick={() => navigate(item.path)}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={item.icon} size="small" style={{ backgroundColor: '#3B82F6' }} />}
                    title={item.text}
                  />
                  <ArrowRightOutlined style={{ color: '#9CA3AF' }} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card title="系统概览" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <div style={{ padding: 16, background: '#F3F4F6', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>配置管理</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#1F2937' }}>
                {configStats.totalConfigs}
              </div>
              <div style={{ fontSize: 12, color: '#10B981', marginTop: 4 }}>
                <ArrowUpOutlined /> {configStats.activeConfigs} 个启用
              </div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ padding: 16, background: '#F3F4F6', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>访问统计</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#1F2937' }}>
                {logStats?.totalRequests || 0}
              </div>
              <div style={{ fontSize: 12, color: '#8B5CF6', marginTop: 4 }}>
                <UserOutlined /> {logStats?.uniqueVisitors || 0} 独立访客
              </div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ padding: 16, background: '#F3F4F6', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>服务器状态</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#1F2937' }}>
                {serverStats?.totalServers || 0}
              </div>
              <div style={{ fontSize: 12, color: '#3B82F6', marginTop: 4 }}>
                <CloudServerOutlined /> {serverStats?.onlineServers || 0} 在线
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default Dashboard;
