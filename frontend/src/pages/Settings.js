import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  message,
  Divider,
  Descriptions,
  Alert,
  Row,
  Col,
  Switch,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  FolderOutlined,
  FileTextOutlined,
  SettingOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { settingsAPI, nginxAPI } from '../services/api';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [systemInfo, setSystemInfo] = useState({});
  const [form] = Form.useForm();

  useEffect(() => {
    loadSettings();
    loadSystemInfo();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsAPI.list();
      form.setFieldsValue(response.data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      message.error('加载设置失败');
    }
  };

  const loadSystemInfo = async () => {
    try {
      const response = await settingsAPI.getInfo();
      setSystemInfo(response.data);
    } catch (error) {
      console.error('Failed to load system info:', error);
      message.error('加载系统信息失败');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await settingsAPI.update(values);
      message.success('设置保存成功');
    } catch (error) {
      message.error('设置保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields(['nginxConfigPath', 'nginxLogPath']);
      setLoading(true);
      const response = await settingsAPI.test(values.nginxConfigPath, values.nginxLogPath);
      if (response.data.success) {
        message.success('路径测试成功');
      } else {
        message.error(`路径测试失败: ${response.data.message}`);
      }
    } catch (error) {
      message.error('路径测试失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReloadNginx = async () => {
    try {
      setLoading(true);
      await nginxAPI.reload();
      message.success('Nginx 重载成功');
      loadSystemInfo();
    } catch (error) {
      message.error('Nginx 重载失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Alert
        message="系统设置"
        description="配置 Nginx 管理控制台的基本设置，包括配置文件路径、日志路径等。修改设置后需要重启服务才能生效。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <SettingOutlined />
                基本设置
              </Space>
            }
            extra={
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadSettings}
                  loading={loading}
                >
                  重置
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={loading}
                >
                  保存设置
                </Button>
              </Space>
            }
          >
            <Form
              form={form}
              layout="vertical"
            >
              <Divider orientation="left">路径配置</Divider>
              <Form.Item
                name="nginxConfigPath"
                label="Nginx 配置文件目录"
                rules={[
                  { required: true, message: '请输入配置文件目录' },
                ]}
                extra="Nginx 主配置文件和站点配置文件所在的目录"
              >
                <Input
                  prefix={<FolderOutlined />}
                  placeholder="/etc/nginx"
                />
              </Form.Item>
              <Form.Item
                name="nginxLogPath"
                label="Nginx 日志目录"
                rules={[
                  { required: true, message: '请输入日志目录' },
                ]}
                extra="Nginx 访问日志和错误日志所在的目录"
              >
                <Input
                  prefix={<FolderOutlined />}
                  placeholder="/var/log/nginx"
                />
              </Form.Item>
              <Form.Item
                name="nginxStatusUrl"
                label="Nginx 状态地址"
                rules={[
                  { required: true, message: '请输入状态地址' },
                ]}
                extra="Nginx stub_status 模块的访问地址，用于获取服务器性能统计"
              >
                <Input
                  prefix={<FolderOutlined />}
                  placeholder="http://localhost/nginx_status"
                />
              </Form.Item>

              <Divider orientation="left">日志设置</Divider>
              <Form.Item
                name="maxLogLines"
                label="最大日志行数"
                rules={[
                  { required: true, message: '请输入最大日志行数' },
                ]}
                extra="日志查看页面默认显示的最大行数"
              >
                <Input
                  type="number"
                  prefix={<FileTextOutlined />}
                  placeholder="1000"
                />
              </Form.Item>
              <Form.Item
                name="autoRefreshInterval"
                label="自动刷新间隔（秒）"
                rules={[
                  { required: true, message: '请输入刷新间隔' },
                ]}
                extra="日志页面自动刷新的时间间隔"
              >
                <Input
                  type="number"
                  prefix={<ReloadOutlined />}
                  placeholder="5"
                />
              </Form.Item>

              <Divider orientation="left">历史记录设置</Divider>
              <Form.Item
                name="enableHistory"
                label="启用历史记录"
                valuePropName="checked"
                extra="是否记录配置文件的变更历史"
              >
                <Switch checkedChildren="已启用" unCheckedChildren="已禁用" />
              </Form.Item>
              <Form.Item
                name="historyRetentionDays"
                label="历史记录保留天数"
                rules={[
                  { required: true, message: '请输入保留天数' },
                ]}
                extra="配置历史记录保留的天数，超过天数将被自动清理"
              >
                <Input
                  type="number"
                  prefix={<SafetyOutlined />}
                  placeholder="30"
                />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <CheckCircleOutlined />
                路径测试
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Alert
              message="测试配置路径和日志路径是否可访问"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Button
              type="primary"
              block
              icon={<CheckCircleOutlined />}
              onClick={handleTestConnection}
              loading={loading}
            >
              测试路径
            </Button>
          </Card>

          <Card
            title={
              <Space>
                <SettingOutlined />
                系统信息
              </Space>
            }
            extra={
              <Button
                icon={<ReloadOutlined />}
                onClick={loadSystemInfo}
                loading={loading}
              >
                刷新
              </Button>
            }
          >
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Nginx 版本">
                {systemInfo.nginxVersion || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="操作系统">
                {systemInfo.os || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="运行时间">
                {systemInfo.uptime || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="CPU 使用率">
                {systemInfo.cpuUsage || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="内存使用率">
                {systemInfo.memoryUsage || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="磁盘使用率">
                {systemInfo.diskUsage || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            title={
              <Space>
                <SafetyOutlined />
                快捷操作
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                block
                icon={<ReloadOutlined />}
                onClick={handleReloadNginx}
                loading={loading}
              >
                重载 Nginx
              </Button>
              <Button
                block
                icon={<SafetyOutlined />}
                onClick={() => message.info('功能开发中')}
              >
                验证配置
              </Button>
              <Button
                block
                icon={<FileTextOutlined />}
                onClick={() => message.info('功能开发中')}
              >
                查看配置状态
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Settings;
