import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  message,
  Card,
  Tag,
  Tooltip,
  Descriptions,
  Popconfirm,
} from 'antd';
import {
  ReloadOutlined,
  RollbackOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { historyAPI } from '../services/api';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentHistory, setCurrentHistory] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await historyAPI.list();
      setHistory(response.data || []);
    } catch (error) {
      message.error('加载历史记录失败');
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (record) => {
    try {
      setLoading(true);
      const response = await historyAPI.get(record.id);
      setCurrentHistory({
        ...record,
        content: response.data.content,
      });
      setDetailModalVisible(true);
    } catch (error) {
      message.error('加载历史详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (record) => {
    try {
      setRestoring(true);
      await historyAPI.restore(record.id);
      message.success('恢复成功');
      loadHistory();
    } catch (error) {
      message.error('恢复失败');
    } finally {
      setRestoring(false);
    }
  };

  const getActionTag = (action) => {
    const actionMap = {
      create: { color: 'green', text: '创建' },
      update: { color: 'blue', text: '更新' },
      delete: { color: 'red', text: '删除' },
    };
    const config = actionMap[action] || { color: 'default', text: action };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action) => getActionTag(action),
    },
    {
      title: '配置文件',
      dataIndex: 'configPath',
      key: 'configPath',
      ellipsis: true,
      render: (path) => (
        <Space>
          <FileTextOutlined />
          <span>{path}</span>
        </Space>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 120,
      render: (operator) => (
        <Space>
          <UserOutlined />
          <span>{operator}</span>
        </Space>
      ),
    },
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '备注',
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          {record.action !== 'delete' && (
            <Popconfirm
              title="确认恢复"
              description="确定要恢复到此版本吗？当前配置将被覆盖。"
              onConfirm={() => handleRestore(record)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="恢复版本">
                <Button
                  type="link"
                  icon={<RollbackOutlined />}
                  loading={restoring}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="配置历史记录"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={loadHistory}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={history}
          rowKey="id"
          loading={loading}
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
            <ClockCircleOutlined />
            历史版本详情
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          currentHistory?.action !== 'delete' && (
            <Popconfirm
              title="确认恢复"
              description="确定要恢复到此版本吗？当前配置将被覆盖。"
              onConfirm={() => {
                handleRestore(currentHistory);
                setDetailModalVisible(false);
              }}
              okText="确定"
              cancelText="取消"
            >
              <Button
                key="restore"
                type="primary"
                icon={<RollbackOutlined />}
                loading={restoring}
              >
                恢复此版本
              </Button>
            </Popconfirm>
          ),
        ]}
      >
        {currentHistory && (
          <div>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="ID">{currentHistory.id}</Descriptions.Item>
              <Descriptions.Item label="操作类型">
                {getActionTag(currentHistory.action)}
              </Descriptions.Item>
              <Descriptions.Item label="配置文件" span={2}>
                {currentHistory.configPath}
              </Descriptions.Item>
              <Descriptions.Item label="操作人">
                <Space>
                  <UserOutlined />
                  {currentHistory.operator}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="操作时间">
                <Space>
                  <ClockCircleOutlined />
                  {new Date(currentHistory.createdAt).toLocaleString('zh-CN')}
                </Space>
              </Descriptions.Item>
              {currentHistory.comment && (
                <Descriptions.Item label="备注" span={2}>
                  {currentHistory.comment}
                </Descriptions.Item>
              )}
            </Descriptions>
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}>
              <Editor
                height="400px"
                defaultLanguage="nginx"
                value={currentHistory.content || ''}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  readOnly: true,
                }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default History;
