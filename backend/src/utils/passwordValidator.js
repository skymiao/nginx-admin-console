const validatePassword = (password) => {
  const errors = [];

  if (!password || password.length === 0) {
    errors.push('密码不能为空');
    return errors;
  }

  if (password.length < 8) {
    errors.push('密码长度至少 8 位');
  }

  if (password.length > 100) {
    errors.push('密码最多 100 位');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含小写字母');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含大写字母');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('密码必须包含数字');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含特殊字符 (!@#$%^&*(),.?":{}|<>)');
  }

  return errors;
};

const getPasswordStrength = (password) => {
  if (!password) return 0;

  let strength = 0;

  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
  if (password.length >= 16) strength += 1;

  return strength;
};

const getPasswordStrengthLabel = (strength) => {
  switch (strength) {
    case 0:
    case 1:
      return { label: '极弱', color: '#ff4d4f', percent: 12.5 };
    case 2:
      return { label: '弱', color: '#ff7875', percent: 25 };
    case 3:
      return { label: '一般', color: '#ffc069', percent: 37.5 };
    case 4:
      return { label: '中等', color: '#ffd666', percent: 50 };
    case 5:
      return { label: '强', color: '#95de64', percent: 62.5 };
    case 6:
      return { label: '很强', color: '#5cdbd3', percent: 75 };
    case 7:
      return { label: '极强', color: '#1890ff', percent: 87.5 };
    case 8:
      return { label: '完美', color: '#52c41a', percent: 100 };
    default:
      return { label: '未知', color: '#d9d9d9', percent: 0 };
  }
};

module.exports = {
  validatePassword,
  getPasswordStrength,
  getPasswordStrengthLabel,
};
