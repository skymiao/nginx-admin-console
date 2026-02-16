import React from 'react';
import { Empty, Spin, Result, Button } from 'antd';
import {
  LoadingOutlined,
  ReloadOutlined,
  WarningOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';

export const LoadingState = ({ tip = '加载中...' }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    padding: '40px',
  }}>
    <Spin
      indicator={<LoadingOutlined style={{ fontSize: 48, color: '#3B82F6' }} spin />}
      tip={<span style={{ fontSize: 16, color: '#64748B', marginTop: 16 }}>{tip}</span>}
      size="large"
    />
  </div>
);

export const ErrorState = ({ 
  title = '加载失败',
  description = '数据加载失败，请稍后重试',
  onRetry 
}) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    padding: '40px',
  }}>
    <Result
      status="error"
      icon={<WarningOutlined style={{ fontSize: 72, color: '#EF4444' }} />}
      title={title}
      subTitle={description}
      extra={
        onRetry && (
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={onRetry}
            style={{ borderRadius: '8px' }}
          >
            重新加载
          </Button>
        )
      }
    />
  </div>
);

export const EmptyState = ({ 
  description = '暂无数据',
  image = Empty.PRESENTED_IMAGE_SIMPLE,
  action 
}) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    padding: '40px',
  }}>
    <Empty
      image={image}
      imageStyle={{
        height: 120,
      }}
      description={<span style={{ fontSize: 16, color: '#64748B' }}>{description}</span>}
    >
      {action}
    </Empty>
  </div>
);

export const PageLoading = () => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  }}>
    <Spin
      indicator={<LoadingOutlined style={{ fontSize: 64, color: '#3B82F6' }} spin />}
      size="large"
    />
  </div>
);

export const SkeletonCard = ({ height = 200 }) => (
  <div
    className="loading-skeleton"
    style={{
      height: `${height}px`,
      borderRadius: '12px',
    }}
  />
);

export const SkeletonRow = ({ count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="loading-skeleton"
        style={{
          height: '60px',
          marginBottom: '16px',
          borderRadius: '8px',
        }}
      />
    ))}
  </>
);

export const withLoadingState = (Component) => {
  return ({ loading, error, data, ...props }) => {
    if (loading) {
      return <LoadingState />;
    }

    if (error) {
      return <ErrorState />;
    }

    if (!data || data.length === 0) {
      return <EmptyState />;
    }

    return <Component data={data} {...props} />;
  };
};

export const LoadingOverlay = ({ loading, children }) => (
  <div style={{ position: 'relative' }}>
    {children}
    {loading && (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 255, 255, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '12px',
        zIndex: 10,
      }}>
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 32, color: '#3B82F6' }} spin />}
        />
      </div>
    )}
  </div>
);