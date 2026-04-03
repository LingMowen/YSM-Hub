const uploadProgress = new Map();

function createProgressMiddleware() {
  return (req, res, next) => {
    if (req.method === 'POST' && req.url.includes('/upload')) {
      const contentLength = parseInt(req.headers['content-length'], 10);
      if (contentLength) {
        const uploadId = req.headers['x-upload-id'] || req.sessionID || Date.now().toString();
        uploadProgress.set(uploadId, {
          loaded: 0,
          total: contentLength,
          percentage: 0
        });

        req.on('data', (chunk) => {
          const progress = uploadProgress.get(uploadId);
          if (progress) {
            progress.loaded += chunk.length;
            progress.percentage = Math.round((progress.loaded / progress.total) * 100);
            uploadProgress.set(uploadId, progress);
          }
        });

        req.on('end', () => {
          setTimeout(() => {
            uploadProgress.delete(uploadId);
          }, 5000);
        });

        req.uploadId = uploadId;
      }
    }
    next();
  };
}

function getProgress(uploadId) {
  const progress = uploadProgress.get(uploadId);
  return progress || { loaded: 0, total: 0, percentage: 0 };
}

export { createProgressMiddleware, getProgress };
