<template>
  <div class="login-container">
    <div class="login-box">
      <div class="logo">
        <Icon name="box" :size="48" color="#333" />
      </div>
      <h1 class="title">模型管理系统</h1>

      <div class="tabs">
        <button
          :class="['tab', { active: activeTab === 'login' }]"
          @click="activeTab = 'login'"
        >
          登录
        </button>
        <button
          :class="['tab', { active: activeTab === 'register' }]"
          @click="activeTab = 'register'"
        >
          注册
        </button>
      </div>

      <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="form">
        <div class="form-group">
          <Icon name="user" :size="20" />
          <input
            v-model="loginForm.username"
            type="text"
            placeholder="用户名"
            required
          />
        </div>
        <div class="form-group">
          <Icon name="lock" :size="20" />
          <input
            v-model="loginForm.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="密码"
            required
          />
          <button type="button" class="toggle-password" @click="showPassword = !showPassword">
            <Icon :name="showPassword ? 'eye-off' : 'eye'" :size="18" />
          </button>
        </div>
        <button type="submit" class="btn primary" :disabled="loading">
          <Icon v-if="loading" name="refresh-cw" :size="18" class="spin" />
          <span v-else>登录</span>
        </button>
      </form>

      <form v-else @submit.prevent="handleRegister" class="form">
        <div class="form-group">
          <Icon name="user" :size="20" />
          <input
            v-model="registerForm.username"
            type="text"
            placeholder="用户名"
            required
          />
        </div>
        <div class="form-group">
          <Icon name="mail" :size="20" />
          <input
            v-model="registerForm.email"
            type="email"
            placeholder="邮箱"
            required
          />
        </div>
        <div class="form-group">
          <Icon name="lock" :size="20" />
          <input
            v-model="registerForm.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="密码"
            required
          />
          <button type="button" class="toggle-password" @click="showPassword = !showPassword">
            <Icon :name="showPassword ? 'eye-off' : 'eye'" :size="18" />
          </button>
        </div>
        <div class="form-group">
          <Icon name="key" :size="20" />
          <input
            v-model="registerForm.gameName"
            type="text"
            placeholder="游戏名称（MC用户名）"
          />
        </div>
        <button type="submit" class="btn primary" :disabled="loading">
          <Icon v-if="loading" name="refresh-cw" :size="18" class="spin" />
          <span v-else>注册</span>
        </button>
      </form>

      <p v-if="message" :class="['message', messageType]">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import Icon from '../components/Icon.vue';
import api from '../api';

const router = useRouter();
const authStore = useAuthStore();

const activeTab = ref('login');
const showPassword = ref(false);
const loading = ref(false);
const message = ref('');
const messageType = ref('');

const loginForm = reactive({
  username: '',
  password: ''
});

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  gameName: ''
});

const showMessage = (text, type = 'error') => {
  message.value = text;
  messageType.value = type;
  setTimeout(() => {
    message.value = '';
  }, 5000);
};

const handleLogin = async () => {
  loading.value = true;
  message.value = '';
  try {
    await authStore.login(loginForm);
    router.push('/');
  } catch (error) {
    console.error('Login error:', error);
    showMessage(error?.message || error || '登录失败');
  } finally {
    loading.value = false;
  }
};

const handleRegister = async () => {
  loading.value = true;
  message.value = '';
  try {
    const res = await authStore.register(registerForm);
    if (res.needEmailVerify) {
      showMessage('注册成功，请查收邮箱验证码', 'success');
      activeTab.value = 'verify';
    } else {
      showMessage('注册成功，请登录', 'success');
      activeTab.value = 'login';
    }
  } catch (error) {
    console.error('Register error:', error);
    showMessage(error?.message || error || '注册失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url('/background.jpg') center center / cover no-repeat fixed;
  padding: 20px;
}

.login-box {
  width: 400px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.logo {
  text-align: center;
  margin-bottom: 12px;
}

.title {
  text-align: center;
  font-size: 22px;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  background: #f5f5f5;
  padding: 4px;
  border-radius: 8px;
}

.tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.tab.active {
  background: #fff;
  color: #333;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form {
  display: flex;
  flex-direction: column;
}

.form-group {
  position: relative;
  margin-bottom: 16px;
}

.form-group :deep(svg) {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
}

.form-group input {
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  color: #333;
  box-sizing: border-box;
}

.form-group input::placeholder {
  color: #999;
}

.toggle-password {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-password :deep(svg) {
  position: static;
  transform: none;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  margin-top: 8px;
}

.btn.primary {
  background: #333;
  color: #fff;
}

.btn.primary:hover {
  background: #444;
}

.btn.primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.message {
  margin-top: 12px;
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
}

.message.error {
  background: #fef2f2;
  color: #dc2626;
}

.message.success {
  background: #f0fdf4;
  color: #16a34a;
}
</style>
