import React from 'react';
import { Select } from 'antd';
import type { Server } from '../../types';

interface ServerSelectorProps {
  servers: Server[];
  selectedServer: number | null;
  onChange: (serverId: number) => void;
  loading?: boolean;
}

export const ServerSelector: React.FC<ServerSelectorProps> = ({
  servers,
  selectedServer,
  onChange,
  loading = false,
}) => {
  return (
    <Select
      value={selectedServer}
      onChange={onChange}
      loading={loading}
      placeholder="选择服务器"
      style={{ width: 200 }}
      allowClear
    >
      {servers.map(server => (
        <Select.Option key={server.id} value={server.id}>
          {server.name} {server.isDefault && '(默认)'}
        </Select.Option>
      ))}
    </Select>
  );
};

export default React.memo(ServerSelector);
