import prisma from '../../src/utils/prisma.js';

async function modelAccessMiddleware(req, res, next) {
  try {
    const modelId = parseInt(req.params.id);
    
    if (!modelId) {
      return res.status(400).json({
        code: 400,
        message: '缺少模型ID参数',
        timestamp: new Date().toISOString()
      });
    }

    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    if (!userId && !isAdmin) {
      return res.status(401).json({
        code: 401,
        message: '未授权访问',
        timestamp: new Date().toISOString()
      });
    }

    const model = await prisma.Model.findFirst({
      where: { id: modelId },
      include: {
        uploaders: {
          where: isAdmin ? {} : { userId }
        }
      }
    });

    if (!model) {
      return res.status(404).json({
        code: 404,
        message: '模型不存在',
        timestamp: new Date().toISOString()
      });
    }

    if (!isAdmin && model.uploaders.length === 0) {
      console.warn(`未授权的模型访问尝试 - userId: ${userId} 尝试访问模型ID: ${modelId} IP: ${req.ip}`);
      
      return res.status(403).json({
        code: 403,
        message: '您没有权限访问此模型',
        timestamp: new Date().toISOString()
      });
    }

    req.model = model;
    next();
  } catch (err) {
    console.error('模型权限验证错误:', err);
    return res.status(500).json({
      code: 500,
      message: '权限验证失败',
      timestamp: new Date().toISOString()
    });
  }
}

export default modelAccessMiddleware;
