# YSM Manager 后端文档

## 项目概述

YSM Manager 是一个用于管理 Minecraft Yes Steve Model (YSM) 模型的 Web 应用程序后端。提供用户管理、模型上传、模型授权、管理员功能等核心功能。

## 技术栈

- **运行时**: Node.js 24+
- **框架**: Express.js
- **数据库**: SQLite + Prisma ORM
- **文件存储**: 本地文件系统
- **游戏通信**: RCON 协议

## 项目结构

```
ysm-manager-server/
├── app/
│   ├── Controller/          # 控制器层
│   │   ├── baseController.js         # 基础控制器
│   │   ├── userController.js         # 用户相关接口
│   │   ├── modelController.js        # 模型相关接口
│   │   ├── administratorController.js # 管理员接口
│   │   └── testController.js         # 测试接口
│   └── Middleware/          # 中间件层
│       ├── authMiddleware.js         # 用户鉴权
│       ├── adminAuthMiddleware.js    # 管理员鉴权
│       ├── securityMiddleware.js     # 安全头设置
│       ├── fileUploadMiddleware.js   # 文件上传处理
│       ├── uploadLimitMiddleware.js  # 上传限制检查
│       └── checkGameName.js          # 游戏名绑定检查
├── routes/
│   └── index.js             # 路由配置
├── src/utils/
│   ├── prisma.js            # Prisma 客户端
│   ├── rcon.js              # RCON 连接管理
│   ├── common.js            # 通用工具函数
│   └── initCheck.js         # 初始化检查
├── prisma/
│   ├── schema.prisma        # 数据库模型定义
│   └── migrations/          # 数据库迁移文件
├── app.js                   # 应用入口
└── .env                     # 环境变量配置
```

## 数据库模型

### User (用户表)

```prisma
model User {
  id                Int       @id @default(autoincrement())
  name              String    @default("")           // 用户名
  password          String    @default("")           // 密码
  gameName          String?                          // 绑定的游戏名
  token             String?   @default("")           // 登录令牌
  tokenExpiresAt    DateTime?                        // 令牌过期时间
  customUploadLimit Int       @default(5)            // 公共模型上传限制
  authUploadLimit   Int       @default(1)            // 私人模型上传限制
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  uploadedModels    ModelUploader[]                  // 关联的上传记录
  bindings          NameBinding[]                    // 游戏名绑定记录
}
```

### Model (模型表)

```prisma
model Model {
  id              Int       @id @default(autoincrement())
  allowAuth       Boolean   @default(false)          // 是否允许私人上传
  currentType     String    @default("")             // 当前类型: auth/custom
  hash            String    @default("")             // 文件哈希值
  fileName        String    @default("")             // 文件名
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  uploaders       ModelUploader[]                    // 上传者列表
  authorizations  ModelAuthorization[]               // 授权记录
}
```

### ModelUploader (模型上传关联表)

```prisma
model ModelUploader {
  id        Int       @id @default(autoincrement())
  modelId   Int
  userId    Int
  createdAt DateTime  @default(now())
  model     Model     @relation(fields: [modelId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([modelId, userId])                        // 唯一约束
}
```

### ModelAuthorization (模型授权表)

```prisma
model ModelAuthorization {
  id        Int       @id @default(autoincrement())
  gameName  String    @default("")                   // 授权的游戏名
  modelId   Int
  createdAt DateTime  @default(now())
  model     Model     @relation(fields: [modelId], references: [id], onDelete: Cascade)
}
```

### NameBinding (游戏名绑定表)

```prisma
model NameBinding {
  id                Int       @id @default(autoincrement())
  userId            Int
  gameName          String
  verificationCode  String                           // 验证码
  token             String    @unique                 // 绑定令牌
  expiresAt         DateTime                         // 过期时间
  attempts          Int       @default(0)            // 尝试次数
  lastSentAt        DateTime                         // 最后发送时间
  createdAt         DateTime  @default(now())
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## API 接口文档

### 基础信息

- **基础URL**: `http://localhost:51300/api`
- **数据格式**: JSON
- **认证方式**: Bearer Token (Authorization: Bearer <token>)

### 用户接口 (/api/user)

#### 1. 用户注册

```
POST /api/user/register
```

**请求参数**:

```json
{
  "name": "用户名",
  "password": "密码"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "用户名",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "注册成功"
}
```

#### 2. 用户登录

```
POST /api/user/login
```

**请求参数**:

```json
{
  "name": "用户名",
  "password": "密码"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "name": "用户名",
      "gameName": "游戏名"
    }
  },
  "message": "登录成功"
}
```

#### 3. 用户登出&#x20;

```
POST /api/user/logout
Authorization: Bearer <token>
```

**响应**:

