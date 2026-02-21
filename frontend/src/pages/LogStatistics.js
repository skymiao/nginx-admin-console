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
  Table,
  Tag,
  Progress,
  Tooltip,
} from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  EyeOutlined,
  GlobalOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { serverAPI } from '../services/api';
import api from '../services/api';

const { Option } = Select;

const LogStatistics = () => {
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(24);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    if (selectedServer !== null) {
      loadStatistics();
    }
  }, [selectedServer, hours]);

  useEffect(() => {
    if (selectedServer !== null) {
      loadTrends();
    }
  }, [selectedServer, days]);

  const loadServers = async () => {
    try {
      const response = await serverAPI.list();
      const serverList = response.data?.data || [];
      setServers(serverList);
      if (serverList.length > 0) {
        setSelectedServer(serverList[0].id);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/log-statistics/statistics', { 
        params: { 
          serverId: selectedServer,
          hours 
        } 
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
      message.error('加载统计信息失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    try {
      setLoading(true);
      const response = await api.get('/log-statistics/trends', { 
        params: { 
          serverId: selectedServer,
          days 
        } 
      });
      setTrends(response.data);
    } catch (error) {
      console.error('Failed to load trends:', error);
      message.error('加载趋势数据失败');
    } finally {
      setLoading(false);
    }
  };

  const formatTraffic = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const statusColumns = [
    {
      title: '状态码',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 200 ? 'success' : status >= 500 ? 'error' : 'warning'}>
          {status}
        </Tag>
      ),
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count',
      render: (count, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{count}</div>
          <Progress 
            percent={stats.totalRequests > 0 ? (count / stats.totalRequests * 100).toFixed(1) : 0} 
            size="small"
            strokeColor={record.status === 200 ? '#10B981' : record.status >= 500 ? '#EF4444' : '#F59E0B'}
          />
        </div>
      ),
    },
  ];

  const methodColumns = [
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      render: (method) => (
        <Tag color="blue" style={{ fontWeight: 500 }}>{method}</Tag>
      ),
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count',
      render: (count) => (
        <div>
          <div style={{ fontWeight: 600 }}>{count}</div>
          <Progress 
            percent={stats.totalRequests > 0 ? (count / stats.totalRequests * 100).toFixed(1) : 0} 
            size="small"
            strokeColor="#3B82F6"
          />
        </div>
      ),
    },
  ];

  const pathColumns = [
    {
      title: '排名',
      key: 'rank',
      render: (_, record, index) => index + 1,
      width: 80,
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
    },
    {
      title: '访问次数',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      render: (count) => (
        <div>
          <div style={{ fontWeight: 600 }}>{count}</div>
          <Progress 
            percent={stats.totalRequests > 0 ? (count / stats.totalRequests * 100).toFixed(1) : 0} 
            size="small"
            strokeColor="#10B981"
          />
        </div>
      ),
    },
  ];

  const ipColumns = [
    {
      title: '排名',
      key: 'rank',
      render: (_, record, index) => index + 1,
      width: 80,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      render: (ip) => (
        <Tag color="purple" style={{ fontWeight: 500 }}>{ip}</Tag>
      ),
    },
    {
      title: '访问次数',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      render: (count) => (
        <div>
          <div style={{ fontWeight: 600 }}>{count}</div>
          <Progress 
            percent={stats.totalRequests > 0 ? (count / stats.totalRequests * 100).toFixed(1) : 0} 
            size="small"
            strokeColor="#8B5CF6"
          />
        </div>
      ),
    },
  ];

  const trendColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '请求数',
      dataIndex: 'requests',
      key: 'requests',
      render: (requests) => (
        <div style={{ fontWeight: 600, color: '#3B82F6' }}>{requests}</div>
      ),
    },
    {
      title: '独立访客',
      dataIndex: 'uniqueVisitors',
      key: 'uniqueVisitors',
      render: (visitors) => (
        <div style={{ fontWeight: 600, color: '#10B981' }}>{visitors}</div>
      ),
    },
    {
      title: '流量',
      dataIndex: 'traffic',
      key: 'traffic',
      render: (traffic) => (
        <div style={{ fontWeight: 600, color: '#F59E0B' }}>{formatTraffic(traffic)}</div>
      ),
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      render: (rate) => (
        <div style={{ fontWeight: 600, color: parseFloat(rate) >= 99 ? '#10B981' : parseFloat(rate) >= 95 ? '#F59E0B' : '#EF4444' }}>
          {rate}%
        </div>
      ),
    },
    {
      title: '错误数',
      dataIndex: 'errors',
      key: 'errors',
      render: (errors) => (
        <div style={{ fontWeight: 600, color: errors > 0 ? '#EF4444' : '#10B981' }}>{errors}</div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title={
                <Space>
                  <BarChartOutlined style={{ color: '#3B82F6' }} />
                  <span>总请求数</span>
                </Space>
              }
              value={stats?.totalRequests || 0}
              valueStyle={{ color: '#3B82F6', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title={
                <Space>
                  <EyeOutlined style={{ color: '#10B981' }} />
                  <span>独立访客</span>
                </Space>
              }
              value={stats?.uniqueVisitors || 0}
              valueStyle={{ color: '#10B981', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title={
                <Space>
                  <DatabaseOutlined style={{ color: '#F59E0B' }} />
                  <span>总流量</span>
                </Space>
              }
              value={formatTraffic(stats?.totalTraffic || 0)}
              valueStyle={{ color: '#F59E0B', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title={
                <Space>
                  <CheckCircleOutlined style={{ color: '#8B5CF6' }} />
                  <span>成功率</span>
                </Space>
              }
              value={stats?.successRate || 0}
              suffix="%"
              valueStyle={{ color: parseFloat(stats?.successRate || 0) >= 99 ? '#10B981' : parseFloat(stats?.successRate || 0) >= 95 ? '#F59E0B' : '#EF4444', fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card 
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#10B981' }} />
                <span>成功请求</span>
              </Space>
            }
            hoverable
          >
            <Statistic
              value={stats?.statusCodes?.[200] || 0}
              valueStyle={{ color: '#10B981', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card 
            title={
              <Space>
                <CloseCircleOutlined style={{ color: '#F59E0B' }} />
                <span>客户端错误 (4xx)</span>
              </Space>
            }
            hoverable
          >
            <Statistic
              value={stats?.statusCodes?.[400] || 0}
              valueStyle={{ color: '#F59E0B', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card 
            title={
              <Space>
                <CloseCircleOutlined style={{ color: '#EF4444' }} />
                <span>服务器错误 (5xx)</span>
              </Space>
            }
            hoverable
          >
            <Statistic
              value={stats?.statusCodes?.[500] || 0}
              valueStyle={{ color: '#EF4444', fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <LineChartOutlined style={{ color: '#3B82F6' }} />
            <span>访问趋势</span>
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
            <Select
              value={days}
              onChange={setDays}
              style={{ width: 120 }}
            >
              <Option value={7}>最近7天</Option>
              <Option value={14}>最近14天</Option>
              <Option value={30}>最近30天</Option>
            </Select>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={loadTrends}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Spin spinning={loading}>
          <Table
            columns={trendColumns}
            dataSource={trends}
            rowKey="date"
            pagination={false}
            size="small"
          />
        </Spin>
      </Card>

      <Card
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#3B82F6' }} />
            <span>请求方法分布</span>
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
            <Select
              value={hours}
              onChange={setHours}
              style={{ width: 120 }}
            >
              <Option value={1}>最近1小时</Option>
              <Option value={6}>最近6小时</Option>
              <Option value={24}>最近24小时</Option>
              <Option value={168}>最近7天</Option>
            </Select>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={loadStatistics}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Spin spinning={loading}>
          <Table
            columns={methodColumns}
            dataSource={Object.entries(stats?.methods || {}).map(([method, count]) => ({ method, count }))}
            rowKey="method"
            pagination={false}
            size="small"
          />
        </Spin>
      </Card>

      <Card
        title={
          <Space>
            <GlobalOutlined style={{ color: '#10B981' }} />
            <span>热门路径 (Top 10)</span>
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
              type="primary"
              icon={<ReloadOutlined />}
              onClick={loadStatistics}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Spin spinning={loading}>
          <Table
            columns={pathColumns}
            dataSource={stats?.topPaths || []}
            rowKey="path"
            pagination={false}
            size="small"
          />
        </Spin>
      </Card>

      <Card
        title={
          <Space>
            <CloudServerOutlined style={{ color: '#8B5CF6' }} />
            <span>热门IP (Top 10)</span>
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
              type="primary"
              icon={<ReloadOutlined />}
              onClick={loadStatistics}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Table
            columns={ipColumns}
            dataSource={stats?.topIPs || []}
            rowKey="ip"
            pagination={false}
            size="small"
          />
        </Spin>
      </Card>
    </div>
  );
};

export default LogStatistics;
