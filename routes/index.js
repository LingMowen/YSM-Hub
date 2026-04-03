import express from 'express';
const router = express.Router();

import testController from '../app/Controller/testController.js';
import userController from '../app/Controller/userController.js';
import administratorController from '../app/Controller/administratorController.js';
import modelController from '../app/Controller/modelController.js';
import authController from '../app/Controller/authController.js';
import adminController from '../app/Controller/adminController.js';

import securityMiddleware from '../app/Middleware/securityMiddleware.js';
import authMiddleware from '../app/Middleware/authMiddleware.js';
import adminAuthMiddleware from '../app/Middleware/adminAuthMiddleware.js';
import uploadMiddleware from '../app/Middleware/fileUploadMiddleware.js';

import reviewerAuthMiddleware from '../app/Middleware/reviewerAuthMiddleware.js';
import uploadImageMiddleware from '../app/Middleware/imageUploadMiddleware.js';
import avatarUploadMiddleware from '../app/Middleware/avatarUploadMiddleware.js';
import modelAccessMiddleware from '../app/Middleware/modelAccessMiddleware.js';
import { checkCustomUploadLimit, checkAuthUploadLimit } from '../app/Middleware/uploadLimitMiddleware.js';
import checkGameName from '../app/Middleware/checkGameName.js';

router.post('/auth/login', securityMiddleware, authController.login);
router.post('/auth/register', securityMiddleware, authController.register);
router.post('/auth/verify-email', securityMiddleware, authMiddleware, authController.verifyEmail);
router.post('/auth/logout', authMiddleware, authController.logout);
router.get('/auth/profile', authMiddleware, authController.getProfile);
router.post('/auth/upload-avatar', authMiddleware, avatarUploadMiddleware.single('avatar'), authController.uploadAvatar);
router.get('/auth/whitelist', authMiddleware, authController.getWhitelist);
router.get('/system-settings', authController.getSystemSettings);

router.get('/models', authMiddleware, modelController.list);
router.get('/models/:id', authMiddleware, modelAccessMiddleware, modelController.get);
router.post('/models', authMiddleware, modelController.create);
router.put('/models/:id', authMiddleware, modelAccessMiddleware, modelController.update);
router.delete('/models/:id', authMiddleware, modelAccessMiddleware, modelController.delete);
router.post('/models/upload', authMiddleware, uploadMiddleware.single('file'), modelController.upload);
router.post('/models/upload-image', authMiddleware, uploadImageMiddleware.single('image'), modelController.uploadImage);
router.post('/models/link', authMiddleware, modelController.link);
router.post('/models/:id/unlink', authMiddleware, modelController.unlink);
router.post('/models/:id/unlink-from-user', authMiddleware, modelController.unlinkFromUser);
router.post('/models/:id/download-to-custom', authMiddleware, modelController.downloadToCustom);
router.post('/models/:id/save-to-my-models', authMiddleware, modelController.saveToMyModels);
router.get('/models/:id/download', authMiddleware, modelController.downloadFile);
router.get('/models/:id/preview', modelController.getPreview);
router.post('/models/:id/increment-download', authMiddleware, modelController.incrementDownloadCount);
router.get('/models/:id/comments', authMiddleware, modelController.getComments);
router.post('/models/:id/comments', authMiddleware, modelController.addComment);
router.delete('/models/comments/:id', authMiddleware, modelController.deleteComment);
router.post('/models/:id/authorize', authMiddleware, modelController.authorizeModel);
router.post('/models/:id/deauthorize', authMiddleware, modelController.deauthorizeModel);

router.get('/users', authMiddleware, adminAuthMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const users = await userController.list(req, res);
  } catch (err) {
    console.error('获取用户列表错误:', err);
    return res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});
