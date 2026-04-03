<template>
  <div class="admin-users">
    <div class="section">
      <div class="section-header">
        <h3>用户列表</h3>
        <div class="header-actions">
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索用户名或游戏名..."
              @keyup.enter="searchUser"
            />
            <button @click="searchUser" class="btn">
              <Icon name="search" :size="16" />
            </button>
          </div>
          <button @click="fetchUsers" class="btn">
            <Icon name="refresh-cw" :size="16" />
            刷新
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading">
        <Icon name="refresh-cw" :size="24" class="spin" />
      </div>
      <div v-else-if="users.length === 0" class="empty">
        <Icon name="users" :size="48" color="#ccc" />
        <p>暂无用户数据</p>
      </div>
      <div v-else class="user-list">
        <div v-for="u in users" :key="u.id" class="user-item">
          <div class="user-avatar">
            <Icon name="user" :size="18" />
          </div>
          <div class="user-info">
            <span class="username">{{ u.name }}</span>
            <span class="email">
              {{ u.email || '-' }}
              <template v-if="u.gameName"> | {{ u.gameName }}</template>
            </span>
          </div>
          <span class="role-badge" :class="u.role">
            {{ u.role === 'admin' ? '管理员' : '用户' }}
          </span>
          <span v-if="u.isReviewer" class="role-badge reviewer">审核员</span>
          <div class="user-stats">
            <span class="stat" title="公共模型">
              <Icon name="box" :size="14" />
              {{ u.customUploadLimit || 0 }}
            </span>
            <span class="stat" title="私人模型">
              <Icon name="lock" :size="14" />
              {{ u.authUploadLimit || 0 }}
            </span>
          </div>
          <div class="user-actions">
            <button @click="editUser(u)" class="action-btn" title="编辑">
              <Icon name="edit" :size="16" />
            </button>
            <button @click="resetUserPassword(u)" class="action-btn" title="重置密码">
              <Icon name="key" :size="16" />
            </button>
            <button v-if="u.id !== currentUserId" @click="deleteUser(u)" class="action-btn danger" title="删除">
              <Icon name="trash-2" :size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑用户弹窗 -->
    <div v-if="showEditModal" class="modal" @click.self="showEditModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>编辑用户</h3>
          <button @click="showEditModal = false" class="close-btn">
            <Icon name="x" :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>用户名</label>
            <input v-model="userEditForm.username" type="text" />
          </div>
          <div class="form-group">
            <label>游戏名称</label>
            <input v-model="userEditForm.gameName" type="text" />
          </div>
          <div class="form-group">
            <label>角色</label>
            <select v-model="userEditForm.role">
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div class="form-group">
            <label class="toggle-label">
              <span>审核员权限</span>
              <button
                :class="['toggle', { active: userEditForm.isReviewer }]"
                @click="userEditForm.isReviewer = !userEditForm.isReviewer"
              >
                <span class="toggle-dot"></span>
              </button>
            </label>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>公共模型上限</label>
              <input v-model.number="userEditForm.customUploadLimit" type="number" min="0" />
            </div>
            <div class="form-group">
              <label>私人模型上限</label>
              <input v-model.number="userEditForm.authUploadLimit" type="number" min="0" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showEditModal = false" class="btn secondary">取消</button>
          <button @click="saveUser" class="btn primary" :disabled="saving">
            <Icon v-if="saving" name="refresh-cw" :size="16" class="spin" />
            <span v-else>保存</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 重置密码弹窗 -->
    <div v-if="showResetModal" class="modal" @click.self="closeResetModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>重置密码</h3>
          <button @click="closeResetModal" class="close-btn">
            <Icon name="x" :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div v-if="resetResult" class="reset-result">
            <div class="form-group">
              <label>用户名</label>
              <input :value="resetResult.username" type="text" disabled />
            </div>
            <div class="form-group">
              <label>新密码</label>
              <div class="copy-field">
                <input :value="resetResult.newPassword" type="text" disabled />
                <button @click="copyPassword" class="btn">
                  <Icon name="copy" :size="16" />
                </button>
              </div>
            </div>
            <p class="warning-text">请立即复制新密码，关闭后将无法再次查看！</p>
          </div>
          <div v-else>
            <p>确定要重置用户 "{{ resetTargetUser?.username }}" 的密码吗？</p>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeResetModal" class="btn secondary">
            {{ resetResult ? '关闭' : '取消' }}
          </button>
          <button v-if="!resetResult" @click="confirmResetPassword" class="btn primary" :disabled="resetting">
            <Icon v-if="resetting" name="refresh-cw" :size="16" class="spin" />
            <span v-else>确认重置</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import Icon from '../components/Icon.vue';
import api from '../api';

const authStore = useAuthStore();
const currentUserId = computed(() => authStore.user?.id);
const loading = ref(false);
const saving = ref(false);
const resetting = ref(false);
const searchQuery = ref('');
const users = ref([]);
const showEditModal = ref(false);
const showResetModal = ref(false);
const resetTargetUser = ref(null);
const resetResult = ref(null);