```json
{
  "success": true,
  "message": "登出成功"
}
```

#### 4. 获取当前用户信息

```
GET /api/user/info
Authorization: Bearer <token>
```

**响应**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "用户名",
    "gameName": "游戏名",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 5. 修改密码

```
POST /api/user/changePassword
Authorization: Bearer <token>
```

**请求参数**:

```json
{
  "oldPassword": "旧密码",
  "newPassword": "新密码"
}
```

#### 6. 更新游戏名（发送验证码）

```
POST /api/user/updateGameName
Authorization: Bearer <token>
```

**请求参数**:

```json
{
  "gameName": "游戏名"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "token": "绑定令牌",
    "expiresAt": "2024-01-01T00:05:00.000Z"
  },
  "message": "验证码已发送"
}
```

#### 7. 验证游戏名绑定

```
POST /api/user/verifyGameName
Authorization: Bearer <token>
```

**请求参数**:

```json
{
  "gameName": "游戏名",
  "verificationCode": "123456"
}
```

#### 8. 检查绑定状态

```
GET /api/user/bindingStatus
Authorization: Bearer <token>
```

**响应**:

```json
{
  "success": true,
  "data": {
    "status": "pending",
    "gameName": "游戏名",
    "expiresAt": "2024-01-01T00:05:00.000Z",
    "attempts": 0
  }
}
```

#### 9. 获取公共模型列表

```
GET /api/user/models/custom
Authorization: Bearer <token>
```

**响应**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "allowAuth": true,
      "currentType": "custom",
      "hash": "abc123...",
      "fileName": "模型.ysm",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "uploadedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 10. 获取私人模型列表

```
GET /api/user/models/auth
Authorization: Bearer <token>
```

#### 11. 获取所有模型列表

```
GET /api/user/models/all
Authorization: Bearer <token>
```

### 模型接口 (/api/ysm)

#### 1. Hash 验证

```
POST /api/ysm/hashVerification
Authorization: Bearer <token>
```

**请求参数**:

```json
{
  "hash": "文件哈希值",
  "type": "custom" // 或 "auth"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "exists": true,
    "modelId": 1,
    "hash": "abc123..."
  }
}
```

#### 2. 上传公共模型

```
POST /api/ysm/custom
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**请求参数**:

- `file`: YSM 模型文件 (.ysm)

**响应**:

```json
{
  "success": true,
  "data": {
    "modelId": 1,
    "hash": "abc123...",
    "fileName": "模型.ysm",
    "filePath": "/path/to/model.ysm"
  }
}
```

#### 3. 上传私人模型

```
POST /api/ysm/auth
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### 4. 授权模型

```
POST /api/ysm/auth/:id
Authorization: Bearer <token>
```

**响应**:

```json
{
  "success": true,
  "data": {
    "rconResponse": "RCON 响应结果"
  }
}
```

#### 5. 解除授权模型

```
POST /api/ysm/deauth/:id
Authorization: Bearer <token>
```

#### 6. 删除私人模型

```
DELETE /api/ysm/auth/:id
Authorization: Bearer <token>
```

### 管理员接口 (/api/admin)

#### 1. 重置用户密码

```
POST /api/admin/resetPassword
Authorization: Bearer <adminKey>
```

**请求参数**:

```json
{
  "username": "用户名"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "username": "用户名",
    "newPassword": "新密码"
  }
}
```

#### 2. 删除模型

```
DELETE /api/admin/delmodel/:id
Authorization: Bearer <adminKey>
```

**响应**:

```json
{
  "success": true,
  "data": {
    "modelId": 1,
    "fileName": "模型.ysm",
    "currentType": "custom"
  }
}
```

#### 3. 根据文件名查找模型

```
POST /api/admin/getmodel
Authorization: Bearer <adminKey>
```

**请求参数**:

```json
{
  "fileName": "模型.ysm"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "allowAuth": true,
    "currentType": "custom",
    "hash": "abc123...",
    "fileName": "模型.ysm",
    "uploaders": [
      {
        "id": 1,
        "name": "用户名",
        "gameName": "游戏名"
      }
    ]
  }
}
```

#### 4. 获取所有模型列表

```
GET /api/admin/models
Authorization: Bearer <adminKey>
```

