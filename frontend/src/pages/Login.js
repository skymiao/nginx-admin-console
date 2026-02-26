import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Modal, Alert } from 'antd';
import { UserOutlined, LockOutlined, CloudServerOutlined, ExclamationCircleOutlined, CloseCircleOutlined, LockTwoTone, UserDeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/auth';

const { Title } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, type: '', title: '', message: '' });
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form] = Form.useForm();

  const showErrorModal = (type, title, message) => {
    setErrorModal({ visible: true, type, title, message });
  };

  const handleOk = () => {
    setErrorModal({ visible: false, type: '', title: '', message: '' });
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password);
      if (result.success) {
        message.success('登录成功');
        navigate('/dashboard');
      } else {
        const errorMsg = result.message || '登录失败';
        
        if (errorMsg.includes('用户名或密码错误')) {
          showErrorModal(
            'auth_error',
            '登录失败',
            '用户名或密码错误，请检查后重试'
          );
        } else if (errorMsg.includes('账户已被禁用')) {
          showErrorModal(
            'account_disabled',
            '账户已被禁用',
            '您的账户已被管理员禁用，请联系管理员重新启用'
          );
        } else if (errorMsg.includes('账户已被锁定')) {
          showErrorModal(
            'account_locked',
            '账户已被锁定',
            '由于多次登录失败，您的账户已被临时锁定，请稍后再试'
          );
        } else if (errorMsg.includes('网络错误') || errorMsg.includes('连接失败')) {
          showErrorModal(
            'network_error',
            '网络连接失败',
            '无法连接到服务器，请检查网络连接后重试'
          );
        } else {
          showErrorModal(
            'unknown_error',
            '登录失败',
            errorMsg || '登录过程中发生未知错误，请稍后重试'
          );
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.message && error.message.includes('Network Error')) {
        showErrorModal(
          'network_error',
          '网络连接失败',
          '无法连接到服务器，请检查网络连接后重试'
        );
      } else if (error.code === 'ECONNABORTED') {
        showErrorModal(
          'timeout_error',
          '请求超时',
          '服务器响应超时，请稍后重试'
        );
      } else {
        showErrorModal(
          'unknown_error',
          '登录失败',
          '登录过程中发生未知错误，请稍后重试'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const getErrorIcon = (type) => {
    switch (type) {
      case 'auth_error':
        return <CloseCircleOutlined style={{ fontSize: 48, color: '#FF4D4F' }} />;
      case 'account_disabled':
        return <LockTwoTone style={{ fontSize: 48, color: '#FAAD14' }} />;
      case 'account_locked':
        return <LockTwoTone style={{ fontSize: 48, color: '#FAAD14' }} />;
      case 'network_error':
        return <ExclamationCircleOutlined style={{ fontSize: 48, color: '#FAAD14' }} />;
      case 'timeout_error':
        return <ExclamationCircleOutlined style={{ fontSize: 48, color: '#FAAD14' }} />;
      default:
        return <ExclamationCircleOutlined style={{ fontSize: 48, color: '#FF4D4F' }} />;
    }
  };

  const getErrorColor = (type) => {
    switch (type) {
      case 'auth_error':
        return '#FF4D4F';
      case 'account_disabled':
        return '#FAAD14';
      case 'account_locked':
        return '#FAAD14';
      case 'network_error':
        return '#FAAD14';
      case 'timeout_error':
        return '#FAAD14';
      default:
        return '#FF4D4F';
    }
  };

  return (
    <div className="login-container animate-fade-in" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
      }} />
      <Card
        className="animate-slide-up"
        style={{
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(20px)',
          background: 'rgba(255, 255, 255, 0.95)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
          }}>
            <CloudServerOutlined style={{ fontSize: 40, color: 'white' }} />
          </div>
          <Title level={2} style={{ marginBottom: 8, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Nginx 管理控制台
          </Title>
          <p style={{ color: '#64748B', fontSize: 15, fontWeight: 500 }}>
            请登录以继续
          </p>
        </div>
        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#667eea' }} />}
              placeholder="用户名"
              style={{
                borderRadius: '12px',
                padding: '12px 16px',
                border: '2px solid #E2E8F0',
                transition: 'all 0.3s ease',
              }}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#667eea' }} />}
              placeholder="密码"
              style={{
                borderRadius: '12px',
                padding: '12px 16px',
                border: '2px solid #E2E8F0',
                transition: 'all 0.3s ease',
              }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 48,
                borderRadius: '12px',
                fontSize: 16,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 24, borderTop: '1px solid #E2E8F0' }}>
          <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>
            安全的 Nginx 配置管理平台
          </p>
        </div>
      </Card>
      
      <Modal
        title={null}
        open={errorModal.visible}
        onOk={handleOk}
        onCancel={handleOk}
        footer={[
          <Button key="ok" type="primary" onClick={handleOk} size="large" block style={{ borderRadius: '8px' }}>
            我知道了
          </Button>,
        ]}
        centered
        width={400}
        style={{ borderRadius: '16px' }}
        bodyStyle={{ padding: '32px 24px', textAlign: 'center' }}
      >
        <div style={{ marginBottom: 24 }}>
          {getErrorIcon(errorModal.type)}
        </div>
        <Title level={4} style={{ marginBottom: 12, color: getErrorColor(errorModal.type) }}>
          {errorModal.title}
        </Title>
        <p style={{ color: '#64748B', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
          {errorModal.message}
        </p>
        {errorModal.type === 'auth_error' && (
          <Alert
            message="提示"
            description="请检查用户名和密码是否正确，注意大小写"
            type="info"
            showIcon
            style={{ marginTop: 20, borderRadius: '8px', textAlign: 'left' }}
          />
        )}
        {errorModal.type === 'account_disabled' && (
          <Alert
            message="联系管理员"
            description="如需重新启用账户，请联系系统管理员"
            type="warning"
            showIcon
            style={{ marginTop: 20, borderRadius: '8px', textAlign: 'left' }}
          />
        )}
        {errorModal.type === 'account_locked' && (
          <Alert
            message="稍后重试"
            description="账户将在一段时间后自动解锁，请稍后再试"
            type="warning"
            showIcon
            style={{ marginTop: 20, borderRadius: '8px', textAlign: 'left' }}
          />
        )}
        {(errorModal.type === 'network_error' || errorModal.type === 'timeout_error') && (
          <Alert
            message="检查网络"
            description="请确保网络连接正常，服务器地址正确"
            type="warning"
            showIcon
            style={{ marginTop: 20, borderRadius: '8px', textAlign: 'left' }}
          />
        )}
      </Modal>
    </div>
  );
};

export default Login;
