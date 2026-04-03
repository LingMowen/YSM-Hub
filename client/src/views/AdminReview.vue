<template>
  <div class="review-center">
    <div class="section">
      <div class="section-header">
        <h3>待审核模型</h3>
        <button @click="fetchPendingModels" class="btn">
          <Icon name="refresh-cw" :size="16" />
          刷新
        </button>
      </div>

      <div v-if="loading" class="loading">
        <Icon name="refresh-cw" :size="24" class="spin" />
      </div>
      <div v-else-if="!reviewEnabled" class="empty disabled">
        <Icon name="shield-off" :size="48" color="#999" />
        <p>模型审核功能已关闭</p>
        <p class="hint">上传的模型将自动通过审核，无需人工审核</p>
      </div>
      <div v-else-if="pendingModels.length === 0" class="empty">
        <Icon name="check-circle" :size="48" color="#16a34a" />
        <p>暂无待审核模型</p>
      </div>
      <div v-else class="model-list">
        <div v-for="model in pendingModels" :key="model.id" class="model-card">
          <div class="model-image">
            <img v-if="model.imageUrl" :src="model.imageUrl" alt="模型预览" />
            <div v-else class="no-image">
              <Icon name="image" :size="48" color="#999" />
              <span>暂无预览图</span>
            </div>
          </div>
          <div class="model-info">
            <div class="model-header">
              <h4>{{ model.fileName }}</h4>
              <span class="status-badge pending">待审核</span>
            </div>
            <div class="model-meta">
              <span><Icon name="user" :size="14" /> {{ model.uploaders?.[0]?.name || '未知' }}</span>
              <span><Icon name="clock" :size="14" /> {{ formatDate(model.createdAt) }}</span>
              <span><Icon name="hard-drive" :size="14" /> {{ formatFileSize(model.fileSize) }}</span>
            </div>
          </div>
          <div class="model-actions">
            <button @click="viewModel(model)" class="btn">
              <Icon name="eye" :size="16" />
              查看
            </button>
            <button @click="approveModel(model)" class="btn approve">
              <Icon name="check" :size="16" />
              通过
            </button>
            <button @click="rejectModel(model)" class="btn reject">
              <Icon name="x" :size="16" />
              拒绝
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDetailModal" class="modal" @click.self="showDetailModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>模型详情</h3>
          <button @click="showDetailModal = false" class="close-btn">
            <Icon name="x" :size="20" />
          </button>
        </div>
        <div class="modal-body" v-if="selectedModel">
          <div class="detail-image">
            <img v-if="selectedModel.imageUrl" :src="selectedModel.imageUrl" alt="模型预览" />
            <div v-else class="no-image">
              <Icon name="image" :size="48" color="#999" />
              <span>暂无预览图</span>
            </div>
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">文件名</span>
              <span class="value">{{ selectedModel.fileName }}</span>
            </div>
            <div class="detail-item">
              <span class="label">上传者</span>
              <span class="value">{{ selectedModel.uploaders?.[0]?.name || '未知' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">上传时间</span>
              <span class="value">{{ formatDate(selectedModel.createdAt) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">文件大小</span>
              <span class="value">{{ formatFileSize(selectedModel.fileSize) }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showDetailModal = false" class="btn secondary">关闭</button>
          <button @click="rejectModel(selectedModel)" class="btn reject">
            <Icon name="x" :size="16" />
            拒绝
          </button>
          <button @click="approveModel(selectedModel)" class="btn approve">
            <Icon name="check" :size="16" />
            通过审核
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Icon from '../components/Icon.vue';
import api from '../api';

const loading = ref(false);
const pendingModels = ref([]);
const showDetailModal = ref(false);
const selectedModel = ref(null);
const reviewEnabled = ref(true);

const fetchSettings = async () => {
  try {
    const res = await api.admin.getSettings();
    const settings = res.data?.settings || res.settings || {};
    reviewEnabled.value = settings.reviewEnabled ?? true;
  } catch (error) {
    console.error('获取设置失败:', error);
  }
};

const fetchPendingModels = async () => {
  loading.value = true;
  try {
    const res = await api.admin.getPendingReviewModels();
    pendingModels.value = res.data || [];
  } catch (error) {
    alert('获取待审核模型失败');
  } finally {
    loading.value = false;
  }
};

const viewModel = (model) => {
  selectedModel.value = model;
  showDetailModal.value = true;
};

const approveModel = async (model) => {
  try {
    await api.admin.reviewModel(model.id, 'approve');
    showDetailModal.value = false;
    fetchPendingModels();
    alert('模型已通过审核');
  } catch (error) {
    alert('操作失败: ' + (error.message || '未知错误'));
  }
};

const rejectModel = async (model) => {
  try {
    await api.admin.reviewModel(model.id, 'reject');
    showDetailModal.value = false;
    fetchPendingModels();
    alert('模型已拒绝');
  } catch (error) {
    alert('操作失败: ' + (error.message || '未知错误'));
  }
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

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

onMounted(() => {
  fetchSettings();
  fetchPendingModels();
});
</script>

<style scoped>
.review-center {
  width: 100%;
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

.loading, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #999;
}

.empty.disabled {
  background: #f9f9f9;
  border-radius: 8px;
}

.empty p {
  margin: 12px 0 0;
}

.empty .hint {
  font-size: 13px;
  color: #bbb;
  margin-top: 8px;
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.model-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.model-image {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f0f0f0;
}

.model-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.no-image span {
  font-size: 12px;
  color: #999;
}

.model-info {
  flex: 1;
  min-width: 0;
}

.model-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.model-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
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

.model-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.model-meta span {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.model-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

.btn.approve {
  background: #16a34a;
  color: #fff;
}

.btn.approve:hover:not(:disabled) {
  background: #15803d;
}

.btn.reject {
  background: #dc2626;
  color: #fff;
}

.btn.reject:hover:not(:disabled) {
  background: #b91c1c;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  max-height: 90vh;
  overflow: auto;
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

.detail-image {
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  background: #f0f0f0;
  margin-bottom: 20px;
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
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

.detail-item .label {
  font-size: 12px;
  color: #666;
}

.detail-item .value {
  font-size: 14px;
  color: #333;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #eee;
}

.modal-footer .btn.secondary {
  background: #f5f5f5;
  color: #333;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
