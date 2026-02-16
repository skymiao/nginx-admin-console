import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Tag,
  Tooltip,
  Row,
  Col,
  Statistic,
  Alert,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { serverAPI } from '../services/api';

const Servers = () => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentServer, setCurrentServer] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [reloadLoading, setReloadLoading] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      setLoading(true);
      const response = await serverAPI.list();
      setServers(response.data || []);
    } catch (error) {
      message.error('加载服务器列表失败');
      console.error('Failed to load servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setCurrentServer(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (server) => {
    setCurrentServer(server);
    form.setFieldsValue({
      name: server.name,
      host: server.host,
      port: server.port,
      username: server.username,
      password: '',
      privateKey: server.private_key || '',
      description: server.description,
      nginxConfigPath: server.nginx_config_path,
      nginxLogPath: server.nginx_log_path,
      nginxStatusUrl: server.nginx_status_url,
      useSudo: server.use_sudo === 1,
    });
    setModalVisible(true);
  };

  const handleDelete = async (server) => {
    if (server.is_default) {
      message.warning('默认服务器不能删除');
      return;
    }

    try {
      await serverAPI.delete(server.id);
      message.success('删除成功');
      loadServers();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (currentServer) {
        await serverAPI.update(currentServer.id, values);
        message.success('更新成功');
      } else {
        await serverAPI.create(values);
        message.success('创建成功');
      }

      setModalVisible(false);
      loadServers();
    } catch (error) {
      message.error(currentServer ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestLoading(true);
      const values = await form.validateFields();
      const response = await serverAPI.testConnection(values);
      
      if (response.data.success) {
        message.success('连接成功');
      } else {
        message.error(response.data.message || '连接失败');
      }
    } catch (error) {
      message.error('连接测试失败');
    } finally {
      setTestLoading(false);
    }
  };

  const handleReloadNginx = async (server) => {
    try {
      setReloadLoading(server.id);
      const response = await serverAPI.reloadNginx(server.id);
      
      if (response.data.success) {
        message.success(response.data.message || 'nginx重载成功');
        loadServers();
      } else {
        message.error(response.data.message || 'nginx重载失败');
      }
    } catch (error) {
      message.error('nginx重载失败');
    } finally {
      setReloadLoading(null);
    }
  };

  const columns = [
    {
      title: '服务器名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <CloudServerOutlined style={{ color: '#3B82F6', fontSize: 16 }} />
          <div>
            <div style={{ fontWeight: 600, color: '#1E293B' }}>{text}</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{record.host}:{record.port}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      render: (text) => (
        <Tag color="blue" style={{ fontWeight: 500 }}>{text}</Tag>
      ),
    },
    {
      title: '配置路径',
      dataIndex: 'nginx_config_path',
      key: 'nginx_config_path',
      render: (text) => (
        <span style={{ color: '#64748B', fontSize: 13 }}>{text}</span>
      ),
    },
    {
      title: '状态地址',
      dataIndex: 'nginx_status_url',
      key: 'nginx_status_url',
      render: (text) => (
        <span style={{ color: '#64748B', fontSize: 13 }}>{text}</span>
      ),
    },
    {
      title: '默认',
      dataIndex: 'is_default',
      key: 'is_default',
      width: 80,
      render: (isDefault) => (
        isDefault ? (
          <Tag color="success" style={{ fontWeight: 500 }}>是</Tag>
        ) : (
          <Tag color="default" style={{ fontWeight: 500 }}>否</Tag>
        )
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="重载nginx">
            <Button
              type="text"
              icon={<ThunderboltOutlined />}
              onClick={() => handleReloadNginx(record)}
              loading={reloadLoading === record.id}
              style={{ color: '#3B82F6' }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ color: '#3B82F6' }}
            />
          </Tooltip>
          {!record.is_default && (
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const getServerStats = () => {
    return {
      total: servers.length,
      default: servers.filter(s => s.is_default).length,
      remote: servers.filter(s => !s.is_default).length,
    };
  };

  const serverStats = getServerStats();

  return (
    <div className="animate-fade-in">
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card className="stat-card">
            <Statistic
              title="服务器总数"
              value={serverStats.total}
              prefix={<CloudServerOutlined style={{ color: '#3B82F6' }} />}
              valueStyle={{ color: '#3B82F6', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="stat-card">
            <Statistic
              title="默认服务器"
              value={serverStats.default}
              prefix={<SettingOutlined style={{ color: '#10B981' }} />}
              valueStyle={{ color: '#10B981', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="stat-card">
            <Statistic
              title="远程服务器"
              value={serverStats.remote}
              prefix={<CloudServerOutlined style={{ color: '#64748B' }} />}
              valueStyle={{ color: '#64748B', fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="服务器管理"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadServers}
              loading={loading}
              style={{ borderRadius: '8px' }}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              style={{ borderRadius: '8px' }}
            >
              添加服务器
            </Button>
          </Space>
        }
        className="servers-card"
      >
        <Alert
          message="分布式管理"
          description="添加远程nginx服务器，通过SSH连接管理多个nginx实例的配置文件和服务"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={columns}
          dataSource={servers}
          rowKey="id"
          loading={loading}
          className="servers-table"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <CloudServerOutlined />
            <span>{currentServer ? '编辑服务器' : '添加服务器'}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        confirmLoading={loading}
        width={700}
        className="server-modal"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            port: 22,
            nginxConfigPath: '/etc/nginx',
            nginxLogPath: '/var/log/nginx',
            nginxStatusUrl: 'http://localhost/nginx_status',
          }}
        >
          <Form.Item
            name="name"
            label="服务器名称"
            rules={[
              { required: true, message: '请输入服务器名称' },
              { max: 50, message: '服务器名称最多50个字符' },
            ]}
          >
            <Input
              prefix={<CloudServerOutlined />}
              placeholder="请输入服务器名称"
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="host"
            label="主机地址"
            rules={[
              { required: true, message: '请输入主机地址' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
                  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
                  if (ipRegex.test(value) || domainRegex.test(value)) {
                    if (ipRegex.test(value)) {
                      const parts = value.split('.');
                      const valid = parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255);
                      if (!valid) {
                        return Promise.reject('请输入有效的IP地址');
                      }
                    }
                    return Promise.resolve();
                  }
                  return Promise.reject('请输入有效的IP地址或域名');
                }
              }
            ]}
          >
            <Input
              placeholder="例如: 192.168.1.100 或 example.com"
              size="large"
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="port"
                label="SSH端口"
                rules={[
                  { required: true, message: '请输入SSH端口' },
                  { type: 'number', min: 1, max: 65535, message: '端口范围1-65535' },
                ]}
              >
                <InputNumber
                  min={1}
                  max={65535}
                  style={{ width: '100%' }}
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                ]}
              >
                <Input
                  placeholder="SSH用户名"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { 
                required: !currentServer && !form.getFieldValue('privateKey'), 
                message: '请输入密码或私钥' 
              },
            ]}
          >
            <Input.Password
              placeholder={currentServer ? '留空保持原密码不变' : 'SSH密码（与私钥二选一）'}
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="privateKey"
            label="私钥"
          >
            <Input.TextArea
              placeholder={currentServer ? '留空保持原私钥不变' : 'SSH私钥（与密码二选一）'}
              rows={4}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="nginxConfigPath"
                label="Nginx配置路径"
                rules={[
                  { required: true, message: '请输入nginx配置路径' },
                ]}
              >
                <Input
                  placeholder="/etc/nginx"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="nginxLogPath"
                label="Nginx日志路径"
                rules={[
                  { required: true, message: '请输入nginx日志路径' },
                ]}
              >
                <Input
                  placeholder="/var/log/nginx"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="nginxStatusUrl"
            label="Nginx状态地址"
            tooltip="用于获取nginx统计信息的stub_status地址"
            rules={[
              { required: true, message: '请输入nginx状态地址' },
            ]}
          >
            <Input
              placeholder="http://localhost/nginx_status"
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="useSudo"
            label="使用Sudo"
            tooltip="如果登录用户没有root权限，可以使用sudo执行nginx相关命令"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea
              placeholder="服务器描述（可选）"
              rows={2}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button
                type="primary"
                onClick={handleTestConnection}
                loading={testLoading}
              >
                测试连接
              </Button>
              <Button
                type="primary"
                onClick={handleSave}
                loading={loading}
              >
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Servers;