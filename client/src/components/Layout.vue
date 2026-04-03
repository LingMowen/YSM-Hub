<template>
  <div class="layout">
    <aside :class="['sidebar', { expanded: isExpanded }]">
      <div class="logo">
        <Icon name="box" :size="32" color="#fff" />
        <span v-if="isExpanded" class="logo-text">YSM</span>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item" :title="isExpanded ? '' : '首页'">
          <Icon name="home" :size="22" />
          <span v-if="isExpanded" class="nav-text">首页</span>
        </router-link>
        <router-link to="/models" class="nav-item" :title="isExpanded ? '' : '模型列表'">
          <Icon name="box" :size="22" />
          <span v-if="isExpanded" class="nav-text">模型列表</span>
        </router-link>
        <router-link to="/upload" class="nav-item" :title="isExpanded ? '' : '上传模型'">
          <Icon name="upload" :size="22" />
          <span v-if="isExpanded" class="nav-text">上传模型</span>
        </router-link>
        <router-link to="/profile" class="nav-item" :title="isExpanded ? '' : '个人中心'">
          <Icon name="user" :size="22" />
          <span v-if="isExpanded" class="nav-text">个人中心</span>
        </router-link>
        <router-link v-if="authStore.isAdmin" to="/admin" class="nav-item" :title="isExpanded ? '' : '管理后台'">
          <Icon name="settings" :size="22" />
          <span v-if="isExpanded" class="nav-text">管理后台</span>
        </router-link>
      </nav>
      <div class="nav-bottom">
        <button @click="handleLogout" class="nav-item" :title="isExpanded ? '' : '退出登录'">
          <Icon name="log-out" :size="22" />
          <span v-if="isExpanded" class="nav-text">退出登录</span>
        </button>
        <button @click="toggleSidebar" class="nav-item toggle-btn" :title="isExpanded ? '' : '展开菜单'">
          <Icon :name="isExpanded ? 'chevron-left' : 'chevron-right'" :size="22" />
        </button>
      </div>
    </aside>
    <main :class="['main-content', { expanded: isExpanded }]">
      <header class="topbar">
        <h2 class="page-title">{{ pageTitle }}</h2>
        <div class="user-info">
          <span class="username">{{ authStore.user?.username }}</span>
        </div>
      </header>
      <div class="content">
        <slot></slot>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import Icon from '../components/Icon.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const isExpanded = ref(false);

const pageTitle = computed(() => {
  const titles = {
    'Home': '首页',
    'Models': '模型列表',
    'Upload': '上传模型',
    'Profile': '个人中心',
    'Admin': '管理后台',
    'AdminSettings': '系统设置'
  };
  return titles[route.name] || '';
});

const toggleSidebar = () => {
  isExpanded.value = !isExpanded.value;
};

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 64px;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 16px 10px;
  position: fixed;
  height: 100vh;
  z-index: 100;
}

.sidebar.expanded {
  width: 200px;
  padding: 16px 12px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 6px;
  margin-bottom: 24px;
  width: 100%;
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
  width: 100%;
}

.nav-bottom {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.nav-item {
  height: 44px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 10px;
  color: #888;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 10px;
  width: 100%;
  white-space: nowrap;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.nav-item.router-link-active {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.nav-text {
  font-size: 14px;
  flex: 1;
}

.toggle-btn {
  margin-top: 8px;
}

.main-content {
  flex: 1;
  margin-left: 64px;
  background: #f5f5f5;
  min-height: 100vh;
  transition: margin-left 0.3s ease;
}

.main-content.expanded {
  margin-left: 200px;
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

.content {
  padding: 24px;
}
</style>
