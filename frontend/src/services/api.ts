import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  User,
  Role,
  Server,
  ConfigFile,
  LogEntry,
  ErrorLogEntry,
  Upstream,
  NginxStatus,
  LogStatistics,
  HistoryRecord,
  Setting,
  ApiResponse,
  LoginRequest,
  LoginResponse,
  CreateUserRequest,
  UpdateUserRequest,
  ChangePasswordRequest,
  CreateServerRequest,
  UpdateServerRequest,
  CreateConfigRequest,
  UpdateConfigRequest,
  LogRequest,
} from '../types';

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const request = async <T = any>(config: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  try {
    const response: AxiosResponse<ApiResponse<T>> = await api(config);
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || error.message || '请求失败',
      error: error.response?.data?.error || error.message,
    };
  }
};

export const authAPI = {
  login: async (username: string, password: string): Promise<ApiResponse<LoginResponse>> => {
    return request<LoginResponse>({
      method: 'POST',
      url: '/auth/login',
      data: { username, password },
    });
  },
  logout: async (): Promise<ApiResponse> => {
    return request({
      method: 'POST',
      url: '/auth/logout',
    });
  },
  getMe: async (): Promise<ApiResponse<User>> => {
    return request<User>({
      method: 'GET',
      url: '/auth/me',
    });
  },
};

export const userAPI = {
  list: async (): Promise<ApiResponse<User[]>> => {
    return request<User[]>({
      method: 'GET',
      url: '/users',
    });
  },
  get: async (id: number): Promise<ApiResponse<User>> => {
    return request<User>({
      method: 'GET',
      url: `/users/${id}`,
    });
  },
  create: async (data: CreateUserRequest): Promise<ApiResponse<User>> => {
    return request<User>({
      method: 'POST',
      url: '/users',
      data,
    });
  },
  update: async (id: number, data: UpdateUserRequest): Promise<ApiResponse<User>> => {
    return request<User>({
      method: 'PUT',
      url: `/users/${id}`,
      data,
    });
  },
  delete: async (id: number): Promise<ApiResponse> => {
    return request({
      method: 'DELETE',
      url: `/users/${id}`,
    });
  },
  getProfile: async (): Promise<ApiResponse<User>> => {
    return request<User>({
      method: 'GET',
      url: '/users/profile/me',
    });
  },
  updateProfile: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    return request<User>({
      method: 'PUT',
      url: '/users/profile/me',
      data,
    });
  },
  changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse> => {
    return request({
      method: 'PUT',
      url: '/users/profile/me/password',
      data,
    });
  },
};

export const roleAPI = {
  list: async (): Promise<ApiResponse<Role[]>> => {
    return request<Role[]>({
      method: 'GET',
      url: '/roles',
    });
  },
  get: async (id: number): Promise<ApiResponse<Role>> => {
    return request<Role>({
      method: 'GET',
      url: `/roles/${id}`,
    });
  },
  getPermissions: async (): Promise<ApiResponse<string[]>> => {
    return request<string[]>({
      method: 'GET',
      url: '/roles/permissions',
    });
  },
  create: async (data: Partial<Role>): Promise<ApiResponse<Role>> => {
    return request<Role>({
      method: 'POST',
      url: '/roles',
      data,
    });
  },
  update: async (id: number, data: Partial<Role>): Promise<ApiResponse<Role>> => {
    return request<Role>({
      method: 'PUT',
      url: `/roles/${id}`,
      data,
    });
  },
  delete: async (id: number): Promise<ApiResponse> => {
    return request({
      method: 'DELETE',
      url: `/roles/${id}`,
    });
  },
};

export const configAPI = {
  list: async (serverId?: number): Promise<ApiResponse<ConfigFile[]>> => {
    return request<ConfigFile[]>({
      method: 'GET',
      url: '/configs',
      params: serverId ? { serverId } : undefined,
    });
  },
  get: async (path: string, serverId?: number): Promise<ApiResponse<{ content: string; path: string }>> => {
    return request({
      method: 'GET',
      url: '/configs/content',
      params: { path, ...(serverId && { serverId }) },
    });
  },
  create: async (data: CreateConfigRequest): Promise<ApiResponse> => {
    return request({
      method: 'POST',
      url: '/configs',
      data,
    });
  },
  update: async (path: string, data: UpdateConfigRequest): Promise<ApiResponse> => {
    return request({
      method: 'PUT',
      url: `/configs/${encodeURIComponent(path)}`,
      data,
    });
  },
  delete: async (path: string, serverId?: number): Promise<ApiResponse> => {
    return request({
      method: 'DELETE',
      url: `/configs/${encodeURIComponent(path)}`,
      params: serverId ? { serverId } : undefined,
    });
  },
  validate: async (content: string, serverId?: number): Promise<ApiResponse> => {
    return request({
      method: 'POST',
      url: '/configs/validate',
      data: { content, ...(serverId && { serverId }) },
    });
  },
  apply: async (serverId?: number): Promise<ApiResponse> => {
    return request({
      method: 'POST',
      url: '/configs/apply',
      data: serverId ? { serverId } : undefined,
    });
  },
  disable: async (path: string, serverId?: number): Promise<ApiResponse> => {
    return request({
      method: 'POST',
      url: `/configs/${encodeURIComponent(path)}/disable`,
      data: serverId ? { serverId } : undefined,
    });
  },
  enable: async (path: string, serverId?: number): Promise<ApiResponse> => {
    return request({
      method: 'POST',
      url: `/configs/${encodeURIComponent(path)}/enable`,
      data: serverId ? { serverId } : undefined,
    });
  },
};

