# 前端重新制作计划

## 背景

当前项目 `ysm-manager-server` 的前端存在问题：
- 使用编译后的 Vue 代码，难以维护
- 存在编码问题导致 emoji 显示乱码
- 布局需要优化
- 需要支持 MC 模组打包

## 项目定位

本项目需要同时支持两种使用场景：
1. **Web 前端** - 通过浏览器访问的管理界面，可配置端口和服务器IP进行远程访问
2. **MC 模组集成** - 打包为 Minecraft 模组后，通过游戏内浏览器访问 Web 界面

## 技术方案

### 图标设计
- 所有页面图标使用简约线条 SVG（Feather Icons 风格）
- 无 emoji、无渐变色
- 统一 stroke-width: 2
- 统一颜色：当前色（currentColor）

### Vue.js 3 + Vite

**项目结构**：
```
ysm-manager-server/
├── client/                     # Vue 项目源码
│   ├── src/
│   │   ├── main.js           # Vue 入口
│   │   ├── App.vue           # 根组件
│   │   ├── api/              # API 封装
│   │   ├── components/       # 公共组件
│   │   ├── views/            # 页面组件
│   │   ├── stores/           # 状态管理 (Pinia)
│   │   ├── router/           # 路由配置
│   │   └── utils/            # 工具函数
│   ├── public/               # 静态资源
│   ├── index.html            # HTML 入口
│   ├── vite.config.js        # Vite 配置
│   ├── package.json          # 项目依赖
│   └── .env                  # 环境变量
└── dist/                     # 构建输出目录
```

## 核心架构

### 管理员账户配置化
- 管理员通过 `.env` 配置（ADMIN_NAME, ADMIN_PASSWORD, ADMIN_EMAIL）
- 不再使用独立的 adminKey
- 管理员和普通用户统一登录入口

### 统一登录系统
```
用户登录
    ↓
检查用户名是否为 ADMIN_NAME
    ↓
是 → role='admin' → 显示管理后台入口
否 → role='user' → 普通用户界面
```

### 用户角色系统

| 角色 | 说明 | 权限 |
|------|------|------|
| admin | 管理员 | 所有功能 + 管理后台 |
| user | 普通用户 | 个人中心、模型上传/查看 |

## 待删除的前端文件

```
client/
├── admin-model-link.js
├── index.html
├── manager.html
├── model-management.html
└── assets/
    ├── index-CK4wgnXP.js
    ├── index-BnnYIS63.css
    └── icons.css
```

## 图标规范

### SVG 图标列表
| 用途 | 图标名称 | 说明 |
|------|---------|------|
| 登录 | log-in | 用户登录 |
| 注册 | user-plus | 用户注册 |
| 首页 | home | 返回首页 |
| 列表 | list | 模型列表 |
| 用户 | user | 个人中心 |
| 上传 | upload | 上传模型 |
| 设置 | settings | 系统设置 |
| 搜索 | search | 搜索 |
| 删除 | trash-2 | 删除 |
| 编辑 | edit | 编辑 |
| 保存 | save | 保存 |
| 关闭 | x | 关闭 |
| 密码 | lock | 密码 |
| 邮箱 | mail | 邮箱 |
| 游戏 | gamepad-2 | 游戏 |
| 验证 | shield | 验证 |
| 警告 | alert-triangle | 警告 |
| 成功 | check-circle | 成功 |
| 错误 | x-circle | 错误 |
| 刷新 | refresh-cw | 刷新 |
| 退出 | log-out | 退出 |
| 统计 | bar-chart-2 | 统计 |
| 模型 | box | 模型文件 |

### 图标使用示例
```vue
<template>
  <i class="icon icon-home"></i>
</template>

<style>
.icon {
  display: inline-flex;
  width: 20px;
  height: 20px;
}
.icon::before {
  content: '';
  display: block;
  width: 100%;
  height: 100%;
  background: currentColor;
  mask: url('/icons/home.svg') center/contain no-repeat;
  -webkit-mask: url('/icons/home.svg') center/contain no-repeat;
}
</style>
```

## 功能模块

### 1. 用户模块
| 页面 | 组件 | 功能 |
|------|------|------|
| 登录注册页 | Login.vue | 登录/注册 Tab 切换 |
| - | Register.vue | 注册表单、SMTP验证 |

### 2. 布局模块
| 组件 | 功能 |
|------|------|
| AppLayout.vue | 主布局（侧边栏 + 内容区） |
| NavBar.vue | 顶部导航 |
| SideBar.vue | 侧边栏（根据角色显示菜单） |

### 3. 首页模块
| 页面 | 组件 | 功能 |
|------|------|------|
| Home.vue | 首页 | 统计信息、快捷操作 |
| - | StatsCard.vue | 统计卡片 |
| - | QuickActions.vue | 快捷操作按钮 |

### 4. 模型模块
| 页面 | 组件 | 功能 |
|------|------|------|
| ModelList.vue | 模型列表 | 公共/私人 Tab 切换 |
| - | ModelCard.vue | 模型卡片 |
| - | ModelSearch.vue | 搜索筛选 |

### 5. 上传模块
| 页面 | 组件 | 功能 |
|------|------|------|
| Upload.vue | 上传页 | 文件选择、进度显示 |

