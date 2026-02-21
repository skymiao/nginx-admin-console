import React from 'react';
import { Table, Empty, Spin } from 'antd';

const DataTable = React.memo(({
  columns,
  dataSource,
  loading = false,
  rowKey = 'id',
  pagination,
  onRow,
  scroll,
}) => {
  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      rowKey={rowKey}
      pagination={pagination}
      onRow={onRow}
      scroll={scroll}
      locale={{
        emptyText: loading ? <Spin /> : <Empty description="暂无数据" />,
      }}
    />
  );
});

DataTable.displayName = 'DataTable';

export default DataTable;
