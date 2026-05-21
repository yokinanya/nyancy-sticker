# 使用说明

本文档面向**网站访客**、**内容运营者** 和 **开发者** 三类角色。

---

## 一、访客：怎么用这个图库

### 基本操作

| 动作 | 操作方式 |
|---|---|
| 浏览 | 直接滚动；点击顶部分类 Tab 切换；点击 #标签 多选筛选 |
| 搜索 | 在搜索框输入关键词（名称/标签/分类都会被匹配）；快捷键 `/` 聚焦搜索框 |
| 预览 | 点击任意表情卡片，弹出大图预览 |
| 复制图片 | 预览框 → **复制图片**，直接到剪贴板，去聊天框 `Ctrl+V` 粘贴 |
| 复制链接 | 预览框 → **复制链接**，得到 CDN URL |
| 下载 | 预览框 → **下载**，保存到本地 |
| 切换主题 | 右上角太阳/月亮图标 |
| 安装到主屏 | 浏览器地址栏的「安装」按钮（PWA）|

### 兼容性提示

- **复制图片** 依赖浏览器 Clipboard API：Chrome / Edge / Firefox / Safari 都支持
- **GIF 复制** 只会拷贝首帧（浏览器限制）；如需保留动图，请用「下载」
- iOS Safari 必须由用户手势触发复制；不支持时会自动回退提示

---

## 二、运营：怎么添加表情包

> 前提：已配置 `.env.local`（见下文「环境变量」）

### 单张添加

```bash
pnpm sticker add ./猫猫.png
```

会依次询问：名称（默认文件名）、分类（从已有分类选）、标签（勾选已有 + 自定义）。
回车确认后，CLI 会：
1. 用 sharp 读取尺寸
2. 计算 SHA-256 前 16 位作为对象 key
3. 检查 R2 是否已有同名对象（hash 防重）
4. 上传到 `<bucket>/<category>/<hash>.<ext>`
5. 把元数据写进 `data/stickers.json`

跳过交互：

```bash
pnpm sticker add ./猫猫.png \
  --name "默念喵" \
  --category cat \
  --tags "发呆,可爱" \
  -y
```

加 `--dry-run` 可以预览不实际上传。

### 批量导入

最高效的方式是按子目录组织素材：

```
~/stickers/
├─ cat/         ← 子目录名 = category id（须存在）
│  ├─ a.png
│  └─ b.gif
├─ doge/
│  └─ c.webp
└─ meme/
   └─ d.jpg
```

然后：

```bash
pnpm sticker bulk-import ~/stickers --category-from-dir -y
```

- `-y` 模式下：名称用文件名，标签留空（之后用 `edit` 或 `tag` 命令补）
- 不加 `-y` 会对每张图询问名称和标签
- 同 hash 已存在的会自动跳过（R2 和 manifest 都查重）

### 修改与删除

```bash
pnpm sticker edit <id>           # 交互式改名称/分类/标签
pnpm sticker tag <id> 标签1 标签2 # 追加标签
pnpm sticker rm <id>             # 仅从 manifest 删除
pnpm sticker rm <id> --purge     # 同时删 R2 对象（前提：无其它条目引用）
```

### 分类管理

```bash
pnpm sticker categories          # 列出所有分类 + 计数
pnpm sticker categories:add      # 交互式新增（id + 名称 + emoji）
pnpm sticker categories:rm <id>  # 删除（如果有引用会要求确认，但不会迁移）
```

> 删除分类时如果还有表情引用它，会留下「悬空引用」，记得先用 `pnpm sticker edit` 把那些表情迁到别的分类。

### 校验数据

每次 `pnpm build` 会自动跑：

```bash
pnpm sticker validate
```

检查项：
- id 唯一性
- 分类引用完整（不能引用已删除的分类）
- src 字段非空
- hash 唯一（重复会作为警告，不会失败）

加 `--check-remote` 会额外 HEAD 检查每张图的 URL 是否可达（慢，2000 张要几分钟）：

```bash
pnpm sticker validate --check-remote
```