const userEditForm = reactive({
  id: '',
  username: '',
  gameName: '',
  role: 'user',
  isReviewer: false,
  customUploadLimit: 5,
  authUploadLimit: 1
});

import { computed } from 'vue';

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res = await api.users.list({ limit: 100 });
    users.value = res.data?.users || res.users || [];
  } catch (error) {
    console.error('获取用户列表失败');
  } finally {
    loading.value = false;
  }
};

const searchUser = async () => {
  if (!searchQuery.value.trim()) {
    fetchUsers();
    return;
  }
  loading.value = true;
  try {
    let res = await api.admin.getUserByUsername(searchQuery.value);
    if (res.success && res.data) {
      users.value = [res.data];
    } else {
      res = await api.admin.getUserByGameName(searchQuery.value);
      if (res.success && res.data) {
        users.value = [res.data];
      } else {
        users.value = [];
      }
    }
  } catch (error) {
    console.error('搜索用户失败');
    users.value = [];
  } finally {
    loading.value = false;
  }
};

const editUser = (user) => {
  userEditForm.id = user.id;
  userEditForm.username = user.name;
  userEditForm.gameName = user.gameName || '';
  userEditForm.role = user.role;
  userEditForm.isReviewer = user.isReviewer || false;
  userEditForm.customUploadLimit = user.customUploadLimit || 5;
  userEditForm.authUploadLimit = user.authUploadLimit || 1;
  showEditModal.value = true;
};

const saveUser = async () => {
  saving.value = true;
  try {
    await api.users.update(userEditForm.id, {
      username: userEditForm.username,
      gameName: userEditForm.gameName,
      role: userEditForm.role
    });
    await api.admin.setReviewer(userEditForm.id, userEditForm.isReviewer);
    await api.admin.updateUserUploadLimit(userEditForm.id, {
      customUploadLimit: userEditForm.customUploadLimit,
      authUploadLimit: userEditForm.authUploadLimit
    });
    showEditModal.value = false;
    fetchUsers();
    alert('保存成功');
  } catch (error) {
    alert('保存失败: ' + (error.message || '未知错误'));
  } finally {
    saving.value = false;
  }
};

const resetUserPassword = (user) => {
  resetTargetUser.value = user;
  resetResult.value = null;
  showResetModal.value = true;
};

const closeResetModal = () => {
  showResetModal.value = false;
  resetTargetUser.value = null;
  resetResult.value = null;
};

const confirmResetPassword = async () => {
  if (!resetTargetUser.value) return;
  resetting.value = true;
  try {
    const res = await api.admin.resetPassword(resetTargetUser.value.username);
    if (res.success) {
      resetResult.value = {
        username: res.data?.username || resetTargetUser.value.username,
        newPassword: res.data?.newPassword
      };
    } else {
      alert('重置失败: ' + (res.message || '未知错误'));
    }
  } catch (error) {
    alert('重置失败: ' + (error.message || '未知错误'));
  } finally {
    resetting.value = false;
  }
};

const copyPassword = () => {
  if (resetResult.value?.newPassword) {
    navigator.clipboard.writeText(resetResult.value.newPassword);
    alert('密码已复制到剪贴板');
  }
};

const deleteUser = async (user) => {
  if (!confirm(`确定删除用户 "${user.name}" 吗？此操作不可恢复！`)) return;
  try {
    await api.users.delete(user.id);
    fetchUsers();
    alert('删除成功');
  } catch (error) {
    alert('删除失败: ' + (error.message || '未知错误'));
  }
};

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
.admin-users {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box {
  display: flex;
  gap: 8px;
}

.search-box input {
  padding: 8px 12px;
  border: 1px solid #eee;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  width: 200px;
}

.search-box input:focus {
  border-color: #333;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #f5f5f5;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn:hover:not(:disabled) {
  background: #eee;
}

.btn.primary {
  background: #333;
  color: #fff;
}

.btn.primary:hover:not(:disabled) {
  background: #444;
}

.btn.secondary {
  background: #f5f5f5;
  color: #333;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #999;
}

.empty p {
  margin: 12px 0 0;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: #e5e5e5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.email {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.role-badge.user {
  background: #f5f5f5;
  color: #666;
}

.user-stats {
  display: flex;
  gap: 12px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
}

.user-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 6px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.action-btn.danger:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  width: 100%;
  max-width: 420px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #eee;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #333;
}

.form-group input:disabled {
  background: #f5f5f5;
  color: #999;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.reset-result {
  background: #f0fdf4;
  padding: 16px;
  border-radius: 8px;
}

.copy-field {
  display: flex;
  gap: 8px;
}

.copy-field input {
  flex: 1;
}

.warning-text {
  color: #dc2626;
  font-size: 13px;
  margin: 12px 0 0;
  text-align: center;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
