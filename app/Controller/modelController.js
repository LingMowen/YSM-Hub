import createController from './baseController.js';
import prisma from '../../src/utils/prisma.js';
import { fixFilenameEncoding } from '../../src/utils/common.js';

function createModelController() {
  const baseController = createController();

  async function list(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search;
      const linked = req.query.linked;
      const type = req.query.type;
      const uploaderId = req.query.uploaderId ? parseInt(req.query.uploaderId) : null;
      const sort = req.query.sort || 'newest';
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      const isReviewer = req.user?.isReviewer;

      const reviewEnabled = await baseController.getSystemSetting('reviewEnabled') === 'true';

      console.log('Model list - userId:', userId, 'isAdmin:', isAdmin, 'role:', req.user?.role, 'type:', type);

      const where = {};

      if (type !== 'custom') {
        if (!isAdmin && userId) {
          where.uploaders = { some: { userId } };
        }
      } else {
        where.currentType = 'custom';
        if (reviewEnabled) {
          where.reviewStatus = 'approved';
        }
        if (uploaderId) {
          where.uploaders = { some: { userId: uploaderId } };
        }
      }

      if (isAdmin || isReviewer) {
        delete where.reviewStatus;
      }

      if (search) {
        where.fileName = { contains: search };
      }

      const orderBy = {};
      switch (sort) {
        case 'oldest':
          orderBy.createdAt = 'asc';
          break;
        case 'name':
          orderBy.fileName = 'asc';
          break;
        case 'size':
          orderBy.fileSize = 'desc';
          break;
        case 'downloads':
          orderBy.downloadCount = 'desc';
          break;
        default:
          orderBy.createdAt = 'desc';
      }

      const models = await prisma.Model.findMany({
        where,
        include: {
          uploaders: {
            include: {
              user: {
                select: { id: true, name: true, gameName: true }
              }
            }
          },
          authorizations: {
            select: { gameName: true }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      });

      const modelIds = models.map(m => m.id);

      let commentsMap = {};
      if (modelIds.length > 0) {
        const allComments = await prisma.ModelComment.findMany({
          where: { modelId: { in: modelIds }, rating: { gt: 0 } },
          select: { modelId: true, rating: true }
        });

        for (const comment of allComments) {
          if (!commentsMap[comment.modelId]) {
            commentsMap[comment.modelId] = { ratings: [], total: 0, sum: 0 };
          }
          commentsMap[comment.modelId].ratings.push(comment.rating);
          commentsMap[comment.modelId].sum += comment.rating;
          commentsMap[comment.modelId].total += 1;
        }

        for (const mid of Object.keys(commentsMap)) {
          const data = commentsMap[mid];
          commentsMap[mid] = {
            totalRatings: data.total,
            averageRating: data.sum / data.total
          };
        }
      }

      const result = models.map(model => ({
        id: model.id,
        name: model.fileName,
        hash: model.hash,
        type: model.currentType,
        fileName: model.fileName,
        imageUrl: model.imageUrl,
        description: model.description,
        downloadCount: model.downloadCount,
        saveCount: model.saveCount,
        gameName: model.authorizations?.[0]?.gameName || null,
        createdAt: model.createdAt,
        uploaders: model.uploaders.map(u => u.user),
        ratingStats: commentsMap[model.id] || { totalRatings: 0, averageRating: 0 }
      }));

      const total = await prisma.Model.count({ where });

      return baseController.success(res, {
        models: result,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      console.error('获取模型列表错误:', err);
      return baseController.error(res, '获取模型列表失败', 500);
    }
  }

  async function get(req, res) {
    try {
      const { id } = req.params;
      const model = await prisma.Model.findFirst({
        where: { id: parseInt(id) },
        include: {
          uploaders: {
            include: {
              user: {
                select: { id: true, name: true, gameName: true }
              }
            }
          }
        }
      });

      if (!model) {
        return baseController.error(res, '模型不存在', 404);
      }

      return baseController.success(res, model);
    } catch (err) {
      console.error('获取模型详情错误:', err);
      return baseController.error(res, '获取模型详情失败', 500);
    }
  }

  async function create(req, res) {
    try {
      const { name, description } = req.body;
      const userId = req.user.id;

      const newModel = await baseController.createModelWithUploader(
        {
          fileName: name || `model_${Date.now()}`,
          description: description || '',
          currentType: 'auth'
        },
        userId
      );

      return baseController.success(res, newModel, '模型创建成功');
    } catch (err) {
      console.error('创建模型错误:', err);
      return baseController.error(res, '模型创建失败', 500);
    }
  }

  async function update(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';

      const model = await prisma.Model.findFirst({
        where: { id: parseInt(id) }
      });

      if (!model) {
        return baseController.error(res, '模型不存在', 404);
      }

      if (!isAdmin) {
        const uploader = await prisma.ModelUploader.findFirst({
          where: { modelId: parseInt(id), userId }
        });
        if (!uploader) {
          return baseController.error(res, '无权限修改此模型', 403);
        }
      }

      await prisma.Model.update({
        where: { id: parseInt(id) },
        data: {
          fileName: name || model.fileName,
          description: description !== undefined ? description : model.description
        }
      });

      return baseController.success(res, null, '模型更新成功');
    } catch (err) {
      console.error('更新模型错误:', err);
      return baseController.error(res, '模型更新失败', 500);
    }
  }

  async function deleteModel(req, res) {
    try {
      const { id } = req.params;
      const model = await prisma.Model.findFirst({
        where: { id: parseInt(id) }
      });

      if (!model) {
        return baseController.error(res, '模型不存在', 404);
      }

      await baseController.deleteModelFile(model.hash, model.type, model.uploadedBy);

      await prisma.Model.delete({
        where: { id: parseInt(id) }
      });

      return baseController.success(res, null, '模型删除成功');
    } catch (err) {
      console.error('删除模型错误:', err);
      return baseController.error(res, '模型删除失败', 500);
    }
  }

  async function upload(req, res) {
    try {
      if (!req.file) {
        return baseController.error(res, '请上传模型文件', 400);
      }

      const { buffer } = req.file;
      const metadata = await baseController.parseYsmMetadata(buffer);

      if (!metadata) {
        return baseController.error(res, '无效的 YSM 文件', 400);
      }

      console.log('上传模型元数据:', metadata);

      const fileName = fixFilenameEncoding(req.file.originalname).replace('.ysm', '');
      const fileBuffer = Buffer.from(buffer);

      const existingModel = await prisma.Model.findFirst({
        where: {
          hash: metadata.hash,
          currentType: 'custom',
          uploaders: { some: { userId: req.user.id } }
        }
      });

      if (existingModel) {
        return baseController.error(res, '该模型已存在，无法重复上传', 400);
      }

      const reviewEnabled = await baseController.getSystemSetting('reviewEnabled') === 'true';
      const description = req.body.description || '';
      const newModel = await baseController.createModelWithUploader(
        {
          allowAuth: !metadata.free,
          currentType: 'custom',
          hash: metadata.hash,
          fileName: fileName,
          fileSize: fileBuffer.length,
          reviewStatus: reviewEnabled ? 'pending' : 'approved',
          description: description
        },
        req.user.id
      );

      const filePath = await baseController.saveYsmFile(fileBuffer, fileName, 'custom', req.user.id);
      await baseController.reloadModels();

      const message = reviewEnabled
        ? '模型上传成功，正在等待审核'
        : '模型上传成功';

      console.log(`公共模型上传成功 - 用户: ${req.user.name} (ID: ${req.user.id}) 模型: ${fileName} 模型ID: ${newModel.id} 审核状态: ${reviewEnabled ? '待审核' : '已通过'}`);

      return baseController.success(res, {
        modelId: newModel.id,
        hash: metadata.hash,
        fileName: fileName,
        filePath: filePath,
        reviewRequired: reviewEnabled
      }, message);
    } catch (err) {
      console.error('上传模型错误:', err);
      return baseController.error(res, '模型上传失败', 500);
    }
  }

  async function uploadImage(req, res) {
    try {
      if (!req.file) {
        return baseController.error(res, '请上传图片', 400);
      }

      const { modelId } = req.body;
      if (!modelId) {
        return baseController.error(res, '缺少模型ID', 400);
      }

      const imageMaxSize = parseInt(await baseController.getSystemSetting('reviewImageMaxSize')) || 10;
      const maxSizeBytes = imageMaxSize * 1024 * 1024;

      if (req.file.size > maxSizeBytes) {
        return baseController.error(res, `图片大小不能超过 ${imageMaxSize}MB`, 400);
      }

      const model = await prisma.Model.findFirst({
        where: { id: parseInt(modelId) }
      });

      if (!model) {
        return baseController.error(res, '模型不存在', 404);
      }

      const imageUrl = `/uploads/images/${req.file.filename}`;

      await prisma.Model.update({
        where: { id: parseInt(modelId) },
        data: { imageUrl }
      });

      return baseController.success(res, { imageUrl }, '图片上传成功');
    } catch (err) {
      console.error('上传图片错误:', err);
      return baseController.error(res, '图片上传失败', 500);
    }
  }

  async function link(req, res) {
    try {
      const { modelId, gameName } = req.body;
      const userId = req.user.id;

      if (!modelId || !gameName) {
        return baseController.error(res, '缺少参数', 400);
      }

      const model = await prisma.Model.findFirst({
        where: { id: parseInt(modelId) }
      });

      if (!model) {
        return baseController.error(res, '模型不存在', 404);
      }

      if (model.currentType !== 'auth') {
        return baseController.error(res, '只有私人模型可以关联', 400);
      }

      const existingBinding = await prisma.NameBinding.findFirst({
        where: { userId, gameName }
      });

      if (existingBinding) {
        return baseController.error(res, '该游戏名已被其他模型使用', 400);
      }

      const existingAuth = await prisma.ModelAuthorization.findFirst({
        where: { modelId: parseInt(modelId), gameName }
      });

      if (existingAuth) {
        return baseController.error(res, '该模型已关联此游戏名', 400);
      }

      await prisma.ModelAuthorization.create({
        data: {
          modelId: parseInt(modelId),
          gameName
        }
      });

      await prisma.ModelUploader.create({
        data: {
          modelId: parseInt(modelId),
          userId
        }
      });

      await baseController.reloadModels();

      console.log(`模型关联成功 - 模型ID: ${modelId} 游戏名: ${gameName} 用户ID: ${userId}`);

      return baseController.success(res, null, '模型关联成功');
    } catch (err) {
      console.error('关联模型错误:', err);
      return baseController.error(res, '模型关联失败', 500);
    }
  }

  async function unlink(req, res) {
    try {
      const modelId = parseInt(req.query.modelId);
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!modelId) {
        return baseController.error(res, '缺少模型ID', 400);
      }

      const uploader = await prisma.ModelUploader.findFirst({
        where: { modelId, userId }
      });

      if (!uploader && !isAdmin) {
        return baseController.error(res, '无权限解除此关联', 403);
      }

      const auths = await prisma.ModelAuthorization.findMany({
        where: { modelId }
      });

      for (const auth of auths) {
        await prisma.NameBinding.deleteMany({
          where: { gameName: auth.gameName }
        });
      }

      await prisma.ModelAuthorization.deleteMany({
        where: { modelId }
      });

      await prisma.ModelUploader.deleteMany({
        where: { modelId, userId }
      });

      await baseController.reloadModels();

      return baseController.success(res, null, '解除关联成功');
    } catch (err) {
      console.error('解除关联错误:', err);
      return baseController.error(res, '解除关联失败', 500);
    }
  }

  async function hashVerification(req, res) {
    try {
      const { hash } = req.body;

      if (!hash) {
        return baseController.error(res, '缺少 hash 参数', 400);
      }

      const model = await prisma.Model.findFirst({
        where: { hash }
      });

      if (model) {
        return baseController.success(res, {
          exists: true,
          modelId: model.id,
          fileName: model.fileName
        });
      } else {
        return baseController.success(res, { exists: false });
      }
    } catch (err) {
      console.error('哈希验证错误:', err);
      return baseController.error(res, '验证失败', 500);
    }
  }

  async function custom(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search;
      const sort = req.query.sort || 'newest';
      const uploaderId = req.query.uploaderId ? parseInt(req.query.uploaderId) : null;

      const reviewEnabled = await baseController.getSystemSetting('reviewEnabled') === 'true';

      const where = { currentType: 'custom' };

      if (reviewEnabled) {
        where.reviewStatus = 'approved';
      }

      if (uploaderId) {
        where.uploaders = { some: { userId: uploaderId } };
      }

      if (search) {
        where.fileName = { contains: search };
      }

      const orderBy = {};
      switch (sort) {
        case 'oldest':
          orderBy.createdAt = 'asc';
          break;
        case 'name':
          orderBy.fileName = 'asc';
          break;
        case 'downloads':
          orderBy.downloadCount = 'desc';
          break;
        default:
          orderBy.createdAt = 'desc';
      }

      const [models, total] = await Promise.all([
        prisma.Model.findMany({
          where,
          include: {
            uploaders: {
              include: {
                user: {
                  select: { id: true, name: true, gameName: true }
                }
              }
            }
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.Model.count({ where })
      ]);

      const modelIds = models.map(m => m.id);

      let commentsMap = {};
      if (modelIds.length > 0) {
        const allComments = await prisma.ModelComment.findMany({
          where: { modelId: { in: modelIds }, rating: { gt: 0 } },
          select: { modelId: true, rating: true }
        });

        for (const comment of allComments) {
          if (!commentsMap[comment.modelId]) {
            commentsMap[comment.modelId] = { ratings: [], total: 0, sum: 0 };
          }
          commentsMap[comment.modelId].ratings.push(comment.rating);
          commentsMap[comment.modelId].sum += comment.rating;
          commentsMap[comment.modelId].total += 1;
        }

        for (const mid of Object.keys(commentsMap)) {
          const data = commentsMap[mid];
          commentsMap[mid] = {
            totalRatings: data.total,
            averageRating: data.sum / data.total
          };
        }
      }

      const result = models.map(model => ({
        id: model.id,
        name: model.fileName,
        hash: model.hash,
        type: model.currentType,
        fileName: model.fileName,
        imageUrl: model.imageUrl,
        description: model.description,
        downloadCount: model.downloadCount,
        saveCount: model.saveCount,
        createdAt: model.createdAt,
        uploaders: model.uploaders.map(u => u.user),
        ratingStats: commentsMap[model.id] || { totalRatings: 0, averageRating: 0 }
      }));

      return baseController.success(res, {
        models: result,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      console.error('获取公共模型列表错误:', err);
      return baseController.error(res, '获取模型列表失败', 500);
    }
  }

  async function auth(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const gameName = req.user.gameName;
      const sort = req.query.sort || 'newest';

      if (!gameName) {
        return baseController.success(res, { models: [], total: 0, page, totalPages: 0 });
      }

      const orderBy = {};
      switch (sort) {
        case 'oldest':
          orderBy.createdAt = 'asc';
          break;
        case 'name':
          orderBy.fileName = 'asc';
          break;
        default:
          orderBy.createdAt = 'desc';
      }

      const [models, total] = await Promise.all([
        prisma.Model.findMany({
          where: { currentType: 'auth' },
          include: {
            authorizations: {
              where: { gameName }
            },
            uploaders: {
              include: {
                user: {
                  select: { id: true, name: true, gameName: true }
                }
              }
            }
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit
        }),
        prisma.Model.count({ where: { currentType: 'auth' } })
      ]);

      const filtered = models.filter(m => m.authorizations.length > 0);

      const modelIds = filtered.map(m => m.id);

      let commentsMap = {};
      if (modelIds.length > 0) {
        const allComments = await prisma.ModelComment.findMany({
          where: { modelId: { in: modelIds }, rating: { gt: 0 } },
          select: { modelId: true, rating: true }
        });

        for (const comment of allComments) {
          if (!commentsMap[comment.modelId]) {
            commentsMap[comment.modelId] = { ratings: [], total: 0, sum: 0 };
          }
          commentsMap[comment.modelId].ratings.push(comment.rating);
          commentsMap[comment.modelId].sum += comment.rating;
          commentsMap[comment.modelId].total += 1;
        }

        for (const mid of Object.keys(commentsMap)) {
          const data = commentsMap[mid];
          commentsMap[mid] = {
            totalRatings: data.total,
            averageRating: data.sum / data.total
          };
        }
      }

      const result = filtered.map(model => ({
        id: model.id,
        name: model.fileName,
        hash: model.hash,
        type: model.currentType,
        fileName: model.fileName,
        imageUrl: model.imageUrl,
        description: model.description,
        downloadCount: model.downloadCount,
        saveCount: model.saveCount,
        createdAt: model.createdAt,
        uploaders: model.uploaders.map(u => u.user),
        ratingStats: commentsMap[model.id] || { totalRatings: 0, averageRating: 0 }
      }));

      return baseController.success(res, {
        models: result,
        total: filtered.length,
        page,
        totalPages: Math.ceil(filtered.length / limit)
      });
    } catch (err) {
      console.error('获取授权模型列表错误:', err);
      return baseController.error(res, '获取模型列表失败', 500);
    }
  }

  async function authorizeModel(req, res) {
    try {
      const { modelId, gameName } = req.body;

      if (!modelId || !gameName) {
        return baseController.error(res, '缺少参数', 400);
      }

      const model = await prisma.Model.findFirst({
        where: { id: parseInt(modelId) }
      });

      if (!model) {
        return baseController.error(res, '模型不存在', 404);
      }

      const existingBinding = await prisma.NameBinding.findFirst({
        where: { gameName }
      });

      if (existingBinding) {
        return baseController.error(res, '该游戏名已被其他模型使用', 400);
      }

      await prisma.ModelAuthorization.create({
        data: {
          modelId: parseInt(modelId),
          gameName
        }
      });

      await baseController.reloadModels();

      return baseController.success(res, null, '授权成功');
    } catch (err) {
      console.error('授权模型错误:', err);
      return baseController.error(res, '授权失败', 500);
    }
  }

  async function deauthorizeModel(req, res) {
    try {
      const { modelId, gameName } = req.body;

      if (!modelId || !gameName) {
        return baseController.error(res, '缺少参数', 400);
      }

      await prisma.ModelAuthorization.deleteMany({
        where: {
          modelId: parseInt(modelId),
          gameName
        }
      });

      await prisma.NameBinding.deleteMany({
        where: { gameName }
      });

      await baseController.reloadModels();

      return baseController.success(res, null, '取消授权成功');
    } catch (err) {
      console.error('取消授权错误:', err);
      return baseController.error(res, '取消授权失败', 500);
    }
  }

  async function deleteAuthModel(req, res) {
    try {
      const { modelId } = req.body;
      const gameName = req.user.gameName;

      if (!modelId || !gameName) {
        return baseController.error(res, '缺少参数', 400);
      }

      await prisma.ModelAuthorization.deleteMany({
        where: {
          modelId: parseInt(modelId),
          gameName
        }
      });

      await baseController.reloadModels();

      return baseController.success(res, null, '删除成功');
    } catch (err) {
      console.error('删除授权模型错误:', err);
      return baseController.error(res, '删除失败', 500);
    }
  }

  async function downloadToCustom(req, res) {
    try {
      const { hash, fileName } = req.body;
      const userId = req.user.id;

      if (!hash || !fileName) {
        return baseController.error(res, '缺少参数', 400);
      }

      const model = await prisma.Model.findFirst({
        where: { hash }
      });

      if (!model) {
        return baseController.error(res, '模型不存在', 404);
      }

      const filePath = await baseController.getModelFilePath(hash, fileName, 'custom', userId);

      return baseController.success(res, { filePath });
    } catch (err) {
      console.error('下载到自定义目录错误:', err);
      return baseController.error(res, '下载失败', 500);
    }
  }

  async function saveToMyModels(req, res) {
    try {
      const modelId = parseInt(req.params.id);
      const userId = req.user.id;

      const model = await prisma.Model.findFirst({
        where: { id: modelId }
      });

      if (!model) {
        return baseController.error(res, '模型不存在', 404);
      }

      if (model.currentType === 'auth') {
        return baseController.error(res, '私人模型无法保存', 400);
      }

      const existing = await prisma.ModelUploader.findFirst({
        where: { modelId, userId }
      });

      if (existing) {
        return baseController.error(res, '已保存过该模型', 400);
      }

      await prisma.ModelUploader.create({
        data: {
          modelId,
          userId
        }
      });

      await prisma.Model.update({
        where: { id: modelId },
        data: { saveCount: { increment: 1 } }
      });

      return baseController.success(res, null, '保存成功');
    } catch (err) {
      console.error('保存模型错误:', err);
      return baseController.error(res, '保存失败', 500);
    }
  }

  async function downloadFile(req, res) {
    try {
      const { id } = req.params;
      const model = await prisma.Model.findFirst({
        where: { id: parseInt(id) }
      });

      if (!model) {
        return baseController.error(res, '模型不存在', 404);
      }

      const downloadEnabled = await baseController.getSystemSetting('downloadEnabled') === 'true';
      if (!downloadEnabled) {
        return baseController.error(res, '下载功能已关闭', 403);
      }

      const filePath = await baseController.getYsmFilePath(model.hash, model.fileName);

      if (!filePath) {
        return baseController.error(res, '文件不存在', 404);
      }

      return baseController.success(res, { filePath, fileName: model.fileName });
    } catch (err) {
      console.error('获取下载链接错误:', err);
      return baseController.error(res, '获取下载链接失败', 500);
    }
  }

  async function incrementDownloadCount(req, res) {
    try {
      const { id } = req.params;

      await prisma.Model.update({
        where: { id: parseInt(id) },
        data: { downloadCount: { increment: 1 } }
      });

      return baseController.success(res, null, '下载计数已更新');
    } catch (err) {
      console.error('更新下载计数错误:', err);
      return baseController.error(res, '更新下载计数失败', 500);
    }
  }

  async function unlinkFromUser(req, res) {
    try {
      const modelId = parseInt(req.params.id);
      const userId = req.user.id;

      const uploader = await prisma.ModelUploader.findFirst({
        where: { modelId, userId }
      });

      if (!uploader) {
        return baseController.error(res, '未找到该关联', 404);
      }

      await prisma.ModelUploader.delete({
        where: { id: uploader.id }
      });

      const model = await prisma.Model.findFirst({
        where: { id: modelId }
      });

      if (model && model.saveCount > 0) {
        await prisma.Model.update({
          where: { id: modelId },
          data: { saveCount: { decrement: 1 } }
        });
      }

      return baseController.success(res, null, '解除关联成功');
    } catch (err) {
      console.error('解除关联错误:', err);
      return baseController.error(res, '解除关联失败', 500);
    }
  }

  async function getComments(req, res) {
    try {
      const modelId = parseInt(req.params.id);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const comments = await prisma.ModelComment.findMany({
        where: { modelId },
        include: {
          user: {
            select: { id: true, name: true, gameName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await prisma.ModelComment.count({
        where: { modelId }
      });

      const ratedComments = await prisma.ModelComment.findMany({
        where: { modelId, rating: { gt: 0 } },
        select: { rating: true }
      });

      const totalRatings = ratedComments.length;
      const averageRating = totalRatings > 0
        ? ratedComments.reduce((sum, c) => sum + c.rating, 0) / totalRatings
        : 0;

      return baseController.success(res, {
        comments,
        total,
        averageRating,
        totalRatings
      });
    } catch (err) {
      console.error('获取评论错误:', err);
      return baseController.error(res, '获取评论失败', 500);
    }
  }

  async function addComment(req, res) {
    try {
      const modelId = parseInt(req.params.id);
      const { content, rating } = req.body;

      if (!content || content.trim().length === 0) {
        return baseController.error(res, '评论内容不能为空', 400);
      }

      if (rating !== undefined && (rating < 0 || rating > 5)) {
        return baseController.error(res, '评分必须在0-5之间', 400);
      }

      const model = await prisma.Model.findFirst({
        where: { id: modelId }
      });

      if (!model) {
        return baseController.error(res, '模型不存在', 404);
      }

      const comment = await prisma.ModelComment.create({
        data: {
          modelId,
          userId: req.user.id,
          content: content.trim(),
          rating: rating || 0
        },
        include: {
          user: {
            select: { id: true, name: true, gameName: true }
          }
        }
      });

      return baseController.success(res, comment, '评论发布成功');
    } catch (err) {
      console.error('添加评论错误:', err);
      return baseController.error(res, '评论发布失败', 500);
    }
  }

  async function deleteComment(req, res) {
    try {
      const commentId = parseInt(req.params.id);
      const isAdmin = req.user.role === 'admin';

      const comment = await prisma.ModelComment.findFirst({
        where: { id: commentId }
      });

      if (!comment) {
        return baseController.error(res, '评论不存在', 404);
      }

      if (comment.userId !== req.user.id && !isAdmin) {
        return baseController.error(res, '无权删除此评论', 403);
      }

      await prisma.ModelComment.delete({
        where: { id: commentId }
      });

      return baseController.success(res, null, '评论已删除');
    } catch (err) {
      console.error('删除评论错误:', err);
      return baseController.error(res, '删除评论失败', 500);
    }
  }

  return {
    list,
    get,
    create,
    update,
    delete: deleteModel,
    upload,
    uploadImage,
    link,
    unlink,
    hashVerification,
    custom,
    auth,
    authorizeModel,
    deauthorizeModel,
    deleteAuthModel,
    downloadToCustom,
    saveToMyModels,
    downloadFile,
    incrementDownloadCount,
    unlinkFromUser,
    getComments,
    addComment,
    deleteComment
  };
}

export default createModelController();
