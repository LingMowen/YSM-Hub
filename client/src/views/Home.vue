<template>
  <div class="home">
    <div class="stats">
      <div class="stat-card">
        <Icon name="box" :size="24" color="#333" />
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalModels }}</span>
          <span class="stat-label">模型总数</span>
        </div>
      </div>
      <div class="stat-card">
        <Icon name="users" :size="24" color="#333" />
        <div class="stat-info">
          <span class="stat-value">{{ stats.publicModels }}</span>
          <span class="stat-label">公开模型</span>
        </div>
      </div>
      <div class="stat-card">
        <Icon name="user" :size="24" color="#333" />
        <div class="stat-info">
          <span class="stat-value">{{ stats.myModels }}</span>
          <span class="stat-label">我的模型</span>
        </div>
      </div>
      <div class="stat-card">
        <Icon name="lock" :size="24" color="#333" />
        <div class="stat-info">
          <span class="stat-value">{{ stats.privateModels }}</span>
          <span class="stat-label">私人模型</span>
        </div>
      </div>
      <div v-if="authStore.isAdmin" class="stat-card">
        <Icon name="users" :size="24" color="#333" />
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalUsers }}</span>
          <span class="stat-label">用户总数</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h3 class="section-title">最近操作</h3>
      <div v-if="loading" class="loading">
        <Icon name="refresh-cw" :size="24" class="spin" />
      </div>
      <div v-else-if="recentModels.length === 0" class="empty">
        <Icon name="box" :size="48" color="#ccc" />
        <p>暂无模型</p>
      </div>
      <div v-else class="model-grid">
        <div v-for="model in recentModels" :key="model.id" class="model-card">
          <div class="model-thumb">
            <Icon name="box" :size="32" color="#999" />
          </div>
          <div class="model-info">
            <h4>{{ model.name }}</h4>
            <p>{{ model.gameName || '未关联' }}</p>
            <span class="model-date">{{ formatDate(model.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { useAuthStore } from '../stores/auth';
import Icon from '../components/Icon.vue';
import api from '../api';

const authStore = useAuthStore();
const loading = ref(false);
const recentModels = ref([]);

const stats = reactive({
  totalModels: 0,
  publicModels: 0,
  myModels: 0,
  privateModels: 0,
  totalUsers: 0
});

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN');
};

const fetchStats = async () => {
  try {
    if (authStore.isAdmin) {
      const res = await api.admin.getStats();
      const statsData = res.data?.stats || res.stats || {};
      if (statsData) {
        stats.totalModels = statsData.totalModels || 0;
        stats.totalUsers = statsData.totalUsers || 0;
      }
    }
    const modelRes = await api.models.list({ limit: 4 });
    const modelData = modelRes.data || modelRes;
    if (modelData && modelData.models) {
      recentModels.value = modelData.models;
      stats.myModels = modelData.pagination?.total || 0;
      stats.publicModels = modelData.models.filter(m => m.type === 'custom' || m.currentType === 'custom').length;
      stats.privateModels = modelData.models.filter(m => m.type === 'auth' || m.currentType === 'auth').length;
      if (!authStore.isAdmin) {
        stats.totalModels = stats.myModels;
      }
    }
  } catch (error) {
    console.error('获取统计数据失败:', error);
  }
};

onMounted(() => {
  fetchStats();
});
</script>

<style scoped>
.home {
  width: 100%;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px;
}

.loading, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
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
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.model-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.model-thumb {
  height: 120px;
  background: #f9f9f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-info {
  padding: 16px;
}

.model-info h4 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-info p {
  margin: 0 0 8px;
  font-size: 12px;
  color: #666;
}

.model-date {
  font-size: 12px;
  color: #999;
}
</style>
