import jwt from 'jsonwebtoken';

const authMiddleware = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
      return res.status(401).json({ success: false, message: '未提供认证token' });
    }

    let token;
    if (authorizationHeader.startsWith('Bearer ')) {
      token = authorizationHeader.slice(7);
    } else {
      token = authorizationHeader;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: '无效的认证token' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'ysm-secret-key');
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'token已过期' });
      }
      return res.status(401).json({ success: false, message: 'token无效' });
    }

    req.user = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error('鉴权错误:', error);
    return res.status(500).json({ success: false, message: '鉴权失败' });
  }
};

export default authMiddleware;
