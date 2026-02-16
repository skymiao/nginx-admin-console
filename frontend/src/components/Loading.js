import React from 'react';

const Loading = ({ size = 'default', tip = '加载中...' }) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: size === 'large' ? '400px' : '200px',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div className="spinner" style={{
        width: size === 'large' ? 50 : 30,
        height: size === 'large' ? 50 : 30,
        border: '3px solid #f3f3f3',
        borderTop: '3px solid #1890ff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <span style={{ color: '#999' }}>{tip}</span>
    </div>
  );
};

export default Loading;