### 直接编辑 manifest

`data/stickers.json` 是单一数据源。理论上可以手改，但请记得：
- 保持 id 唯一
- 保持 hash 字段与 R2 对象对应（否则 `--purge` 会失效）
- 改完跑一次 `pnpm sticker validate`

CLI 写入时会自动按 id 排序，保证 git diff 友好。

---

## 三、开发者：本地开发与部署

### 环境变量

复制 `.env.example` → `.env.local`：

```env
# Cloudflare R2
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx        # Cloudflare dashboard 右侧
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxx        # R2 → Manage R2 API Tokens
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxx
R2_BUCKET=nyancy-stickers                       # bucket 名
R2_PUBLIC_HOST=cdn.example.com                  # 绑定到 bucket 的自定义域名（无协议）

# 前端用，必须 NEXT_PUBLIC_ 前缀，通常 = R2_PUBLIC_HOST
NEXT_PUBLIC_R2_HOST=cdn.example.com
```

> R2 公开访问需要在 Cloudflare 控制台给 bucket 启用 **Public Access** 或绑定 Custom Domain。

### 跑起来

```bash
pnpm install
pnpm build && pnpm start     # http://localhost:3000
```

#### 关于 `pnpm dev`

由于 Next.js 16 默认 Turbopack，而 Serwist（PWA）尚不支持，本项目 `dev`/`build` 已固定加 `--webpack`。


### 类型检查

```bash
pnpm typecheck
```

`prebuild` 钩子会自动跑 `validate-manifest`，所以 `pnpm build` 前不必单独跑。

### 部署到 Vercel / Cloudflare Pages / Node

- **Vercel**：直接连仓库，框架检测会自动识别 Next.js。在 Dashboard 配置 `NEXT_PUBLIC_R2_HOST`（其他 R2_* 不需要，因为前端不直接上传）
- **自托管**：`pnpm build && pnpm start`，反代到端口 3000
- **静态导出**：当前是 SSR（因为 PWA 需要 service worker 注册），不支持纯 `next export`

### 自定义 logo

替换 `public/icons/icon-192.png` 和 `public/icons/icon-512.png` 即可，PWA 会自动用新图标。如果想重新生成占位：

```bash
pnpm exec tsx scripts/generate-icons.ts
```

### 替换站点元数据

- 标题、描述：`app/layout.tsx` 的 `metadata` 导出
- PWA 名称、主题色：`app/manifest.ts`
- 字体：`app/globals.css` 里的 `font-family`

### 添加分类的最佳实践

1. 先 `pnpm sticker categories:add` 创建分类 id（英文，做对象 key 前缀）
2. 在本地素材文件夹建立同名子目录
3. `pnpm sticker bulk-import ./素材目录 --category-from-dir`

---

## 四、常见问题

### Q: 复制图片显示「当前浏览器不支持复制图片」？

A: 你的浏览器没启用 Clipboard API。可能是：
- HTTP 站点（必须 HTTPS）
- 老版本浏览器
- 隐私模式下被禁用

回退方案：用「复制链接」或「下载」。

### Q: GIF 复制后是静态图？

A: 浏览器 Clipboard API 把所有图片都转成 PNG，动图必然变首帧。GIF 推荐**下载**到本地后再发送。

### Q: 网站打开后看不到图片？

A: 检查：
1. `NEXT_PUBLIC_R2_HOST` 是否正确设置
2. `next.config.ts` 的 `images.remotePatterns` 是否包含你的 CDN 域名
3. R2 bucket 是否开启了公开访问 / 自定义域名

### Q: 想关闭 PWA？

A: `app/layout.tsx` 删除 `manifest` 字段；`next.config.ts` 删掉 `withSerwist` 包装；删除 `app/sw.ts`。

### Q: 一次能加多少张？

A: 没有硬上限。Manifest 通过 RSC 序列化到 HTML（约每张 200 bytes），10000 张大概 2 MB HTML —— 仍可接受。超过后建议改为客户端按需 fetch（修改 `app/page.tsx` 把 manifest 改为 API 拉取）。
