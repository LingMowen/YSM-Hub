import { ref, provide, inject } from 'vue';

export function createGlobal() {
  const messageRef = ref(null);
  const confirmRef = ref(null);

  const $message = {
    success: (text, duration) => messageRef.value?.success(text, duration),
    error: (text, duration) => messageRef.value?.error(text, duration),
    warning: (text, duration) => messageRef.value?.warning(text, duration),
    info: (text, duration) => messageRef.value?.info(text, duration),
    show: (text, type, duration) => messageRef.value?.show(text, type, duration)
  };

  const $confirm = (options) => confirmRef.value?.show(options);

  provide('$message', $message);
  provide('$confirm', $confirm);

  return { messageRef, confirmRef };
}

export function useMessage() {
  return { $message: inject('$message'), $confirm: inject('$confirm') };
}
