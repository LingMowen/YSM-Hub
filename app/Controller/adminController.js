import createController from './baseController.js';

function createAdminController() {
  const baseController = createController();

  async function getSettings(req, res) {
    try {
      const settings = {
        emailVerificationEnabled: await baseController.getSystemSetting('emailVerificationEnabled') === 'true',
        whitelistEnabled: await baseController.getSystemSetting('whitelistEnabled') === 'true',
        downloadEnabled: await baseController.getSystemSetting('downloadEnabled') === 'true',
        reviewEnabled: await baseController.getSystemSetting('reviewEnabled') === 'true',
        reviewImageMaxSize: parseInt(await baseController.getSystemSetting('reviewImageMaxSize')) || 10,
        rconHost: await baseController.getSystemSetting('rconHost') || process.env.RCON_HOST || 'localhost',
        rconPort: await baseController.getSystemSetting('rconPort') || process.env.RCON_PORT || '25575',
        rconPassword: await baseController.getSystemSetting('rconPassword') || process.env.RCON_PASSWORD || '',
        modelDir: await baseController.getSystemSetting('modelDir') || process.env.YSM_MODEL_DIR || './ysm_models'
      };

      return baseController.success(res, { settings });
    } catch (err) {
      console.error('获取设置错误:', err);
      return baseController.error(res, '获取设置失败', 500);
    }
  }

  async function updateSettings(req, res) {
    try {
      const { emailVerificationEnabled, whitelistEnabled, downloadEnabled, reviewEnabled, reviewImageMaxSize, rconHost, rconPort, rconPassword, modelDir } = req.body;

      if (emailVerificationEnabled !== undefined) {
        await baseController.setSystemSetting('emailVerificationEnabled', String(emailVerificationEnabled));
      }
      if (whitelistEnabled !== undefined) {
        await baseController.setSystemSetting('whitelistEnabled', String(whitelistEnabled));
      }
      if (downloadEnabled !== undefined) {
        await baseController.setSystemSetting('downloadEnabled', String(downloadEnabled));
      }
      if (reviewEnabled !== undefined) {
        await baseController.setSystemSetting('reviewEnabled', String(reviewEnabled));
      }
      if (reviewImageMaxSize !== undefined) {
        await baseController.setSystemSetting('reviewImageMaxSize', String(reviewImageMaxSize));
      }
      if (rconHost !== undefined) {
        await baseController.setSystemSetting('rconHost', rconHost);
      }
      if (rconPort !== undefined) {
        await baseController.setSystemSetting('rconPort', String(rconPort));
      }
      if (rconPassword !== undefined) {
        await baseController.setSystemSetting('rconPassword', rconPassword);
      }
      if (modelDir !== undefined) {
        await baseController.setSystemSetting('modelDir', modelDir);
      }

      return baseController.success(res, null, '设置已更新');
    } catch (err) {
      console.error('更新设置错误:', err);
      return baseController.error(res, '更新设置失败', 500);
    }
  }

  async function getSmtpSettings(req, res) {
    try {
      const smtp = {
        host: await baseController.getSystemSetting('smtpHost') || '',
        port: parseInt(await baseController.getSystemSetting('smtpPort')) || 587,
        secure: await baseController.getSystemSetting('smtpSecure') === 'true',
        user: await baseController.getSystemSetting('smtpUser') || '',
        pass: await baseController.getSystemSetting('smtpPass') || '',
        fromName: await baseController.getSystemSetting('smtpFromName') || ''
      };

      return baseController.success(res, { smtp });
    } catch (err) {
      console.error('获取SMTP设置错误:', err);
      return baseController.error(res, '获取SMTP设置失败', 500);
    }
  }

  async function updateSmtpSettings(req, res) {
    try {
      const { host, port, secure, user, pass, fromName } = req.body;

      if (host !== undefined) await baseController.setSystemSetting('smtpHost', host);
      if (port !== undefined) await baseController.setSystemSetting('smtpPort', String(port));
      if (secure !== undefined) await baseController.setSystemSetting('smtpSecure', String(secure));
      if (user !== undefined) await baseController.setSystemSetting('smtpUser', user);
      if (pass !== undefined) await baseController.setSystemSetting('smtpPass', pass);
      if (fromName !== undefined) await baseController.setSystemSetting('smtpFromName', fromName);

      return baseController.success(res, null, 'SMTP设置已更新');
    } catch (err) {
      console.error('更新SMTP设置错误:', err);
      return baseController.error(res, '更新SMTP设置失败', 500);
    }
  }

  async function getStats(req, res) {
    try {
      const totalModels = await baseController.prisma.Model.count();
      const totalUsers = await baseController.prisma.User.count();

      const linkedModels = await baseController.prisma.ModelAuthorization.count();

      return baseController.success(res, {
        stats: {
          totalModels,
          linkedModels,
          totalUsers
        }
      });
    } catch (err) {
      console.error('获取统计错误:', err);
      return baseController.error(res, '获取统计失败', 500);
    }
  }

  async function getSystemInfo(req, res) {
    try {
      return baseController.success(res, {
        info: {
          serverType: process.env.SERVER_TYPE || 'Unknown',
          gameVersion: process.env.GAME_VERSION || 'Unknown'
        }
      });
    } catch (err) {
      console.error('获取系统信息错误:', err);
      return baseController.error(res, '获取系统信息失败', 500);
    }
  }

  async function getWhitelistSettings(req, res) {
    try {
      const whitelistEnabled = await baseController.getSystemSetting('whitelistEnabled') === 'true';
      return baseController.success(res, { whitelistEnabled });
    } catch (err) {
      return baseController.error(res, '获取白名单设置失败', 500);
    }
  }

  async function updateWhitelistSettings(req, res) {
    try {
      const { enabled } = req.body;
      await baseController.setSystemSetting('whitelistEnabled', String(enabled));
      return baseController.success(res, null, '白名单设置已更新');
    } catch (err) {
      return baseController.error(res, '更新白名单设置失败', 500);
    }
  }

  return {
    getSettings,
    updateSettings,
    getSmtpSettings,
    updateSmtpSettings,
    getStats,
    getSystemInfo,
    getWhitelistSettings,
    updateWhitelistSettings
  };
}

export default createAdminController();
