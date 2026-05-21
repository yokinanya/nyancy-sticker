# 猫猫冲表情站

基于 Next.js 16、HeroUI v3 和 Cloudflare R2 的表情包图库。项目数据源是 [data/stickers.json](data/stickers.json)，图片文件存储在 R2，前端构建时读取 manifest 渲染图库。

## 功能

- 按角色一级分类、合集二级分类浏览表情
- 按名称、标签、分类搜索
- 支持标签筛选、预览、复制链接、下载
- 本地管理页 `/admin`：分类、标签、单条编辑、批量编辑、批量上传
- CLI：批量导入、校验、分类管理、标签管理、删除
- PWA：manifest、图标、Service Worker

## 快速开始

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

本地站点：

- 首页：`http://localhost:3000`
- 本地管理页：`http://localhost:3000/admin`

## 常用命令

```bash
pnpm dev                  # 本地开发
pnpm typecheck            # TypeScript 检查
pnpm validate-manifest    # 校验 data/stickers.json
pnpm build                # 构建，构建前会自动校验 manifest
pnpm sticker --help       # CLI 帮助
```

## 数据结构

`data/stickers.json` 是单一数据源。

- `categories`：分类列表
  - 一级分类表示角色：`{ "id": "miya", "name": "喵田弥夜" }`
  - 二级分类表示合集：`{ "id": "miya_2025", "name": "2025", "parentId": "miya" }`
- `stickers`：表情列表，`category` 指向分类 id

二级分类 id 约定为：

```text
一级分类id_二级分类id
```

图片上传到 R2 的 key 约定为：

```text
stickers/<一级分类id>/<二级分类id>/<hash>.<ext>
```

## 文档

贡献和开发说明见 [docs/USAGE.md](docs/USAGE.md)。

## License

[MIT](LICENSE) © yokinanya
