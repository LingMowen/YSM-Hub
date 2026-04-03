import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response.data === undefined) {
      return { success: true };
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const errorData = error.response?.data;
    if (errorData && typeof errorData === 'object') {
      return Promise.reject(errorData);
    }
    return Promise.reject({ success: false, message: error.message || 'Request failed' });
  }
);

export default {
  auth: {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    verifyEmail: (code) => api.post('/auth/verify-email', { code }),
    logout: () => api.post('/auth/logout'),
    getProfile: () => api.get('/auth/profile'),
    getWhitelist: () => api.get('/auth/whitelist'),
    getSystemSettings: () => api.get('/system-settings'),
    uploadAvatar: (formData) => api.post('/auth/upload-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  models: {
    list: (params) => api.get('/models', { params }),
    get: (id) => api.get(`/models/${id}`),
    create: (data) => api.post('/models', data),
    update: (id, data) => api.put(`/models/${id}`, data),
    delete: (id) => api.delete(`/models/${id}`),
    upload: (formData) => api.post('/models/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    link: (data) => api.post('/models/link', data),
    unlink: (id) => api.post(`/models/${id}/unlink`),
    unlinkFromUser: (id) => api.post(`/models/${id}/unlink-from-user`),
    downloadToCustom: (id) => api.post(`/models/${id}/download-to-custom`),
    saveToMyModels: (id) => api.post(`/models/${id}/save-to-my-models`),
    downloadFile: (id) => api.get(`/models/${id}/download`, { responseType: 'blob' }),
    incrementDownloadCount: (id) => api.post(`/models/${id}/increment-download`),
    getComments: (id, params) => api.get(`/models/${id}/comments`, { params }),
    addComment: (id, data) => api.post(`/models/${id}/comments`, data),
    deleteComment: (id) => api.delete(`/models/comments/${id}`),
    authorize: (id, gameName) => api.post(`/models/${id}/authorize`, { modelId: id, gameName }),
    deauthorize: (id, gameName) => api.post(`/models/${id}/deauthorize`, { modelId: id, gameName })
  },

  users: {
    list: (params) => api.get('/users', { params }),
    get: (id) => api.get(`/users/${id}`),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    getAdmins: () => api.get('/users/admins'),
    // 游戏名绑定
    sendGameNameCode: (gameName) => api.post('/users/game-name', { gameName }),
    verifyGameName: (gameName, verificationCode) => api.post('/users/game-name/verify', { gameName, verificationCode }),
    checkBindingStatus: () => api.get('/users/game-name/status')
  },

  admin: {
    getSettings: () => api.get('/admin/settings'),
    updateSettings: (data) => api.put('/admin/settings', data),
    getStats: () => api.get('/admin/stats'),
    getSystemInfo: () => api.get('/admin/system-info'),
    getWhitelistSettings: () => api.get('/admin/whitelist-settings'),
    updateWhitelistSettings: (data) => api.put('/admin/whitelist-settings', data),
    getSmtpSettings: () => api.get('/admin/smtp-settings'),
    updateSmtpSettings: (data) => api.put('/admin/smtp-settings', data),
    // 高级管理员功能
    resetPassword: (username) => api.post('/admin/reset-password', { username }),
    deleteModel: (id) => api.delete(`/admin/models/${id}`),
    getModelByFileName: (fileName) => api.post('/admin/models/by-filename', { fileName }),
    getAllModels: () => api.get('/admin/models'),
    updateUserUploadLimit: (userId, data) => api.put('/admin/users/upload-limit', { userId, ...data }),
    getUserByUsername: (username) => api.post('/admin/users/by-username', { username }),
    getUserByGameName: (gameName) => api.post('/admin/users/by-game-name', { gameName }),
    // 审核相关
    getPendingReviewModels: () => api.get('/admin/review/pending'),
    reviewModel: (id, action) => api.put(`/admin/review/${id}`, { action }),
    setReviewer: (userId, isReviewer) => api.post('/admin/reviewers', { userId, isReviewer }),
    getReviewers: () => api.get('/admin/reviewers')
  },

  rcon: {
    send: (command) => api.post('/rcon/send', { command }),
    status: () => api.get('/rcon/status')
  },

  logs: {
    recent: (limit = 50) => api.get('/logs/recent', { params: { limit } }),
  }
};
