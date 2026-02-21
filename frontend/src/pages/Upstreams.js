import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  message,
  Spin,
  Descriptions,
  Row,
  Col,
  Statistic,
  Alert,
  Progress,
  Tooltip,
  Select,
  Popconfirm,
  Modal,
  Form,
  InputNumber,
} from 'antd';
import {
  ReloadOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  HeatmapOutlined,
  SafetyOutlined,
  StopOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { upstreamAPI, serverAPI, configAPI } from '../services/api';

const Upstreams = () => {
  const navigate = useNavigate();
  const [upstreams, setUpstreams] = useState([]);
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serversLoading, setServersLoading] = useState(false);
  const [selectedUpstream, setSelectedUpstream] = useState(null);
  const [editServerModalVisible, setEditServerModalVisible] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [applying, setApplying] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

  const handleConfigFileClick = (filePath) => {
    navigate('/configs', { state: { editFile: filePath, serverId: selectedServer } });
  };

  const handleLoadBalancingMethodChange = async (newMethod, upstreamRecord) => {
    try {
      setLoading(true);
      const configPath = upstreamRecord.file;
      const response = await configAPI.get(configPath, selectedServer);
      let content = response.data.content;
      
      const upstreamName = upstreamRecord.name;
      
      const upstreamPattern = new RegExp(`upstream\\s+${upstreamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`, 's');
      const upstreamMatch = content.match(upstreamPattern);
      
      if (!upstreamMatch) {
        message.error('未找到upstream配置');
        return;
      }
      
      const upstreamBlock = upstreamMatch[1];
      const fullUpstreamMatch = upstreamMatch[0];
      const upstreamHeader = fullUpstreamMatch.substring(0, fullUpstreamMatch.indexOf(upstreamBlock));
      const upstreamFullStartIndex = upstreamMatch.index;
      const upstreamFullEndIndex = upstreamFullStartIndex + fullUpstreamMatch.length;
      
      const unsupportedMethods = ['ip_hash', 'hash', 'random'];
      if (unsupportedMethods.includes(newMethod)) {
        const backupPattern = /server\s+[^\s;]+[^;]*\bbackup\b/g;
        const backupMatch = upstreamBlock.match(backupPattern);
        
        if (backupMatch) {
          message.warning('当前配置中存在 backup 参数的备份服务器，ip_hash、hash、random 算法不支持备份功能。请先取消备份功能，再进行设置。');
          return;
        }
      }
      
      const lines = upstreamBlock.split('\n');
      const methodLines = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        if (!trimmedLine) continue;
        
        const methodPattern = /(least_conn|least_time|ip_hash|hash|random)/;
        const match = line.match(methodPattern);
        
        if (match) {
          methodLines.push({ index: i, method: match[1], isCommented: trimmedLine.startsWith('#') });
        }
      }
      
      let newUpstreamBlock;
      
      if (newMethod === 'round_robin') {
        const newLines = lines.filter((line, index) => !methodLines.some(l => l.index === index));
        newUpstreamBlock = newLines.join('\n');
      } else if (methodLines.length === 0) {
        const indentMatch = upstreamBlock.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '    ';
        const insertLine = `${indent}${newMethod};`;
        const newLines = [insertLine, ...lines];
        newUpstreamBlock = newLines.join('\n');
      } else {
        const commentedNewMethodLine = methodLines.find(l => l.method === newMethod && l.isCommented);
        
        if (commentedNewMethodLine) {
          const newLines = [...lines];
          newLines[commentedNewMethodLine.index] = newLines[commentedNewMethodLine.index].replace(/^(\s*)#\s*/, '$1');
          
          const linesToRemove = methodLines.filter(l => l.index !== commentedNewMethodLine.index);
          const filteredLines = newLines.filter((line, index) => !linesToRemove.some(l => l.index === index));
          newUpstreamBlock = filteredLines.join('\n');
        } else {
          const activeMethodLine = methodLines.find(l => !l.isCommented);
          
          if (activeMethodLine) {
            const newLines = [...lines];
            newLines[activeMethodLine.index] = newLines[activeMethodLine.index].replace(activeMethodLine.method, newMethod);
            newUpstreamBlock = newLines.join('\n');
          } else {
            const indentMatch = upstreamBlock.match(/^(\s*)/);
            const indent = indentMatch ? indentMatch[1] : '    ';
            const insertLine = `${indent}${newMethod};`;
            const newLines = [insertLine, ...lines];
            newUpstreamBlock = newLines.join('\n');
          }
        }
      }
      
      newUpstreamBlock = newUpstreamBlock.replace(/^\s*\n/, '').replace(/\n\s*$/, '');
      newUpstreamBlock = newUpstreamBlock.replace(/\n\s*\n/g, '\n');
      
      const newContent = content.substring(0, upstreamFullStartIndex) + upstreamHeader + '\n' + newUpstreamBlock + '\n}' + content.substring(upstreamFullEndIndex);
      
      await configAPI.update(configPath, { 
        content: newContent,
        ...(selectedServer && { serverId: selectedServer })
      });
      
      message.success('负载均衡算法更新成功');
      loadUpstreams();
    } catch (error) {
      message.error('操作失败');
      console.error('Load balancing method change error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServerAction = async (server, action, upstreamRecord) => {
    try {
      setLoading(true);
      const configPath = upstreamRecord ? upstreamRecord.file : selectedUpstream.file;
      const response = await configAPI.get(configPath, selectedServer);
      let content = response.data.content;
      
      const upstreamName = upstreamRecord ? upstreamRecord.name : selectedUpstream.name;
      
      const upstreamPattern = new RegExp(`upstream\\s+${upstreamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]+)\\}`, 's');
      const upstreamMatch = content.match(upstreamPattern);
      
      if (!upstreamMatch) {
        message.error('未找到upstream配置');
        return;
      }
      
      const upstreamBlock = upstreamMatch[1];
      const upstreamStartIndex = upstreamMatch.index + upstreamMatch[0].indexOf(upstreamBlock);
      
      const escapedAddress = server.address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const serverPattern = new RegExp(`^\\s*#?\\s*server\\s+${escapedAddress}(?:\\s+[^;]*)?;?`, 'gm');
      let match;
      const serverLines = [];
      
      while ((match = serverPattern.exec(upstreamBlock)) !== null) {
        serverLines.push({ index: upstreamStartIndex + match.index, match: match[0] });
      }
      
      if (serverLines.length === 0) {
        message.error('未找到服务器配置');
        return;
      }
      
      const serverLine = serverLines[0];
      let newServerLine = serverLine.match;
      
      if (action === 'down') {
        if (newServerLine.trim().startsWith('#')) {
          message.warning('服务器已经是下线状态');
          return;
        }
        const leadingWhitespace = newServerLine.match(/^(\s*)/)[1];
        newServerLine = leadingWhitespace + '#' + newServerLine.substring(leadingWhitespace.length);
      } else if (action === 'up') {
        if (!newServerLine.trim().startsWith('#') && !newServerLine.includes(' backup')) {
          message.warning('服务器已经是活跃状态');
          return;
        }
        if (newServerLine.trim().startsWith('#')) {
          newServerLine = newServerLine.replace(/^(\s*)#\s*/, '$1');
        } else {
          newServerLine = newServerLine.replace(/\s+backup;?/, ';');
        }
      } else if (action === 'backup') {
        const lbMethod = upstreamRecord ? upstreamRecord.loadBalancingMethod : selectedUpstream.loadBalancingMethod;
        const unsupportedMethods = ['ip_hash', 'hash', 'random'];
        
        if (unsupportedMethods.includes(lbMethod)) {
          message.warning(`当前负载均衡算法为 ${lbMethod}，不支持备份设置。只支持不设置算法、轮询算法或 least_conn 算法。`);
          return;
        }
        
        if (newServerLine.includes(' backup;') || newServerLine.includes(' backup ')) {
          message.warning('服务器已经是备份状态');
          return;
        }
        if (newServerLine.trim().startsWith('#')) {
          const leadingWhitespace = newServerLine.match(/^(\s*)/)[1];
          newServerLine = newServerLine.replace(/^(\s*)#\s*/, '$1');
          newServerLine = newServerLine.replace(/;?$/, ' backup;');
        } else {
          newServerLine = newServerLine.replace(/;?$/, ' backup;');
        }
      } else if (action === 'unbackup') {
        if (!newServerLine.includes(' backup') && !newServerLine.includes(' backup;')) {
          message.warning('服务器不是备份状态');
          return;
        }
        newServerLine = newServerLine.replace(/\s+backup;?/, ';');
      }
      
      const newContent = content.substring(0, serverLine.index) + newServerLine + content.substring(serverLine.index + serverLine.match.length);
      
      await configAPI.update(configPath, { 
        content: newContent,
        ...(selectedServer && { serverId: selectedServer })
      });
      
      message.success('服务器状态更新成功');
      loadUpstreams();
    } catch (error) {
      message.error('操作失败');
      console.error('Server action error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyConfig = async () => {
    try {
      setApplying(true);
      await configAPI.apply(selectedServer);
      message.success('配置应用成功');
    } catch (error) {
      message.error('配置应用失败');
      console.error('Apply config error:', error);
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => {
    loadServers();
    loadUpstreams();
  }, []);

  useEffect(() => {
    loadUpstreams();
  }, [selectedServer]);

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

  const loadUpstreams = async () => {
    try {
      setLoading(true);
      const response = await upstreamAPI.getStats(selectedServer);
      setUpstreams(response.data?.data || []);
    } catch (error) {
      message.error('加载 upstream 列表失败');
      console.error('Failed to load upstreams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadUpstreams();
  };

  const getUpstreamHealth = (upstream) => {
    const total = upstream.totalServers;
    if (total === 0) return { status: 'unknown', percent: 0, color: '#94A3B8' };
    const active = upstream.activeServers;
    const percent = (active / total) * 100;
    
    if (percent === 100) return { status: 'healthy', percent, color: '#10B981' };
    if (percent >= 80) return { status: 'good', percent, color: '#34D399' };
    if (percent >= 60) return { status: 'warning', percent, color: '#F59E0B' };
    return { status: 'critical', percent, color: '#EF4444' };
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <CloudServerOutlined style={{ color: '#3B82F6', fontSize: 16 }} />
          <strong style={{ fontSize: 14, color: '#1E293B' }}>{text}</strong>
        </Space>
      ),
    },
    {
      title: '配置文件',
      dataIndex: 'file',
      key: 'file',
      ellipsis: true,
      render: (text) => {
        const parts = text.split('/');
        return (
          <Tooltip title={text}>
            <Button
              type="link"
              onClick={() => handleConfigFileClick(text)}
              style={{ padding: 0, color: '#3B82F6', fontWeight: 500 }}
            >
              {parts[parts.length - 1]}
            </Button>
          </Tooltip>
        );
      },
    },
    {
      title: '负载均衡',
      dataIndex: 'loadBalancingMethod',
      key: 'loadBalancingMethod',
      render: (method) => {
        const methodMap = {
          'round_robin': '轮询',
          'least_conn': '最少连接',
          'least_time': '最少时间',
          'ip_hash': 'IP 哈希',
          'hash': '哈希',
          'random': '随机',
        };
        return <Tag color="blue" style={{ fontWeight: 500 }}>{methodMap[method] || method}</Tag>;
      },
    },
    {
      title: '健康状态',
      key: 'health',
      render: (_, record) => {
        const health = getUpstreamHealth(record);
        return (
          <div style={{ width: 120 }}>
            <Progress
              percent={health.percent}
              strokeColor={health.color}
              size="small"
              showInfo={false}
            />
            <span style={{ fontSize: 12, color: '#64748B' }}>
              {health.percent.toFixed(0)}% 活跃
            </span>
          </div>
        );
      },
    },
    {
      title: '服务器',
      key: 'servers',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="活跃服务器">
            <Tag color="success" style={{ margin: 0 }}>{record.activeServers}</Tag>
          </Tooltip>
          <Tooltip title="备份服务器">
            <Tag color="warning" style={{ margin: 0 }}>{record.backupServers}</Tag>
          </Tooltip>
          <Tooltip title="下线服务器">
            <Tag color="error" style={{ margin: 0 }}>{record.downServers}</Tag>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Keepalive',
      dataIndex: 'keepalive',
      key: 'keepalive',
      render: (value) => (
        value ? (
          <Space>
            <ThunderboltOutlined style={{ color: '#3B82F6' }} />
            <span style={{ color: '#64748B' }}>{value} 连接</span>
          </Space>
        ) : (
          <span style={{ color: '#94A3B8' }}>-</span>
        )
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => setSelectedUpstream(record)}
          style={{ padding: 0, color: '#3B82F6', fontWeight: 500 }}
        >
          查看详情
        </Button>
      ),
    },
  ];

  const getServerColumns = (upstreamRecord) => [
    {
      title: '服务器地址',
      dataIndex: 'address',
      key: 'address',
      render: (text) => (
        <Space>
          <ApiOutlined style={{ color: '#3B82F6' }} />
          <strong style={{ color: '#1E293B', fontSize: 13 }}>{text}</strong>
        </Space>
      ),
    },
    {
      title: '权重',
      dataIndex: 'weight',
      key: 'weight',
      render: (weight) => (
        <Tag color="blue" style={{ fontWeight: 500 }}>{weight}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          'active': { color: 'success', text: '活跃', icon: <CheckCircleOutlined /> },
          'backup': { color: 'warning', text: '待命中', icon: <WarningOutlined /> },
          'down': { color: 'error', text: '下线', icon: <CloseCircleOutlined /> },
        };
        const config = statusMap[status] || { color: 'default', text: status, icon: null };
        return (
          <Tag color={config.color} style={{ fontWeight: 500 }}>
            {config.icon} {config.text}
          </Tag>
        );
      },
    },
    {
      title: '最大失败',
      dataIndex: 'max_fails',
      key: 'max_fails',
      render: (value) => (
        <span style={{ color: '#64748B', fontSize: 13 }}>{value || '-'}</span>
      ),
    },
    {
      title: '失败超时',
      dataIndex: 'fail_timeout',
      key: 'fail_timeout',
      render: (value) => (
        <span style={{ color: '#64748B', fontSize: 13 }}>{value ? `${value}s` : '-'}</span>
      ),
    },
    {
      title: '最大连接',
      dataIndex: 'max_conns',
      key: 'max_conns',
      render: (value) => (
        <span style={{ color: '#64748B', fontSize: 13 }}>{value || '-'}</span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 250,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'down' ? (
            <Popconfirm
              title="确认上线"
              description="确定要将此服务器上线吗？"
              onConfirm={() => handleServerAction(record, 'up', upstreamRecord)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                style={{ color: '#10B981' }}
              >
                上线
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="确认下线"
              description="确定要将此服务器下线吗？"
              onConfirm={() => handleServerAction(record, 'down', upstreamRecord)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                icon={<StopOutlined />}
                style={{ color: '#F59E0B' }}
              >
                下线
              </Button>
            </Popconfirm>
          )}
          {record.status === 'backup' ? (
            <Popconfirm
              title="确认取消备份"
              description="确定要取消此服务器的备份状态吗？"
              onConfirm={() => handleServerAction(record, 'unbackup', upstreamRecord)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                icon={<CheckCircleOutlined />}
                style={{ color: '#64748B' }}
              >
                取消备份
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="确认设为备份"
              description="确定要将此服务器设为备份吗？"
              onConfirm={() => handleServerAction(record, 'backup', upstreamRecord)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                icon={<WarningOutlined />}
                style={{ color: '#64748B' }}
              >
                备份
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const serverColumns = getServerColumns(selectedUpstream);

  const getTotalStats = () => {
    return {
      totalUpstreams: upstreams.length,
      totalServers: upstreams.reduce((sum, u) => sum + u.totalServers, 0),
      activeServers: upstreams.reduce((sum, u) => sum + u.activeServers, 0),
      backupServers: upstreams.reduce((sum, u) => sum + u.backupServers, 0),
      downServers: upstreams.reduce((sum, u) => sum + u.downServers, 0),
    };
  };

  const totalStats = getTotalStats();

  return (
    <div className="animate-fade-in">
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="Upstream 总数"
              value={totalStats.totalUpstreams}
              prefix={<CloudServerOutlined style={{ color: '#3B82F6' }} />}
              valueStyle={{ color: '#3B82F6', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="服务器总数"
              value={totalStats.totalServers}
              prefix={<ApiOutlined style={{ color: '#64748B' }} />}
              valueStyle={{ color: '#64748B', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="活跃服务器"
              value={totalStats.activeServers}
              prefix={<CheckCircleOutlined style={{ color: '#10B981' }} />}
              valueStyle={{ color: '#10B981', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="异常服务器"
              value={totalStats.downServers}
              prefix={<CloseCircleOutlined style={{ color: '#EF4444' }} />}
              valueStyle={{ color: '#EF4444', fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Upstream 管理"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
              style={{ borderRadius: '8px' }}
            >
              刷新
            </Button>
          </Space>
        }
        className="upstream-card"
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
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
          <Spin spinning={loading}>
            {upstreams.length === 0 ? (
              <Alert
                message="暂无 upstream 配置"
                description="请在 Nginx 配置文件中添加 upstream 块"
                type="info"
                showIcon
                style={{ borderRadius: '8px' }}
              />
            ) : (
            <Table
              columns={columns}
              dataSource={upstreams}
              rowKey="name"
              pagination={false}
              className="upstream-table"
              expandable={{
                expandedRowRender: (record) => {
                  console.log('Rendering expanded row for:', record.name, 'servers:', record.servers);
                  if (!record || !record.servers || record.servers.length === 0) {
                    return (
                      <div style={{ padding: '16px 24px', background: '#F8FAFC' }}>
                        <div>暂无服务器配置</div>
                      </div>
                    );
                  }
                  return (
                    <div style={{ padding: '16px 24px', background: '#F8FAFC' }}>
                      <div style={{ marginBottom: 16 }}>
                        <div><strong>Upstream 名称:</strong> {record.name}</div>
                        <div><strong>配置文件:</strong> {record.file}</div>
                        <div style={{ marginTop: 8 }}>
                          <strong>负载均衡算法:</strong>
                          <Select
                            value={record.loadBalancingMethod}
                            onChange={(value) => handleLoadBalancingMethodChange(value, record)}
                            style={{ marginLeft: 8, width: 200 }}
                            size="small"
                            options={[
                              { label: '轮询 (round_robin)', value: 'round_robin' },
                              { label: '最少连接 (least_conn)', value: 'least_conn' },
                              { label: '最少时间 (least_time)', value: 'least_time' },
                              { label: 'IP 哈希 (ip_hash)', value: 'ip_hash' },
                              { label: '哈希 (hash)', value: 'hash' },
                              { label: '随机 (random)', value: 'random' },
                            ]}
                          />
                        </div>
                        <div><strong>Keepalive 连接:</strong> {record.keepalive || '未设置'}</div>
                      </div>
                      <div>
                        <div style={{ marginBottom: 12, fontWeight: 'bold' }}>
                          后端服务器列表
                        </div>
                        <Table
                          columns={getServerColumns(record)}
                          dataSource={record.servers}
                          rowKey="address"
                          pagination={false}
                          size="small"
                          className="server-table"
                        />
                      </div>
                    </div>
                  );
                },
                rowExpandable: () => true,
                expandedRowKeys,
                onExpand: (expanded, record) => {
                  console.log('onExpand called:', expanded, 'record:', record.name, 'current expandedRowKeys:', expandedRowKeys);
                  if (expanded === true) {
                    const newKeys = [record.name];
                    console.log('Setting expanded key:', newKeys);
                    setExpandedRowKeys(newKeys);
                  } else {
                    setExpandedRowKeys([]);
                  }
                },
              }}
            />
          )}
        </Spin>
        </Space>
      </Card>

      {selectedUpstream && (
        <Card
          title={`Upstream 详情: ${selectedUpstream.name}`}
          style={{ marginTop: 16 }}
          extra={
            <Space>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleApplyConfig}
                loading={applying}
                style={{ borderRadius: '8px' }}
              >
                应用配置
              </Button>
              <Button onClick={() => setSelectedUpstream(null)} style={{ borderRadius: '8px' }}>
                关闭
              </Button>
            </Space>
          }
          className="upstream-detail-card"
        >
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={12} md={6}>
              <Statistic
                title="总服务器数"
                value={selectedUpstream.totalServers}
                prefix={<ApiOutlined />}
                valueStyle={{ color: '#64748B' }}
              />
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Statistic
                title="活跃服务器"
                value={selectedUpstream.activeServers}
                valueStyle={{ color: '#10B981' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Statistic
                title="备份服务器"
                value={selectedUpstream.backupServers}
                valueStyle={{ color: '#F59E0B' }}
                prefix={<WarningOutlined />}
              />
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Statistic
                title="下线服务器"
                value={selectedUpstream.downServers}
                valueStyle={{ color: '#EF4444' }}
                prefix={<CloseCircleOutlined />}
              />
            </Col>
          </Row>
          <div style={{ marginBottom: 16 }}>
            <Space>
              <span style={{ fontWeight: 500 }}>负载均衡算法:</span>
              <Select
                value={selectedUpstream.loadBalancingMethod}
                onChange={(value) => handleLoadBalancingMethodChange(value, selectedUpstream)}
                style={{ width: 200 }}
                options={[
                  { label: '轮询 (round_robin)', value: 'round_robin' },
                  { label: '最少连接 (least_conn)', value: 'least_conn' },
                  { label: '最少时间 (least_time)', value: 'least_time' },
                  { label: 'IP 哈希 (ip_hash)', value: 'ip_hash' },
                  { label: '哈希 (hash)', value: 'hash' },
                  { label: '随机 (random)', value: 'random' },
                ]}
              />
            </Space>
          </div>
          <Table
            columns={serverColumns}
            dataSource={selectedUpstream.servers}
            rowKey="address"
            pagination={false}
            className="server-table"
          />
        </Card>
      )}
    </div>
  );
};

export default Upstreams;