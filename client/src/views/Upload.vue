<template>
  <div class="upload-page">
      <div class="upload-card">
        <div class="upload-row">
          <div
            class="drop-zone"
            :class="{ dragover: isDragover }"
            @dragover.prevent="isDragover = true"
            @dragleave="isDragover = false"
            @drop.prevent="handleDrop"
            @click="triggerFileInput"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".ysm"
              @change="handleFileSelect"
              hidden
            />
            <Icon name="upload" :size="48" color="#999" />
            <p class="drop-text">拖拽 YSM 文件到此处或点击选择</p>
            <p class="drop-hint">支持 .ysm 格式</p>
          </div>

          <div class="description-section">
            <label>模型简介</label>
            <textarea
              v-model="description"
              placeholder="请输入模型简介（选填）"
              rows="5"
            ></textarea>
          </div>
        </div>

        <div v-if="selectedFile" class="file-info">
          <Icon name="file" :size="20" />
          <span class="file-name">{{ selectedFile.name }}</span>
          <span class="file-size">{{ formatSize(selectedFile.size) }}</span>
          <button @click="clearFile" class="clear-btn">
            <Icon name="x" :size="16" />
          </button>
        </div>

        <div class="form-section">
          <div class="form-group">
            <label>模型名称</label>
            <input v-model="modelName" type="text" placeholder="输入模型名称" />
          </div>
          <div class="form-group">
            <label>模型类型</label>
            <div class="type-selector">
              <button
                :class="['type-btn', { active: modelType === 'custom' }]"
                @click="modelType = 'custom'"
              >
                <Icon name="users" :size="18" />
                <span>公共模型</span>
                <small>所有人可见</small>
              </button>
              <button
                :class="['type-btn', { active: modelType === 'auth' }]"
                @click="modelType = 'auth'"
              >
                <Icon name="lock" :size="18" />
                <span>私人模型</span>
                <small>仅自己可见</small>
              </button>
            </div>
          </div>
          <div class="form-group" v-if="modelType === 'custom'">
            <label class="checkbox-label">
              <input type="checkbox" v-model="uploadToCenter" />
              <span>上传到模型中心（允许其他用户下载）</span>
            </label>
          </div>

          <div v-if="uploadToCenter" class="image-upload-section">
            <div class="form-group">
              <label>
                模型截图
                <span class="required">* 必填</span>
              </label>
              <p class="label-hint">请上传模型的截图，图片大小不超过 {{ imageMaxSize }}MB</p>
              <div
                class="image-drop-zone"
                :class="{ dragover: isImageDragover, 'has-image': previewImage }"
                @dragover.prevent="isImageDragover = true"
                @dragleave="isImageDragover = false"
                @drop.prevent="handleImageDrop"
                @click="triggerImageInput"
              >
                <input
                  ref="imageInput"
                  type="file"
                  accept="image/*"
                  @change="handleImageSelect"
                  hidden
                />
                <img v-if="previewImage" :src="previewImage" alt="预览" class="image-preview" />
                <div v-else class="image-placeholder">
                  <Icon name="image" :size="32" color="#999" />
                  <span>点击上传截图</span>
                </div>
              </div>
              <button v-if="previewImage" @click="clearImage" class="clear-image-btn">
                <Icon name="x" :size="14" />
                移除图片
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>游戏名称（可选）</label>
            <input v-model="gameName" type="text" placeholder="MC用户名" />
          </div>
        </div>

        <button
          class="btn-upload"
          :disabled="!canUpload || uploading"
          @click="handleUpload"
        >
          <Icon v-if="uploading" name="refresh-cw" :size="20" class="spin" />
          <span v-else>{{ uploadButtonText }}</span>
        </button>

        <p v-if="message" :class="['message', messageType]">{{ message }}</p>
      </div>

      <div v-if="uploadProgress > 0 && uploadProgress < 100" class="progress-bar">
        <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
      </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import api from '../api';

const router = useRouter();
const fileInput = ref(null);
const imageInput = ref(null);
const selectedFile = ref(null);
const selectedImage = ref(null);
const previewImage = ref('');
const isDragover = ref(false);
const isImageDragover = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const message = ref('');
const messageType = ref('');
const modelName = ref('');
const description = ref('');
const gameName = ref('');
const modelType = ref('custom');
const uploadToCenter = ref(false);
const reviewEnabled = ref(false);
const imageMaxSize = ref(10);

const canUpload = computed(() => {
  if (!selectedFile.value) return false;
  if (uploadToCenter.value && !selectedImage.value) return false;
  return true;
});

const uploadButtonText = computed(() => {
  if (uploading.value) return '上传中...';
  if (uploadToCenter.value && !selectedImage.value) return '请先上传模型截图';
  return '上传模型';
});

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const triggerImageInput = () => {
  imageInput.value?.click();
};

const handleFileSelect = (e) => {
  const file = e.target.files?.[0];
  if (file) {
    if (!file.name.endsWith('.ysm')) {
      showMessage('仅支持 YSM 格式', 'error');
      return;
    }
    selectedFile.value = file;
    if (!modelName.value) {
      modelName.value = file.name.replace('.ysm', '');
    }
  }
};

const handleImageSelect = (e) => {
  const file = e.target.files?.[0];
  if (file) {
    const maxBytes = imageMaxSize.value * 1024 * 1024;
    if (file.size > maxBytes) {
      showMessage(`图片大小不能超过 ${imageMaxSize.value}MB`, 'error');
      return;
    }
    selectedImage.value = file;
    previewImage.value = URL.createObjectURL(file);
  }
};

