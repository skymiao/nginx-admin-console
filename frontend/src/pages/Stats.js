import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Button,
  Space,
  Spin,
  message,
  Progress,
  Tag,
  Tooltip,
} from 'antd';
import {
  ThunderboltOutlined,
  SwapOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  ClockCircleOutlined,
  ReadOutlined,
  EditOutlined,
  HourglassOutlined,
} from '@ant-design/icons';
import { serverAPI } from '../services/api';

const { Option } = Select;

const Stats = () => {
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    loadServers();
    loadStats();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadStats();
      }, 5000);
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, selectedServer]);

  useEffect(() => {
    loadStats();
  }, [selectedServer]);

  const loadServers = async () => {
    try {
      const response = await serverAPI.list();
      const serverList = response.data || [];
      setServers(serverList);
      if (serverList.length > 0) {
        setSelectedServer(serverList[0].id);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await serverAPI.getStats(selectedServer);
      setStats(response.data);
      
      const historyResponse = await serverAPI.getStatsHistory(selectedServer);
      setHistory(historyResponse.data.history || []);
    } catch (error) {
      console.error('Failed to load stats:', error);
      message.error('加载统计信息失败');
    } finally {
      setLoading(false);
    }
  };

  const recordStats = async () => {
    try {
      await serverAPI.recordStats(selectedServer);
      message.success('统计记录成功');
      loadStats();
    } catch (error) {
      console.error('Failed to record stats:', error);
      message.error('记录统计失败');
    }
  };

  const getChangeIcon = (current, previous) => {
    if (!previous) return <MinusOutlined style={{ color: '#94A3B8' }} />;
    const diff = current - previous;
    if (diff > 0) return <RiseOutlined style={{ color: '#10B981' }} />;
    if (diff < 0) return <FallOutlined style={{ color: '#EF4444' }} />;
    return <MinusOutlined style={{ color: '#94A3B8' }} />;
  };

  const getChangePercent = (current, previous) => {
    if (!previous || previous === 0) return 0;
    const diff = current - previous;
    return ((diff / previous) * 100).toFixed(1);
  };

  const calculateRequestRate = () => {
    if (!stats || history.length < 2) return 0;
    const current = stats.requests;
    const previous = history[0]?.requests || 0;
    if (previous === 0) return 0;
    return current - previous;
  };

  const requestRate = calculateRequestRate();

  return (
    <div className="animate-fade-in">
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title={
                <Space>
                  <ThunderboltOutlined style={{ color: '#3B82F6' }} />
                  <span>活跃连接</span>
                </Space>
              }
              value={stats?.activeConnections || 0}
              valueStyle={{ color: '#3B82F6', fontWeight: 600 }}
              prefix={getChangeIcon(stats?.activeConnections, history[0]?.activeConnections)}
              suffix={
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {getChangePercent(stats?.activeConnections, history[0]?.activeConnections)}%
                </Tag>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title={
                <Space>
                  <SwapOutlined style={{ color: '#10B981' }} />
                  <span>总请求数</span>
                </Space>
              }
              value={stats?.requests || 0}
              valueStyle={{ color: '#10B981', fontWeight: 600 }}
              prefix={getChangeIcon(stats?.requests, history[0]?.requests)}
              suffix={
                <Tag color="green" style={{ marginLeft: 8 }}>
                  {getChangePercent(stats?.requests, history[0]?.requests)}%
                </Tag>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title={
                <Space>
                  <DatabaseOutlined style={{ color: '#F59E0B' }} />
                  <span>已处理</span>
                </Space>
              }
              value={stats?.handled || 0}
              valueStyle={{ color: '#F59E0B', fontWeight: 600 }}
              prefix={getChangeIcon(stats?.handled, history[0]?.handled)}
              suffix={
                <Tag color="orange" style={{ marginLeft: 8 }}>
                  {getChangePercent(stats?.handled, history[0]?.handled)}%
                </Tag>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title={
                <Space>
                  <CloudServerOutlined style={{ color: '#8B5CF6' }} />
                  <span>已接受</span>
                </Space>
              }
              value={stats?.accepts || 0}
              valueStyle={{ color: '#8B5CF6', fontWeight: 600 }}
              prefix={getChangeIcon(stats?.accepts, history[0]?.accepts)}
              suffix={
                <Tag color="purple" style={{ marginLeft: 8 }}>
                  {getChangePercent(stats?.accepts, history[0]?.accepts)}%
                </Tag>
              }
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card 
            title={
              <Space>
                <ReadOutlined style={{ color: '#3B82F6' }} />
                <span>正在读取</span>
              </Space>
            }
            extra={
              <Tooltip title="正在读取请求头">
                <ClockCircleOutlined style={{ color: '#94A3B8' }} />
              </Tooltip>
            }
          >
            <Statistic
              value={stats?.reading || 0}
              valueStyle={{ color: '#3B82F6', fontWeight: 600 }}
              suffix={
                <div style={{ marginTop: 8 }}>
                  <Progress 
                    percent={stats ? ((stats.reading / (stats.activeConnections || 1)) * 100).toFixed(1) : 0} 
                    size="small"
                    strokeColor="#3B82F6"
                  />
                </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card 
            title={
              <Space>
                <EditOutlined style={{ color: '#10B981' }} />
                <span>正在写入</span>
              </Space>
            }
            extra={
              <Tooltip title="正在将响应写回客户端">
                <ClockCircleOutlined style={{ color: '#94A3B8' }} />
              </Tooltip>
            }
          >
            <Statistic
              value={stats?.writing || 0}
              valueStyle={{ color: '#10B981', fontWeight: 600 }}
              suffix={
                <div style={{ marginTop: 8 }}>
                  <Progress 
                    percent={stats ? ((stats.writing / (stats.activeConnections || 1)) * 100).toFixed(1) : 0} 
                    size="small"
                    strokeColor="#10B981"
                  />
                </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card 
            title={
              <Space>
                <HourglassOutlined style={{ color: '#F59E0B' }} />
                <span>等待中</span>
              </Space>
            }
            extra={
              <Tooltip title="等待下一个请求的空闲连接">
                <ClockCircleOutlined style={{ color: '#94A3B8' }} />
              </Tooltip>
            }
          >
            <Statistic
              value={stats?.waiting || 0}
              valueStyle={{ color: '#F59E0B', fontWeight: 600 }}
              suffix={
                <div style={{ marginTop: 8 }}>
                  <Progress 
                    percent={stats ? ((stats.waiting / (stats.activeConnections || 1)) * 100).toFixed(1) : 0} 
                    size="small"
                    strokeColor="#F59E0B"
                  />
                </div>
              }
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#3B82F6' }} />
            <span>请求速率</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="当前周期"
              value={requestRate}
              valueStyle={{ color: '#3B82F6', fontWeight: 600 }}
              suffix="次"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="平均速率"
              value={history.length > 1 ? Math.round((stats?.requests - history[history.length - 1]?.requests) / (history.length - 1)) : 0}
              valueStyle={{ color: '#10B981', fontWeight: 600 }}
              suffix="次/周期"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="峰值速率"
              value={history.length > 0 ? Math.max(...history.map(h => h.requests - (history[history.indexOf(h) + 1]?.requests || 0))) : 0}
              valueStyle={{ color: '#EF4444', fontWeight: 600 }}
              suffix="次"
            />
          </Col>
        </Row>
      </Card>

      <Card
        title={
          <Space>
            <CloudServerOutlined style={{ color: '#8B5CF6' }} />
            <span>服务器控制</span>
          </Space>
        }
        extra={
          <Space>
            <Select
              value={selectedServer}
              onChange={setSelectedServer}
              style={{ width: 200 }}
              placeholder="选择服务器"
            >
              {servers.map(server => (
                <Option key={server.id} value={server.id}>
                  {server.name} ({server.host})
                </Option>
              ))}
            </Select>
            <Button
              type={autoRefresh ? 'primary' : 'default'}
              icon={<ReloadOutlined />}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? '停止刷新' : '自动刷新'}
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={loadStats}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              icon={<DatabaseOutlined />}
              onClick={recordStats}
            >
              记录
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          {stats ? (
            <div>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: '#64748B', marginBottom: 8 }}>连接状态</div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#3B82F6' }}>
                          {stats.reading}
                        </div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>读取</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#10B981' }}>
                          {stats.writing}
                        </div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>写入</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#F59E0B' }}>
                          {stats.waiting}
                        </div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>等待</div>
                      </div>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: '#64748B', marginBottom: 8 }}>请求统计</div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#8B5CF6' }}>
                          {stats.accepts}
                        </div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>已接受</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#F59E0B' }}>
                          {stats.handled}
                        </div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>已处理</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#10B981' }}>
                          {stats.requests}
                        </div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>总请求</div>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
              暂无数据
            </div>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default Stats;
