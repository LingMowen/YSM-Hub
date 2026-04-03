<template>
  <div class="profile-page">
      <div class="profile-card">
        <div class="profile-header">
          <div class="avatar" @click="triggerAvatarInput">
            <img v-if="user?.avatar" :src="user.avatar" alt="头像" />
            <Icon v-else name="user" :size="32" />
            <div class="avatar-overlay">
              <Icon name="upload" :size="20" />
            </div>
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              @change="handleAvatarChange"
              hidden
            />
          </div>
          <div class="user-info">
            <h2>{{ user?.username }}</h2>
            <span class="role-badge" :class="user?.role">
              {{ user?.role === 'admin' ? '管理员' : '普通用户' }}
            </span>
          </div>
        </div>

        <div class="profile-details">
          <div class="detail-row">
            <span class="label">
              <Icon name="user" :size="16" />
              用户名
            </span>
            <span class="value">{{ user?.username }}</span>
          </div>
          <div class="detail-row">
            <span class="label">
              <Icon name="mail" :size="16" />
              邮箱
            </span>
            <span class="value">{{ user?.email || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">
              <Icon name="gamepad-2" :size="16" />
              游戏名称
            </span>
            <span class="value">{{ user?.gameName || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">
              <Icon name="box" :size="16" />
              模型数量
            </span>
            <span class="value">{{ stats.modelCount }}</span>
          </div>
          <div class="detail-row">
            <span class="label">
              <Icon name="calendar" :size="16" />
              注册时间
            </span>
            <span class="value">{{ formatDate(user?.createdAt) }}</span>
          </div>
        </div>

        <div class="profile-actions">
          <button @click="showEditModal = true" class="btn">
            <Icon name="edit" :size="18" />
            编辑资料
          </button>
          <button @click="showBindModal = true" class="btn">
            <Icon name="link" :size="18" />
            绑定游戏名
          </button>
          <button @click="handleLogout" class="btn danger">
            <Icon name="log-out" :size="18" />
            退出登录
          </button>
        </div>
      </div>

    <!-- 编辑资料弹窗 -->
    <div v-if="showEditModal" class="modal" @click.self="showEditModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>编辑资料</h3>
          <button @click="showEditModal = false" class="close-btn">
            <Icon name="x" :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>游戏名称</label>
            <input v-model="editForm.gameName" type="text" placeholder="MC用户名" />
          </div>
          <div class="form-group">
            <label>新密码（留空不修改）</label>
            <input v-model="editForm.password" type="password" placeholder="输入新密码" />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showEditModal = false" class="btn secondary">取消</button>
          <button @click="saveProfile" class="btn primary" :disabled="saving">
            <Icon v-if="saving" name="refresh-cw" :size="16" class="spin" />
            <span v-else>保存</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 绑定游戏名弹窗 -->
    <div v-if="showBindModal" class="modal" @click.self="closeBindModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>绑定 MC 游戏名</h3>
          <button @click="closeBindModal" class="close-btn">
            <Icon name="x" :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <!-- 步骤1：输入游戏名 -->
          <div v-if="bindStep === 1" class="bind-step">
            <div class="form-group">
              <label>MC 游戏名</label>
              <input v-model="bindForm.gameName" type="text" placeholder="输入游戏内用户名" :disabled="sendingCode" />
            </div>
            <div class="bind-info">
              <Icon name="info" :size="16" />
              <span>验证码将发送到游戏内聊天框，鼠标悬停在"[验证码]"上即可查看</span>
            </div>
          </div>

          <!-- 步骤2：输入验证码 -->
          <div v-if="bindStep === 2" class="bind-step">
            <div class="form-group">
              <label>验证码</label>
              <input v-model="bindForm.code" type="text" placeholder="输入游戏内看到的验证码" maxlength="6" :disabled="verifying" />
            </div>
            <div class="bind-info warning">
              <Icon name="clock" :size="16" />
              <span>验证码有效期 5 分钟，剩余尝试次数：{{ remainingAttempts }}</span>
            </div>
          </div>

          <!-- 绑定成功 -->
          <div v-if="bindStep === 3" class="bind-step success">
            <Icon name="check-circle" :size="48" />
            <p>游戏名绑定成功！</p>
          </div>

          <!-- 错误提示 -->
          <div v-if="bindError" class="bind-error">
            {{ bindError }}
          </div>
        </div>
        <div class="modal-footer">
          <button v-if="bindStep < 3" @click="closeBindModal" class="btn secondary">取消</button>
          <button v-if="bindStep === 1" @click="sendCode" class="btn primary" :disabled="sendingCode || !bindForm.gameName">
            <Icon v-if="sendingCode" name="refresh-cw" :size="16" class="spin" />
            <span v-else>发送验证码</span>
          </button>
          <button v-if="bindStep === 2" @click="verifyCode" class="btn primary" :disabled="verifying || !bindForm.code">
            <Icon v-if="verifying" name="refresh-cw" :size="16" class="spin" />
            <span v-else>确认绑定</span>
          </button>
          <button v-if="bindStep === 3" @click="closeBindModal" class="btn primary">确定</button>
        </div>
      </div>
    </div>

    <!-- 头像裁剪弹窗 -->
    <div v-if="showCropModal" class="modal" @click.self="closeCropModal">
      <div class="modal-content crop-modal">
        <div class="modal-header">
          <h3>裁剪头像</h3>
          <button @click="closeCropModal" class="close-btn">
            <Icon name="x" :size="20" />
          </button>
        </div>
        <div class="modal-body crop-body">
          <div class="crop-container">
            <img ref="cropImage" :src="cropImageSrc" class="crop-image" />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeCropModal" class="btn secondary">取消</button>
          <button @click="confirmCrop" class="btn primary" :disabled="uploadingAvatar">
            <Icon v-if="uploadingAvatar" name="refresh-cw" :size="16" class="spin" />
            <span v-else>确认</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, getCurrentInstance, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import Icon from '../components/Icon.vue';
import api from '../api';
import Cropper from 'cropperjs';

const { proxy } = getCurrentInstance();
const router = useRouter();
const authStore = useAuthStore();

const user = computed(() => authStore.user);
const showEditModal = ref(false);
const showBindModal = ref(false);
const saving = ref(false);
const stats = reactive({ modelCount: 0 });
const avatarInput = ref(null);
const uploadingAvatar = ref(false);
const showCropModal = ref(false);
const cropImageSrc = ref('');
const cropImage = ref(null);
let cropper = null;

watch(showCropModal, async (val) => {
  if (val) {
    await nextTick();
    if (cropImage.value) {
      cropper = new Cropper(cropImage.value, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.9,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false
      });
    }
  }
});

// 编辑表单
const editForm = reactive({
  gameName: '',
  password: ''
});

// 绑定游戏名相关
const bindStep = ref(1);
const sendingCode = ref(false);
const verifying = ref(false);
const remainingAttempts = ref(5);
const bindError = ref('');
const bindForm = reactive({
  gameName: '',
  code: ''
});

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
};

const fetchStats = async () => {
  try {
    const res = await api.models.list({ limit: 1000 });
    const data = res.data || res;
    stats.modelCount = data.pagination?.total || 0;
  } catch (error) {
    console.error('获取统计数据失败');
  }
};

const triggerAvatarInput = () => {
  avatarInput.value?.click();
};

const handleAvatarChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    proxy.$message.error('头像图片不能超过 5MB');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    cropImageSrc.value = e.target.result;
    showCropModal.value = true;
    if (avatarInput.value) avatarInput.value.value = '';
  };
  reader.readAsDataURL(file);
};

