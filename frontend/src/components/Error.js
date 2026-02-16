import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const Error = ({ title = '出错了', subTitle, onRetry }) => {
  const navigate = useNavigate();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      navigate(-1);
    }
  };

  return (
    <Result
      status="error"
      title={title}
      subTitle={subTitle || '页面加载失败，请稍后重试'}
      extra={[
        <Button type="primary" key="retry" onClick={handleRetry}>
          重试
        </Button>,
        <Button key="back" onClick={() => navigate('/')}>
          返回首页
        </Button>,
      ]}
    />
  );
};

export default Error;
