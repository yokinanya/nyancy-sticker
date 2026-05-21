# 🐱 nyancy-sticker

> 一个轻量、可复制、可下载的中文表情包图库 —— 基于 HeroUI v3 + Next.js 16 + Cloudflare R2 构建。

![Stack](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs) ![HeroUI](https://img.shields.io/badge/HeroUI-v3-orange) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss) ![PWA](https://img.shields.io/badge/PWA-Serwist-5a0fc8) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)

## ✨ 特性

- 🖼 **可复制的图片** —— 一键复制 PNG 到剪贴板，直接粘贴到微信 / QQ / Telegram；GIF 自动回退到下载
- 🔎 **模糊搜索** —— 基于 Fuse.js，按名称 / 标签 / 分类即时筛选
- 🏷 **多维筛选** —— 分类 Tab + 多选标签 chip 组合过滤
- 🌀 **虚拟滚动** —— `@tanstack/react-virtual`，万张表情也流畅
- 🌓 **亮/暗主题** —— `next-themes`，自动跟随系统
- 📱 **PWA 离线** —— Serwist + Workbox，安装到桌面/手机主屏
- ⚡ **静态导出** —— 整个 manifest 编译进 bundle，零冷启动
- 🛠 **配套 CLI** —— 批量导入、上传 R2、去重、校验、增删改一条命令搞定
- ☁ **Cloudflare R2 存储** —— 零出网带宽费，自定义域名 CDN

## 🚀 快速开始

```bash
# 1. 装依赖
pnpm install

# 2. 配置环境（R2 凭证）
cp .env.example .env.local && vim .env.local

# 3. 跑起来
pnpm build && pnpm start    # http://localhost:3000
```

## 📦 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | **Next.js 16** (App Router) | RSC + 静态生成，SEO 友好 |
| UI | **HeroUI v3** + Tailwind v4 | 现代设计、暗色支持、无需 Provider |
| 状态 | Zustand + persist | 5 KB，搜索/筛选/最近使用全靠它 |
| 搜索 | Fuse.js | 纯前端模糊搜索，无后端依赖 |
| 虚拟化 | @tanstack/react-virtual | 行级虚拟，ResizeObserver 自适应列数 |
| 图片 | next/image | 自动 WebP/AVIF、懒加载、CDN 友好 |
| PWA | **Serwist** | next-pwa 的现代替代，原生支持 App Router |
| 存储 | Cloudflare R2 | 零出网带宽费，S3 兼容 |
| 上传 | @aws-sdk/client-s3 | R2 用 S3 协议 |
| CLI | cac + @inquirer/prompts | 交互式管理 manifest |

## 📁 目录结构

```
nyancy-sticker/
├─ app/                  # Next.js App Router
│  ├─ layout.tsx         # 根布局 + 主题/语言 Provider
│  ├─ page.tsx           # 首页：渲染 manifest
│  ├─ providers.tsx      # next-themes + I18nProvider
│  ├─ manifest.ts        # PWA manifest
│  ├─ sw.ts              # Serwist Service Worker
│  └─ globals.css
├─ components/           # React 组件（全部 client）
│  ├─ sticker-gallery.tsx    # 顶层整合：搜索/Tabs/网格/Modal
│  ├─ sticker-grid.tsx       # 虚拟滚动网格
│  ├─ sticker-card.tsx       # 单卡片
│  ├─ sticker-preview-modal.tsx  # 预览 + 复制/下载
│  ├─ search-bar.tsx
│  ├─ category-tabs.tsx
│  ├─ tag-filter.tsx
│  ├─ site-header.tsx
│  └─ theme-toggle.tsx
├─ lib/                  # 共享纯逻辑
│  ├─ types.ts           # Sticker / Category / Manifest
│  ├─ store.ts           # Zustand 过滤状态
│  ├─ search.ts          # Fuse 构建 + 过滤
│  └─ clipboard.ts       # 复制图片/链接/下载
├─ cli/                  # 运维 CLI（pnpm sticker ...）
│  ├─ index.ts           # cac 入口
│  ├─ commands/          # add / bulk-import / edit / rm / list / tag / validate / categories
│  └─ lib/               # manifest-io / image / r2 / log
├─ data/
│  └─ stickers.json      # ★ 单一数据源，CLI 维护
├─ scripts/
│  ├─ validate-manifest.ts  # 构建前自动校验
│  └─ generate-icons.ts     # 生成占位图标
├─ public/
│  ├─ icons/             # PWA 图标
│  └─ sw.js              # 构建产物（gitignored）
└─ docs/
   └─ USAGE.md           # 详细使用指南
```

## 🛠 CLI 速查

```bash
pnpm sticker --help                              # 列出所有命令
pnpm sticker add ./xxx.png                       # 交互式添加一张
pnpm sticker bulk-import ./folder --category-from-dir  # 批量导入
pnpm sticker list --category cat                 # 按分类列出
pnpm sticker edit <id>                           # 编辑元数据
pnpm sticker rm <id> --purge                     # 删除 + 清 R2 对象
pnpm sticker tag <id> 可爱 经典                  # 追加标签
pnpm sticker validate --check-remote             # 完整性 + URL 可达
pnpm sticker categories                          # 列出分类
```

完整说明见 [docs/USAGE.md](docs/USAGE.md)。

## 📜 License

MIT © yokinanya
