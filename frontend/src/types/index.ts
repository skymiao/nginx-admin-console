export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  status: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Server {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  useSudo: boolean;
  isDefault: boolean;
  nginxConfigPath: string;
  nginxLogPath: string;
  nginxStatusUrl: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigFile {
  name: string;
  path: string;
  enabled: boolean;
  size: number;
  modified: string;
}

export interface LogEntry {
  ip: string;
  time: string;
  method: string;
  path: string;
  protocol: string;
  status: number;
  size: number;
  referer: string;
  userAgent: string;
}

export interface ErrorLogEntry {
  time: string;
  level: string;
  pid: number;
  tid: number;
  message: string;
}

export interface Upstream {
  name: string;
  configFile: string;
  algorithm: string;
  servers: UpstreamServer[];
}

export interface UpstreamServer {
  address: string;
  weight: number;
  maxFails: number;
  failTimeout: string;
  backup: boolean;
  down: boolean;
}

export interface NginxStatus {
  activeConnections: number;
  accepts: number;
  handled: number;
  requests: number;
  reading: number;
  writing: number;
  waiting: number;
}

export interface LogStatistics {
  totalRequests: number;
  uniqueVisitors: number;
  totalBytes: number;
  successRate: number;
  errorRate: number;
  statusCodeDistribution: {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
  };
  methodDistribution: {
    GET: number;
    POST: number;
    PUT: number;
    DELETE: number;
    PATCH: number;
    HEAD: number;
    OPTIONS: number;
  };
  topPaths: Array<{ path: string; count: number }>;
  topIPs: Array<{ ip: string; count: number }>;
}

export interface HistoryRecord {
  id: number;
  configPath: string;
  action: string;
  operator: string;
  content?: string;
  comment?: string;
  createdAt: string;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: string;
  status?: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CreateServerRequest {
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  useSudo?: boolean;
  nginxConfigPath?: string;
  nginxLogPath?: string;
  nginxStatusUrl?: string;
}

export interface UpdateServerRequest extends Partial<CreateServerRequest> {}

export interface CreateConfigRequest {
  path: string;
  content: string;
  serverId?: number;
}

export interface UpdateConfigRequest {
  content: string;
  serverId?: number;
}

export interface LogRequest {
  file?: string;
  lines?: number;
  keyword?: string;
  serverId?: number;
}
