import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tag,
  Row,
  Col,
  Descriptions,
  Alert,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { logFormatAPI, serverAPI } from '../services/api';

const LogFormats = () => {
  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentFormat, setCurrentFormat] = useState(null);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();
  const [servers, setServers] = useState([]);

  useEffect(() => {
    loadFormats();
    loadServers();
  }, []);

  const loadFormats = async () => {
    try {
      setLoading(true);
      const response = await logFormatAPI.list();
      setFormats(response.data.data || []);
    } catch (error) {
      message.error('加载日志格式失败');
    } finally {
      setLoading(false);
    }
  };

  const loadServers = async () => {
    try {
      const response = await serverAPI.getServers();
      const data = response.data?.data || response.data || [];
      const servers = Array.isArray(data) ? data : [];
      const filteredServers = servers.filter(server => !server.is_default);
      setServers(filteredServers);
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const handleAdd = () => {
    setCurrentFormat(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (format) => {
    setCurrentFormat(format);
    form.setFieldsValue(format);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await logFormatAPI.delete(id);
      message.success('删除成功');
      loadFormats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (currentFormat) {
        await logFormatAPI.update(currentFormat.id, values);
        message.success('更新成功');
      } else {
        await logFormatAPI.create(values);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      loadFormats();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleTest = async () => {
    try {
      setTestLoading(true);
      const values = await testForm.validateFields();
      const response = await logFormatAPI.test(values);
      setTestResult(response.data.data);
      setTestModalVisible(true);
    } catch (error) {
      message.error('格式测试失败');
    } finally {
      setTestLoading(false);
    }
  };

  const handleQuickTest = async (format) => {
    try {
      setTestLoading(true);
      const response = await logFormatAPI.test({
        format_pattern: format.format_pattern,
        field_mapping: format.field_mapping,
        sample_log: '192.168.1.1 - - [25/Feb/2026:08:41:45 +0800] "GET /api/test HTTP/1.1" 200 1234 "-" "-"'
      });
      setTestResult(response.data.data);
      setTestModalVisible(true);
    } catch (error) {
      message.error('格式测试失败');
    } finally {
      setTestLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '格式名称',
      dataIndex: 'format_name',
      key: 'format_name',
      width: 120,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (active) => active ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<ExperimentOutlined />}
            size="small"
            onClick={() => handleQuickTest(record)}
            loading={testLoading}
          >
            测试
          </Button>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const presetFormats = [
    {
      label: 'Nginx Default Log Format',
      value: 'nginx_default',
      pattern: '^\\s*(\\S+)\\s*-\\s*(\\S+)\\s*\\[([^\\]]+)\\]\\s*"([^"]+)"\\s*(\\d{3})\\s*(\\d+)(?:\\s*"([^"]*)")?(?:\\s*"([^"]*)")?(?:\\s*"([^"]*)")?(?:\\s*\\(([^)]+)\\))?(?:\\s*@\\s*\\S+(?:\\s*\\S+)*)?\\s*$',
      mapping: '{"ip":1,"time":3,"method":4,"path":4,"protocol":4,"status":5,"size":6,"referer":7,"userAgent":8}',
      description: 'Nginx默认日志格式（Combined Log Format）'
    },
    {
      label: 'Combined with Virtual Host',
      value: 'combined_vhost',
      pattern: '^(\\S+) \\S+ \\S+ \\[([^\\]]+)\\] "([A-Z]+) ([^"]+) ([^"]+)" (\\d{3}) (\\d+) "([^"]*)" "([^"]*)"$',
      mapping: '{"ip":1,"time":2,"method":3,"path":4,"protocol":5,"status":6,"size":7,"referer":8,"userAgent":9}',
      description: '包含虚拟主机的组合日志格式'
    },
    {
      label: 'Common Log Format',
      value: 'common',
      pattern: '^(\\S+) \\S+ \\S+ \\[([^\\]]+)\\] "([^"]+)" (\\d{3}) (\\d+)$',
      mapping: '{"ip":1,"time":2,"method":3,"path":3,"protocol":3,"status":4,"size":5}',
      description: 'Apache通用日志格式'
    },
    {
      label: 'JSON Format',
      value: 'json',
      pattern: '^\\{.*\\}$',
      mapping: '{"ip":"ip","time":"time","method":"method","path":"path","protocol":"protocol","status":"status","size":"size","referer":"referer","userAgent":"userAgent"}',
      description: 'JSON格式日志'
    },
    {
      label: 'Custom App Log Format',
      value: 'custom_app',
      pattern: '^(\\d{1,3}(?:\\.\\d{1,3}){3})\\s+-\\s+ruser:\\[[^\\]]*\\]\\s+-\\s+\\[([^\\]]+)\\]\\s+-\\s+request:\\[([A-Z]+)\\s+(\\S+)\\s+([^\\]]+)\\]\\s+-\\s+channel:\\[[^\\]]*\\]\\s+-\\s+reqId:\\[[^\\]]*\\]\\s+-\\s+routeName:\\[[^\\]]*\\]\\s+-\\s+jsessionId:\\[[^\\]]*\\]\\s+-\\s+logToken:\\[[^\\]]*\\]\\s+-\\s+timestamp:\\[[^\\]]*\\]\\s+-\\s+platId:\\[[^\\]]*\\]\\s+-\\s+http_status:\\[(\\d{3})\\]\\s+-\\s+body_bytes_sent:\\[(\\d+)\\]\\s+-\\s+http_referer:\\[(.*?)\\]\\s+-\\s+http_user_agent:\\[([^\\]]*)\\]',
      mapping: '{"ip":1,"time":2,"method":3,"path":4,"protocol":5,"status":6,"size":7,"referer":8,"userAgent":9}',
      description: '自定义应用日志格式'
    },
    {
      label: 'Custom',
      value: 'custom',
      pattern: '',
      mapping: '',
      description: '自定义格式'
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <ExperimentOutlined />
            <span>日志格式管理</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ExperimentOutlined />}
              onClick={() => setTestModalVisible(true)}
            >
              测试格式
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              添加格式
            </Button>
          </Space>
        }
      >
        <Alert
          message="日志格式说明"
          description="为不同服务器配置不同的日志解析格式。系统会根据服务器IP自动选择对应的格式进行日志解析。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={formats}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={currentFormat ? '编辑日志格式' : '添加日志格式'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="server_ips"
            label="服务器IP"
            rules={[
              { required: true, message: '请至少选择一个服务器IP' }
            ]}
          >
            <Select
              mode="multiple"
              placeholder="请选择服务器IP"
              allowClear
            >
              <Select.Option key="default" value="default">
                <Tag color="blue">默认</Tag>
              </Select.Option>
              {servers.map(server => (
                <Select.Option key={server.host} value={server.host}>
                  {server.name} ({server.host})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="format_name"
            label="格式名称"
            rules={[{ required: true, message: '请选择或输入格式名称' }]}
          >
            <Select placeholder="选择预设格式或输入自定义名称">
              {presetFormats.map(format => (
                <Select.Option key={format.value} value={format.value}>
                  {format.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.format_name !== currentValues.format_name}
          >
            {({ getFieldValue }) => {
              const formatName = getFieldValue('format_name');
              const preset = presetFormats.find(f => f.value === formatName);
              
              if (preset && preset.pattern) {
                form.setFieldsValue({
                  format_pattern: preset.pattern,
                  field_mapping: preset.mapping,
                  description: preset.description,
                });
              }
              
              return null;
            }}
          </Form.Item>

          <Form.Item
            name="format_pattern"
            label="正则表达式"
            rules={[
              { required: true, message: '请输入正则表达式' },
              {
                validator: (_, value) => {
                  try {
                    if (value) new RegExp(value);
                    return Promise.resolve();
                  } catch (error) {
                    return Promise.reject('正则表达式格式错误');
                  }
                }
              }
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="输入正则表达式，例如: ^(\\S+) \\S+ \\S+ \\[([^\\]]+)\\] ..."
            />
          </Form.Item>

          <Form.Item
            name="field_mapping"
            label="字段映射 (JSON)"
            rules={[
              { required: true, message: '请输入字段映射' },
              {
                validator: (_, value) => {
                  try {
                    if (value) JSON.parse(value);
                    return Promise.resolve();
                  } catch (error) {
                    return Promise.reject('JSON格式错误');
                  }
                }
              }
            ]}
          >
            <Input.TextArea
              rows={3}
              placeholder='{"ip":1,"time":2,"method":3,"path":4,"protocol":5,"status":6,"size":7}'
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea
              rows={2}
              placeholder="格式描述"
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="状态"
            valuePropName="checked"
            initialValue={true}
          >
            <Select>
              <Select.Option value={true}>启用</Select.Option>
              <Select.Option value={false}>禁用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="测试日志格式"
        open={testModalVisible}
        onOk={() => setTestModalVisible(false)}
        onCancel={() => setTestModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setTestModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <Form form={testForm} layout="vertical">
          <Form.Item
            name="format_pattern"
            label="正则表达式"
            rules={[{ required: true, message: '请输入正则表达式' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="field_mapping"
            label="字段映射 (JSON)"
            rules={[{ required: true, message: '请输入字段映射' }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item
            name="sample_log"
            label="示例日志行"
            rules={[{ required: true, message: '请输入示例日志行' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder='192.168.1.1 - - [25/Feb/2026:08:41:45 +0800] "GET /api/test HTTP/1.1" 200 1234 "-" "-"'
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<ExperimentOutlined />}
              onClick={handleTest}
              loading={testLoading}
              block
            >
              测试格式
            </Button>
          </Form.Item>
        </Form>

        {testResult && (
          <>
            <Divider />
            <Alert
              message={testResult.matched ? '格式匹配成功' : '格式匹配失败'}
              description={
                testResult.matched ? (
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="匹配状态">
                      <Tag icon={<CheckCircleOutlined />} color="success">
                        成功
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="解析字段" span={2}>
                      <pre style={{ margin: 0, fontSize: 12 }}>
                        {JSON.stringify(testResult.fields, null, 2)}
                      </pre>
                    </Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="error">
                    日志行不匹配该格式
                  </Tag>
                )
              }
              type={testResult.matched ? 'success' : 'error'}
              showIcon
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default LogFormats;
