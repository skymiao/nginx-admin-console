import React from 'react';
import { PageHeader as AntPageHeader, Button, Space, Breadcrumb } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const PageHeader = React.memo(({
  title,
  extra,
  onRefresh,
  breadcrumb,
  showRefresh = true,
}) => {
  return (
    <AntPageHeader
      title={title}
      breadcrumb={breadcrumb ? <Breadcrumb items={breadcrumb} /> : null}
      extra={
        <Space>
          {showRefresh && (
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              刷新
            </Button>
          )}
          {extra}
        </Space>
      }
      style={{ backgroundColor: '#fff', marginBottom: 16 }}
    />
  );
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;
