import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Tag,
  Tooltip,
  Statistic,
  Empty,
  Badge,
  Select,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  StopOutlined,
  PlayCircleOutlined,
  FileOutlined,
  FolderOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { configAPI, serverAPI } from '../services/api';

const ConfigFiles = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [configs, setConfigs] = useState([]);
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serversLoading, setServersLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editorModalVisible, setEditorModalVisible] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [validating, setValidating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form] = Form.useForm();

  useEffect(() => {
    loadServers();
    loadConfigs();
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [selectedServer]);

  useEffect(() => {
    const state = location.state;
    if (state && state.editFile) {
      const serverId = state.serverId || null;
      setSelectedServer(serverId);
      setTimeout(() => {
        openEditor(state.editFile, serverId);
      }, 500);
    }
  }, [location]);

  const openEditor = async (filePath, serverIdOverride = null) => {
    try {
      setLoading(true);
      const targetServerId = serverIdOverride || selectedServer;
      const response = await configAPI.get(filePath, targetServerId);
      const content = response.data?.data?.content || response.data?.content || '';
      setEditorContent(content);
      setCurrentConfig({ path: filePath, name: filePath.split('/').pop() });
      setEditorModalVisible(true);
    } catch (error) {
      message.error('加载配置文件失败');
      console.error('Failed to load config content:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServers = async () => {
    try {
      setServersLoading(true);
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
    } catch (error) {
      console.error('Failed to load servers:', error);
    } finally {
      setServersLoading(false);
    }
  };

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await configAPI.list(selectedServer);
      const data = response.data?.data || response.data || [];
      setConfigs(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('加载配置文件失败');
      console.error('Failed to load configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: configs.length,
    enabled: configs.filter(c => c.enabled).length,
    disabled: configs.filter(c => !c.enabled).length,
    main: configs.filter(c => c.type === 'main').length,
    sub: configs.filter(c => c.type === 'sub').length,
  };

  const handleCreate = () => {
    setCurrentConfig(null);
    setEditorContent('');
    setEditorModalVisible(true);
  };

  const handleEdit = async (config) => {
    await openEditor(config.path);
    setCurrentConfig(config);
  };

  const handleDelete = async (config) => {
    try {
      await configAPI.delete(config.path, selectedServer);
      message.success('删除成功');
      loadConfigs();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || '删除失败';
      message.error(errorMsg);
      console.error('Delete error:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      let data;
      if (currentConfig) {
        data = {
          path: currentConfig.path,
          content: editorContent,
          ...(selectedServer && { serverId: selectedServer }),
        };
        await configAPI.update(currentConfig.path, data);
      } else {
        const formValues = await form.validateFields();
        data = {
          path: formValues.path,
          content: editorContent,
          ...(selectedServer && { serverId: selectedServer }),
        };
        await configAPI.create(data);
      }
      message.success('保存成功');
      setEditorModalVisible(false);
      loadConfigs();
    } catch (error) {
      message.error('保存失败');
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    try {
      setValidating(true);
      const response = await configAPI.validate(editorContent, selectedServer);
      if (response.data.valid) {
        message.success('配置验证通过');
      } else {
        message.error(`配置验证失败: ${response.data.error}`);
      }
    } catch (error) {
      message.error('验证失败');
    } finally {
      setValidating(false);
    }
  };

  const handleApply = async () => {
    try {
      setApplying(true);
      await configAPI.apply(selectedServer);
      await configAPI.reload();
      message.success('配置应用成功');
    } catch (error) {
      message.error('配置应用失败');
    } finally {
      setApplying(false);
    }
  };

  const handleDisable = async (config) => {
    try {
      await configAPI.disable(config.path, selectedServer);
      message.success('禁用成功');
      loadConfigs();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || '禁用失败';
      message.error(errorMsg);
      console.error('Disable error:', error);
    }
  };

  const handleEnable = async (config) => {
    try {
      await configAPI.enable(config.path, selectedServer);
      message.success('启用成功');
      loadConfigs();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || '启用失败';
      message.error(errorMsg);
      console.error('Enable error:', error);
    }
  };

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <Tag 
          color={type === 'main' ? 'blue' : 'default'}
          style={{ 
            borderRadius: '6px',
            padding: '4px 12px',
            fontWeight: 500
          }}
        >
          {type === 'main' ? '主配置' : '子配置'}
        </Tag>
      ),
    },
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <FileTextOutlined style={{ color: '#3B82F6' }} />
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Space>
      ),
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span style={{ color: '#64748B', fontSize: 13 }}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size) => (
        <span style={{ fontWeight: 500, color: '#1E293B' }}>
          {(size / 1024).toFixed(2)} KB
        </span>
      ),
    },
    {
      title: '最后修改',
      dataIndex: 'lastModified',
      key: 'lastModified',
      width: 180,
      render: (date) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: '#64748B', fontSize: 12 }} />
          <span style={{ fontSize: 13, color: '#64748B' }}>
            {new Date(date).toLocaleString('zh-CN')}
          </span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled) => (
        <Badge 
          status={enabled ? 'success' : 'default'}
          text={enabled ? '启用' : '禁用'}
          style={{ fontWeight: 500 }}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ color: '#3B82F6' }}
            />
          </Tooltip>
          {record.type !== 'main' && (
            <>
              {record.enabled ? (
                <Tooltip title="禁用">
                  <Button
                    type="text"
                    icon={<StopOutlined />}
                    onClick={() => handleDisable(record)}
                    style={{ color: '#F59E0B' }}
                  />
                </Tooltip>
              ) : (
                <Tooltip title="启用">
                  <Button
                    type="text"
                    icon={<PlayCircleOutlined />}
                    onClick={() => handleEnable(record)}
                    style={{ color: '#10B981' }}
                  />
                </Tooltip>
              )}
              <Popconfirm
                title="确认删除"
                description="确定要删除此配置文件吗？"
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
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="总配置数"
              value={stats.total}
              prefix={<DatabaseOutlined style={{ color: '#3B82F6' }} />}
              valueStyle={{ color: '#3B82F6', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="已启用"
              value={stats.enabled}
              prefix={<PlayCircleOutlined style={{ color: '#10B981' }} />}
              valueStyle={{ color: '#10B981', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="已禁用"
              value={stats.disabled}
              prefix={<StopOutlined style={{ color: '#F59E0B' }} />}
              valueStyle={{ color: '#F59E0B', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="子配置"
              value={stats.sub}
              prefix={<FolderOutlined style={{ color: '#8B5CF6' }} />}
              valueStyle={{ color: '#8B5CF6', fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="配置文件管理"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadConfigs}
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
              新建配置
            </Button>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={handleApply}
              loading={applying}
              style={{ borderRadius: '8px' }}
            >
              应用配置
            </Button>
          </Space>
        }
        className="config-table-card"
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="分布式管理"
            description="选择服务器后，可以管理该服务器上的nginx配置文件。未选择时管理本地配置文件。"
            type="info"
            showIcon
            icon={<CloudServerOutlined />}
          />
          <Space size="middle">
            <span style={{ fontWeight: 500 }}>选择服务器:</span>
            <Select
              style={{ width: 300 }}
              placeholder="选择服务器（可选）"
              loading={serversLoading}
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
          </Space>
          {configs.length === 0 && !loading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无配置文件"
              style={{ padding: '60px 0' }}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={configs}
              rowKey="path"
              loading={loading}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                pageSizeOptions: ['10', '20', '50', '100'],
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
                style: { marginTop: 16 },
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                },
              }}
              scroll={{ x: 1200 }}
            />
          )}
        </Space>
      </Card>

      <Modal
        title={currentConfig ? '编辑配置文件' : '新建配置文件'}
        open={editorModalVisible}
        onCancel={() => setEditorModalVisible(false)}
        width={1000}
        footer={[
          <Button key="cancel" onClick={() => setEditorModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="validate"
            icon={<CheckCircleOutlined />}
            onClick={handleValidate}
            loading={validating}
            style={{ borderRadius: '8px' }}
          >
            验证
          </Button>,
          <Button
            key="save"
            type="primary"
            onClick={handleSave}
            loading={loading}
            style={{ borderRadius: '8px' }}
          >
            保存
          </Button>,
        ]}
        className="editor-modal"
      >
        {!currentConfig && (
          <Form form={form} layout="vertical" style={{ marginBottom: 16 }}>
            <Form.Item
              name="path"
              label="配置文件路径"
              rules={[{ required: true, message: '请输入配置文件路径' }]}
            >
              <Input 
                placeholder="/etc/nginx/conf.d/example.conf"
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          </Form>
        )}
        <div style={{ 
          border: '1px solid #E2E8F0', 
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <Editor
            height="500px"
            defaultLanguage={currentConfig?.name?.endsWith('.stream') ? 'nginx' : 'nginx'}
            value={editorContent}
            onChange={(value) => setEditorContent(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16 },
            }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ConfigFiles;