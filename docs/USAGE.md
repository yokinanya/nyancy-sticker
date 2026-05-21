# 使用说明

## 贡献指南

### 贡献范围

可以通过 PR 贡献这些内容：

- 修正表情名称、标签、分类归属
- 新增或调整一级分类、二级分类
- 提交新的表情包素材
- 修正文档、样式、代码问题
- 改进搜索、筛选、管理页或 CLI 行为

不要在 PR 中直接提交图片文件，也不要手写无法验证的 CDN URL。图片文件需要由维护者下载检查后上传到 Cloudflare R2。

### 提交表情包素材

可以通过 GitHub Issue 提交表情包素材：

1. 将图片打包成压缩包，支持常见格式如 `zip`、`7z`
2. 图片文件名会作为默认表情名称，例如 `紧张 2.gif` 会入库为 `紧张 2`
3. 在压缩包内按角色和合集分目录更好，例如：

```text
喵田弥夜/
└─ 2025/
   ├─ 紧张 2.gif
   └─ 晚安.png
```

4. 将压缩包上传到网盘
5. 新建 Issue，附上网盘链接，并说明：
   - 角色
   - 合集
   - 推荐标签
   - 素材来源和授权情况


### 修改数据

数据文件是 [data/stickers.json](../data/stickers.json)。

分类结构：

```json
{
  "categories": [
    { "id": "miya", "name": "喵田弥夜" },
    { "id": "miya_2025", "name": "2025", "parentId": "miya" }
  ],
  "stickers": []
}
```

规则：

- 一级分类表示角色，没有 `parentId`
- 二级分类表示合集，`parentId` 指向一级分类 id
- 二级分类 id 使用 `一级分类id_二级分类短id`
- 只支持两级分类，不支持三级分类
- 表情的 `category` 必须指向已存在的分类 id
- 标签写在 `tags` 数组里，保持短词、可搜索

改完数据后运行：

```bash
pnpm validate-manifest
```

### 本地管理页

维护者可以使用 `/admin` 管理数据：

```bash
pnpm dev
```

打开：

```text
http://localhost:3000/admin
```

本地管理页支持：

- 新增、编辑、删除分类
- 全局重命名或删除标签
- 单条编辑名称、分类、标签
- 批量改分类、加标签、删标签、删除
- 批量上传本地图片到 R2

`/admin` 只允许在 `NODE_ENV=development` 下写入。生产环境不会开放写入能力。

### CLI

CLI 仍可用于批量导入和维护：

```bash
pnpm sticker --help
pnpm sticker categories
pnpm sticker categories:add
pnpm sticker categories:rm <id>
pnpm sticker list --category <id>
pnpm sticker edit <id>
pnpm sticker tag <id> 标签1 标签2
pnpm sticker rm <id>
pnpm sticker validate --check-remote
```

批量导入目录：

```bash
pnpm sticker bulk-import ./素材目录 --category-from-dir -y
```

## 开发指南

### 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

需要配置：

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=nyancy-stickers
R2_PUBLIC_HOST=cdn.example.com
NEXT_PUBLIC_R2_HOST=cdn.example.com
NEXT_SERVER_ACTION_BODY_SIZE_LIMIT=100mb
R2_PROXY_URL=
```

说明：

- `R2_*` 用于本地管理页和 CLI 上传 R2
- `NEXT_PUBLIC_R2_HOST` 用于 Next Image 远程图片白名单
- `NEXT_SERVER_ACTION_BODY_SIZE_LIMIT` 控制 Server Action 请求体上限
- `R2_PROXY_URL` 可选，用于本地通过代理访问 Cloudflare R2

### 本地开发

```bash
pnpm install
pnpm dev
```

项目的 `dev` 和 `build` 都使用 webpack。Serwist/PWA 相关配置不依赖 Turbopack。

### 校验

```bash
pnpm typecheck
pnpm validate-manifest
pnpm build
```

`pnpm build` 会通过 `prebuild` 自动运行 manifest 校验。

### 目录说明

```text
app/                    Next.js App Router
app/admin/              本地管理页、上传 Route Handler、Server Actions
components/             前台图库组件
lib/                    共享类型、搜索、分类、上传、manifest 读写逻辑
cli/                    运维 CLI
data/stickers.json      单一数据源
public/icons/           PWA 图标
docs/                   文档
```

### 关键实现

- [lib/types.ts](../lib/types.ts)：`Sticker`、`Category`、`Manifest`
- [lib/categories.ts](../lib/categories.ts)：一级/二级分类工具函数
- [lib/manifest-file.ts](../lib/manifest-file.ts)：本地 manifest 读写和校验
- [lib/admin-upload.ts](../lib/admin-upload.ts)：本地上传文件解析、hash、R2 key 生成
- [app/admin/upload/route.ts](../app/admin/upload/route.ts)：批量上传入口
- [app/admin/sticker-table.tsx](../app/admin/sticker-table.tsx)：管理页分页编辑表格

### 图标与站点信息

- 站点 metadata：[app/layout.tsx](../app/layout.tsx)
- PWA manifest：[app/manifest.ts](../app/manifest.ts)
- 浏览器图标：[app/icon.png](../app/icon.png)
- Apple 图标：[app/apple-icon.png](../app/apple-icon.png)
- PWA 图标：[public/icons](../public/icons)

### 发布注意事项

- 部署环境不需要 R2 写入凭证，除非要在该环境开放管理上传
- `data/stickers.json` 会进入构建产物，发布前必须提交最新数据
- `public/sw.js` 是构建产物，变更 PWA 行为后重新构建
