<template>
  <div class="admin-overview">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon users">
          <Icon name="users" :size="24" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.totalUsers || 0 }}</span>
          <span class="stat-label">用户总数</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon models">
          <Icon name="box" :size="24" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.totalModels || 0 }}</span>
          <span class="stat-label">模型总数</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon linked">
          <Icon name="link" :size="24" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.linkedModels || 0 }}</span>
          <span class="stat-label">已授权模型</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import Icon from '../components/Icon.vue';
import api from '../api';

const stats = reactive({
  totalUsers: 0,
  totalModels: 0,
  linkedModels: 0
});

const fetchStats = async () => {
  try {
    const res = await api.admin.getStats();
    const data = res.data?.stats || res.stats || {};
    Object.assign(stats, data);
  } catch (error) {
    console.error('获取统计数据失败:', error);
  }
};

onMounted(() => {
  fetchStats();
});
</script>

<style scoped>
.admin-overview {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.users {
  background: #eff6ff;
  color: #3b82f6;
}

.stat-icon.models {
  background: #fef3c7;
  color: #f59e0b;
}

.stat-icon.linked {
  background: #dcfce7;
  color: #22c55e;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
</style>
