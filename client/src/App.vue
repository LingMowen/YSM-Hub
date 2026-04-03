<template>
  <template v-if="isLoginPage">
    <router-view v-slot="{ Component }">
      <transition name="fade-slide" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </template>
  <template v-else-if="isAdminPage">
    <div class="admin-app">
      <aside :class="['admin-sidebar', { collapsed: isSidebarCollapsed }]">
        <div class="logo">
          <Icon name="settings" :size="32" color="#fff" />
          <span v-if="!isSidebarCollapsed" class="logo-text">管理后台</span>
        </div>
        <nav class="nav">
          <router-link to="/admin/overview" class="nav-item">
            <Icon name="bar-chart-2" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">数据总览</span>
          </router-link>
          <router-link to="/admin/console" class="nav-item">
            <Icon name="terminal" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">RCON 控制台</span>
          </router-link>
          <router-link to="/admin/users" class="nav-item">
            <Icon name="users" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">用户管理</span>
          </router-link>
          <router-link to="/admin/models" class="nav-item">
            <Icon name="box" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">模型管理</span>
          </router-link>
          <router-link to="/admin/settings" class="nav-item">
            <Icon name="sliders" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">系统设置</span>
          </router-link>
        </nav>
        <div class="nav-bottom">
          <button @click="toggleSidebar" class="nav-item toggle-item">
            <Icon :name="isSidebarCollapsed ? 'chevron-right' : 'chevron-left'" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">收起侧栏</span>
          </button>
          <router-link to="/" class="nav-item">
            <Icon name="chevron-left" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">返回用户端</span>
          </router-link>
        </div>
      </aside>
      <main :class="['admin-main', { 'sidebar-collapsed': isSidebarCollapsed }]">
        <header class="topbar">
          <h2 class="page-title">{{ pageTitle }}</h2>
          <div class="user-info">
            <span class="username">{{ authStore.user?.username }}</span>
            <span class="role-badge admin">管理员</span>
          </div>
        </header>
        <div class="content">
          <router-view v-slot="{ Component }">
            <transition name="fade-slide" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>
  </template>
  <template v-else>
    <div class="user-app">
      <aside :class="['user-sidebar', { collapsed: isSidebarCollapsed }]">
        <div class="logo">
          <Icon name="box" :size="32" color="#fff" />
          <span v-if="!isSidebarCollapsed" class="logo-text">YSM</span>
        </div>
        <nav class="nav">
          <router-link to="/" class="nav-item">
            <Icon name="home" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">首页</span>
          </router-link>
          <router-link to="/models" class="nav-item">
            <Icon name="box" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">模型列表</span>
          </router-link>
          <router-link to="/model-center" class="nav-item">
            <Icon name="globe" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">模型中心</span>
          </router-link>
          <router-link to="/upload" class="nav-item">
            <Icon name="upload" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">上传模型</span>
          </router-link>
          <router-link to="/profile" class="nav-item">
            <Icon name="user" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">个人中心</span>
          </router-link>
        </nav>
        <div class="nav-bottom">
          <button @click="toggleSidebar" class="nav-item toggle-item">
            <Icon :name="isSidebarCollapsed ? 'chevron-right' : 'chevron-left'" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">收起侧栏</span>
          </button>
          <router-link v-if="authStore.isAdmin" to="/admin/console" class="nav-item">
            <Icon name="settings" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">管理后台</span>
          </router-link>
          <router-link v-if="(authStore.isAdmin || authStore.user?.isReviewer) && reviewEnabled" to="/review" class="nav-item">
            <Icon name="check-circle" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">审核中心</span>
          </router-link>
          <button @click="handleLogout" class="nav-item">
            <Icon name="log-out" :size="22" />
            <span v-if="!isSidebarCollapsed" class="nav-text">退出登录</span>
          </button>
        </div>
      </aside>
      <main :class="['user-main', { 'sidebar-collapsed': isSidebarCollapsed }]">
        <header class="topbar">
          <h2 class="page-title">{{ pageTitle }}</h2>
          <div class="user-info">
            <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" class="user-avatar" alt="头像" />
            <Icon v-else name="user" :size="22" />
            <span class="username">{{ authStore.user?.username }}</span>
          </div>
        </header>
        <div class="content">
          <router-view v-slot="{ Component }">
            <transition name="fade-slide" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>
  </template>

  <Message ref="messageRef" />
  <Confirm ref="confirmRef" />
