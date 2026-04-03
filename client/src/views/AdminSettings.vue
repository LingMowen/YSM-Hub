<template>
  <div class="settings-page">
      <div class="settings-header">
        <h2>系统设置</h2>
      </div>

      <div class="settings-section">
        <h3>
          <Icon name="server" :size="18" />
          服务器配置
        </h3>
        <div class="settings-card">
          <div class="form-group">
            <label>模型文件夹路径</label>
            <input v-model="settings.modelDir" type="text" placeholder="./ysm_models" />
            <p class="label-hint">模型文件存储路径，需要与游戏服务器 mods 文件夹共享</p>
          </div>
          <div class="form-group">
            <label>RCON 地址</label>
            <input v-model="settings.rconHost" type="text" placeholder="localhost" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>RCON 端口</label>
              <input v-model="settings.rconPort" type="number" placeholder="25575" />
            </div>
            <div class="form-group">
              <label>RCON 密码</label>
              <input v-model="settings.rconPassword" type="password" placeholder="******" />
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>
          <Icon name="shield" :size="18" />
          安全设置
        </h3>
        <div class="settings-card">
          <div class="form-group">
            <label class="toggle-label">
              <span>邮箱验证</span>
              <p class="label-hint">注册时需要邮箱验证（模组中关闭后无需配置）</p>
              <button
                :class="['toggle', { active: settings.emailVerificationEnabled }]"
                @click="settings.emailVerificationEnabled = !settings.emailVerificationEnabled"
              >
                <span class="toggle-dot"></span>
              </button>
            </label>
          </div>
          <div class="form-group">
            <label class="toggle-label">
              <span>白名单验证</span>
              <p class="label-hint">仅允许白名单用户注册（仅在模组模式下可用）</p>
              <button
                :class="['toggle', { active: settings.whitelistEnabled }]"
                @click="settings.whitelistEnabled = !settings.whitelistEnabled"
              >
                <span class="toggle-dot"></span>
              </button>
            </label>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>
          <Icon name="download" :size="18" />
          功能设置
        </h3>
        <div class="settings-card">
          <div class="form-group">
            <label class="toggle-label">
              <span>模型下载功能</span>
              <p class="label-hint">开启后用户可以将模型文件下载到本地设备</p>
              <button
                :class="['toggle', { active: settings.downloadEnabled }]"
                @click="settings.downloadEnabled = !settings.downloadEnabled"
              >
                <span class="toggle-dot"></span>
              </button>
            </label>
          </div>
          <div class="form-group">
            <label class="toggle-label">
              <span>模型审核功能</span>
              <p class="label-hint">开启后上传的模型需要审核才能在模型中心显示</p>
              <button
                :class="['toggle', { active: settings.reviewEnabled }]"
                @click="settings.reviewEnabled = !settings.reviewEnabled"
              >
                <span class="toggle-dot"></span>
              </button>
            </label>
          </div>
          <div class="form-group" v-if="settings.reviewEnabled">
            <label>模型截图大小限制 (MB)</label>
            <input v-model.number="settings.reviewImageMaxSize" type="number" min="1" max="50" />
            <p class="label-hint">模型截图文件最大允许上传的大小</p>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>
          <Icon name="mail" :size="18" />
          SMTP 配置
        </h3>
        <div class="settings-card">
          <div class="form-group">
            <label>SMTP 服务器</label>
            <input v-model="smtpSettings.host" type="text" placeholder="smtp.example.com" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>SMTP 端口</label>
              <input v-model="smtpSettings.port" type="number" placeholder="587" />
            </div>
            <div class="form-group">
              <label>加密方式</label>
              <select v-model="smtpSettings.secure">
                <option :value="true">SSL</option>
                <option :value="false">TLS</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>发件人邮箱</label>
            <input v-model="smtpSettings.user" type="email" placeholder="noreply@example.com" />
          </div>
          <div class="form-group">
            <label>邮箱密码/授权码</label>
            <input v-model="smtpSettings.pass" type="password" placeholder="******" />
          </div>
          <div class="form-group">
            <label>发件人名称</label>
            <input v-model="smtpSettings.fromName" type="text" placeholder="模型管理系统" />
          </div>
        </div>
      </div>

      <div class="settings-actions">
        <button @click="resetSettings" class="btn secondary">
          <Icon name="x" :size="16" />
          重置
        </button>
        <button @click="saveSettings" class="btn primary" :disabled="saving">
          <Icon v-if="saving" name="refresh-cw" :size="16" class="spin" />
          <span v-else>保存设置</span>
        </button>
      </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import Icon from '../components/Icon.vue';
import api from '../api';

const saving = ref(false);
const settings = reactive({
  modelDir: '',
  rconHost: '',
  rconPort: '',
  rconPassword: '',
  emailVerificationEnabled: false,
  whitelistEnabled: false,
  downloadEnabled: false,
  reviewEnabled: false,
  reviewImageMaxSize: 10
});

const smtpSettings = reactive({
  host: '',
  port: 587,
  secure: true,
  user: '',
  pass: '',
  fromName: ''
});

const fetchSettings = async () => {
  try {
    const res = await api.admin.getSettings();
    Object.assign(settings, res.data?.settings || res.settings || {});
  } catch (error) {
    console.error('获取设置失败');
  }
};

const fetchSmtpSettings = async () => {
  try {
    const res = await api.admin.getSmtpSettings();
    Object.assign(smtpSettings, res.data?.smtp || res.smtp || {});
  } catch (error) {
    console.error('获取SMTP设置失败');
  }
};

const saveSettings = async () => {
  saving.value = true;
  try {
    await api.admin.updateSettings(settings);
    await api.admin.updateSmtpSettings(smtpSettings);
    alert('保存成功');
  } catch (error) {
    alert('保存失败');
  } finally {
    saving.value = false;
  }
};

const resetSettings = async () => {
  if (!confirm('确定重置所有设置吗？')) return;
  fetchSettings();
  fetchSmtpSettings();
};

onMounted(() => {
  fetchSettings();
  fetchSmtpSettings();
});
</script>

<style scoped>
.settings-page {
  width: 100%;
}

.settings-header {
  margin-bottom: 32px;
}

.settings-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.settings-section {
  margin-bottom: 32px;
}

.settings-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.settings-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  margin-bottom: 20px;
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
  padding: 10px 14px;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #333;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.toggle-label span {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.label-hint {
  flex: 2;
  margin: 0;
  font-size: 12px;
  color: #999;
}

.toggle {
  width: 48px;
  height: 26px;
  background: #ddd;
  border: none;
  border-radius: 13px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle.active {
  background: #333;
}

.toggle-dot {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle.active .toggle-dot {
  transform: translateX(22px);
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #eee;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
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
</style>
