# 猫猫冲表情站

基于 Next.js 16、Tailwind v4、本地 Radix/shadcn 风格组件、Cloudflare R2 与 Neon Postgres 的表情包图库。访客浏览，登录用户可投稿，管理员审核后发布。

## 功能

- 按角色一级分类、合集二级分类浏览表情
- 按名称、标签、分类搜索
- 支持标签筛选、预览、复制链接、下载
- **登录投稿**：GitHub OAuth 登录后通过 `/submit` 投稿，进入审核队列
- **后台审核 / 管理**：`/admin/submissions` 审核投稿，`/admin` 管理分类、标签、贴纸
- **批量上传优化**：支持 R2 预签名直传、服务器中转上传、已存在 R2 对象复用
- **维护脚本**：可用 Vercel AI Gateway 识别本地表情图片并批量生成文件名
- PWA：manifest、图标、Service Worker

## 技术栈

- Next.js 16（App Router，`--webpack` 模式以兼容 Serwist）
- Tailwind v4 + 本地 `components/ui` 组件 + Radix primitives + React 19
- Neon Postgres + Drizzle ORM
- Auth.js v5（GitHub provider，JWT session）
- Cloudflare R2（图片存储，S3 SDK 直连）
- Serwist（PWA service worker）

## 快速开始

1. 复制并填写环境变量：

```bash
cp .env.example .env.local
```

需要填写：
- `DATABASE_URL` / `DATABASE_URL_UNPOOLED`（Neon 控制台获取）
- `AUTH_SECRET`（`openssl rand -base64 32`）
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`（GitHub OAuth App，callback URL `<origin>/api/auth/callback/github`）
- `ADMIN_GITHUB_LOGINS`（逗号分隔，登录时这些用户会被种子化为 admin）
- `R2_*` 与 `NEXT_PUBLIC_R2_HOST`（Cloudflare R2 凭证与公开域名）
- `AI_GATEWAY_API_KEY`（可选，仅运行 `pnpm rename:stickers` 时需要）

2. 安装依赖、跑迁移、（首次）灌入历史数据：

```bash
pnpm install
pnpm db:migrate
pnpm db:seed       # 仅首次：把 data/stickers.json 灌入数据库
pnpm db:backfill-previews # 首次 seed 后生成并上传预览图
pnpm dev
```

3. 站点入口：
- 首页（画廊）：`http://localhost:3000`
- 投稿：`http://localhost:3000/submit`（需登录）
- 后台管理：`http://localhost:3000/admin`（需 admin）
- 投稿审核：`http://localhost:3000/admin/submissions`（需 admin）

## 常用命令

```bash
pnpm dev               # 本地开发
pnpm build             # 构建
pnpm typecheck         # TypeScript 检查
pnpm db:generate       # 根据 drizzle/schema.ts 生成 SQL migration
pnpm db:migrate        # 应用 migration 到数据库
pnpm db:push           # 直接同步 schema（dev 快速迭代用）
pnpm db:studio         # Drizzle Studio
pnpm db:seed           # 一次性：从 data/stickers.json 灌入历史数据
pnpm db:backfill-previews # 为 approved/pending 历史贴纸生成 R2 预览图
pnpm rename:stickers -- <目录> # dry-run：用 Vercel AI Gateway 识别本地表情图并生成改名计划
```

## 数据模型

见 [drizzle/schema.ts](drizzle/schema.ts)。核心表：

- `user`：Auth.js 标配 + `githubLogin` + `role`(`user`|`admin`) + `createdAt`
- `account` / `session` / `verificationToken`：Auth.js 标配
- `character`：角色一级归属
- `category`：角色下的子分类，`characterId + slug` 在同一角色内唯一
- `sticker`：单表 + `status`(`approved`|`pending`|`rejected`)，含 `src` 原图、`previewSrc` 预览图、`submittedById` / `approvedById` / `approvedAt` / `rejectionReason`；`tags` 为 `text[]`（GIN 索引）；`hash` 配合 partial unique index 保证未拒绝行的去重

R2 key 规则：
- 原图：`stickers/<角色id>/<分类slug>/<hash>.<ext>`
- 静态图预览：`previews/<角色id>/<分类slug>/<hash>-240.webp`
- GIF 预览：`previews/<角色id>/<分类slug>/<hash>-160.gif`

生产上传链路会同时写入原图和预览图；历史数据在首次 seed 后必须运行 `pnpm db:backfill-previews`，否则画廊查询会显式报错提示缺少 `previewSrc`。

上传默认使用 R2 预签名直传：浏览器先向应用请求 `/presign`，再直接 `PUT` 到 R2 临时对象，最后由 `/complete` 读取临时对象、生成预览并写库。上传表单也提供“服务器中转”模式，用于用户网络无法直连 Cloudflare R2 的场景。

如果同一张图片已经在共用 R2 bucket 中存在，上传前会先尝试按 `hash + 分类 + 扩展名` 导入已有最终对象；成功时会直接写当前数据库，不重复上传文件。

R2 直传要求 bucket CORS 允许站点来源执行 `PUT`，并允许 `Content-Type` / `Cache-Control` 请求头。临时对象使用 `Cache-Control: no-store`，最终原图和预览继续使用长期 immutable 缓存。

## 维护脚本

```bash
pnpm rename:stickers -- /path/to/images
pnpm rename:stickers -- /path/to/images --recursive
pnpm rename:stickers -- /path/to/images --apply
```

`rename:stickers` 默认只输出 dry-run 计划；加 `--apply` 才会重命名。脚本会把图片缩小后通过 Vercel AI Gateway 多模态模型识别，并生成中文短文件名。默认模型由 `VERCEL_IMAGE_RENAME_MODEL` 控制。

## 部署

部署到 Vercel：

1. 在 Vercel 项目设置中配置所有 [.env.example](.env.example) 列出的环境变量
2. **不要**设置 `R2_PROXY_URL`（仅本地开发使用）
3. `NEXTAUTH_URL` 设置为生产域名
4. 在 GitHub OAuth App 中追加生产 callback URL：`https://<domain>/api/auth/callback/github`
5. Push 触发自动构建；首次部署后跑一次 `pnpm db:migrate`（可在本地用 `DATABASE_URL_UNPOOLED` 指向生产库执行）

## License

[MIT](LICENSE) © yokinanya
