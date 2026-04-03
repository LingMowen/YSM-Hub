<template>
  <Teleport to="body">
    <div v-if="visible" class="confirm-overlay" @click.self="handleCancel">
      <div class="confirm-dialog">
        <div class="confirm-header">
          <Icon name="alert-triangle" :size="24" class="warning-icon" />
          <h3>{{ title }}</h3>
        </div>
        <div class="confirm-body">
          <p>{{ message }}</p>
        </div>
        <div class="confirm-footer">
          <button class="btn cancel" @click="handleCancel">
            {{ cancelText }}
          </button>
          <button class="btn confirm" @click="handleConfirm">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import Icon from './Icon.vue';

const visible = ref(false);
const title = ref('提示');
const message = ref('');
const confirmText = ref('确定');
const cancelText = ref('取消');

let resolvePromise = null;

const show = (options) => {
  return new Promise((resolve) => {
    title.value = options.title || '提示';
    message.value = options.message || '';
    confirmText.value = options.confirmText || '确定';
    cancelText.value = options.cancelText || '取消';
    visible.value = true;
    resolvePromise = resolve;
  });
};

const handleConfirm = () => {
  visible.value = false;
  if (resolvePromise) {
    resolvePromise(true);
    resolvePromise = null;
  }
};

const handleCancel = () => {
  visible.value = false;
  if (resolvePromise) {
    resolvePromise(false);
    resolvePromise = null;
  }
};

defineExpose({ show });
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.confirm-dialog {
  background: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.confirm-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.warning-icon {
  color: #f59e0b;
}

.confirm-body {
  padding: 20px;
}

.confirm-body p {
  margin: 0;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.confirm-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: #f9f9f9;
  border-top: 1px solid #eee;
}

.confirm-footer .btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-footer .btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.confirm-footer .btn.cancel:hover {
  background: #eee;
}

.confirm-footer .btn.confirm {
  background: #dc2626;
  color: #fff;
}

.confirm-footer .btn.confirm:hover {
  background: #b91c1c;
}
</style>
