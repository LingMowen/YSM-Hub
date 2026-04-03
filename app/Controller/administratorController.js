import createController from './baseController.js';
import bcrypt from 'bcrypt';

function createAdministratorController() {
  const baseController = createController();

  async function resetPassword(req, res) {
    try {
      const { username } = req.body;
      
      if (!username) {
        return baseController.error(res, '缺少用户名', 400);
      }
      
      const user = await baseController.prisma.User.findFirst({
        where: { name: username }
      });
      
      if (!user) {
        return baseController.error(res, '用户不存在', 400);
      }
      
      const newPassword = baseController.generateRandomPassword();
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      await baseController.prisma.User.update({
        where: { id: user.id },
        data: { 
          password: hashedPassword,
          token: null,
          tokenExpiresAt: null
        }
      });
      
      return baseController.success(res, {
        username: user.name,
        newPassword
      }, '密码重置成功');
    } catch (err) {
      console.error('重置密码错误:', err);
      return baseController.error(res, '重置密码失败，请稍后再试', 500);
    }
  }

  async function deleteModel(req, res) {
    try {
      const modelId = parseInt(req.params.id);

      if (!modelId) {
        return baseController.error(res, '请提供有效的模型ID', 400);
      }

      const model = await baseController.prisma.Model.findFirst({
        where: { id: modelId }
      });

      if (!model) {
        return baseController.error(res, '模型不存在', 404);
      }

      baseController.deleteModelFile(model.fileName, model.currentType);

      await baseController.prisma.Model.delete({
        where: { id: modelId }
      });

      await baseController.reloadModels();

      return baseController.success(res, {
        modelId: model.id,
        fileName: model.fileName,
        currentType: model.currentType
      }, '模型已删除');
    } catch (err) {
      console.error('删除模型错误:', err);
      return baseController.error(res, '删除模型失败，请稍后再试', 500);
    }
  }

  async function getModelByFileName(req, res) {
    try {
      const { fileName } = req.body;

      if (!fileName) {
        return baseController.error(res, '缺少文件名', 400);
      }

      const model = await baseController.prisma.Model.findFirst({
        where: { fileName },
        include: {
          uploaders: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  gameName: true,
                  createdAt: true
                }
              }
            }
          }
        }
      });

      if (!model) {
        return baseController.error(res, '模型不存在', 404);
      }

      const result = {
        id: model.id,
        allowAuth: model.allowAuth,
        currentType: model.currentType,
        hash: model.hash,
        fileName: model.fileName,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        uploaders: model.uploaders.map(uploader => ({
          id: uploader.user.id,
          name: uploader.user.name,
          gameName: uploader.user.gameName,
          createdAt: uploader.user.createdAt,
          uploadedAt: uploader.createdAt
        }))
      };

      return baseController.success(res, result, '获取模型信息成功');
    } catch (err) {
      console.error('获取模型信息错误:', err);
      return baseController.error(res, '获取模型信息失败，请稍后再试', 500);
    }
  }

  async function updateUserUploadLimit(req, res) {
    try {
      const { userId, username, customUploadLimit, authUploadLimit } = req.body;

      if (!userId && !username) {
        return baseController.error(res, '缺少用户ID或用户名', 400);
      }

      if (customUploadLimit === undefined && authUploadLimit === undefined) {
        return baseController.error(res, '至少需要提供一个上传限制参数', 400);
      }

      let user;
      if (userId) {
        user = await baseController.prisma.User.findFirst({
          where: { id: parseInt(userId) }
        });
      } else {
        user = await baseController.prisma.User.findFirst({
          where: { name: username }
        });
      }

      if (!user) {
        return baseController.error(res, '用户不存在', 400);
      }

      const uploadStats = await baseController.getUserUploadStats(user.id);

      if (customUploadLimit !== undefined) {
        if (typeof customUploadLimit !== 'number' || customUploadLimit < 0) {
          return baseController.error(res, '公共模型上传限制必须是非负整数', 400);
        }
        if (customUploadLimit < uploadStats.customUploaded) {
          return baseController.error(res, `公共模型上传限制不能低于已上传数量（已上传 ${uploadStats.customUploaded} 个）`, 400);
        }
      }

      if (authUploadLimit !== undefined) {
        if (typeof authUploadLimit !== 'number' || authUploadLimit < 0) {
          return baseController.error(res, '私人模型上传限制必须是非负整数', 400);
        }
        if (authUploadLimit < uploadStats.authUploaded) {
          return baseController.error(res, `私人模型上传限制不能低于已上传数量（已上传 ${uploadStats.authUploaded} 个）`, 400);
        }
      }

      const updateData = {};
      if (customUploadLimit !== undefined) {
        updateData.customUploadLimit = customUploadLimit;
      }
      if (authUploadLimit !== undefined) {
        updateData.authUploadLimit = authUploadLimit;
      }

      const updatedUser = await baseController.prisma.User.update({
        where: { id: user.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          customUploadLimit: true,
          authUploadLimit: true
        }
      });

      const newUploadStats = await baseController.getUserUploadStats(user.id);
      const result = {
        ...updatedUser,
        ...newUploadStats
      };

      return baseController.success(res, result, '用户上传限制更新成功');
    } catch (err) {
      console.error('更新用户上传限制错误:', err);
      return baseController.error(res, '更新用户上传限制失败，请稍后再试', 500);
    }
  }

  async function getUserInfoByUsername(req, res) {
    try {
      const { username } = req.body;

      if (!username) {
        return baseController.error(res, '缺少用户名', 400);
      }

      const user = await baseController.prisma.User.findFirst({
        where: { name: username }
      });

      if (!user) {
        return baseController.error(res, '用户不存在', 404);
      }

      const userInfo = await baseController.getUserCompleteInfo(user.id);

      return baseController.success(res, userInfo, '获取用户信息成功');
    } catch (err) {
      console.error('获取用户信息错误:', err);
      return baseController.error(res, '获取用户信息失败，请稍后再试', 500);
    }
  }

  async function getUserInfoByGameName(req, res) {
    try {
      const { gameName } = req.body;

      if (!gameName) {
        return baseController.error(res, '缺少游戏名', 400);
      }

      const user = await baseController.prisma.User.findFirst({
        where: { gameName }
      });

      if (!user) {
        return baseController.error(res, '用户不存在', 404);
      }

      const userInfo = await baseController.getUserCompleteInfo(user.id);

      return baseController.success(res, userInfo, '获取用户信息成功');
    } catch (err) {
      console.error('获取用户信息错误:', err);
      return baseController.error(res, '获取用户信息失败，请稍后再试', 500);
    }
  }

  async function getAllModels(req, res) {
    try {
      const models = await baseController.prisma.Model.findMany({
        include: {
          uploaders: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  gameName: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const result = models.map(model => ({
        id: model.id,
        allowAuth: model.allowAuth,
        currentType: model.currentType,
        hash: model.hash,
        name: model.name,
        fileName: model.fileName,
        fileSize: model.fileSize,
        imageUrl: model.imageUrl,
        description: model.description,
        reviewStatus: model.reviewStatus,
        downloadCount: model.downloadCount,
        saveCount: model.saveCount,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        uploaders: model.uploaders.map(uploader => ({
          id: uploader.user.id,
          name: uploader.user.name,
          gameName: uploader.user.gameName
        }))
      }));

      return baseController.success(res, result, '获取模型列表成功');
    } catch (err) {
      console.error('获取模型列表错误:', err);
      return baseController.error(res, '获取模型列表失败，请稍后再试', 500);
    }
  }

  async function getPendingReviewModels(req, res) {
    try {
      const reviewEnabled = await baseController.getSystemSetting('reviewEnabled') === 'true';
      if (!reviewEnabled) {
        return baseController.success(res, [], '审核功能已关闭');
      }

      const models = await baseController.prisma.Model.findMany({
        where: { reviewStatus: 'pending' },
        include: {
          uploaders: {
            include: {
              user: {
                select: { id: true, name: true, gameName: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const result = models.map(model => ({
        id: model.id,
        fileName: model.fileName,
        fileSize: model.fileSize,
        imageUrl: model.imageUrl,
        reviewStatus: model.reviewStatus,
        downloadCount: model.downloadCount,
        saveCount: model.saveCount,
        createdAt: model.createdAt,
        uploaders: model.uploaders.map(uploader => ({
          id: uploader.user.id,
          name: uploader.user.name,
          gameName: uploader.user.gameName
        }))
      }));

      return baseController.success(res, result, '获取待审核模型成功');
    } catch (err) {
      console.error('获取待审核模型错误:', err);
      return baseController.error(res, '获取待审核模型失败', 500);
    }
  }

  async function reviewModel(req, res) {
    try {
      const reviewEnabled = await baseController.getSystemSetting('reviewEnabled') === 'true';
      if (!reviewEnabled) {
        return baseController.error(res, '审核功能已关闭', 400);
      }

      const modelId = parseInt(req.params.id);
      const { action } = req.body;
      const reviewerId = req.user.id;

      if (!['approve', 'reject'].includes(action)) {
        return baseController.error(res, '无效的审核操作', 400);
      }

      const model = await baseController.prisma.Model.findFirst({
        where: { id: modelId }
      });

      if (!model) {
        return baseController.error(res, '模型不存在', 404);
      }

      if (model.reviewStatus !== 'pending') {
        return baseController.error(res, '该模型已审核', 400);
      }

      const newStatus = action === 'approve' ? 'approved' : 'rejected';

      await baseController.prisma.Model.update({
        where: { id: modelId },
        data: {
          reviewStatus: newStatus,
          reviewedBy: reviewerId,
          reviewedAt: new Date()
        }
      });

      console.log(`模型审核 - 模型ID: ${modelId} 操作: ${action} 审核员ID: ${reviewerId}`);

      return baseController.success(res, null, action === 'approve' ? '模型已通过审核' : '模型已拒绝');
    } catch (err) {
      console.error('审核模型错误:', err);
      return baseController.error(res, '审核操作失败', 500);
    }
  }

  async function setReviewer(req, res) {
    try {
      const { userId, isReviewer } = req.body;

      if (!userId) {
        return baseController.error(res, '缺少用户ID', 400);
      }

      await baseController.prisma.User.update({
        where: { id: userId },
        data: { isReviewer: !!isReviewer }
      });

      return baseController.success(res, null, isReviewer ? '已授予审核员权限' : '已撤销审核员权限');
    } catch (err) {
      console.error('设置审核员错误:', err);
      return baseController.error(res, '设置审核员失败', 500);
    }
  }

  async function getReviewers(req, res) {
    try {
      const reviewers = await baseController.prisma.User.findMany({
        where: { isReviewer: true },
        select: { id: true, name: true, gameName: true, email: true }
      });

      return baseController.success(res, reviewers, '获取审核员成功');
    } catch (err) {
      console.error('获取审核员错误:', err);
      return baseController.error(res, '获取审核员失败', 500);
    }
  }

  return {
    resetPassword,
    deleteModel,
    getModelByFileName,
    getAllModels,
    updateUserUploadLimit,
    getUserInfoByUsername,
    getUserInfoByGameName,
    getPendingReviewModels,
    reviewModel,
    setReviewer,
    getReviewers
  };
}

export default createAdministratorController();
