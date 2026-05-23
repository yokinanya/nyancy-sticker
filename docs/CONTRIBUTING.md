# 贡献指南

## 贡献范围

可以通过站内投稿或 PR 贡献这些内容：

- 新增表情包素材
- 修正表情名称、标签、分类归属
- 新增或调整一级分类、二级分类
- 修正文档、样式、代码问题
- 改进搜索、筛选、投稿、审核或管理页行为

表情图片不再通过 PR 直接提交到仓库。请使用站内投稿流程，或在 Issue 里提供可下载素材和必要说明，由维护者审核后入库。

## 投稿表情包

登录 GitHub 后打开：

```text
/submit
```

投稿流程：

1. 选择角色和二级分类。
2. 如果缺少二级分类，可以在投稿页新建子分类。
3. 拖入或选择图片，支持 `png`、`jpg`、`jpeg`、`gif`、`webp`。
4. 单张图片大小不能超过 8 MB。
5. 文件名会作为默认表情名称，例如 `紧张 2.gif` 会入库为 `紧张 2`。
6. 标签用逗号分隔，保持短词、可搜索。
7. 点击「开始上传」，投稿会进入审核队列。

系统会在上传前检查重复图片。已存在或已在审核队列里的图片不会重复提交。

## 通过 Issue 提供素材

如果不方便使用站内投稿，可以新建 GitHub Issue：

1. 将图片打包为 `zip`、`7z` 等压缩包。
2. 建议按角色和合集分目录：

```text
喵田弥夜/
└─ 2025/
   ├─ 紧张 2.gif
   └─ 晚安.png
```

3. 将压缩包上传到网盘。
4. 在 Issue 中附上网盘链接，并说明角色、合集、推荐标签、素材来源和授权情况。

## 贡献代码或文档

提交 PR 前请确认：

- 不提交 `.env.local`、API key、R2 凭证、数据库连接串等敏感信息。
- 不提交图片素材到仓库；图片应走投稿或 Issue 素材流程。
- 文档里的命令、路径和环境变量要能在当前仓库中找到。
- 涉及数据库结构时，同时更新 `drizzle/schema.ts` 并生成 migration。
- 涉及 UI 行为时，尽量附上桌面端和移动端截图。

常用检查：

```bash
pnpm typecheck
pnpm lint
pnpm build
```

# 维护指南

## 角色权限

- `user`：普通登录用户，可以投稿。
- `editor`：管理员，可以进入后台审核投稿、管理分类、标签和贴纸。
- `admin`：超级管理员，可以额外管理用户角色。

`ADMIN_GITHUB_LOGINS` 用逗号分隔 GitHub login。列表里的用户登录时会被强制设为 `admin`；普通 `editor` 建议在后台用户管理里手动设置。

## 投稿审核

管理员打开：

```text
/admin/submissions
```

审核动作：

- 通过：投稿状态变为 `approved`，进入前台图库。
- 拒绝：投稿状态变为 `rejected`，可填写拒绝原因。

图片文件在投稿时已经上传到 R2。审核只改变数据库中的状态和审核信息。

## 后台管理

管理员打开：

```text
/admin
```

后台支持：

- 审核投稿
- 新增、编辑、删除分类
- 全局重命名或删除标签
- 筛选、排序、编辑贴纸
- 批量改分类、加标签、删标签、删除
- 批量上传本地图片并直接发布
- 管理用户角色（仅 `admin`）

分类规则：

- 一级分类表示角色，没有 `parentId`。
- 二级分类表示合集，`parentId` 指向一级分类 id。
- 只支持两级分类，不支持三级分类。
- 表情的 `categoryId` 必须指向已存在的分类 id。

R2 key 规则：

```text
stickers/<一级分类id>/<二级分类id>/<hash>.<ext>
```

# 开发指南

## 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

需要配置：

```env
DATABASE_URL=
DATABASE_URL_UNPOOLED=
AUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
ADMIN_GITHUB_LOGINS=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=nyancy-stickers
R2_PUBLIC_HOST=s3.yokina.moe
NEXT_PUBLIC_R2_HOST=s3.yokina.moe
NEXT_SERVER_ACTION_BODY_SIZE_LIMIT=100mb
R2_PROXY_URL=
```

