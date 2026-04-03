<template>
  <div class="models-page">
    <div class="header">
      <div class="search-box">
        <Icon name="search" :size="20" />
        <input v-model="searchQuery" type="text" placeholder="搜索模型..." @input="handleSearch" />
      </div>
      <div class="actions">
        <select v-model="filterType" @change="fetchModels" class="filter-select">
          <option value="">全部模型</option>
          <option value="public">公开模型</option>
          <option value="private">私人模型</option>
          <option value="my">我的模型</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <Icon name="refresh-cw" :size="24" class="spin" />
    </div>
    <div v-else-if="models.length === 0" class="empty">
      <Icon name="box" :size="48" color="#ccc" />
      <p>暂无模型</p>
      <router-link to="/upload" class="btn">上传模型</router-link>
    </div>
    <div v-else class="model-list">
      <div
        v-for="model in models"
        :key="model.id"
        :class="['model-item', { expanded: expandedModel === model.id }]"
      >
        <div class="model-main" @click="togglePreview(model.id)">
          <div class="model-thumb">
            <div v-if="expandedModel === model.id" class="model-preview">
              <div class="preview-placeholder">
                <Icon name="box" :size="48" color="#999" />
                <span>YSM 模型</span>
                <small>{{ model.name }}</small>
              </div>
            </div>
            <Icon v-else name="box" :size="32" color="#999" />
          </div>
          <div class="model-content">
            <h3>{{ model.name }}</h3>
            <div class="model-meta">
              <span class="meta-date">{{ formatDate(model.createdAt) }}</span>
            </div>
          </div>
          <div class="expand-indicator">
            <Icon :name="expandedModel === model.id ? 'chevron-up' : 'chevron-down'" :size="20" />
          </div>
        </div>

        <div v-if="expandedModel === model.id" class="model-expanded">
          <div class="expanded-info">
            <div class="info-row">
              <span class="info-label">文件名</span>
              <span class="info-value">{{ model.fileName || model.name }}.ysm</span>
            </div>
            <div class="info-row">
              <span class="info-label">模型类型</span>
              <span class="info-value">{{ model.type === 'custom' ? '公开模型' : '私人模型' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">上传时间</span>
              <span class="info-value">{{ formatDate(model.createdAt) }}</span>
            </div>
          </div>
          <div class="expanded-actions">
            <button @click.stop="viewModel(model)" class="action-btn" title="查看详情">
              <Icon name="eye" :size="18" />
            </button>
            <button v-if="model.type === 'auth'" @click.stop="authorizeModel(model)" class="action-btn success" title="授权">
              <Icon name="key" :size="18" />
            </button>
            <button v-if="authStore.isAdmin" @click.stop="editModel(model)" class="action-btn" title="编辑">
              <Icon name="edit" :size="18" />
            </button>
            <button v-if="authStore.isAdmin" @click.stop="deleteModel(model)" class="action-btn danger" title="删除">
              <Icon name="trash-2" :size="18" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="pagination.totalPages > 1" class="pagination">
      <button :disabled="pagination.page <= 1" @click="changePage(pagination.page - 1)">
        <Icon name="chevron-left" :size="16" />
      </button>
      <span>{{ pagination.page }} / {{ pagination.totalPages }}</span>
      <button :disabled="pagination.page >= pagination.totalPages" @click="changePage(pagination.page + 1)">
        <Icon name="chevron-right" :size="16" />
      </button>
    </div>

    <div v-if="showModal" class="modal" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ modalMode === 'view' ? '模型详情' : '编辑模型' }}</h3>
          <button @click="showModal = false" class="close-btn">
            <Icon name="x" :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <template v-if="modalMode === 'view'">
            <div class="detail-row">
              <span class="label">名称</span>
              <span class="value">{{ currentModel.name }}</span>
            </div>
            <div class="detail-row">
              <span class="label">文件名</span>
              <span class="value">{{ currentModel.fileName || currentModel.name }}.ysm</span>
            </div>
            <div class="detail-row">
              <span class="label">模型类型</span>
              <span class="value">{{ currentModel.type === 'custom' ? '公开模型' : '私人模型' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">创建时间</span>
              <span class="value">{{ formatDate(currentModel.createdAt) }}</span>
            </div>
          </template>
          <template v-else-if="modalMode === 'edit'">
            <div class="form-group">
              <label>名称</label>
              <input v-model="editForm.name" type="text" />
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <button @click="showModal = false" class="btn secondary">取消</button>
          <button v-if="modalMode === 'edit'" @click="saveEdit" class="btn primary">保存</button>
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
const loading = ref(false);
const models = ref([]);
const searchQuery = ref('');
const filterType = ref('');
const showModal = ref(false);
const modalMode = ref('view');
const currentModel = ref({});
const expandedModel = ref(null);

const editForm = reactive({ name: '' });

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0
});

