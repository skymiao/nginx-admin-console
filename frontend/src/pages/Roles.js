import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Card,
  Tag,
  Tooltip,
  Popconfirm,
  Checkbox,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  TeamOutlined,
  KeyOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { roleAPI } from '../services/api';

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  const [form] = Form.useForm();
  const [permissionForm] = Form.useForm();
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await roleAPI.list();
      setRoles(response.data?.data || []);
    } catch (error) {
      console.error('Failed to load roles:', error);
      message.error('加载角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await roleAPI.getPermissions();
      setPermissions(response.data?.data || []);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      message.error('加载权限列表失败');
    }
  };

  const handleCreate = () => {
    setCurrentRole(null);
    form.resetFields();
    setSelectedPermissions([]);
    setModalVisible(true);
  };

  const handleEdit = (role) => {
    setCurrentRole(role);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
    });
    setSelectedPermissions(role.permissions || []);
    setModalVisible(true);
  };

  const handleDelete = async (role) => {
    try {
      await roleAPI.delete(role.id);
      message.success('删除成功');
      loadRoles();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const data = {
        ...values,
        permissions: selectedPermissions,
      };
      
      if (currentRole) {
        await roleAPI.update(currentRole.id, data);
        message.success('更新成功');
      } else {
        await roleAPI.create(data);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      loadRoles();
    } catch (error) {
      console.error('Save error:', error);
      if (error.response) {
        message.error(error.response.data.message || (currentRole ? '更新失败' : '创建失败'));
      } else {
        message.error(currentRole ? '更新失败' : '创建失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPermissionsByCategory = () => {
    const grouped = {};
    permissions.forEach(perm => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <TeamOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '权限数量',
      dataIndex: 'permissions',
      key: 'permissions',
      width: 120,
      render: (perms) => (
        <Tag color="blue">{perms.length} 个权限</Tag>
      ),
    },
    {
      title: '权限列表',
      dataIndex: 'permissions',
      key: 'permissionList',
      render: (perms) => (
        <Space wrap>
          {perms.slice(0, 3).map(perm => (
            <Tag key={perm} color="green">{perm}</Tag>
          ))}
          {perms.length > 3 && <Tag>+{perms.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {record.name !== 'admin' && (
            <Popconfirm
              title="确认删除"
              description="确定要删除此角色吗？"
              onConfirm={() => handleDelete(record)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button
                  type="link"
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

  const groupedPermissions = getPermissionsByCategory();

  return (
    <div>
      <Card
        title="角色管理"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadRoles}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              新建角色
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={roles}
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
        title={currentRole ? '编辑角色' : '新建角色'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        confirmLoading={loading}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="角色名称"
            rules={[
              { required: true, message: '请输入角色名称' },
              { pattern: /^[a-z_]+$/, message: '只能包含小写字母和下划线' },
            ]}
          >
            <Input
              prefix={<TeamOutlined />}
              placeholder="请输入角色名称（如：developer）"
              disabled={!!currentRole}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入描述' }]}
          >
            <Input
              prefix={<SafetyOutlined />}
              placeholder="请输入角色描述"
            />
          </Form.Item>
          <Form.Item
            label="权限"
          >
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: 16 }}>
              <Checkbox.Group 
                style={{ width: '100%' }}
                value={selectedPermissions}
                onChange={setSelectedPermissions}
              >
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category} style={{ marginBottom: 16 }}>
                    <Divider orientation="left" style={{ margin: '8px 0' }}>
                      {category}
                    </Divider>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {perms.map(perm => (
                        <Checkbox key={perm.id} value={perm.id}>
                          <Space>
                            <KeyOutlined />
                            <span>{perm.name}</span>
                            <Tag color="blue" style={{ fontSize: 12 }}>{perm.id}</Tag>
                          </Space>
                        </Checkbox>
                      ))}
                    </Space>
                  </div>
                ))}
              </Checkbox.Group>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Roles;
