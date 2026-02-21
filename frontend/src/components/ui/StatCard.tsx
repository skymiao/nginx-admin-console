import React from 'react';
import { Card, Statistic } from 'antd';
import type { StatisticProps } from 'antd/es/statistic';

interface StatCardProps extends StatisticProps {
  title: string;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  loading = false,
  ...statisticProps
}) => {
  return (
    <Card loading={loading}>
      <Statistic title={title} {...statisticProps} />
    </Card>
  );
};

export default React.memo(StatCard);