const formatDate = (date) => new Date(date).toLocaleDateString('zh-CN');

let searchTimeout = null;
const handleSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.page = 1;
    fetchModels();
  }, 300);
};

const fetchModels = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit
    };
    if (searchQuery.value) params.search = searchQuery.value;
    if (filterType.value) params.filterType = filterType.value;

    const res = await api.models.list(params);
    const data = res.data || res;
    models.value = data.models || [];
    pagination.total = data.pagination?.total || 0;
    pagination.totalPages = Math.ceil(pagination.total / pagination.limit);
  } catch (error) {
    console.error('获取模型列表失败');
  } finally {
    loading.value = false;
  }
};

const changePage = (page) => {
  pagination.page = page;
  fetchModels();
};

const togglePreview = (modelId) => {
  expandedModel.value = expandedModel.value === modelId ? null : modelId;
};

const viewModel = (model) => {
  currentModel.value = model;
  modalMode.value = 'view';
  showModal.value = true;
};

const editModel = (model) => {
  currentModel.value = model;
  editForm.name = model.name;
  modalMode.value = 'edit';
  showModal.value = true;
};

const saveEdit = async () => {
  try {
    await api.models.update(currentModel.value.id, editForm);
    showModal.value = false;
    fetchModels();
    alert('保存成功');
  } catch (error) {
    alert('保存失败');
  }
};

const deleteModel = async (model) => {
  if (!confirm(`确定彻底删除模型 "${model.name}" 吗？此操作不可恢复！`)) return;

  try {
    await api.models.delete(model.id);
    fetchModels();
    alert('删除成功');
  } catch (error) {
    alert('删除失败');
  }
};

const authorizeModel = async (model) => {
  const gameName = authStore.user?.gameName;
  
  if (!gameName) {
    alert('请先绑定游戏名');
    return;
  }
  
  if (!confirm(`确定将模型 "${model.name}" 授权给 "${gameName}" 吗？`)) return;
  
  try {
    await api.models.authorize(model.id, gameName);
    alert('授权成功');
  } catch (error) {
    alert('授权失败: ' + (error.message || '未知错误'));
  }
};

onMounted(() => {
  fetchModels();
});
</script>

<style scoped>
.models-page {
  width: 100%;
}

.header {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #eee;
}

.search-box input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
}

.filter-select {
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.loading, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px;
  background: #fff;
  border-radius: 12px;
  color: #999;
}

.empty p {
  margin: 12px 0 24px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn.primary {
  background: #333;
  color: #fff;
}

.btn.secondary {
  background: #f5f5f5;
  color: #333;
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-item {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.2s;
}

.model-item.expanded {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.model-main {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  cursor: pointer;
}

.model-thumb {
  width: 64px;
  height: 64px;
  background: #f9f9f9;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.model-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.preview-placeholder span {
  font-size: 10px;
  color: #666;
  font-weight: 500;
}

.preview-placeholder small {
  font-size: 8px;
  color: #999;
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-content {
  flex: 1;
  min-width: 0;
}

.model-content h3 {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.meta-tag.linked {
  background: #f0fdf4;
  color: #16a34a;
}

.meta-tag.unlinked {
  background: #fef2f2;
  color: #dc2626;
}

.meta-date {
  font-size: 12px;
  color: #999;
}

.expand-indicator {
  color: #999;
  transition: transform 0.2s;
}

.model-item.expanded .expand-indicator {
  transform: rotate(180deg);
}

.model-expanded {
  padding: 0 16px 16px;
  border-top: 1px solid #f5f5f5;
  margin-top: 0;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.expanded-info {
  padding: 16px 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: #666;
}

.info-value {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.expanded-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #eee;
  color: #333;
}

.action-btn.danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.action-btn.success {
  background: #f0fdf4;
  color: #16a34a;
}

.action-btn.success:hover {
  background: #dcfce7;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
}

.pagination button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination button:hover:not(:disabled) {
  background: #f5f5f5;
}

.pagination span {
  font-size: 14px;
  color: #666;
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
  max-width: 480px;
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
  padding: 4px;
}

.modal-body {
  padding: 20px;
}

.detail-row {
  display: flex;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  width: 100px;
  color: #666;
  font-size: 14px;
}

.detail-row .value {
  flex: 1;
  color: #333;
  font-size: 14px;
}

.form-group {
  margin-bottom: 16px;
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

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #eee;
}
</style>
