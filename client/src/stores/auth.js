import { defineStore } from 'pinia';
import api from '../api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })(),
    token: localStorage.getItem('token') || null,
    systemSettings: null,
    whitelistEnabled: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    currentUser: (state) => state.user
  },

  actions: {
    async login(credentials) {
      const res = await api.auth.login(credentials);
      const data = res.data || res;
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return res;
    },

    async register(data) {
      const res = await api.auth.register(data);
      return res;
    },

    async verifyEmail(code) {
      const res = await api.auth.verifyEmail(code);
      const respData = res.data || res;
      if (respData.success && respData.token) {
        this.token = respData.token;
        this.user = respData.user;
        localStorage.setItem('token', respData.token);
        localStorage.setItem('user', JSON.stringify(respData.user));
      }
      return res;
    },

    async logout() {
      try {
        await api.auth.logout();
      } finally {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    },

    async fetchProfile() {
      const res = await api.auth.getProfile();
      const data = res.data || res;
      this.user = data.user;
      localStorage.setItem('user', JSON.stringify(data.user));
      return res;
    },

    async fetchSystemSettings() {
      const res = await api.auth.getSystemSettings();
      const data = res.data || res;
      this.systemSettings = data.settings;
      this.whitelistEnabled = data.settings?.whitelistEnabled;
      return res;
    },

    async fetchWhitelist() {
      const res = await api.auth.getWhitelist();
      const data = res.data || res;
      return data.whitelist;
    },

    clearAuth() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
});
