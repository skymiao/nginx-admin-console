import axios from 'axios';

const api = axios.create({
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

export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
};

export const userAPI = {
  list: () => api.get('/users'),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getProfile: () => api.get('/users/profile/me'),
  updateProfile: (data) => api.put('/users/profile/me', data),
  changePassword: (data) => api.put('/users/profile/me/password', data),
};

export const roleAPI = {
  list: () => api.get('/roles'),
  get: (id) => api.get(`/roles/${id}`),
  getPermissions: () => api.get('/roles/permissions'),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
};

export const configAPI = {
  list: (serverId) => api.get('/configs', { params: serverId ? { serverId } : {} }),
  get: (path, serverId) => api.get('/configs/content', { params: { path, ...(serverId && { serverId }) } }),
  create: (data) => api.post('/configs', data),
  update: (path, data) => api.put(`/configs/${encodeURIComponent(path)}`, data),
  delete: (path, serverId) => api.delete(`/configs/${encodeURIComponent(path)}`, { params: serverId ? { serverId } : {} }),
  validate: (content, serverId) => api.post('/configs/validate', { content, ...(serverId && { serverId }) }),
  apply: (serverId) => api.post('/configs/apply', serverId ? { serverId } : {}),
  disable: (path, serverId) => api.post(`/configs/${encodeURIComponent(path)}/disable`, serverId ? { serverId } : {}),
  enable: (path, serverId) => api.post(`/configs/${encodeURIComponent(path)}/enable`, serverId ? { serverId } : {}),
};

export const logAPI = {
  getFiles: (serverId) => api.get('/logs/files', { params: { serverId } }),
  getAccessLog: (params) => api.get('/logs/access', { params }),
  getErrorLog: (params) => api.get('/logs/error', { params }),
  getTraffic: (params) => api.get('/logs/traffic', { params }),
};

export const historyAPI = {
  list: () => api.get('/history'),
  get: (id) => api.get(`/history/${id}`),
  restore: (id) => api.post(`/history/${id}/restore`),
};

export const settingsAPI = {
  list: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  test: (configPath, logPath) => api.post('/settings/test', { configPath, logPath }),
  getInfo: () => api.get('/settings/info'),
};

export const nginxAPI = {
  reload: () => api.post('/nginx/reload'),
  validate: () => api.post('/nginx/validate'),
  getStatus: () => api.get('/nginx/status'),
};

export const upstreamAPI = {
  list: (serverId) => api.get('/upstreams', { params: serverId ? { serverId } : {} }),
  getStats: (serverId) => api.get('/upstreams/stats', { params: serverId ? { serverId } : {} }),
};

export const serverAPI = {
  list: () => api.get('/servers'),
  get: (id) => api.get(`/servers/${id}`),
  create: (data) => api.post('/servers', data),
  update: (id, data) => api.put(`/servers/${id}`, data),
  delete: (id) => api.delete(`/servers/${id}`),
  testConnection: (data) => api.post('/servers/test-connection', data),
  reloadNginx: (id) => api.post('/servers/reload-nginx', { serverId: id }),
  getStatus: (id) => api.get('/servers/nginx-status', { params: { serverId: id } }),
  getStats: (serverId) => api.get('/stats', { params: { serverId } }),
  getStatsHistory: (serverId) => api.get('/stats/history', { params: { serverId } }),
  recordStats: (serverId) => api.post('/stats/record', null, { params: { serverId } }),
  getServers: () => api.get('/servers'),
};

export const logFormatAPI = {
  list: (params) => api.get('/log-formats', { params }),
  get: (id) => api.get(`/log-formats/${id}`),
  create: (data) => api.post('/log-formats', data),
  update: (id, data) => api.put(`/log-formats/${id}`, data),
  delete: (id) => api.delete(`/log-formats/${id}`),
  test: (data) => api.post('/log-formats/test', data),
};

export default api;