const handleDrop = (e) => {
  isDragover.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    if (!file.name.endsWith('.ysm')) {
      showMessage('仅支持 YSM 格式', 'error');
      return;
    }
    selectedFile.value = file;
    if (!modelName.value) {
      modelName.value = file.name.replace('.ysm', '');
    }
  }
};

const handleImageDrop = (e) => {
  isImageDragover.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    if (!file.type.startsWith('image/')) {
      showMessage('请上传图片文件', 'error');
      return;
    }
    const maxBytes = imageMaxSize.value * 1024 * 1024;
    if (file.size > maxBytes) {
      showMessage(`图片大小不能超过 ${imageMaxSize.value}MB`, 'error');
      return;
    }
    selectedImage.value = file;
    previewImage.value = URL.createObjectURL(file);
  }
};

const clearFile = () => {
  selectedFile.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const clearImage = () => {
  selectedImage.value = null;
  previewImage.value = '';
  if (imageInput.value) imageInput.value.value = '';
};

const showMessage = (text, type = 'error') => {
  message.value = text;
  messageType.value = type;
  setTimeout(() => { message.value = ''; }, 5000);
};

const handleUpload = async () => {
  if (!selectedFile.value) return;

  uploading.value = true;
  uploadProgress.value = 0;
  message.value = '';

  const formData = new FormData();
  formData.append('file', selectedFile.value);
  formData.append('name', modelName.value || selectedFile.value.name.replace('.ysm', ''));
  formData.append('description', description.value);
  formData.append('type', modelType.value);
  formData.append('uploadToCenter', uploadToCenter.value ? 'true' : 'false');
  if (gameName.value) {
    formData.append('gameName', gameName.value);
  }

  try {
    const uploadRes = await api.models.upload(formData);
    uploadProgress.value = 50;

    if (uploadToCenter.value && selectedImage.value) {
      showMessage('模型上传成功，正在上传截图...', 'info');

      const imageFormData = new FormData();
      imageFormData.append('image', selectedImage.value);
      imageFormData.append('modelId', uploadRes.modelId);

      await api.models.uploadImage(imageFormData);
      uploadProgress.value = 100;

      if (reviewEnabled.value) {
        showMessage('模型和截图上传成功，等待审核通过后可在模型中心显示', 'success');
      } else {
        showMessage('上传成功', 'success');
      }
    } else {
      uploadProgress.value = 100;
      showMessage('上传成功', 'success');
    }

    setTimeout(() => {
      router.push('/models');
    }, 1500);
  } catch (error) {
    showMessage(error.message || '上传失败');
  } finally {
    uploading.value = false;
  }
};

const fetchSettings = async () => {
  try {
    const res = await api.admin.getSettings();
    const settings = res.data?.settings || res.settings || {};
    reviewEnabled.value = settings.reviewEnabled || false;
    imageMaxSize.value = settings.reviewImageMaxSize || 10;
  } catch (error) {
    console.error('获取设置失败:', error);
  }
};

onMounted(() => {
  fetchSettings();
});
</script>

<style scoped>
.upload-page {
  width: 100%;
}

.upload-card {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.upload-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.drop-zone {
  flex: 1;
  border: 2px dashed #ddd;
  border-radius: 12px;
  padding: 48px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.drop-zone:hover,
.drop-zone.dragover {
  border-color: #333;
  background: #fafafa;
}

.drop-text {
  margin: 16px 0 8px;
  font-size: 14px;
  color: #333;
}

.drop-hint {
  margin: 0;
  font-size: 12px;
  color: #999;
}

.description-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.description-section label {
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
}

.description-section textarea {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}

.description-section textarea:focus {
  border-color: #333;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 20px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 12px;
  color: #999;
}

.clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #666;
}

.form-section {
  margin-top: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
}

.required {
  color: #dc2626;
  font-size: 12px;
}

.label-hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: #999;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus {
  border-color: #333;
}

.type-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px;
  background: #f9f9f9;
  border: 2px solid #eee;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn span {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.type-btn small {
  font-size: 12px;
  color: #999;
}

.type-btn:hover {
  border-color: #ccc;
}

.type-btn.active {
  background: #f0f0f0;
  border-color: #333;
}

.type-btn.active span {
  color: #333;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  padding: 12px 16px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #eee;
  transition: all 0.2s;
}

.checkbox-label:hover {
  background: #f5f5f5;
  border-color: #ddd;
}

.checkbox-label input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #333;
  flex-shrink: 0;
  margin: 0;
}

.checkbox-label span {
  line-height: 20px;
}

.image-upload-section {
  margin-top: 16px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #eee;
}

.image-drop-zone {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-drop-zone:hover,
.image-drop-zone.dragover {
  border-color: #333;
  background: #fafafa;
}

.image-drop-zone.has-image {
  border-style: solid;
  padding: 8px;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #999;
}

.image-placeholder span {
  font-size: 13px;
}

.image-preview {
  max-width: 100%;
  max-height: 200px;
  border-radius: 4px;
  object-fit: contain;
}

.clear-image-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 6px 12px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.clear-image-btn:hover {
  background: #fecaca;
}

.btn-upload {
  width: 100%;
  padding: 14px;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  transition: background 0.2s;
}

.btn-upload:hover:not(:disabled) {
  background: #444;
}

.btn-upload:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.message {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.message.error {
  background: #fef2f2;
  color: #dc2626;
}

.message.success {
  background: #f0fdf4;
  color: #16a34a;
}

.message.info {
  background: #eff6ff;
  color: #2563eb;
}

.progress-bar {
  margin-top: 16px;
  height: 4px;
  background: #eee;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #333;
  transition: width 0.3s;
}
</style>