### 6. 个人中心模块
| 页面 | 组件 | 功能 |
|------|------|------|
| User.vue | 个人中心 | 用户信息、修改密码 |
| - | GameNameBinding.vue | 游戏名绑定 |
| - | MyUploads.vue | 我的上传 |

### 7. 管理后台模块（仅 admin）
| 页面 | 组件 | 功能 |
|------|------|------|
| Admin.vue | 管理主页 | 系统设置、用户管理、模型管理 |
| - | SystemSettings.vue | SMTP/白名单开关 |
| - | UserManagement.vue | 用户查询、重置密码 |
| - | ModelManagement.vue | 模型查看、删除 |

## 数据库变更

### User 表新增字段
```prisma
model User {
  // ... 现有字段 ...
  role    String  @default("user")  // admin / user
  isAdmin Boolean @default(false)    // 是否管理员
}
```

### 新增 SystemSettings 表
```prisma
model SystemSettings {
  id              Int     @id @default(1)
  smtpEnabled     Boolean @default(true)
  // 以下字段仅 MC 模组模式使用
  whitelistEnabled Boolean @default(false)  // 白名单验证开关（仅模组模式）
  rconHost        String?  // MC 服务器 IP
  rconPort        Int?     // MC 服务器端口
  rconPassword    String?  // RCON 密码（加密存储）
}
```

### 配置项分类

#### Web 模式（独立部署）
| 配置项 | 说明 | 配置位置 |
|--------|------|---------|
| SMTP 开关 | 邮箱验证开关 | 管理后台 |
| RCON 配置 | 服务器连接信息 | 管理后台 |

#### MC 模组模式（打包后）
| 配置项 | 说明 | 配置位置 |
|--------|------|---------|
| SMTP 开关 | 邮箱验证开关 | 管理后台 |
| 白名单开关 | 白名单验证开关 | 管理后台（仅模组模式显示）|
| RCON 配置 | 无需配置（模组内提供）| - |

## API 接口

### 1. 登录接口增强
```javascript
// POST /api/user/login
// 响应
{
  "success": true,
  "data": {
    "token": "xxx",
    "user": {
      "id": 1,
      "name": "xxx",
      "role": "admin"  // 或 "user"
    }
  }
}
```

### 2. 用户信息接口
```javascript
// GET /api/user/info
{
  "success": true,
  "data": {
    "id": 1,
    "name": "xxx",
    "role": "admin"
  }
}
```

### 3. 需要 admin 角色验证的接口
```javascript
POST /api/admin/resetPassword     // 需要 admin
DELETE /api/admin/delmodel/:id   // 需要 admin
GET /api/admin/models          // 需要 admin
POST /api/admin/getuser        // 需要 admin
POST /api/admin/updateUploadLimit  // 需要 admin
GET /api/admin/settings        // 需要 admin
POST /api/admin/settings      // 需要 admin
```

## 配置文件

### .env
```env
VITE_API_BASE_URL=/api
VITE_APP_TITLE=YSM管理器
```

### 后端 .env
```env
# 管理员账户
ADMIN_NAME=admin
ADMIN_PASSWORD=your_secure_password
ADMIN_EMAIL=admin@example.com
```

## 实施步骤

### 阶段一：项目初始化
1. 创建 Vue 3 + Vite 项目
2. 安装依赖（Vue Router, Pinia, Axios）
3. 配置 Vite
4. 删除旧前端文件

### 阶段二：架构搭建
1. 配置 Vue Router
2. 配置 Pinia Store
3. 创建 API 封装
4. 创建布局组件

### 阶段三：登录注册模块
1. Login.vue 登录注册页
2. Register.vue 注册表单
3. SMTP 验证码功能

### 阶段四：主要功能页面
1. Home.vue 首页
2. ModelList.vue 模型列表
3. Upload.vue 上传页
4. User.vue 个人中心

### 阶段五：管理后台
1. Admin.vue 管理主页
2. SystemSettings.vue 系统设置
3. UserManagement.vue 用户管理
4. ModelManagement.vue 模型管理

### 阶段六：后端改造
1. 修改 User 表添加 role 字段
2. 新增 SystemSettings 表
3. 修改登录接口返回角色
4. 新增管理员角色验证中间件
5. 新增系统设置接口

### 阶段七：构建和部署
1. npm run build 构建项目
2. 配置后端 serve 静态文件
3. MC 模组打包说明

## MC 模组预留

### MC 模组模式特点
- Web 界面打包为 MC 模组后，通过游戏内浏览器访问
- MC 服务器相关配置（RCON）由模组自动提供，无需在后台配置
- **白名单验证开关**：仅在 MC 模组模式下显示，由模组提供服务器白名单

### 打包说明
```
mod/
└── README.md
    - MC 模组打包指南
    - 构建后的文件位置
    - 如何集成到模组中
    - MC 服务器配置说明
```

## 注意事项

1. **Vue 3** - 使用最新的 Vue 3 Composition API
2. **构建** - npm run build 后使用
3. **管理员配置化** - 通过 .env 配置
4. **统一登录** - 管理员和普通用户同一入口
5. **角色权限** - admin/user 两种角色
6. **SMTP 验证** - 可在后台关闭
7. **白名单验证** - MC 模组专有，可关闭
8. **简约设计** - 无渐变色，触摸友好
9. **图标规范** - 全部使用简约线条 SVG，无 emoji
10. **MC 配置** - MC 服务器配置可在管理后台配置，模组模式下由模组提供
