<template>
  <Teleport to="body">
    <div class="message-container">
      <TransitionGroup name="message">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['message', msg.type]"
        >
          <Icon v-if="msg.type === 'success'" name="check-circle" :size="18" />
          <Icon v-else-if="msg.type === 'error'" name="x-circle" :size="18" />
          <Icon v-else-if="msg.type === 'warning'" name="alert-circle" :size="18" />
          <Icon v-else name="info" :size="18" />
          <span>{{ msg.text }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import Icon from './Icon.vue';

const messages = ref([]);
let messageId = 0;

const show = (text, type = 'info', duration = 3000) => {
  const id = ++messageId;
  messages.value.push({ id, text, type });

  setTimeout(() => {
    messages.value = messages.value.filter(m => m.id !== id);
  }, duration);
};

const success = (text, duration) => show(text, 'success', duration);
const error = (text, duration) => show(text, 'error', duration);
const warning = (text, duration) => show(text, 'warning', duration);
const info = (text, duration) => show(text, 'info', duration);

defineExpose({ show, success, error, warning, info });
</script>

<style scoped>
.message-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  color: #333;
  pointer-events: auto;
}

.message.success {
  color: #16a34a;
  border-left: 4px solid #16a34a;
}

.message.error {
  color: #dc2626;
  border-left: 4px solid #dc2626;
}

.message.warning {
  color: #a16207;
  border-left: 4px solid #a16207;
}

.message.info {
  color: #2563eb;
  border-left: 4px solid #2563eb;
}

.message-enter-active,
.message-leave-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.message-leave-to {
  opacity: 0;
  transform: translateX(100px);
}
</style>
