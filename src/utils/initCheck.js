/**
 * 系统初始化检查
 * 检查并处理nullname用户和管理员账户
 */
import dotenv from 'dotenv';
dotenv.config();
import prisma from './prisma.js';
import bcrypt from 'bcrypt';

export async function checkNullnameUser() {
  try {
    console.log('正在检查nullname用户...');

    const nullnamePassword = process.env.NULL_NAME_PASSWORD;

    if (!nullnamePassword) {
      console.error('错误：NULL_NAME_PASSWORD环境变量未设置');
      return;
    }

    const existingUser = await prisma.User.findFirst({
      where: { name: 'nullname' }
    });

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(nullnamePassword, saltRounds);

    if (existingUser) {
      await prisma.User.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          gameName: 'nullnamenullnullnullnullnull',
          token: null,
          tokenExpiresAt: null
        }
      });
      console.log('已更新nullname用户的密码');
    } else {
      await prisma.User.create({
        data: {
          name: 'nullname',
          password: hashedPassword,
          gameName: 'nullnamenullnullnullnullnull'
        }
      });
      console.log('已创建nullname用户并设置密码');
    }

  } catch (error) {
    console.error('检查nullname用户时出错:', error);
  }
}

export async function checkAdminUser() {
  try {
    const adminName = process.env.ADMIN_NAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminName || !adminPassword) {
      console.log('未配置管理员账户（ADMIN_NAME/ADMIN_PASSWORD），跳过创建');
      return;
    }

    console.log('正在检查管理员账户...');

    const existingAdmin = await prisma.User.findFirst({
      where: { name: adminName }
    });

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    if (existingAdmin) {
      await prisma.User.update({
        where: { id: existingAdmin.id },
        data: {
          password: hashedPassword,
          role: 'admin',
          token: null,
          tokenExpiresAt: null
        }
      });
      console.log(`已更新管理员账户 ${adminName} 的密码`);
    } else {
      await prisma.User.create({
        data: {
          name: adminName,
          password: hashedPassword,
          role: 'admin',
          gameName: null,
          emailVerified: true
        }
      });
      console.log(`已创建管理员账户 ${adminName}`);
    }

  } catch (error) {
    console.error('检查管理员账户时出错:', error);
  }
}

export async function initSystem() {
  await checkNullnameUser();
  await checkAdminUser();
  await prisma.$disconnect();
}

export default initSystem;