const closeCropModal = () => {
  showCropModal.value = false;
  cropImageSrc.value = '';
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
};

const confirmCrop = async () => {
  if (!cropper) return;

  const canvas = cropper.getCroppedCanvas({
    width: 200,
    height: 200,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high'
  });

  if (!canvas) {
    proxy.$message.error('裁剪失败');
    return;
  }

  uploadingAvatar.value = true;
  try {
    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.png');

      try {
        const res = await api.auth.uploadAvatar(formData);
        const avatarUrl = res.avatarUrl || res.data?.avatarUrl;
        if (avatarUrl) {
          authStore.user.avatar = avatarUrl;
          localStorage.setItem('user', JSON.stringify(authStore.user));
          proxy.$message.success('头像上传成功');
          closeCropModal();
        }
      } catch (error) {
        proxy.$message.error('头像上传失败');
      } finally {
        uploadingAvatar.value = false;
      }
    }, 'image/png', 0.9);
  } catch (error) {
    proxy.$message.error('裁剪失败');
    uploadingAvatar.value = false;
  }
};

const saveProfile = async () => {
  saving.value = true;
  try {
    const data = {};
    if (editForm.gameName) data.gameName = editForm.gameName;
    if (editForm.password) data.password = editForm.password;
    await api.auth.updateProfile(data);
    await authStore.fetchProfile();
    showEditModal.value = false;
    proxy.$message.success('保存成功');
  } catch (error) {
    proxy.$message.error('保存失败');
  } finally {
    saving.value = false;
  }
};

