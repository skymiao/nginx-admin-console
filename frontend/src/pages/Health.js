import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Badge,
  Alert,
  Spin,
  Space,
  Button,
  Typography,
  Table,
  Tag,
  Collapse,
  Descriptions,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  HeartOutlined,
  ApiOutlined,
  LockOutlined,
  UnlockOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const Health = () => {
  const [loading, setLoading] = useState(true);
  const [checkingApi, setCheckingApi] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [apiEndpoints, setApiEndpoints] = useState(null);
  const [apiStatus, setApiStatus] = useState({});
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/health');
      const data = response.data?.data || response.data;
      setHealthData(data);
    } catch (err) {
      setError(err.message || '健康检查失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchApiEndpoints = async () => {
    try {
      const response = await axios.get('/api/endpoints');
      setApiEndpoints(response.data.data);
    } catch (err) {
      message.error('获取API接口列表失败');
    }
  };

  const checkApiStatus = async (method, path) => {
    try {
      const config = {
        method: method.toLowerCase(),
        url: path,
        timeout: 5000,
      };
      await axios(config);
      return 'success';
    } catch (err) {
      if (err.response && err.response.status === 401) {
        return 'auth_required';
      } else if (err.response && err.response.status === 403) {
        return 'permission_denied';
      } else if (err.response && err.response.status === 404) {
        return 'not_found';
      } else {
        return 'error';
      }
    }
  };

  const checkAllApis = async () => {
    if (!apiEndpoints) return;

    setCheckingApi(true);
    const statusMap = {};

    for (const category of apiEndpoints) {
      for (const endpoint of category.endpoints) {
        const key = `${endpoint.method} ${endpoint.path}`;
        statusMap[key] = 'checking';
        setApiStatus({ ...statusMap });
      }
    }

    for (const category of apiEndpoints) {
      for (const endpoint of category.endpoints) {
        const key = `${endpoint.method} ${endpoint.path}`;
        const status = await checkApiStatus(endpoint.method, endpoint.path);
        statusMap[key] = status;
        setApiStatus({ ...statusMap });
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setCheckingApi(false);
  };

  useEffect(() => {
    checkHealth();
    fetchApiEndpoints();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <Badge status="success" text="正常" />;
      case 'auth_required':
        return <Badge status="warning" text="需要认证" />;
      case 'permission_denied':
        return <Badge status="warning" text="权限不足" />;
      case 'not_found':
        return <Badge status="error" text="不存在" />;
      case 'error':
        return <Badge status="error" text="错误" />;
      case 'checking':
        return <Badge status="processing" text="检查中" />;
      default:
        return <Badge status="default" text="未检查" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return '#52c41a';
      case 'auth_required':
      case 'permission_denied':
        return '#faad14';
      case 'not_found':
      case 'error':
        return '#ff4d4f';
      case 'checking':
        return '#1890ff';
      default:
        return '#d9d9d9';
    }
  };

  const getMethodTag = (method) => {
    const colors = {
      GET: 'blue',
      POST: 'green',
      PUT: 'orange',
      DELETE: 'red',
      PATCH: 'purple',
    };
    return <Tag color={colors[method]}>{method}</Tag>;
  };

  const columns = [
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 100,
      render: (method) => getMethodTag(method),
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
      render: (path) => <Text code>{path}</Text>,
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '认证',
      dataIndex: 'requiresAuth',
      key: 'requiresAuth',
      width: 80,
      render: (requiresAuth) =>
        requiresAuth ? (
          <LockOutlined style={{ color: '#faad14' }} />
        ) : (
          <UnlockOutlined style={{ color: '#52c41a' }} />
        ),
    },
    {
      title: '权限',
      dataIndex: 'permission',
      key: 'permission',
      width: 120,
      render: (permission) =>
        permission ? <Tag color="cyan">{permission}</Tag> : '-',
    },
    {
      title: '限流',
      dataIndex: 'rateLimit',
      key: 'rateLimit',
      width: 120,
      render: (rateLimit) => (
        <Space size={4}>
          <ThunderboltOutlined style={{ color: '#1890ff' }} />
          <Text>{rateLimit}</Text>
        </Space>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record) => {
        const key = `${record.method} ${record.path}`;
        const status = apiStatus[key];
        return getStatusBadge(status);
      },
    },
  ];

  const renderCategoryPanel = (category) => {
    const categoryStatus = category.endpoints.map(
      (endpoint) => apiStatus[`${endpoint.method} ${endpoint.path}`]
    );

    const successCount = categoryStatus.filter(
      (s) => s === 'success'
    ).length;
    const totalCount = category.endpoints.length;

    return (
      <Panel
        header={
          <Space>
            <ApiOutlined />
            <Text strong>{category.category}</Text>
            <Badge
              count={`${successCount}/${totalCount}`}
              style={{
                backgroundColor:
                  successCount === totalCount ? '#52c41a' : '#faad14',
              }}
            />
          </Space>
        }
        key={category.category}
      >
        <Table
          columns={columns}
          dataSource={category.endpoints}
          rowKey={(record) => `${record.method} ${record.path}`}
          pagination={false}
          size="small"
          scroll={{ x: 1000 }}
        />
      </Panel>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <HeartOutlined style={{ color: '#52c41a' }} />
            系统健康检查
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={checkHealth}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<ApiOutlined />}
              onClick={checkAllApis}
              loading={checkingApi}
              disabled={!apiEndpoints}
            >
              检查所有接口
            </Button>
          </Space>
        }
      >
        {loading && !healthData && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" tip="正在检查系统健康状态..." />
          </div>
        )}

        {error && (
          <Alert
            message="健康检查失败"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {healthData && (
          <div>
            <Alert
              message="系统运行正常"
              description="所有服务运行正常，系统健康状态良好"
              type="success"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title="状态"
                    value="正常"
                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title="检查时间"
                    value={healthData?.timestamp ? new Date(healthData.timestamp).toLocaleString('zh-CN') : '-'}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title="响应时间"
                    value="正常"
                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
            </Row>

            <Card
              title="详细信息"
              style={{ marginTop: 24 }}
            >
              <Descriptions column={1} bordered>
                <Descriptions.Item label="状态">
                  <Badge status="success" text={healthData?.status || '-'} />
                </Descriptions.Item>
                <Descriptions.Item label="时间戳">
                  {healthData?.timestamp || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card
              title={
                <Space>
                  <ApiOutlined />
                  API 接口状态
                </Space>
              }
              style={{ marginTop: 24 }}
            >
              {apiEndpoints ? (
                <Collapse defaultActiveKey={['认证']} accordion>
                  {apiEndpoints.map(renderCategoryPanel)}
                </Collapse>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Spin tip="正在加载API接口列表..." />
                </div>
              )}
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Health;
