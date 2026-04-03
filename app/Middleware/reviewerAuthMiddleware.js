const reviewerAuthMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const isAdmin = req.user.role === 'admin';
    const isReviewer = req.user.isReviewer === true || req.user.isReviewer === 1;

    if (!isAdmin && !isReviewer) {
      return res.status(403).json({ success: false, message: '需要审核员权限' });
    }

    next();
  } catch (err) {
    console.error('审核员权限检查错误:', err);
    return res.status(500).json({ success: false, message: '权限验证失败' });
  }
};

export default reviewerAuthMiddleware;
