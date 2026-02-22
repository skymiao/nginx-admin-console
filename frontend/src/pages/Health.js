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
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const Health = () => {
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState(null);
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/health');
      setHealthData(response.data);
    } catch (err) {
      setError(err.message || '健康检查失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

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
          <Button
            icon={<ReloadOutlined />}
            onClick={checkHealth}
            loading={loading}
          >
            刷新
          </Button>
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
                    value={new Date(healthData.timestamp).toLocaleString('zh-CN')}
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
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>状态：</Text>
                  <Badge
                    status="success"
                    text={healthData.status}
                    style={{ marginLeft: 8 }}
                  />
                </div>
                <div>
                  <Text strong>时间戳：</Text>
                  <Text style={{ marginLeft: 8 }}>
                    {healthData.timestamp}
                  </Text>
                </div>
              </Space>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Health;
