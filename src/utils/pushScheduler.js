import fs from 'fs';
import path from 'path';
import prisma from './prisma.js';

let pushInterval = null;
let isPushing = false;

async function getSystemSetting(key) {
  const setting = await prisma.SystemSettings.findFirst({
    where: { key }
  });
  return setting ? setting.value : null;
}

async function pushModelsToGameServer() {
  if (isPushing) {
    console.log('模型推送正在进行中，跳过本次推送');
    return;
  }

  isPushing = true;
  console.log('开始推送模型到游戏服务器...');

  try {
    const gameServerModelDir = await getSystemSetting('gameServerModelDir');
    const modelDir = await getSystemSetting('modelDir') || './ysm_models';

    if (!gameServerModelDir) {
      console.log('游戏服务器模型目录未配置，跳过推送');
      isPushing = false;
      return;
    }

    if (!fs.existsSync(gameServerModelDir)) {
      console.log(`游戏服务器模型目录不存在: ${gameServerModelDir}`);
      isPushing = false;
      return;
    }

    const approvedModels = await prisma.Model.findMany({
      where: {
        currentType: 'custom',
        reviewStatus: 'approved'
      }
    });

    const validModelFiles = new Set(
      approvedModels.map(model => `${model.fileName}.ysm`)
    );

    let pushedCount = 0;
    let skippedCount = 0;
    let deletedCount = 0;

    const existingFiles = fs.readdirSync(gameServerModelDir).filter(f => f.endsWith('.ysm'));

    for (const file of existingFiles) {
      if (!validModelFiles.has(file)) {
        const filePath = path.join(gameServerModelDir, file);
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`已删除游戏服务器中的模型: ${file}`);
      }
    }

    for (const model of approvedModels) {
      const modelFolderPath = path.join(modelDir, model.hash);
      const modelFilePath = path.join(modelFolderPath, `${model.fileName}.ysm`);
      const destPath = path.join(gameServerModelDir, `${model.fileName}.ysm`);

      if (!fs.existsSync(modelFilePath)) {
        console.log(`模型文件不存在: ${modelFilePath}`);
        skippedCount++;
        continue;
      }

      const destExists = fs.existsSync(destPath);
      const srcStat = fs.statSync(modelFilePath);
      const destStat = destExists ? fs.statSync(destPath) : null;

      if (destExists && destStat && srcStat.mtime <= destStat.mtime) {
        skippedCount++;
        continue;
      }

      fs.copyFileSync(modelFilePath, destPath);
      pushedCount++;
      console.log(`已推送模型: ${model.fileName}`);
    }

    console.log(`模型推送完成 - 推送: ${pushedCount} 跳过: ${skippedCount} 删除: ${deletedCount}`);
  } catch (error) {
    console.error('推送模型时出错:', error);
  } finally {
    isPushing = false;
  }
}

export async function startPushScheduler() {
  const pushEnabled = await getSystemSetting('pushEnabled') === 'true';
  const intervalMinutes = parseInt(await getSystemSetting('pushInterval')) || 30;

  if (pushInterval) {
    clearInterval(pushInterval);
    pushInterval = null;
  }

  if (!pushEnabled) {
    console.log('模型推送功能已关闭');
    return;
  }

  console.log(`启动模型定时推送 - 间隔: ${intervalMinutes} 分钟`);

  pushModelsToGameServer();

  pushInterval = setInterval(async () => {
    const enabled = await getSystemSetting('pushEnabled') === 'true';
    if (enabled) {
      await pushModelsToGameServer();
    }
  }, intervalMinutes * 60 * 1000);
}

export async function stopPushScheduler() {
  if (pushInterval) {
    clearInterval(pushInterval);
    pushInterval = null;
    console.log('模型推送调度器已停止');
  }
}

export async function restartPushScheduler() {
  await stopPushScheduler();
  await startPushScheduler();
}

export { pushModelsToGameServer };