export const logAPI = {
  getFiles: async (serverId?: number): Promise<ApiResponse<string[]>> => {
    return request<string[]>({
      method: 'GET',
      url: '/logs/files',
      params: serverId ? { serverId } : undefined,
    });
  },
  getAccessLog: async (params: LogRequest): Promise<ApiResponse<LogEntry[]>> => {
    return request<LogEntry[]>({
      method: 'GET',
      url: '/logs/access',
      params,
    });
  },
  getErrorLog: async (params: LogRequest): Promise<ApiResponse<ErrorLogEntry[]>> => {
    return request<ErrorLogEntry[]>({
      method: 'GET',
      url: '/logs/error',
      params,
    });
  },
  getTrend: async (file?: string, serverId?: number): Promise<ApiResponse<any>> => {
    return request({
      method: 'GET',
      url: '/logs/trend',
      params: { file, serverId },
    });
  },
};

export const historyAPI = {
  list: async (): Promise<ApiResponse<HistoryRecord[]>> => {
    return request<HistoryRecord[]>({
      method: 'GET',
      url: '/history',
    });
  },
  get: async (id: number): Promise<ApiResponse<HistoryRecord>> => {
    return request<HistoryRecord>({
      method: 'GET',
      url: `/history/${id}`,
    });
  },
  restore: async (id: number): Promise<ApiResponse> => {
    return request({
      method: 'POST',
      url: `/history/${id}/restore`,
    });
  },
};

export const settingsAPI = {
  list: async (): Promise<ApiResponse<Setting[]>> => {
    return request<Setting[]>({
      method: 'GET',
      url: '/settings',
    });
  },
  update: async (data: Record<string, string>): Promise<ApiResponse> => {
    return request({
      method: 'PUT',
      url: '/settings',
      data,
    });
  },
  test: async (configPath: string, logPath: string): Promise<ApiResponse> => {
    return request({
      method: 'POST',
      url: '/settings/test',
      data: { configPath, logPath },
    });
  },
  getInfo: async (): Promise<ApiResponse<any>> => {
    return request({
      method: 'GET',
      url: '/settings/info',
    });
  },
};

export const nginxAPI = {
  reload: async (): Promise<ApiResponse> => {
    return request({
      method: 'POST',
      url: '/nginx/reload',
    });
  },
  validate: async (): Promise<ApiResponse> => {
    return request({
      method: 'POST',
      url: '/nginx/validate',
    });
  },
  getStatus: async (): Promise<ApiResponse<NginxStatus>> => {
    return request<NginxStatus>({
      method: 'GET',
      url: '/nginx/status',
    });
  },
};

export const upstreamAPI = {
  list: async (serverId?: number): Promise<ApiResponse<Upstream[]>> => {
    return request<Upstream[]>({
      method: 'GET',
      url: '/upstreams',
      params: serverId ? { serverId } : undefined,
    });
  },
  getStats: async (serverId?: number): Promise<ApiResponse<any>> => {
    return request({
      method: 'GET',
      url: '/upstreams/stats',
      params: serverId ? { serverId } : undefined,
    });
  },
};

export const serverAPI = {
  list: async (): Promise<ApiResponse<Server[]>> => {
    return request<Server[]>({
      method: 'GET',
      url: '/servers',
    });
  },
  get: async (id: number): Promise<ApiResponse<Server>> => {
    return request<Server>({
      method: 'GET',
      url: `/servers/${id}`,
    });
  },
  create: async (data: CreateServerRequest): Promise<ApiResponse<Server>> => {
    return request<Server>({
      method: 'POST',
      url: '/servers',
      data,
    });
  },
  update: async (id: number, data: UpdateServerRequest): Promise<ApiResponse<Server>> => {
    return request<Server>({
      method: 'PUT',
      url: `/servers/${id}`,
      data,
    });
  },
  delete: async (id: number): Promise<ApiResponse> => {
    return request({
      method: 'DELETE',
      url: `/servers/${id}`,
    });
  },
  testConnection: async (data: CreateServerRequest): Promise<ApiResponse> => {
    return request({
      method: 'POST',
      url: '/servers/test-connection',
      data,
    });
  },
  reloadNginx: async (id: number): Promise<ApiResponse> => {
    return request({
      method: 'POST',
      url: '/servers/reload-nginx',
      data: { serverId: id },
    });
  },
  getStatus: async (id: number): Promise<ApiResponse<NginxStatus>> => {
    return request<NginxStatus>({
      method: 'GET',
      url: '/servers/nginx-status',
      params: { serverId: id },
    });
  },
  getStats: async (serverId?: number): Promise<ApiResponse<any>> => {
    return request({
      method: 'GET',
      url: '/stats',
      params: serverId ? { serverId } : undefined,
    });
  },
  getStatsHistory: async (serverId?: number): Promise<ApiResponse<any>> => {
    return request({
      method: 'GET',
      url: '/stats/history',
      params: serverId ? { serverId } : undefined,
    });
  },
  recordStats: async (serverId?: number): Promise<ApiResponse> => {
    return request({
      method: 'POST',
      url: '/stats/record',
      params: serverId ? { serverId } : undefined,
    });
  },
  getServers: async (): Promise<ApiResponse<Server[]>> => {
    return request<Server[]>({
      method: 'GET',
      url: '/servers',
    });
  },
};

export default api;
