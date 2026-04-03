<template>
  <div class="model-center">
    <div class="header">
      <div class="search-box">
        <Icon name="search" :size="20" />
        <input v-model="searchQuery" type="text" placeholder="搜索模型名称或用户名..." @input="handleSearch" />
      </div>
      <div class="filters">
        <select v-model="sortBy" @change="fetchModels" class="filter-select">
          <option value="newest">最新上传</option>
          <option value="popular">最多下载</option>
          <option value="name">名称排序</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <Icon name="refresh-cw" :size="24" class="spin" />
    </div>
    <div v-else-if="models.length === 0" class="empty">
      <Icon name="box" :size="48" color="#ccc" />
      <p>暂无公开模型</p>
    </div>
    <div v-else class="model-grid">
      <div
        v-for="model in models"
        :key="model.id"
        class="model-card"
        @click="viewModel(model)"
      >
        <div class="model-thumb">
          <Icon name="box" :size="48" color="#999" />
        </div>

        <div class="model-info">
          <h3 class="model-name">{{ model.name }}</h3>
          <div class="model-uploader">
            <Icon name="user" :size="14" />
            <span>{{ model.uploaders?.[0]?.name || '未知用户' }}</span>
          </div>
          <div class="model-stats">
            <span class="stat" v-if="model.ratingStats">
              <template v-if="model.ratingStats.totalRatings >= 20">
                <Icon name="star" :size="14" :filled="true" />
                <span>{{ model.ratingStats.averageRating.toFixed(1) }}</span>
              </template>
              <template v-else>
                <Icon name="star" :size="14" :filled="false" />
                <span class="rating-placeholder">?</span>
              </template>
            </span>
            <span class="stat">
              <Icon name="download" :size="14" />
              {{ model.downloadCount || 0 }}
            </span>
            <span class="stat">
              <Icon name="clock" :size="14" />
              {{ formatDate(model.createdAt) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 模型详情弹窗 -->
    <div v-if="showDetailModal" class="modal" @click.self="closeDetailModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>模型详情</h3>
          <button @click="closeDetailModal" class="close-btn">
            <Icon name="x" :size="20" />
          </button>
        </div>
        <div class="modal-body" v-if="selectedModel">
          <div class="detail-layout">
            <div class="detail-image">
              <img v-if="selectedModel.imageUrl" :src="selectedModel.imageUrl" alt="模型截图" />
              <div v-else class="no-image">
                <Icon name="image" :size="48" color="#999" />
                <span>暂无截图</span>
              </div>
            </div>
            <div class="detail-info">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">名称</span>
                  <span class="value">{{ selectedModel.name }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">文件名</span>
                  <span class="value">{{ selectedModel.fileName }}.ysm</span>
                </div>
                <div class="detail-item">
                  <span class="label">上传者</span>
                  <span class="value">{{ selectedModel.uploaders?.[0]?.name || '未知用户' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">上传时间</span>
                  <span class="value">{{ formatDate(selectedModel.createdAt) }}</span>
                </div>
                <div class="detail-item" v-if="downloadEnabled">
                  <span class="label">下载次数</span>
                  <span class="value">{{ selectedModel.downloadCount || 0 }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">保存次数</span>
                  <span class="value">{{ selectedModel.saveCount || 0 }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">评分</span>
                  <span class="value" v-if="selectedModel.ratingStats && selectedModel.ratingStats.totalRatings >= 20">
                    <Icon name="star" :size="14" :filled="true" color="#f59e0b" />
                    {{ selectedModel.ratingStats.averageRating.toFixed(1) }} ({{ selectedModel.ratingStats.totalRatings }}人)
                  </span>
                  <span class="value rating-placeholder" v-else>评分: ?</span>
                </div>
              </div>
              <div class="detail-description" v-if="selectedModel.description">
                <span class="label">简介</span>
                <p>{{ selectedModel.description }}</p>
              </div>
            </div>
          </div>

          <!-- 评论区域 -->
          <div class="comments-section">
            <div class="comments-header">
              <span>评论</span>
              <span class="comments-stats" v-if="commentsStats.totalRatings >= 20">
                <Icon name="star" :size="14" :filled="true" color="#f59e0b" />
                {{ commentsStats.averageRating.toFixed(1) }} ({{ commentsStats.totalRatings }}人评分)
              </span>
              <span class="comments-stats" v-else>
                评分: ?
              </span>
            </div>

            <!-- 评论输入 -->
            <div class="comment-input" v-if="authStore.isAuthenticated">
              <div class="rating-input">
                <span>评分:</span>
                <div class="stars">
                  <Icon
                    v-for="star in 5"
                    :key="star"
                    name="star"
                    :size="20"
                    :color="star <= newComment.rating ? '#f59e0b' : '#ddd'"
                    :filled="star <= newComment.rating"
                    @click="newComment.rating = star"
                  />
                </div>
              </div>
              <textarea v-model="newComment.content" placeholder="写下你的评论..." rows="2"></textarea>
              <button @click="submitComment" class="submit-comment" :disabled="submitting">
                {{ submitting ? '发布中...' : '发布评论' }}
              </button>
            </div>
            <div v-else class="login-hint">
              登录后可发表评论
            </div>

            <!-- 评论列表 -->
            <div class="comments-list" v-if="comments.length > 0">
              <div v-for="comment in comments" :key="comment.id" class="comment-item">
                <div class="comment-header">
                  <span class="comment-user">{{ comment.user?.name || '匿名用户' }}</span>
                  <div class="comment-rating" v-if="comment.rating > 0">
                    <Icon name="star" :size="14" :filled="true" />
                    <span>{{ comment.rating }}</span>
                  </div>
                  <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                  <button
                    v-if="authStore.user?.id === comment.userId || authStore.isAdmin"
                    @click="deleteComment(comment.id)"
                    class="delete-comment"
                  >
                    <Icon name="trash-2" :size="14" />
                  </button>
                </div>
                <p class="comment-content">{{ comment.content }}</p>
              </div>
            </div>
            <div v-else class="no-comments">
              暂无评论，快来抢沙发！
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeDetailModal" class="btn secondary">关闭</button>
          <button @click="saveToMyModels(selectedModel)" class="btn" :disabled="saving === selectedModel?.id || selectedModel?.isSaved">
            <Icon :name="saving === selectedModel?.id ? 'refresh-cw' : (selectedModel?.isSaved ? 'check' : 'plus')" :size="16" />
            {{ saving === selectedModel?.id ? '保存中...' : (selectedModel?.isSaved ? '已保存' : '保存到我的模型') }}
          </button>
          <button v-if="downloadEnabled" @click="downloadModel(selectedModel)" class="btn primary" :disabled="downloading === selectedModel?.id">
            <Icon :name="downloading === selectedModel?.id ? 'refresh-cw' : 'download'" :size="16" />
            {{ downloading === selectedModel?.id ? '下载中...' : '下载' }}
          </button>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import Icon from '../components/Icon.vue';
import api from '../api';

const authStore = useAuthStore();
const loading = ref(false);
const downloading = ref(null);
const saving = ref(null);
const models = ref([]);
const myModelIds = ref(new Set());
const searchQuery = ref('');
const sortBy = ref('newest');
const downloadEnabled = ref(false);
const showDetailModal = ref(false);
const selectedModel = ref(null);
const comments = ref([]);
const commentsStats = ref({ total: 0, averageRating: 0, totalRatings: 0 });
const newComment = reactive({ content: '', rating: 0 });
const submitting = ref(false);

const pagination = reactive({
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 0
});

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getRatingDisplay = (stats) => {
  if (!stats || stats.totalRatings < 20) {
    return { show: false, stars: '?', text: '??' };
  }
  return {
    show: true,
    stars: Math.round(stats.averageRating),
    text: stats.averageRating.toFixed(1)
  };
};

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
      limit: pagination.limit,
      type: 'custom'
    };
    if (searchQuery.value) params.search = searchQuery.value;
    if (sortBy.value) params.sort = sortBy.value;

    const res = await api.models.list(params);
    const data = res.data || res;

    const myModelsRes = await api.models.list({ limit: 1000 });
    const myModelsData = myModelsRes.data || myModelsRes;
    myModelIds.value = new Set((myModelsData.models || []).map(m => m.id));

    models.value = (data.models || []).map(model => ({
      ...model,
      isSaved: myModelIds.value.has(model.id)
    }));
    pagination.total = data.pagination?.total || 0;
    pagination.totalPages = Math.ceil(pagination.total / pagination.limit);
  } catch (error) {
    console.error('获取模型列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const changePage = (page) => {
  pagination.page = page;
  fetchModels();
};

const viewModel = async (model) => {
  selectedModel.value = model;
  showDetailModal.value = true;
  await fetchComments(model.id);
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedModel.value = null;
  comments.value = [];
  commentsStats.value = { total: 0, averageRating: 0, totalRatings: 0 };
  newComment.content = '';
  newComment.rating = 0;
};

const fetchComments = async (modelId) => {
  try {
    const res = await api.models.getComments(modelId);
    const data = res.data || res;
    comments.value = data.comments || [];
    commentsStats.value = {
      total: data.total || 0,
      averageRating: data.averageRating || 0,
      totalRatings: data.totalRatings || 0
    };
  } catch (error) {
    console.error('获取评论失败:', error);
  }
};

const submitComment = async () => {
  if (!newComment.content.trim()) return;
  submitting.value = true;
  try {
    await api.models.addComment(selectedModel.value.id, {
      content: newComment.content,
      rating: newComment.rating
    });
    newComment.content = '';
    newComment.rating = 0;
    await fetchComments(selectedModel.value.id);
  } catch (error) {
    alert('评论失败');
  } finally {
    submitting.value = false;
  }
};

const deleteComment = async (commentId) => {
  try {
    await api.models.deleteComment(commentId);
    await fetchComments(selectedModel.value.id);
  } catch (error) {
    alert('删除失败');
  }
};

const downloadModel = async (model) => {
  downloading.value = model.id;
  try {
    const response = await api.models.downloadFile(model.id);
    const blob = new Blob([response.data], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = model.name + '.ysm';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    await api.models.incrementDownloadCount(model.id);
  } catch (error) {
    console.error('下载失败:', error);
    alert(error.response?.data?.message || '下载失败');
  } finally {
    downloading.value = null;
  }
};

const saveToMyModels = async (model) => {
  if (model.isSaved) return;

  saving.value = model.id;
  try {
    await api.models.saveToMyModels(model.id);
    model.isSaved = true;
    myModelIds.value.add(model.id);
    alert('模型已保存到您的模型列表！');
  } catch (error) {
    console.error('保存失败:', error);
    alert(error.response?.data?.message || '保存失败');
  } finally {
    saving.value = null;
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
.model-center {
  width: 100%;
}

.header {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 250px;
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

.filters {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  min-width: 140px;
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
  margin: 12px 0 0;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.model-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.model-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.model-thumb {
  height: 140px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-info {
  padding: 16px;
  flex: 1;
}

.model-name {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-uploader {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.model-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #f59e0b;
  margin-bottom: 8px;
}

.model-rating svg {
  fill: #f59e0b;
  color: #f59e0b;
}

.rating-count {
  color: #999;
  font-size: 12px;
}

.rating-placeholder {
  color: #999;
}

.model-stats {
  display: flex;
  gap: 16px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
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
  max-width: 720px;
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

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #eee;
}

.modal-footer .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-footer .btn.primary {
  background: #333;
  color: #fff;
}

.modal-footer .btn.primary:hover:not(:disabled) {
  background: #555;
}

.modal-footer .btn.secondary {
  background: #f5f5f5;
  color: #333;
}

.modal-footer .btn.secondary:hover:not(:disabled) {
  background: #eee;
}

.modal-footer .btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.detail-layout {
  display: flex;
  gap: 20px;
}

.detail-image {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
  flex-shrink: 0;
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-image .no-image {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.detail-image .no-image span {
  font-size: 12px;
  color: #999;
}

.detail-info {
  flex: 1;
  min-width: 0;
}

.detail-description {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.detail-description .label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.detail-description p {
  margin: 0;
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  word-break: break-word;
}

.comments-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.comments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.comments-stats {
  font-size: 13px;
  font-weight: normal;
  color: #666;
}

.comment-input {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.rating-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #666;
}

.stars {
  display: flex;
  gap: 4px;
  cursor: pointer;
}

.stars svg {
  color: #ddd;
  transition: color 0.2s;
}

.stars svg.filled,
.stars svg:hover {
  color: #f59e0b;
  fill: #f59e0b;
}

.comment-input textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 6px;
  font-size: 13px;
  resize: none;
  outline: none;
  font-family: inherit;
}

.comment-input textarea:focus {
  border-color: #333;
}

.submit-comment {
  margin-top: 8px;
  padding: 8px 16px;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.submit-comment:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.login-hint {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 13px;
}

.no-comments {
  text-align: center;
  padding: 24px;
  color: #999;
  font-size: 13px;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.comment-user {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.comment-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: #f59e0b;
}

.comment-rating svg {
  fill: #f59e0b;
  color: #f59e0b;
}

.comment-date {
  font-size: 12px;
  color: #999;
  margin-left: auto;
}

.delete-comment {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 4px;
}

.delete-comment:hover {
  color: #dc2626;
}

.comment-content {
  margin: 0;
  font-size: 13px;
  color: #555;
  line-height: 1.5;
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
</style>
