<template>
  <div class="admin-models-page">
    <div class="page-header">
      <h2>模型管理</h2>
      <div class="header-actions">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索文件名..."
            @keyup.enter="searchModels"
          />
          <button @click="searchModels" class="btn">
            <Icon name="search" :size="16" />
          </button>
        </div>
        <button @click="fetchModels" class="btn">
          <Icon name="refresh-cw" :size="16" />
          刷新
        </button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">总模型数</span>
        <span class="stat-value">{{ totalModels }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">公开模型</span>
        <span class="stat-value">{{ publicModels }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">私人模型</span>
        <span class="stat-value">{{ privateModels }}</span>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <Icon name="refresh-cw" :size="32" class="spin" />
    </div>

    <div v-else-if="models.length === 0" class="empty">
      <Icon name="box" :size="48" />
      <p>暂无模型数据</p>
    </div>

    <div v-else class="models-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>文件名</th>
            <th>类型</th>
            <th>大小</th>
            <th>上传者</th>
            <th>上传时间</th>
            <th>审核状态</th>
            <th v-if="downloadEnabled">下载次数</th>
            <th>保存次数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="model in models" :key="model.id">
            <td>{{ model.id }}</td>
            <td class="filename">{{ model.fileName || '-' }}</td>
            <td>
              <span class="type-badge" :class="model.currentType">
                {{ model.currentType === 'custom' ? '公开' : '私人' }}
              </span>
            </td>
            <td>{{ formatFileSize(model.fileSize) }}</td>
            <td>{{ model.uploaders?.[0]?.name || '-' }}</td>
            <td>{{ formatDate(model.createdAt) }}</td>
            <td>
              <span :class="['status-badge', model.reviewStatus]">
                {{ reviewStatusText(model.reviewStatus) }}
              </span>
            </td>
            <td v-if="downloadEnabled">{{ model.downloadCount || 0 }}</td>
            <td>{{ model.saveCount || 0 }}</td>
            <td>
              <div class="actions">
                <button @click="viewModel(model)" class="action-btn" title="查看">
                  <Icon name="eye" :size="16" />
                </button>
                <button @click="deleteModel(model)" class="action-btn danger" title="删除">
                  <Icon name="trash-2" :size="16" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 模型详情弹窗 -->
    <div v-if="showDetailModal" class="modal" @click.self="showDetailModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>模型详情</h3>
          <button @click="showDetailModal = false" class="close-btn">
            <Icon name="x" :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-grid" v-if="selectedModel">
            <div class="detail-item">
              <span class="label">ID</span>
              <span class="value">{{ selectedModel.id }}</span>
            </div>
            <div class="detail-item">
              <span class="label">文件名</span>
              <span class="value">{{ selectedModel.fileName }}</span>
            </div>
            <div class="detail-item">
              <span class="label">类型</span>
              <span class="value">
                <span class="type-badge" :class="selectedModel.currentType">
                  {{ selectedModel.currentType === 'custom' ? '公开' : '私人' }}
                </span>
              </span>
            </div>
            <div class="detail-item">
              <span class="label">文件大小</span>
              <span class="value">{{ formatFileSize(selectedModel.fileSize) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">文件路径</span>
              <span class="value path">{{ selectedModel.filePath }}</span>
            </div>
            <div class="detail-item">
              <span class="label">上传者</span>
              <span class="value">{{ selectedModel.uploaders?.[0]?.name || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">上传者ID</span>
              <span class="value">{{ selectedModel.uploaders?.[0]?.id || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">上传时间</span>
              <span class="value">{{ formatDate(selectedModel.createdAt) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">下载次数</span>
              <span class="value">{{ selectedModel.downloadCount || 0 }}</span>
            </div>
            <div class="detail-item">
              <span class="label">保存次数</span>
              <span class="value">{{ selectedModel.saveCount || 0 }}</span>
            </div>
            <div class="detail-item full-width">
              <span class="label">描述</span>
              <span class="value">{{ selectedModel.description || '无描述' }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showDetailModal = false" class="btn secondary">关闭</button>
          <button v-if="downloadEnabled" @click="downloadModel(selectedModel)" class="btn primary">
            <Icon name="download" :size="16" />
            下载
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import Icon from '../components/Icon.vue';
import api from '../api';

const loading = ref(false);
const searchQuery = ref('');
const models = ref([]);
const showDetailModal = ref(false);
const selectedModel = ref(null);
const downloadEnabled = ref(false);

const totalModels = computed(() => models.value.length);
const publicModels = computed(() => models.value.filter(m => m.type === 'custom').length);
const privateModels = computed(() => models.value.filter(m => m.type === 'auth').length);

const formatFileSize = (bytes) => {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const reviewStatusText = (status) => {
  const map = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝'
  };
  return map[status] || status;
};

const fetchModels = async () => {
  loading.value = true;
  try {
    const res = await api.admin.getAllModels();
    models.value = res.data || [];
  } catch (error) {
    console.error('获取模型列表失败:', error);
    alert('获取模型列表失败');
  } finally {
    loading.value = false;
  }
};

const searchModels = async () => {
  if (!searchQuery.value.trim()) {
    fetchModels();
    return;
  }
  loading.value = true;
  try {
    const res = await api.admin.getModelByFileName(searchQuery.value);
    if (res.success && res.data) {
      models.value = [res.data];
    } else {
      models.value = [];
    }
  } catch (error) {
    console.error('搜索模型失败:', error);
    alert('搜索模型失败');
  } finally {
    loading.value = false;
  }
};

const viewModel = (model) => {
  selectedModel.value = model;
  showDetailModal.value = true;
};

const deleteModel = async (model) => {
  if (!confirm(`确定删除模型 "${model.fileName}" 吗？此操作不可恢复！`)) return;
  try {
    const res = await api.admin.deleteModel(model.id);
    if (res.success) {
      fetchModels();
      alert('删除成功');
    } else {
      alert('删除失败: ' + (res.message || '未知错误'));
    }
  } catch (error) {
    alert('删除失败: ' + (error.message || '未知错误'));
  }
};

const downloadModel = async (model) => {
  try {
    const res = await api.models.download(model.id);
    if (res.success && res.data?.downloadUrl) {
      window.open(res.data.downloadUrl, '_blank');
    } else {
      alert('获取下载链接失败');
    }
  } catch (error) {
    alert('下载失败: ' + (error.message || '未知错误'));
  }
};

const fetchSettings = async () => {
  try {
    const res = await api.admin.getSettings();
    const settings = res.data?.settings || res.settings || {};
    downloadEnabled.value = settings.downloadEnabled || false;
  } catch (error) {
    console.error('获取设置失败:', error);
  }
};

onMounted(() => {
  fetchSettings();
  fetchModels();
});
</script>

<style scoped>
.admin-models-page {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
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
  width: 250px;
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

.btn.primary:hover {
  background: #444;
}

.btn.secondary {
  background: #f5f5f5;
  color: #333;
}

.stats-bar {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: #fff;
  border-radius: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px;
  background: #fff;
  border-radius: 12px;
  color: #999;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px;
  background: #fff;
  border-radius: 12px;
  color: #999;
}

.models-table {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.models-table table {
  width: 100%;
  border-collapse: collapse;
}

.models-table th,
.models-table td {
  padding: 12px 16px;
  text-align: left;
  font-size: 14px;
}

.models-table th {
  background: #f9f9f9;
  font-weight: 500;
  color: #666;
}

.models-table tbody tr {
  border-top: 1px solid #f5f5f5;
}

.models-table tbody tr:hover {
  background: #fafafa;
}

.filename {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-badge {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.type-badge.custom {
  background: #f0fdf4;
  color: #16a34a;
}

.type-badge.auth {
  background: #fefce8;
  color: #a16207;
}

.status-badge {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.approved {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.rejected {
  background: #fee2e2;
  color: #991b1b;
}

.actions {
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
  max-width: 500px;
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

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item .label {
  font-size: 12px;
  color: #666;
}

.detail-item .value {
  font-size: 14px;
  color: #333;
  word-break: break-all;
}

.detail-item .value.path {
  font-family: monospace;
  font-size: 12px;
  color: #666;
}
</style>
