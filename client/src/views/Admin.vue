<template>
  <div class="admin-page">
      <div class="stats-grid">
        <div class="stat-card">
          <Icon name="box" :size="24" />
          <div class="stat-info">
            <span class="stat-value">{{ stats.totalModels }}</span>
            <span class="stat-label">模型总数</span>
          </div>
        </div>
        <div class="stat-card">
          <Icon name="gamepad-2" :size="24" />
          <div class="stat-info">
            <span class="stat-value">{{ stats.linkedModels }}</span>
            <span class="stat-label">已关联</span>
          </div>
        </div>
        <div class="stat-card">
          <Icon name="users" :size="24" />
          <div class="stat-info">
            <span class="stat-value">{{ stats.totalUsers }}</span>
            <span class="stat-label">用户总数</span>
          </div>
        </div>
        <div class="stat-card">
          <Icon name="server" :size="24" />
          <div class="stat-info">
            <span class="stat-value">{{ rconStatus ? '在线' : '离线' }}</span>
            <span class="stat-label">RCON状态</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h3>快捷入口</h3>
        </div>
        <div class="quick-links">
          <router-link to="/admin/settings" class="quick-link">
            <Icon name="settings" :size="24" />
            <span>系统设置</span>
          </router-link>
          <router-link to="/admin/models" class="quick-link">
            <Icon name="box" :size="24" />
            <span>模型管理</span>
          </router-link>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h3>系统信息</h3>
          <button @click="refreshSystemInfo" class="btn">
            <Icon name="refresh-cw" :size="16" />
            刷新
          </button>
        </div>
        <div class="info-grid">
          <div class="info-card">
            <Icon name="server" :size="20" />
            <div class="info-content">
              <span class="info-label">服务器</span>
              <span class="info-value">{{ systemInfo.serverType || '-' }}</span>
            </div>
          </div>
          <div class="info-card">
            <Icon name="gamepad-2" :size="20" />
            <div class="info-content">
              <span class="info-label">游戏版本</span>
              <span class="info-value">{{ systemInfo.gameVersion || '-' }}</span>
            </div>
          </div>
          <div class="info-card">
            <Icon name="shield" :size="20" />
            <div class="info-content">
              <span class="info-label">白名单</span>
              <span class="info-value">{{ settings.whitelistEnabled ? '已启用' : '已禁用' }}</span>
            </div>
          </div>
          <div class="info-card">
            <Icon name="mail" :size="20" />
            <div class="info-content">
              <span class="info-label">邮箱验证</span>
              <span class="info-value">{{ settings.emailVerificationEnabled ? '已启用' : '已禁用' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h3>RCON 控制台</h3>
          <button @click="checkRconStatus" class="btn">
            <Icon name="refresh-cw" :size="16" />
            刷新
          </button>
        </div>
        <div class="rcon-panel">
          <div class="rcon-output">
            <p v-for="(line, i) in rconOutput" :key="i" class="output-line">{{ line }}</p>
            <p v-if="rconOutput.length === 0" class="output-hint">输入命令发送至服务器</p>
          </div>
          <div class="rcon-input">
            <input
              v-model="rconCommand"
              type="text"
              placeholder="输入命令..."
              @keyup.enter="sendRconCommand"
            />
            <button @click="sendRconCommand" :disabled="!rconCommand || sending">
              <Icon v-if="sending" name="refresh-cw" :size="16" class="spin" />
              <Icon v-else name="send" :size="16" />
            </button>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h3>用户管理</h3>
          <div class="search-box">
            <input
              v-model="userSearchQuery"
              type="text"
              placeholder="搜索用户名或游戏名..."
              @keyup.enter="searchUser"
            />
            <button @click="searchUser" class="btn">
              <Icon name="search" :size="16" />
            </button>
          </div>
        </div>
        <div v-if="loadingUsers" class="loading">
          <Icon name="refresh-cw" :size="24" class="spin" />
        </div>
        <div v-else-if="users.length === 0" class="empty">
          暂无用户数据
        </div>
        <div v-else class="user-list">
          <div v-for="u in users" :key="u.id" class="user-item">
            <div class="user-avatar">
              <Icon name="user" :size="18" />
            </div>
            <div class="user-info">
              <span class="username">{{ u.username }}</span>
              <span class="email">{{ u.email || '-' }} {{ u.gameName ? `| ${u.gameName}` : '' }}</span>
            </div>
            <span class="role-badge" :class="u.role">{{ u.role === 'admin' ? '管理员' : '用户' }}</span>
            <div class="user-actions">
              <button @click="editUser(u)" class="action-btn" title="编辑">
                <Icon name="edit" :size="16" />
              </button>
              <button @click="resetUserPassword(u)" class="action-btn" title="重置密码">
                <Icon name="key" :size="16" />
              </button>
              <button v-if="u.id !== authStore.user?.id" @click="deleteUser(u)" class="action-btn danger" title="删除">
                <Icon name="trash-2" :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 编辑用户弹窗 -->
      <div v-if="showUserModal" class="modal" @click.self="showUserModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h3>编辑用户</h3>
            <button @click="showUserModal = false" class="close-btn">
              <Icon name="x" :size="20" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>用户名</label>
              <input v-model="userEditForm.username" type="text" disabled />
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
            <div class="form-row">
              <div class="form-group">
                <label>公共模型上传限制</label>
                <input v-model.number="userEditForm.customUploadLimit" type="number" min="0" />
              </div>
              <div class="form-group">
                <label>私人模型上传限制</label>
                <input v-model.number="userEditForm.authUploadLimit" type="number" min="0" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showUserModal = false" class="btn secondary">取消</button>
            <button @click="saveUser" class="btn primary" :disabled="savingUser">
              <Icon v-if="savingUser" name="refresh-cw" :size="16" class="spin" />
              <span v-else>保存</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 重置密码弹窗 -->
      <div v-if="showResetModal" class="modal" @click.self="showResetModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h3>重置密码</h3>
            <button @click="showResetModal = false" class="close-btn">
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
              <p>确定要重置用户 "{{ resetUserForm.username }}" 的密码吗？</p>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showResetModal = false" class="btn secondary">
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
import { ref, reactive, onMounted, getCurrentInstance } from 'vue';
import { useAuthStore } from '../stores/auth';
import Icon from '../components/Icon.vue';
import api from '../api';

const { proxy } = getCurrentInstance();
const authStore = useAuthStore();
const loadingUsers = ref(false);
const savingUser = ref(false);
const showUserModal = ref(false);
const showResetModal = ref(false);
const resetting = ref(false);
const sending = ref(false);
const rconStatus = ref(false);
const rconCommand = ref('');
const rconOutput = ref([]);
const userSearchQuery = ref('');
const users = ref([]);
const stats = reactive({ totalModels: 0, linkedModels: 0, totalUsers: 0 });
const systemInfo = reactive({});
const settings = reactive({ whitelistEnabled: false, emailVerificationEnabled: false });

const userEditForm = reactive({
  id: '',
  username: '',
  gameName: '',
  role: 'user',
  customUploadLimit: 5,
  authUploadLimit: 1
});

const resetUserForm = reactive({
  username: ''
});

const resetResult = ref(null);

const fetchStats = async () => {
  try {
    const res = await api.admin.getStats();
    const data = res.data?.stats || res.stats || {};
    stats.totalModels = data.totalModels || 0;
    stats.linkedModels = data.linkedModels || 0;
    stats.totalUsers = data.totalUsers || 0;
  } catch (error) {
    console.error('获取统计数据失败');
  }
};

const fetchSettings = async () => {
  try {
    const res = await api.admin.getSettings();
    Object.assign(settings, res.data?.settings || res.settings || {});
  } catch (error) {
    console.error('获取设置失败');
  }
};

const fetchSystemInfo = async () => {
  try {
    const res = await api.admin.getSystemInfo();
    Object.assign(systemInfo, res.data?.info || res.info || {});
  } catch (error) {
    console.error('获取系统信息失败');
  }
};

const refreshSystemInfo = async () => {
  await fetchSystemInfo();
  await fetchStats();
};

const checkRconStatus = async () => {
  try {
    const res = await api.rcon.status();
    rconStatus.value = res.data?.connected ?? res.connected ?? false;
  } catch (error) {
    rconStatus.value = false;
  }
};

const sendRconCommand = async () => {
  if (!rconCommand.value || sending.value) return;
  sending.value = true;
  rconOutput.value.push(`> ${rconCommand.value}`);
  try {
    const res = await api.rcon.send(rconCommand.value);
    const result = res.data?.result || res.result;
    if (result) {
      rconOutput.value.push(result);
    }
  } catch (error) {
    rconOutput.value.push(`错误: ${error.message || '命令执行失败'}`);
  }
  rconCommand.value = '';
  sending.value = false;
};

const fetchUsers = async () => {
  loadingUsers.value = true;
  try {
    const res = await api.users.list({ limit: 100 });
    users.value = res.data?.users || res.users || [];
  } catch (error) {
    console.error('获取用户列表失败');
  } finally {
    loadingUsers.value = false;
  }
};

const searchUser = async () => {
  if (!userSearchQuery.value.trim()) {
    fetchUsers();
    return;
  }
  loadingUsers.value = true;
  try {
    // 先尝试按用户名搜索
    let res = await api.admin.getUserByUsername(userSearchQuery.value);
    if (res.success && res.data) {
      users.value = [res.data];
    } else {
      // 再尝试按游戏名搜索
      res = await api.admin.getUserByGameName(userSearchQuery.value);
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
    loadingUsers.value = false;
  }
};

const editUser = (user) => {
  userEditForm.id = user.id;
  userEditForm.username = user.username;
  userEditForm.gameName = user.gameName || '';
  userEditForm.role = user.role;
  userEditForm.customUploadLimit = user.customUploadLimit || 5;
  userEditForm.authUploadLimit = user.authUploadLimit || 1;
  showUserModal.value = true;
};

const saveUser = async () => {
  savingUser.value = true;
  try {
    // 更新用户基本信息
    await api.users.update(userEditForm.id, {
      gameName: userEditForm.gameName,
      role: userEditForm.role
    });
    // 更新上传限制
    await api.admin.updateUserUploadLimit(userEditForm.username, {
      customUploadLimit: userEditForm.customUploadLimit,
      authUploadLimit: userEditForm.authUploadLimit
    });
    showUserModal.value = false;
    fetchUsers();
    proxy.$message.success('保存成功');
  } catch (error) {
    proxy.$message.error('保存失败: ' + (error.message || '未知错误'));
  } finally {
    savingUser.value = false;
  }
};

const resetUserPassword = (user) => {
  resetUserForm.username = user.username;
  resetResult.value = null;
  showResetModal.value = true;
};

const confirmResetPassword = async () => {
  resetting.value = true;
  try {
    const res = await api.admin.resetPassword(resetUserForm.username);
    if (res.success) {
      resetResult.value = {
        username: res.data?.username || resetUserForm.username,
        newPassword: res.data?.newPassword
      };
    } else {
      proxy.$message.error('重置失败: ' + (res.message || '未知错误'));
    }
  } catch (error) {
    proxy.$message.error('重置失败: ' + (error.message || '未知错误'));
  } finally {
    resetting.value = false;
  }
};

const copyPassword = () => {
  if (resetResult.value?.newPassword) {
    navigator.clipboard.writeText(resetResult.value.newPassword);
    proxy.$message.success('密码已复制到剪贴板');
  }
};

const deleteUser = async (user) => {
  const confirmed = await proxy.$confirm({
    title: '确认删除',
    message: `确定删除用户 "${user.username}" 吗？此操作不可恢复！`,
    confirmText: '删除',
    cancelText: '取消'
  });
  if (!confirmed) return;
  try {
    await api.users.delete(user.id);
    fetchUsers();
    proxy.$message.success('删除成功');
  } catch (error) {
    proxy.$message.error('删除失败: ' + (error.message || '未知错误'));
  }
};

onMounted(() => {
  fetchStats();
  fetchSettings();
  fetchSystemInfo();
  checkRconStatus();
  fetchUsers();
});
</script>

<style scoped>
.admin-page {
  width: 100%;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

.section {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
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
  text-decoration: none;
  color: #333;
  transition: background 0.2s;
}

.btn:hover {
  background: #eee;
}

.btn.primary {
  background: #333;
  color: #fff;
}

.btn.primary:hover:not(:disabled) {
  background: #444;
}

.btn.primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn.secondary {
  background: #f5f5f5;
  color: #333;
}

.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.quick-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  background: #f9f9f9;
  border-radius: 12px;
  text-decoration: none;
  color: #333;
  transition: all 0.2s;
}

.quick-link:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
}

.quick-link span {
  font-size: 14px;
  font-weight: 500;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.info-content {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 12px;
  color: #666;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.rcon-panel {
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}

.rcon-output {
  height: 200px;
  overflow-y: auto;
  padding: 16px;
  background: #1a1a1a;
  font-family: monospace;
  font-size: 13px;
}

.output-line {
  margin: 0 0 8px;
  color: #0f0;
  white-space: pre-wrap;
}

.output-hint {
  margin: 0;
  color: #666;
}

.rcon-input {
  display: flex;
  border-top: 1px solid #333;
}

.rcon-input input {
  flex: 1;
  padding: 12px 16px;
  background: #1a1a1a;
  border: none;
  color: #fff;
  font-family: monospace;
  font-size: 13px;
  outline: none;
}

.rcon-input button {
  padding: 12px 20px;
  background: #333;
  border: none;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

.rcon-input button:hover:not(:disabled) {
  background: #444;
}

.rcon-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-box {
  display: flex;
  gap: 8px;
}

.search-box input {
  padding: 8px 12px;
  border: 1px solid #eee;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  width: 250px;
}

.search-box input:focus {
  border-color: #333;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #999;
}

.empty {
  text-align: center;
  padding: 48px;
  color: #999;
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
  max-width: 400px;
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
</style>