router.get('/users/admins', authMiddleware, adminAuthMiddleware, async (req, res) => {
  try {
    const prisma = (await import('../src/utils/prisma.js')).default;
    const admins = await prisma.User.findMany({
      where: { role: 'admin' },
      select: { id: true, name: true, email: true, gameName: true, createdAt: true }
    });
    return res.json({ success: true, data: admins });
  } catch (err) {
    return res.status(500).json({ success: false, message: '获取管理员列表失败' });
  }
});
router.get('/users/:id', authMiddleware, adminAuthMiddleware, async (req, res) => {
  try {
    const prisma = (await import('../src/utils/prisma.js')).default;
    const user = await prisma.User.findFirst({
      where: { id: parseInt(req.params.id) },
      select: { id: true, name: true, email: true, gameName: true, role: true, emailVerified: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ success: false, message: '用户不存在' });
    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});
router.put('/users/:id', authMiddleware, adminAuthMiddleware, async (req, res) => {
  try {
    const prisma = (await import('../src/utils/prisma.js')).default;
    const { username, gameName, role } = req.body;
    const updateData = {};

    if (username !== undefined) {
      const existingUser = await prisma.User.findFirst({
        where: { name: username, NOT: { id: parseInt(req.params.id) } }
      });
      if (existingUser) {
        return res.status(400).json({ success: false, message: '用户名已存在' });
      }
      updateData.name = username;
    }
    if (gameName !== undefined) updateData.gameName = gameName;
    if (role !== undefined) updateData.role = role;

    const user = await prisma.User.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      select: { id: true, name: true, email: true, gameName: true, role: true }
    });
    return res.json({ success: true, data: user });
  } catch (err) {
    console.error('更新用户错误:', err);
    return res.status(500).json({ success: false, message: '更新用户失败' });
  }
});
router.delete('/users/:id', authMiddleware, adminAuthMiddleware, async (req, res) => {
  try {
    const prisma = (await import('../src/utils/prisma.js')).default;
    await prisma.User.delete({ where: { id: parseInt(req.params.id) } });
    return res.json({ success: true, message: '用户已删除' });
  } catch (err) {
    return res.status(500).json({ success: false, message: '删除用户失败' });
  }
});

// 游戏名绑定相关路由
router.post('/users/game-name', authMiddleware, userController.updateGameName);
router.post('/users/game-name/verify', authMiddleware, userController.verifyGameName);
router.get('/users/game-name/status', authMiddleware, userController.checkBindingStatus);

router.get('/admin/settings', authMiddleware, adminAuthMiddleware, adminController.getSettings);
router.put('/admin/settings', authMiddleware, adminAuthMiddleware, adminController.updateSettings);
router.get('/admin/stats', authMiddleware, adminAuthMiddleware, adminController.getStats);
router.get('/admin/system-info', authMiddleware, adminAuthMiddleware, adminController.getSystemInfo);
router.get('/admin/whitelist-settings', authMiddleware, adminAuthMiddleware, adminController.getWhitelistSettings);
router.put('/admin/whitelist-settings', authMiddleware, adminAuthMiddleware, adminController.updateWhitelistSettings);
router.get('/admin/smtp-settings', authMiddleware, adminAuthMiddleware, adminController.getSmtpSettings);
router.put('/admin/smtp-settings', authMiddleware, adminAuthMiddleware, adminController.updateSmtpSettings);

router.get('/rcon/status', authMiddleware, adminAuthMiddleware, async (req, res) => {
  try {
    const baseController = (await import('../app/Controller/baseController.js')).default();
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('RCON connection timeout')), 5000);
    });
    
    const result = await Promise.race([
      baseController.executeRCONCommand('list'),
      timeoutPromise
    ]);
    
    const connected = result !== null && result.success !== false;
    return res.json({ success: true, connected });
  } catch (err) {
    return res.json({ success: true, connected: false });
  }
});
router.post('/rcon/send', authMiddleware, adminAuthMiddleware, async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ success: false, message: '缺少命令' });
    const baseController = (await import('../app/Controller/baseController.js')).default();
    const result = await baseController.executeRCONCommand(command);
    return res.json({ success: true, result: result?.response || '' });
  } catch (err) {
    return res.status(500).json({ success: false, message: '命令执行失败' });
  }
});

// 高级管理员功能
router.post('/admin/reset-password', authMiddleware, adminAuthMiddleware, administratorController.resetPassword);
router.delete('/admin/models/:id', authMiddleware, adminAuthMiddleware, administratorController.deleteModel);
router.post('/admin/models/by-filename', authMiddleware, adminAuthMiddleware, administratorController.getModelByFileName);
router.get('/admin/models', authMiddleware, adminAuthMiddleware, administratorController.getAllModels);
router.put('/admin/users/upload-limit', authMiddleware, adminAuthMiddleware, administratorController.updateUserUploadLimit);
router.post('/admin/users/by-username', authMiddleware, adminAuthMiddleware, administratorController.getUserInfoByUsername);
router.post('/admin/users/by-game-name', authMiddleware, adminAuthMiddleware, administratorController.getUserInfoByGameName);

// 审核相关路由（管理员或审核员可访问）
router.get('/admin/review/pending', authMiddleware, reviewerAuthMiddleware, administratorController.getPendingReviewModels);
router.put('/admin/review/:id', authMiddleware, reviewerAuthMiddleware, administratorController.reviewModel);
router.post('/admin/reviewers', authMiddleware, adminAuthMiddleware, administratorController.setReviewer);
router.get('/admin/reviewers', authMiddleware, adminAuthMiddleware, administratorController.getReviewers);

export default router;
