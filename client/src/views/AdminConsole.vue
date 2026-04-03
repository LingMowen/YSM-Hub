<template>
  <div class="admin-console">
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
        <div class="header-actions">
          <span :class="['status-indicator', rconStatus ? 'online' : 'offline']">
            {{ rconStatus ? '在线' : '离线' }}
          </span>
          <button @click="checkRconStatus" class="btn">
            <Icon name="refresh-cw" :size="16" />
            刷新
          </button>
        </div>
      </div>
      <div class="rcon-panel">
        <div ref="outputRef" class="rcon-output">
          <p v-for="(line, i) in rconOutput" :key="i" :class="['output-line', line.type]">{{ line.text }}</p>
          <p v-if="rconOutput.length === 0" class="output-hint">输入命令发送至服务器</p>
        </div>
        <div class="rcon-input">
          <input
            v-model="rconCommand"
            type="text"
            placeholder="输入命令..."
            @keyup.enter="sendRconCommand"
            :disabled="!rconStatus || sending"
          />
          <button @click="sendRconCommand" :disabled="!rconCommand || !rconStatus || sending">
            <Icon v-if="sending" name="refresh-cw" :size="16" class="spin" />
            <Icon v-else name="send" :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <h3>快捷命令</h3>
      </div>
      <div class="quick-commands">
        <button v-for="cmd in quickCommands" :key="cmd.cmd" @click="executeQuickCommand(cmd.cmd)" class="quick-cmd-btn">
          {{ cmd.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import Icon from '../components/Icon.vue';
import api from '../api';

const rconStatus = ref(false);
const rconCommand = ref('');
const sending = ref(false);
const rconOutput = ref([]);
const outputRef = ref(null);
const systemInfo = reactive({});
const settings = reactive({ whitelistEnabled: false, emailVerificationEnabled: false });

const quickCommands = [
  { name: '玩家列表', cmd: 'list' },
  { name: '服务器状态', cmd: 'status' },
  { name: '服务端版本', cmd: 'version' },
  { name: 'Help', cmd: 'help' }
];

const scrollToBottom = () => {
  nextTick(() => {
    if (outputRef.value) {
      outputRef.value.scrollTop = outputRef.value.scrollHeight;
    }
  });
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
  const cmd = rconCommand.value.trim();
  rconOutput.value.push({ text: `> ${cmd}`, type: 'command' });
  sending.value = true;
  scrollToBottom();

  try {
    const res = await api.rcon.send(cmd);
    const result = res.data?.result || res.result;
    if (result) {
      rconOutput.value.push({ text: result, type: 'response' });
    } else {
      rconOutput.value.push({ text: '(无响应)', type: 'response' });
    }
  } catch (error) {
    rconOutput.value.push({ text: `错误: ${error.message || '命令执行失败'}`, type: 'error' });
  }

  rconCommand.value = '';
  sending.value = false;
  scrollToBottom();
};

const executeQuickCommand = (cmd) => {
  rconCommand.value = cmd;
  sendRconCommand();
};

onMounted(() => {
  fetchSettings();
  fetchSystemInfo();
  checkRconStatus();
});
</script>

<style scoped>
.admin-console {
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
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-indicator {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-indicator.online {
  background: #f0fdf4;
  color: #16a34a;
}

.status-indicator.offline {
  background: #fef2f2;
  color: #dc2626;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  height: 280px;
  overflow-y: auto;
  padding: 16px;
  background: #1a1a1a;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.output-line {
  margin: 0 0 8px;
  color: #0f0;
  white-space: pre-wrap;
  word-break: break-all;
}

.output-line.command {
  color: #4ade80;
}

.output-line.error {
  color: #f87171;
}

.output-line.response {
  color: #ccc;
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
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  outline: none;
}

.rcon-input input::placeholder {
  color: #666;
}

.rcon-input input:disabled {
  opacity: 0.5;
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

.quick-commands {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-cmd-btn {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #eee;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-cmd-btn:hover {
  background: #eee;
  border-color: #ddd;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
