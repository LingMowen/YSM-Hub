import createController from './baseController.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

function createAuthController() {
  const baseController = createController();

  async function login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return baseController.error(res, '缺少必填字段', 400);
      }

      const user = await baseController.prisma.User.findFirst({
        where: { name: username }
      });

      if (!user) {
        return baseController.error(res, '用户名或密码错误', 400);
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return baseController.error(res, '用户名或密码错误', 400);
      }

      const token = jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        process.env.JWT_SECRET || 'ysm-secret-key',
        { expiresIn: '7d' }
      );

      return baseController.success(res, {
        token,
        user: {
          id: user.id,
          username: user.name,
          email: user.email,
          gameName: user.gameName,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt
        }
      }, '登录成功');
    } catch (err) {
      console.error('登录错误:', err);
      return baseController.error(res, '登录失败', 500);
    }
  }

  async function register(req, res) {
    try {
      const { username, password, email, gameName } = req.body;

      if (!username || !password) {
        return baseController.error(res, '缺少必填字段', 400);
      }

      if (username.length < 3 || username.length > 20) {
        return baseController.error(res, '用户名长度应在3-20之间', 400);
      }

      if (password.length < 6) {
        return baseController.error(res, '密码长度至少为6位', 400);
      }

      const existingUser = await baseController.prisma.User.findFirst({
        where: { name: username }
      });

      if (existingUser) {
        return baseController.error(res, '用户名已存在', 400);
      }

      if (email) {
        const existingEmail = await baseController.prisma.User.findFirst({
          where: { email }
        });
        if (existingEmail) {
          return baseController.error(res, '邮箱已被使用', 400);
        }
      }

      const emailVerificationEnabled = await baseController.getSystemSetting('emailVerificationEnabled');
      const whitelistEnabled = await baseController.getSystemSetting('whitelistEnabled');

      if (emailVerificationEnabled === 'true' && email) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await baseController.prisma.User.create({
          data: {
            name: username,
            password: hashedPassword,
            email,
            gameName: gameName || null,
            emailVerified: false
          }
        });

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const token = baseController.generateRandomString(32);

        await baseController.prisma.NameBinding.create({
          data: {
            userId: newUser.id,
            gameName: email,
            verificationCode,
            token,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            lastSentAt: new Date()
          }
        });

        await baseController.sendVerificationEmail(email, verificationCode);

        return baseController.success(res, { needEmailVerify: true }, '注册成功，请查收邮箱验证码');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await baseController.prisma.User.create({
        data: {
          name: username,
          password: hashedPassword,
          email: email || null,
          gameName: gameName || null,
          emailVerified: !email
        }
      });

      const token = jwt.sign(
        { id: newUser.id, name: newUser.name, role: newUser.role },
        process.env.JWT_SECRET || 'ysm-secret-key',
        { expiresIn: '7d' }
      );

      return baseController.success(res, {
        token,
        user: {
          id: newUser.id,
          username: newUser.name,
          email: newUser.email,
          gameName: newUser.gameName,
          role: newUser.role,
          emailVerified: newUser.emailVerified,
          createdAt: newUser.createdAt
        }
      }, '注册成功');
    } catch (err) {
      console.error('注册错误:', err);
      return baseController.error(res, '注册失败', 500);
    }
  }

  async function verifyEmail(req, res) {
    try {
      const { code } = req.body;

      if (!code) {
        return baseController.error(res, '缺少验证码', 400);
      }

      const binding = await baseController.prisma.NameBinding.findFirst({
        where: {
          userId: req.user.id,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!binding) {
        return baseController.error(res, '验证码无效或已过期', 400);
      }

      if (binding.verificationCode !== code) {
        return baseController.error(res, '验证码错误', 400);
      }

      await baseController.prisma.User.update({
        where: { id: req.user.id },
        data: { emailVerified: true }
      });

      await baseController.prisma.NameBinding.delete({
        where: { id: binding.id }
      });

      const user = await baseController.prisma.User.findFirst({
        where: { id: req.user.id }
      });

      const token = jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        process.env.JWT_SECRET || 'ysm-secret-key',
        { expiresIn: '7d' }
      );

      return baseController.success(res, {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.name,
          email: user.email,
          gameName: user.gameName,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt
        }
      }, '验证成功');
    } catch (err) {
      console.error('验证邮箱错误:', err);
      return baseController.error(res, '验证失败', 500);
    }
  }

  async function logout(req, res) {
    return baseController.success(res, null, '登出成功');
  }

  async function getProfile(req, res) {
    try {
      const user = await baseController.prisma.User.findFirst({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          gameName: true,
          role: true,
          isReviewer: true,
          emailVerified: true,
          avatar: true,
          createdAt: true
        }
      });

      if (!user) {
        return baseController.error(res, '用户不存在', 404);
      }

      return baseController.success(res, {
        user: {
          id: user.id,
          username: user.name,
          email: user.email,
          gameName: user.gameName,
          role: user.role,
          emailVerified: user.emailVerified,
          avatar: user.avatar,
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      console.error('获取用户信息错误:', err);
      return baseController.error(res, '获取用户信息失败', 500);
    }
  }

  async function getSystemSettings(req, res) {
    try {
      const settings = {
        emailVerificationEnabled: await baseController.getSystemSetting('emailVerificationEnabled') === 'true',
        whitelistEnabled: await baseController.getSystemSetting('whitelistEnabled') === 'true',
        rconHost: await baseController.getSystemSetting('rconHost') || process.env.RCON_HOST || 'localhost',
        rconPort: await baseController.getSystemSetting('rconPort') || process.env.RCON_PORT || '25575',
        smtpHost: await baseController.getSystemSetting('smtpHost') || '',
        smtpPort: await baseController.getSystemSetting('smtpPort') || '587',
        smtpSecure: await baseController.getSystemSetting('smtpSecure') === 'true',
        smtpUser: await baseController.getSystemSetting('smtpUser') || '',
        smtpFromName: await baseController.getSystemSetting('smtpFromName') || ''
      };

      return baseController.success(res, { settings });
    } catch (err) {
      console.error('获取系统设置错误:', err);
      return baseController.error(res, '获取系统设置失败', 500);
    }
  }

  async function getWhitelist(req, res) {
    try {
      return baseController.success(res, { whitelist: [] });
    } catch (err) {
      return baseController.error(res, '获取白名单失败', 500);
    }
  }

  async function uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return baseController.error(res, '请上传头像图片', 400);
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      await baseController.prisma.User.update({
        where: { id: req.user.id },
        data: { avatar: avatarUrl }
      });

      return baseController.success(res, { avatarUrl }, '头像上传成功');
    } catch (err) {
      console.error('上传头像错误:', err);
      return baseController.error(res, '头像上传失败', 500);
    }
  }

  return {
    login,
    register,
    verifyEmail,
    logout,
    getProfile,
    getSystemSettings,
    getWhitelist,
    uploadAvatar
  };
}

export default createAuthController();
