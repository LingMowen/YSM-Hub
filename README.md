# YSM Hub

一个用于管理 Yes Steve Model (YSM) 模型的 Web 平台，支持模型上传、审核、授权和 RCON 远程管理。

## 功能特性

- **模型管理** - 上传、编辑、删除 YSM 模型文件
- **模型中心** - 公开模型浏览、评分、评论系统
- **审核系统** - 管理员审核上传的模型，可开启/关闭审核功能
- **用户管理** - 用户注册、登录、权限管理
- **游戏绑定** - 通过 RCON 发送验证码绑定游戏名
- **RCON 控制台** - 远程执行 Minecraft 服务器命令
- **数据统计** - 用户数、模型数、授权数统计

## 技术栈

- **前端**: Vue 3 + Vite + Pinia
- **后端**: Node.js + Express
- **数据库**: SQLite (Prisma ORM)
- **文件存储**: 本地文件系统

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装

```bash
# 克隆仓库
git clone https://github.com/LingMowen/YSM-Hub.git
cd YSM-Hub

# 安装依赖
npm install
cd client && npm install && cd ..

# 初始化数据库
npx prisma generate
npx prisma db push

# 构建前端
cd client && npm run build && cd ..
```

### 配置

复制 `.env.example` 为 `.env` 并修改配置：

```env
# 服务器配置
PORT=8181
HOST=0.0.0.0

# 数据库
DATABASE_URL="file:./data.db"

# JWT 密钥
JWT_SECRET=your-secret-key

# RCON 配置
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=your-rcon-password

# 模型存储路径 (需与游戏服务器共享)
YSM_MODEL_DIR=./ysm_models

# 邮件配置 (可选)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

### 启动

```bash
node app.js
```

访问 `http://localhost:8181` 即可使用。

默认管理员账号：
- 用户名: `admin`
- 密码: `admin123`

## 与游戏服务器集成

1. 将 `YSM_MODEL_DIR` 设置为游戏服务器的 `mods/yes_steve_model` 目录（或共享存储）
2. 配置 RCON 连接信息
3. 上传模型后系统会自动发送 `ysm model reload` 命令重载模型

## 目录结构

```
ysm-manager-server/
├── app/                 # 后端应用
│   ├── Controller/      # 控制器
│   └── Middleware/      # 中间件
├── client/              # 前端应用
│   └── src/
│       ├── views/       # 页面组件
│       ├── components/  # 通用组件
│       ├── stores/      # Pinia 状态
│       └── api/         # API 接口
├── prisma/              # 数据库模型
├── routes/              # 路由定义
├── src/                 # 工具函数
└── uploads/             # 上传文件存储
```

## 致谢

本项目基于 [ysm-manager-server](https://github.com/XiaoDengPiaoPiao/ysm-manager-server) 开发，感谢原作者的工作。

## License

Apache License 2.0
