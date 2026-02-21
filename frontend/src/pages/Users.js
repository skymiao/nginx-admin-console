import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Card,
  Tag,
  Tooltip,
  Popconfirm,
  Switch,
  Row,
  Col,
  Statistic,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  StopOutlined,
  UserSwitchOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { userAPI, roleAPI } from '../services/api';

const { Option } = Select;

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.list();
      setUsers(response.data?.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await roleAPI.list();
      setRoles(response.data?.data || []);
    } catch (error) {
      console.error('Failed to load roles:', error);
      message.error('加载角色列表失败');
    }
  };

  const handleCreate = () => {
    setCurrentUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (user) => {
    setCurrentUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setModalVisible(true);
  };

  const handleDelete = async (user) => {
    try {
      await userAPI.delete(user.id);
      message.success('删除成功');
      loadUsers();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      if (currentUser) {
        await userAPI.update(currentUser.id, values);
        message.success('更新成功');
      } else {
        await userAPI.create(values);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      loadUsers();
    } catch (error) {
      message.error(currentUser ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (user, checked) => {
    try {
      await userAPI.update(user.id, { status: checked });
      message.success('状态更新成功');
      loadUsers();
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  const getRoleTag = (role) => {
    const roleMap = {
      admin: { color: 'red', text: '管理员', icon: <SafetyOutlined /> },
      developer: { color: 'blue', text: '开发者', icon: <TeamOutlined /> },
      viewer: { color: 'green', text: '查看者', icon: <UserOutlined /> },
    };
    const config = roleMap[role] || { color: 'default', text: role, icon: <UserOutlined /> };
    return (
      <Tag color={config.color} style={{ fontWeight: 500 }}>
        {config.icon} {config.text}
      </Tag>
    );
  };

  const columns = [
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      render: (text, record) => (
        <Space>
          <Avatar 
            size={32} 
            icon={<UserOutlined />} 
            style={{ backgroundColor: '#3B82F6' }}
          />
          <div>
            <div style={{ fontWeight: 600, color: '#1E293B' }}>{text}</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 140,
      render: (role) => getRoleTag(role),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => (
        <Switch
          checked={status}
          onChange={(checked) => handleStatusChange(record, checked)}
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<StopOutlined />}
          style={{ backgroundColor: status ? '#10B981' : '#94A3B8' }}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => (
        <span style={{ color: '#64748B', fontSize: 13 }}>
          {date || '-'}
        </span>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 180,
      render: (date) => (
        <span style={{ color: '#64748B', fontSize: 13 }}>
          {date || '-'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ color: '#3B82F6' }}
            />
          </Tooltip>
          {record.username !== 'admin' && (
            <Popconfirm
              title="确认删除"
              description="确定要删除此用户吗？"
              onConfirm={() => handleDelete(record)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const getUserStats = () => {
    return {
      total: users.length,
      active: users.filter(u => u.status).length,
      inactive: users.filter(u => !u.status).length,
      admins: users.filter(u => u.role === 'admin').length,
    };
  };

  const userStats = getUserStats();

  return (
    <div className="animate-fade-in">
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="用户总数"
              value={userStats.total}
              prefix={<TeamOutlined style={{ color: '#3B82F6' }} />}
              valueStyle={{ color: '#3B82F6', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="活跃用户"
              value={userStats.active}
              prefix={<CheckCircleOutlined style={{ color: '#10B981' }} />}
              valueStyle={{ color: '#10B981', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="禁用用户"
              value={userStats.inactive}
              prefix={<StopOutlined style={{ color: '#64748B' }} />}
              valueStyle={{ color: '#64748B', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="管理员"
              value={userStats.admins}
              prefix={<SafetyOutlined style={{ color: '#EF4444' }} />}
              valueStyle={{ color: '#EF4444', fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="用户管理"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadUsers}
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
              新建用户
            </Button>
          </Space>
        }
        className="users-card"
      >
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          className="users-table"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <UserSwitchOutlined />
            <span>{currentUser ? '编辑用户' : '新建用户'}</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        confirmLoading={loading}
        width={600}
        className="user-modal"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: true,
          }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 20, message: '用户名最多20个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
              disabled={!!currentUser}
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="请输入邮箱"
              size="large"
            />
          </Form.Item>
          {!currentUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
                size="large"
              />
            </Form.Item>
          )}
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色" size="large">
              {roles.map(role => (
                <Option key={role.name} value={role.name}>
                  <Space>
                    <TeamOutlined />
                    <span>{role.description} ({role.name})</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren={<CheckCircleOutlined />}
              unCheckedChildren={<StopOutlined />}
              style={{ backgroundColor: '#10B981' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;