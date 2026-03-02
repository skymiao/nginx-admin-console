const { z } = require('zod');
const { validatePassword } = require('../utils/passwordValidator');

const passwordValidation = (value, ctx) => {
  const errors = validatePassword(value);
  if (errors.length > 0) {
    return ctx.createError({
      message: errors.join('; '),
    });
  }
  return z.NEVER;
};

const createUserSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(50, '用户名最多50个字符'),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(8, '密码至少8个字符').max(100, '密码最多100个字符').refine(passwordValidation, { message: '密码强度不足' }),
  role: z.enum(['admin', 'developer', 'viewer'], '角色必须是 admin、developer 或 viewer'),
});

const updateUserSchema = createUserSchema.partial();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '当前密码不能为空'),
  newPassword: z.string().min(8, '新密码至少8个字符').max(100, '新密码最多100个字符').refine(passwordValidation, { message: '密码强度不足' }),
});

const createServerSchema = z.object({
  name: z.string().min(1, '服务器名称不能为空').max(100, '服务器名称最多100个字符'),
  host: z.string().min(1, '主机地址不能为空').max(255, '主机地址最多255个字符'),
  port: z.number().int('端口必须是整数').min(1, '端口最小为1').max(65535, '端口最大为65535'),
  username: z.string().min(1, '用户名不能为空').max(50, '用户名最多50个字符'),
  password: z.string().optional(),
  privateKey: z.string().optional(),
  useSudo: z.boolean().default(false),
  nginxConfigPath: z.string().default('/etc/nginx'),
  nginxLogPath: z.string().default('/var/log/nginx'),
  nginxStatusUrl: z.string().url('状态 URL 格式不正确').optional(),
});

const updateServerSchema = createServerSchema.partial();

const createConfigSchema = z.object({
  path: z.string().min(1, '路径不能为空').max(500, '路径最多500个字符'),
  content: z.string().min(1, '内容不能为空'),
  serverId: z.number().int('服务器 ID 必须是整数').optional(),
});

const updateConfigSchema = z.object({
  content: z.string().min(1, '内容不能为空'),
  serverId: z.number().int('服务器 ID 必须是整数').optional(),
});

const createRoleSchema = z.object({
  name: z.string().min(1, '角色名称不能为空').max(50, '角色名称最多50个字符'),
  description: z.string().min(1, '描述不能为空').max(200, '描述最多200个字符'),
  permissions: z.array(z.string()).min(1, '至少选择一个权限'),
});

const updateRoleSchema = createRoleSchema.partial();

const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  createServerSchema,
  updateServerSchema,
  createConfigSchema,
  updateConfigSchema,
  createRoleSchema,
  updateRoleSchema,
  loginSchema,
};
