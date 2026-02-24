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
  DatabaseOutlined,
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
  const [trafficStats, setTrafficStats] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadServers();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedServer !== null && isAuthenticated) {
      loadAllStats();
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
      setConfigStats({
        totalConfigs: 0,
        activeConfigs: 0,
        recentChanges: 0,
      });
      setNginxStatus({ status: 'unknown', uptime: 0 });
      setLogStats({
        totalRequests: 0,
        uniqueVisitors: 0,
        successRate: 0,
        statusCodes: {},
        methods: {},
        hourlyData: {},
      });
      setServerStats({
        totalServers: 0,
        onlineServers: 0,
      });
      setRecentActivity([]);
      return;
    }

    try {
      setLoading(true);
      await Promise.all([
        loadConfigStats(selectedServer),
        loadNginxStatus(selectedServer),
        loadLogStats(selectedServer),
        loadServerStats(selectedServer),
        loadTrafficStats(selectedServer),
      ]);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setConfigStats({
        totalConfigs: 0,
        activeConfigs: 0,
        recentChanges: 0,
      });
      setNginxStatus({ status: 'unknown', uptime: 0 });
      setLogStats({
        totalRequests: 0,
        uniqueVisitors: 0,
        successRate: 0,
        statusCodes: {},
        methods: {},
        hourlyData: {},
      });
      setServerStats({
        totalServers: 0,
        onlineServers: 0,
      });
      setRecentActivity([]);
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

  const loadTrafficStats = async (serverId) => {
    try {
      if (!serverId) {
        setTrafficStats(null);
        return;
      }
      const response = await logAPI.getTraffic({ file: 'access.log', serverId, hours: 24 });
      const data = response.data?.data || response.data || {};
      setTrafficStats(data);
    } catch (error) {
      console.error('Failed to load traffic stats:', error);
      setTrafficStats(null);
    }
  };

  const renderStatusDistribution = () => {
    const getStatusColor = (status) => {
      if (status === 200) return '#10B981';
      if (status === 300) return '#3B82F6';
      if (status === 400) return '#F59E0B';
      if (status === 500) return '#EF4444';
      return '#6B7280';
    };

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

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card 
            hoverable 
            style={{ 
              borderRadius: 12,
              background: nginxStatus.status === 'running' 
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              color: 'white'
            }}
          >
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <SafetyOutlined style={{ fontSize: 36, marginBottom: 8 }} />
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {nginxStatus.status === 'running' ? '运行中' : '已停止'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Nginx 服务状态</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card 
            hoverable 
            style={{ 
              borderRadius: 12,
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: 'white'
            }}
          >
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <ThunderboltOutlined style={{ fontSize: 36, marginBottom: 8 }} />
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {logStats?.totalRequests?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>总请求数 (24h)</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card 
            hoverable 
            style={{ 
              borderRadius: 12,
              background: parseFloat(logStats?.successRate || 0) >= 95
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: 'white'
            }}
          >
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <CheckCircleOutlined style={{ fontSize: 36, marginBottom: 8 }} />
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {logStats?.successRate || 0}%
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>请求成功率</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="配置文件"
              value={configStats.totalConfigs}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#3B82F6' }}
              suffix={<span style={{ fontSize: 14, color: '#10B981' }}>/ {configStats.activeConfigs} 启用</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="服务器"
              value={serverStats?.totalServers || 0}
              prefix={<CloudServerOutlined />}
              valueStyle={{ color: '#6366F1' }}
              suffix={<span style={{ fontSize: 14, color: '#10B981' }}>/ {serverStats?.onlineServers || 0} 在线</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总流量"
              value={trafficStats?.totalGB > 1 ? trafficStats.totalGB : trafficStats?.totalMB || 0}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#8B5CF6' }}
              suffix={trafficStats?.totalGB > 1 ? 'GB' : 'MB'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="周内变更"
              value={configStats.recentChanges}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#EC4899' }}
              suffix="次"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
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
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ThunderboltOutlined />
                <span>流量统计</span>
              </Space>
            }
            extra={
              <Tag color="blue">
                过去24小时
              </Tag>
            }
          >
            {trafficStats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>总流量</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: '#3B82F6' }}>
                      {trafficStats.totalGB > 1 ? `${trafficStats.totalGB} GB` : `${trafficStats.totalMB} MB`}
                    </div>
                  </div>
                  <ArrowRightOutlined style={{ color: '#9CA3AF', fontSize: 20 }} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>请求数</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: '#8B5CF6' }}>
                      {trafficStats.requestCount?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #E5E7EB' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>平均请求大小</div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: '#10B981' }}>
                      {trafficStats.avgBytes ? `${(trafficStats.avgBytes / 1024).toFixed(2)} KB` : '0 KB'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>峰值流量</div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: '#F59E0B' }}>
                      {trafficStats.totalGB > 0 ? '~' : '0'} {(trafficStats.totalBytes / 3600 / 1024 / 1024).toFixed(2)} MB/s
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '20px' }}>
                暂无流量数据
              </div>
            )}
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
    </div>
  );
};

export default Dashboard;