说明：

- `DATABASE_URL` 是运行时使用的 Neon pooled 连接。
- `DATABASE_URL_UNPOOLED` 是 Drizzle migration 使用的直连。
- `AUTH_SECRET` 可用 `openssl rand -base64 32` 生成。
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` 来自 GitHub OAuth App。
- `R2_*` 用于上传图片到 Cloudflare R2。
- `NEXT_PUBLIC_R2_HOST` 用于 Next Image 远程图片白名单。
- `R2_PROXY_URL` 仅本地访问 R2 需要代理时填写，生产环境留空。

GitHub OAuth callback URL：

```text
http://localhost:3000/api/auth/callback/github
https://<domain>/api/auth/callback/github
```

## 本地开发

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`pnpm db:seed` 只用于首次把 `docs/archive/stickers.json` 导入数据库。已有数据的环境不要重复执行。

项目的 `dev` 和 `build` 都使用 webpack。Serwist/PWA 相关配置不依赖 Turbopack。

## 常用命令

```bash
pnpm dev          # 本地开发
pnpm build        # 构建
pnpm start        # 启动构建后的应用
pnpm lint         # ESLint
pnpm typecheck    # TypeScript 检查
pnpm db:generate  # 根据 drizzle/schema.ts 生成 SQL migration
pnpm db:migrate   # 应用 migration 到数据库
pnpm db:push      # 直接同步 schema，适合本地快速迭代
pnpm db:studio    # Drizzle Studio
pnpm db:seed      # 首次从 docs/archive/stickers.json 导入历史数据
```

## 目录说明

```text
app/                    Next.js App Router
app/submit/             登录用户投稿页
app/admin/              后台管理页、审核页、Server Actions
app/api/                投稿、上传、查重、鉴权等 Route Handler
components/             前台图库和通用交互组件
drizzle/                数据库 schema 与 migrations
lib/                    数据库、R2、图片处理、搜索、分类等共享逻辑
scripts/                一次性维护脚本
docs/                   文档和历史数据归档
public/                 静态资源和 PWA 图标
```

## 关键实现

- [drizzle/schema.ts](../drizzle/schema.ts)：数据库表、枚举、索引
- [auth.ts](../auth.ts)：Auth.js GitHub 登录和角色同步
- [lib/auth-helpers.ts](../lib/auth-helpers.ts)：用户、管理员、超级管理员权限检查
- [lib/upload.ts](../lib/upload.ts)：图片检查、hash、R2 上传
- [lib/r2.ts](../lib/r2.ts)：Cloudflare R2 客户端和公开 URL
- [lib/keys.ts](../lib/keys.ts)：R2 object key 生成
- [lib/queries/stickers.ts](../lib/queries/stickers.ts)：前台图库查询
- [lib/queries/admin-stickers.ts](../lib/queries/admin-stickers.ts)：后台贴纸查询
- [components/batch-upload-form.tsx](../components/batch-upload-form.tsx)：投稿和后台批量上传表单
- [app/api/submit/route.ts](../app/api/submit/route.ts)：投稿上传入口
- [app/api/admin/upload-one/route.ts](../app/api/admin/upload-one/route.ts)：后台直接发布上传入口
- [app/admin/submissions/actions.ts](../app/admin/submissions/actions.ts)：审核通过和拒绝

## 图标与站点信息

- 站点 metadata：[app/layout.tsx](../app/layout.tsx)
- PWA manifest：[app/manifest.ts](../app/manifest.ts)
- 浏览器图标：[app/icon.png](../app/icon.png)
- Apple 图标：[app/apple-icon.png](../app/apple-icon.png)
- PWA 图标：[public/icons](../public/icons)

# 发布注意事项

- 在 Vercel 配置 `.env.example` 中列出的必要环境变量。
- 生产环境不要设置 `R2_PROXY_URL`。
- `NEXTAUTH_URL` 设置为生产域名。
- GitHub OAuth App 中追加生产 callback URL。
- 首次部署后执行一次 `pnpm db:migrate`。
- 变更数据库结构时先生成并提交 migration，再部署。
- 变更 PWA 行为或图标后重新构建。