</template>

<script setup>
import { ref, computed, onMounted, provide } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { createGlobal } from './composables/useGlobal';
import Icon from './components/Icon.vue';
import Message from './components/Message.vue';
import Confirm from './components/Confirm.vue';
import api from './api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const isSidebarCollapsed = ref(false);
const reviewEnabled = ref(false);

const isLoginPage = computed(() => route.path === '/login');
const isAdminPage = computed(() => route.path.startsWith('/admin'));

const fetchSettings = async () => {
  try {
    const res = await api.admin.getSettings();
    const settings = res.data?.settings || res.settings || {};
    reviewEnabled.value = settings.reviewEnabled || false;
  } catch (error) {
    console.error('获取设置失败:', error);
  }
};

onMounted(() => {
  if (authStore.isAuthenticated) {
    fetchSettings();
  }
});

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

const pageTitle = computed(() => {
  const titles = {
    '/': '首页',
    '/models': '模型列表',
    '/model-center': '模型中心',
    '/upload': '上传模型',
    '/profile': '个人中心',
    '/admin': '控制台',
    '/admin/overview': '数据总览',
    '/admin/console': 'RCON 控制台',
    '/admin/users': '用户管理',
    '/admin/models': '模型管理',
    '/admin/settings': '系统设置',
    '/review': '审核中心'
  };
  return titles[route.path] || '';
});

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};

const { messageRef, confirmRef } = createGlobal();

const $message = {
  success: (text, duration) => messageRef.value?.success(text, duration),
  error: (text, duration) => messageRef.value?.error(text, duration),
  warning: (text, duration) => messageRef.value?.warning(text, duration),
  info: (text, duration) => messageRef.value?.info(text, duration),
  show: (text, type, duration) => messageRef.value?.show(text, type, duration)
};

const $confirm = (options) => confirmRef.value?.show(options);

provide('$message', $message);
provide('$confirm', $confirm);
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  background-color: #f5f5f5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  text-decoration: none;
  color: inherit;
}

button {
  cursor: pointer;
  font-family: inherit;
}

input, select, textarea {
  font-family: inherit;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>

<style scoped>
.user-app,
.admin-app {
  display: flex;
  min-height: 100vh;
}

.user-sidebar,
.admin-sidebar {
  width: 170px;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
  padding: 16px 10px;
  position: fixed;
  height: 100vh;
  transition: width 0.3s ease;
  overflow: hidden;
}

.admin-sidebar {
  background: #2d2d2d;
}

.user-sidebar.collapsed,
.admin-sidebar.collapsed {
  width: 64px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 6px;
  margin-bottom: 24px;
  white-space: nowrap;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-bottom {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  border-radius: 10px;
  color: #888;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 10px;
  white-space: nowrap;
  transition: all 0.2s;
  overflow: hidden;
}

.nav-item :deep(svg) {
  flex-shrink: 0;
}

.nav-text {
  text-align: left;
  flex: 1;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.nav-item.router-link-active {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.admin-sidebar .nav-item.router-link-active {
  color: #4ade80;
}

.nav-text {
  font-size: 14px;
  flex: 1;
}

.user-main,
.admin-main {
  flex: 1;
  margin-left: 170px;
  background: #f5f5f5;
  min-height: 100vh;
  transition: margin-left 0.3s ease;
}

.user-main.sidebar-collapsed,
.admin-main.sidebar-collapsed {
  margin-left: 64px;
}

.topbar {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-size: 14px;
  color: #666;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.role-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.role-badge.admin {
  background: #f0fdf4;
  color: #16a34a;
}

.content {
  padding: 24px;
}
</style>