**响应**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "allowAuth": true,
      "currentType": "custom",
      "hash": "abc123...",
      "fileName": "模型.ysm",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "uploaders": [
        {
          "id": 1,
          "name": "用户名",
          "gameName": "游戏名"
        }
      ]
    }
  ]
}
```

#### 5. 更新用户上传限制

```
POST /api/admin/updateUploadLimit
Authorization: Bearer <adminKey>
```

**请求参数**:

```json
{
  "username": "用户名",
  "customUploadLimit": 10,  // 可选
  "authUploadLimit": 5      // 可选
}
```

#### 6. 通过用户名查询用户

```
POST /api/admin/getUserInfoByUsername
Authorization: Bearer <adminKey>
```

**请求参数**:

```json
{
  "username": "用户名"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "用户名",
    "gameName": "游戏名",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "customUploadLimit": 5,
    "authUploadLimit": 1,
    "customUploaded": 2,
    "authUploaded": 1,
    "customRemaining": 3,
    "authRemaining": 0
  }
}
```

#### 7. 通过游戏名查询用户

```
POST /api/admin/getUserInfoByGameName
Authorization: Bearer <adminKey>
```

**请求参数**:

```json
{
  "gameName": "游戏名"
}
```

## 中间件说明

### 1. authMiddleware (用户鉴权)

- 验证用户登录状态
- 检查 Token 是否有效且未过期
- 将用户信息附加到请求对象

### 2. adminAuthMiddleware (管理员鉴权)

- 验证管理员密钥
- 密钥配置在 .env 文件的 `ADMIN_SECRET_KEY`

### 3. checkGameName (游戏名检查)

- 检查用户是否已绑定游戏名
- 某些操作需要先绑定游戏名

### 4. checkCustomUploadLimit / checkAuthUploadLimit (上传限制检查)

- 检查用户是否达到上传上限
- 分别检查公共模型和私人模型

### 5. fileUploadMiddleware (文件上传)

- 处理 multipart/form-data
- 验证文件类型 (.ysm)
- 限制文件大小

## 环境变量配置

```env
# 服务器配置
PORT=51300

# 数据库
DATABASE_URL="file:./dev.db"

# RCON 配置
RCON_HOST=localhost
RCON_PORT=25575
RCON_PASSWORD=your_rcon_password

# 管理员配置
ADMIN_SECRET_KEY=123456
NULL_NAME_PASSWORD=123456

# 模型存储路径
YSM_MODEL_DIR=/path/to/ysm/models

# 上传限制
CUSTOM_UPLOAD_LIMIT=5
AUTH_UPLOAD_LIMIT=1

# 自动重载
AUTO_RELOAD_ON_UPLOAD=true
```

## 核心业务流程

### 1. 用户注册/登录流程

1. 用户提交用户名和密码
2. 密码使用 bcrypt 加密存储
3. 登录成功后生成 JWT Token
4. Token 设置过期时间

### 2. 游戏名绑定流程

1. 用户提交游戏名
2. 生成验证码并发送到游戏内 (通过 RCON)
3. 用户输入验证码验证
4. 绑定成功后更新用户信息

### 3. 模型上传流程

1. 用户选择 YSM 文件
2. 计算文件 Hash
3. 检查 Hash 是否已存在
4. 检查上传限制
5. 保存文件到存储目录
6. 创建数据库记录
7. 关联上传者和模型
8. 可选：通过 RCON 自动重载

### 4. 模型授权流程

1. 用户选择要授权的模型
2. 检查模型类型和权限
3. 通过 RCON 发送授权命令到游戏服务器
4. 创建授权记录

### 5. 管理员操作流程

1. 管理员使用管理员密钥登录
2. 执行管理操作（重置密码、删除模型等）
3. 操作结果返回给管理员

## 文件存储结构

```
YSM_MODEL_DIR/
├── custom/                  # 公共模型
│   ├── 模型1.ysm
│   └── 模型2.ysm
└── auth/                    # 私人模型
    ├── 模型3.ysm
    └── 模型4.ysm
```

## 错误码说明

| 状态码 | 说明          |
| --- | ----------- |
| 200 | 请求成功        |
| 400 | 请求参数错误      |
| 401 | 未授权/Token无效 |
| 403 | 权限不足        |
| 404 | 资源不存在       |
| 409 | 资源冲突（如重复上传） |
| 429 | 请求过于频繁      |
| 500 | 服务器内部错误     |

## 开发注意事项

1. **数据库迁移**: 修改 schema.prisma 后需要执行 `npx prisma migrate dev`
2. **Prisma 生成**: 安装依赖后需要执行 `npx prisma generate`
3. **RCON 配置**: 确保 Minecraft 服务器已启用 RCON 并配置正确
4. **文件权限**: 确保 YSM\_MODEL\_DIR 目录有读写权限
5. **生产环境**: 建议使用 PM2 进行进程管理

## 前端开发建议

1. **API 封装**: 建议封装统一的请求方法，自动处理 Token
2. **错误处理**: 统一处理 401 错误，跳转登录页
3. **文件上传**: 使用 FormData，注意设置正确的 Content-Type
4. **状态管理**: 建议使用 localStorage 存储 Token
5. **路由守卫**: 需要登录的页面添加鉴权检查