// 绑定游戏名相关方法
const closeBindModal = () => {
  showBindModal.value = false;
  bindStep.value = 1;
  bindForm.gameName = '';
  bindForm.code = '';
  bindError.value = '';
  remainingAttempts.value = 5;
};

const sendCode = async () => {
  if (!bindForm.gameName) return;
  
  sendingCode.value = true;
  bindError.value = '';
  
  try {
    const res = await api.users.sendGameNameCode(bindForm.gameName);
    if (res.success) {
      bindStep.value = 2;
    } else {
      bindError.value = res.message || '发送验证码失败';
    }
  } catch (error) {
    bindError.value = error.message || '发送验证码失败，请检查游戏名是否正确或玩家是否在线';
  } finally {
    sendingCode.value = false;
  }
};

const verifyCode = async () => {
  if (!bindForm.code || !bindForm.gameName) return;
  
  verifying.value = true;
  bindError.value = '';
  
  try {
    const res = await api.users.verifyGameName(bindForm.gameName, bindForm.code);
    if (res.success) {
      bindStep.value = 3;
      await authStore.fetchProfile();
    } else {
      bindError.value = res.message || '验证失败';
      if (res.attempts !== undefined) {
        remainingAttempts.value = 5 - res.attempts;
      }
    }
  } catch (error) {
    bindError.value = error.message || '验证失败';
    if (error.attempts !== undefined) {
      remainingAttempts.value = 5 - error.attempts;
    }
  } finally {
    verifying.value = false;
  }
};

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};

onMounted(() => {
  editForm.gameName = user.value?.gameName || '';
  fetchStats();
});
</script>

<style scoped>
.profile-page {
  width: 100%;
}

.profile-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 32px;
  background: linear-gradient(135deg, #f9f9f9 0%, #fff 100%);
}

.avatar {
  width: 72px;
  height: 72px;
  background: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  color: #fff;
}

.avatar:hover .avatar-overlay {
  opacity: 1;
}

.user-info h2 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
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

.profile-details {
  padding: 24px 32px;
  border-top: 1px solid #f5f5f5;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid #f5f5f5;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.detail-row .value {
  font-size: 14px;
  color: #333;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status.verified {
  color: #16a34a;
}

.status.unverified {
  color: #dc2626;
}

.profile-actions {
  display: flex;
  gap: 12px;
  padding: 24px 32px;
  border-top: 1px solid #f5f5f5;
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: #f9f9f9;
}

.btn.danger:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.btn.primary {
  background: #333;
  color: #fff;
  border-color: #333;
}

.btn.primary:hover {
  background: #444;
}

.btn.primary:disabled {
  background: #ccc;
  border-color: #ccc;
  cursor: not-allowed;
}

.btn.secondary {
  background: #f5f5f5;
  color: #333;
  border-color: #eee;
}

.btn.secondary:hover {
  background: #eee;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.form-group input:focus {
  border-color: #333;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #eee;
}

/* 绑定游戏名相关样式 */
.bind-step {
  text-align: center;
}

.bind-step.success {
  color: #16a34a;
  padding: 20px 0;
}

.bind-step.success p {
  margin-top: 12px;
  font-size: 16px;
  color: #333;
}

.bind-info {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 8px;
  font-size: 13px;
  color: #0369a1;
  text-align: left;
  margin-top: 12px;
}

.bind-info.warning {
  background: #fefce8;
  color: #a16207;
}

.bind-info svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.bind-error {
  margin-top: 12px;
  padding: 10px 12px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
}

.crop-modal {
  max-width: 500px;
}

.crop-body {
  padding: 16px;
}

.crop-container {
  width: 100%;
  height: 300px;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}

.crop-image {
  display: block;
  max-width: 100%;
}

.crop-container :deep(.cropper-view-box) {
  outline: 2px solid #333;
  outline-color: rgba(51, 51, 51, 0.75);
}

.crop-container :deep(.cropper-line) {
  background-color: #333;
}

.crop-container :deep(.cropper-point) {
  background-color: #333;
  width: 10px;
  height: 10px;
  opacity: 1;
}

.crop-container :deep(.cropper-modal) {
  background-color: #000;
  opacity: 0.5;
}

.crop-container :deep(.cropper-dashed) {
  border-color: #333;
}

.crop-container :deep(.cropper-center) {
  width: 20px;
  height: 20px;
  border: 1px dashed #333;
  background-color: #fff;
}
</style>
