import React from 'react';
import { Table, Empty, Spin } from 'antd';

interface DataTableProps {
  columns: any[];
  dataSource: any[];
  loading?: boolean;
  rowKey?: string;
  pagination?: any;
  onRow?: (record: any, index?: number) => any;
  scroll?: any;
}

const DataTable: React.FC<DataTableProps> = React.memo(({
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
