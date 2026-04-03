import prisma from '../src/utils/prisma.js';
import fs from 'fs';
import path from 'path';

const baseDir = process.env.YSM_MODEL_DIR || './ysm_models';

async function migrateFilesToUserDirectories() {
  console.log('🚀 开始文件迁移到用户隔离目录...\n');

  try {
    const models = await prisma.Model.findMany({
      include: {
        uploaders: {
          take: 1,
          include: { user: true }
        }
      }
    });

    console.log(`📊 找到 ${models.length} 个模型需要处理\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const model of models) {
      const uploader = model.uploaders[0];
      
      if (!uploader) {
        console.log(`⚠️  模型 ${model.fileName} (ID: ${model.id}) 没有上传者，跳过`);
        skippedCount++;
        continue;
      }

      const userId = uploader.userId;
      const userName = uploader.user.name;
      const oldPath = path.join(baseDir, model.currentType, model.fileName);
      const newUserDir = path.join(baseDir, 'users', String(userId), model.currentType);
      const newPath = path.join(newUserDir, model.fileName);

      if (!fs.existsSync(oldPath)) {
        console.log(`⚠️  源文件不存在: ${oldPath}`);
        skippedCount++;
        continue;
      }

      if (fs.existsSync(newPath)) {
        console.log(`✅ 目标文件已存在: ${newPath}`);
        skippedCount++;
        continue;
      }

      try {
        if (!fs.existsSync(newUserDir)) {
          fs.mkdirSync(newUserDir, { recursive: true });
          console.log(`📁 创建目录: ${newUserDir}`);
        }

        fs.renameSync(oldPath, newPath);
        
        console.log(`✅ 迁移成功: ${model.fileName}`);
        console.log(`   用户: ${userName} (ID: ${userId})`);
        console.log(`   从: ${oldPath}`);
        console.log(`   到: ${newPath}\n`);
        
        migratedCount++;
      } catch (err) {
        console.error(`❌ 迁移失败: ${model.fileName}`, err.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 迁移统计:');
    console.log(`   ✅ 成功迁移: ${migratedCount} 个文件`);
    console.log(`   ⏭️  跳过: ${skippedCount} 个文件`);
    console.log(`   ❌ 失败: ${errorCount} 个文件`);
    console.log('='.repeat(60));

  } catch (err) {
    console.error('❌ 迁移过程出错:', err);
    process.exit(1);
  }
}

migrateFilesToUserDirectories();
