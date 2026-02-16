import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Row,
  Col,
  Avatar,
  Descriptions,
  Divider,
  Space,
  Tag,
  Tabs,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  SafetyOutlined,
  SaveOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  ClockCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { userAPI } from '../services/api';
import { useAuth } from '../utils/auth';

const { TabPane } = Tabs;

const Profile = () => {
  const { user } = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getProfile();
      setProfileData(response.data);
      profileForm.setFieldsValue({
        username: response.data.username,
        email: response.data.email,
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      message.error('加载个人资料失败');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const values = await profileForm.validateFields();
      setLoading(true);
      await userAPI.updateProfile({ email: values.email });
      message.success('个人资料更新成功');
      loadProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
      message.error(error.response?.data?.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      const values = await passwordForm.validateFields();
      setPasswordLoading(true);
      await userAPI.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('密码修改成功，请重新登录');
      passwordForm.resetFields();
    } catch (error) {
      console.error('Failed to change password:', error);
      message.error(error.response?.data?.message || '密码修改失败');
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleTag = (role) => {
    const roleMap = {
      admin: { color: 'red', text: '管理员', icon: <SafetyOutlined /> },
      developer: { color: 'blue', text: '开发者', icon: <UserOutlined /> },
      viewer: { color: 'green', text: '查看者', icon: <UserOutlined /> },
    };
    const config = roleMap[role] || { color: 'default', text: role, icon: <UserOutlined /> };
    return (
      <Tag color={config.color} style={{ fontWeight: 500 }}>
        {config.icon} {config.text}
      </Tag>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Avatar
                size={100}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '4px solid rgba(255, 255, 255, 0.3)',
                  marginBottom: 16,
                }}
              />
              <h2 style={{ color: 'white', marginBottom: 8, fontSize: 24 }}>
                {profileData?.username || user?.username}
              </h2>
              <div style={{ marginBottom: 16 }}>
                {getRoleTag(profileData?.role || user?.role)}
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: 0 }}>
                {profileData?.email || user?.email}
              </p>
            </div>
          </Card>

          <Card
            bordered={false}
            style={{ marginTop: 24 }}
            title={
              <Space>
                <UserOutlined />
                <span>账户信息</span>
              </Space>
            }
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="用户名">
                {profileData?.username || user?.username}
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">
                {profileData?.email || user?.email}
              </Descriptions.Item>
              <Descriptions.Item label="角色">
                {getRoleTag(profileData?.role || user?.role)}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color="green">启用</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={<Space><CalendarOutlined />创建时间</Space>}>
                {profileData?.createdAt || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={<Space><ClockCircleOutlined />最后登录</Space>}>
                {profileData?.lastLoginAt || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card
            bordered={false}
            title={
              <Space>
                <SafetyOutlined />
                <span>个人设置</span>
              </Space>
            }
          >
            <Tabs defaultActiveKey="profile">
              <TabPane
                tab={
                  <span>
                    <UserOutlined />
                    基本信息
                  </span>
                }
                key="profile"
              >
                <Form
                  form={profileForm}
                  layout="vertical"
                  onFinish={handleProfileUpdate}
                  style={{ maxWidth: 600 }}
                >
                  <Form.Item
                    label="用户名"
                    name="username"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="请输入用户名"
                      disabled
                    />
                  </Form.Item>

                  <Form.Item
                    label="邮箱"
                    name="email"
                    rules={[
                      { required: true, message: '请输入邮箱' },
                      { type: 'email', message: '请输入有效的邮箱地址' },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined />}
                      placeholder="请输入邮箱"
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={loading}
                      style={{ width: '100%' }}
                    >
                      保存修改
                    </Button>
                  </Form.Item>
                </Form>
              </TabPane>

              <TabPane
                tab={
                  <span>
                    <LockOutlined />
                    修改密码
                  </span>
                }
                key="password"
              >
                <Form
                  form={passwordForm}
                  layout="vertical"
                  onFinish={handlePasswordChange}
                  style={{ maxWidth: 600 }}
                >
                  <Form.Item
                    label="当前密码"
                    name="currentPassword"
                    rules={[
                      { required: true, message: '请输入当前密码' },
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="请输入当前密码"
                      iconRender={(visible) =>
                        visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                      }
                    />
                  </Form.Item>

                  <Form.Item
                    label="新密码"
                    name="newPassword"
                    rules={[
                      { required: true, message: '请输入新密码' },
                      { min: 6, message: '密码长度不能少于6位' },
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="请输入新密码（至少6位）"
                      iconRender={(visible) =>
                        visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                      }
                    />
                  </Form.Item>

                  <Form.Item
                    label="确认新密码"
                    name="confirmPassword"
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: '请确认新密码' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('newPassword') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('两次输入的密码不一致'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="请再次输入新密码"
                      iconRender={(visible) =>
                        visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                      }
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={passwordLoading}
                      style={{ width: '100%' }}
                    >
                      修改密码
                    </Button>
                  </Form.Item>
                </Form>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;
