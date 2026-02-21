import React from 'react';
import { Modal, Form, Button, Space } from 'antd';

const { useForm } = Form;

const ModalForm = React.memo(({
  visible,
  title,
  onCancel,
  onSubmit,
  form,
  loading = false,
  children,
  width = 600,
}) => {
  const [formInstance] = useForm();

  const handleSubmit = async () => {
    try {
      const values = await formInstance.validateFields();
      await onSubmit(values);
      formInstance.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancel = () => {
    formInstance.resetFields();
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      title={title}
      onCancel={handleCancel}
      footer={
        <Space>
          <Button onClick={handleCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            确定
          </Button>
        </Space>
      }
      width={width}
      destroyOnClose
    >
      <Form form={formInstance} layout="vertical">
        {children}
      </Form>
    </Modal>
  );
});

ModalForm.displayName = 'ModalForm';

export default ModalForm;
