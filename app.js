/**
 * 应用入口文件
 * 初始化 Express 应用并配置路由
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authMiddleware from './app/Middleware/authMiddleware.js';

// 设置控制台编码为 UTF-8
process.stdout.setEncoding('utf-8');
process.stderr.setEncoding('utf-8');

const app = express();
const PORT = process.env.PORT || 8181;
const HOST = process.env.HOST || '0.0.0.0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 添加CORS中间件，允许任何来源访问
app.use(cors());//TEST

// 添加JSON解析中间件
app.use(express.json());

// 配置静态文件服务
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'client/dist')));

// 导入路由
import routes from './routes/index.js';
import { createProgressMiddleware, getProgress } from './app/Middleware/uploadProgressMiddleware.js';

// 添加上传进度中间件
app.use(createProgressMiddleware());

// 使用路由
app.use('/api', routes);

// 添加进度查询 API
app.get('/api/upload/progress/:uploadId', authMiddleware, (req, res) => {
  const { uploadId } = req.params;
  const progress = getProgress(uploadId);
  res.json({ success: true, progress });
});

// 处理前端路由
app.get(/^(?!\/api\/)/, (req, res) => {
    console.log('Frontend route matched:', req.path);
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// 导入初始化检查
import initSystem from './src/utils/initCheck.js';
// 导入baseController用于模型重载
import createController from './app/Controller/baseController.js';
const baseController = createController();

// 定时重载模型功能
let reloadTimer = null;
function setupScheduledReload() {
  const reloadTime = parseInt(process.env.RELOAD_TIME);
  if (reloadTime && reloadTime > 0) {
    console.log(`定时模型重载已启用，间隔 ${reloadTime}ms`);
    reloadTimer = setInterval(async () => {
      console.log('执行定时模型重载...');
      await baseController.executeRCONCommand('ysm model reload');
    }, reloadTime);
  } else {
    console.log('定时模型重载未配置或已禁用');
  }
}

// 执行初始化检查
initSystem().then(() => {
  // 启动服务器
  app.listen(PORT, HOST, () => {
    console.log(`服务器启动在 ${HOST}:${PORT}端口`);
    console.log(`当前版本为 ${process.env.VERSION}`);
    // 设置定时重载
    setupScheduledReload();
  });
});

export default app;