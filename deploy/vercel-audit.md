# SILLAGE × Vercel 部署审计报告

- 审计对象：`D:\workspace\SILLAGE`（Vite 7 + React 19 静态 SPA，无后端）
- 审计方式：**只读**（read / grep / glob / `node -e` 只读探测 / `npm ls` / `tsc -b --dry`）。未执行 `npm install`、`npm ci`、`npm run build`；未修改源码、`package.json`、`vercel.json`、`.vercelignore`、`tsconfig.json`、`dist/`。
- 运行时快照：Node v22.22.2 / npm 11.6.2，registry 指向 `registry.npmmirror.com`；工作目录无 `.git`（`Test-Path .git` = False），因此**上传门禁只有 `.vercelignore`，`.gitignore` 在本目录不生效**。
- 包体：仓库（不含 `node_modules`/`dist`）**5,268 个文件 / 599.37 MB**；`public/` 11 个文件 / **11.76 MB**（`12,332,916 B`）。

---

## 一、部署结论

**结论：当前配置不能保证一次部署成功 —— 有 1 个必然阻断项（P0-1），修掉后即可直接部署。**

- 应用本身**100% 静态、无 API、无环境变量、无外部 CDN**（唯一网络请求是自身 `public/` 下的 mp4/json），Vercel 静态托管形态完全匹配。
- 阻断项不在代码，而在 `.vercelignore` 的一条过宽 pattern：`design/` 会把 `src/design/` 一起排除，导致 Linux 构建机上 `vite build` 解析不到 Tailwind 入口 `src/design/tokens.css` 而失败。
- 除 P0-1 外，其余 14 项为 P1 建议（上传体积/缓存/Node 版本锁定/锁文件源等），均不影响首次上线成功。

**修复清单（最小改动 = 1 行）**

| # | 文件 | 改动 | 结果 |
|---|------|------|------|
| 1 | `.vercelignore:5` | `design/` → `/design/` | 解除 P0 |
| 2 | `.vercelignore` | 追加 `/dist/`、`*.tsbuildinfo`、`/qa-output/`、`/deploy/` | 上传 599MB→约 13MB，避免陈旧增量状态 |
| 3 | `package.json` | 追加 `"engines": { "node": "22.x" }` | 锁定构建 Node，避免默认版本漂移 |
| 4 | `vercel.json` | 追加 `trailingSlash:false` + `headers`（可选 `installCommand:"npm ci"`） | `/live/` 不再 404；hash 资源长缓存 |

---

## 二、P0 阻断项

### P0-1（唯一阻断）`.vercelignore` 的 `design/` 会连带排除 `src/design/` → 构建必失败

**证据链**

1. `.vercelignore:5` 的 pattern 是 `design/`（无前导 `/`、无 `**` 前缀）。
2. Vercel 官方文档明确 `.vercelignore`「works similarly to a `.gitignore` file」（<https://vercel.com/docs/deployments/vercel-ignore>），而 Vercel 客户端的实现就是 npm `ignore` 包：
   - `@vercel/client` 源码 `packages/client/src/utils/index.ts`：`import ignore from 'ignore'` → `ig.add(...clearRelative(ignoreFile))` → `readdir(path, [absPath => ig.ignores(relative(path, absPath))])`（<https://raw.githubusercontent.com/vercel/vercel/main/packages/client/src/utils/index.ts>）。
   - `clearRelative()` 只去掉行首 `./`，**不会**给 pattern 补根锚点。
3. gitignore 语义（`ignore` 包遵循同一规范，<https://git-scm.com/docs/gitignore#_pattern_format>）：
   - 「If there is a separator at the beginning or middle … the pattern is relative to the directory level」；`design/` 只有**结尾**分隔符 → **可在任意层级匹配**。
   - 官方例子：「`frotz/` matches `frotz` **and `a/frotz` that is a directory**」。
4. 因此 `design/` 命中 `src/design/`，`src/design/tokens.css` 与 `src/design/components.tsx` 不会上传到构建容器：
   - `src/main.tsx:9` `import './design/tokens.css';` —— 该文件是**唯一的 Tailwind v4 入口**：
     - `src/design/tokens.css:1` `@import 'tailwindcss' source(none);`
     - `src/design/tokens.css:3` `@source '../../src';`
   - 无 `.js/.ts` 可解析 → `vite build` 报 `Failed to resolve import "./design/tokens.css" from "src/main.tsx"`（Rollup 解析失败），构建 Step 失败，deployment 失败。
5. 补充：`tsc -b` 不拦这一步（`tsconfig.json:9` `include: ["src", "vite.config.ts"]`，文件缺失只是不被编译，**不会**报错）——所以故障会推迟到 `vite build` 阶段才暴露，容易误判。

**修复（二选一，推荐前者）**

```gitignore
# .vercelignore —— 带根锚点，只排除仓库根的 design/ 评审目录
/design/
```

```gitignore
# 或者：保留原语义但显式把 src/design 加回来（ignore 包按行顺序求值，后置 ! 生效）
design/
!/src/design/
```

> 说明：P0-1 与部署方式无关。走 CLI/自上传时必然命中；走 Git 集成部署时 `.vercelignore` 同样用于从部署中排除文件（文档标题即 “Exclude Files from Deployments”），同一条 pattern 仍是错的。且本目录无 `.git`，无法依赖 Git 侧过滤。

---

## 三、P1 建议项

### P1-1 `.vercelignore` 遗漏 `dist/` —— 上传双份产物且污染部署
- `.vercelignore:1-7` 未忽略 `/dist/`；`.gitignore:2` 有 `dist/` 但（本目录无 `.git`）不参与上传过滤。
- 影响：本地一旦构建过，`dist/`（预计 ≈12.5 MB：public 11.76 MB + hashed assets/字体/CSS）会随源码一起上传，上传量翻倍；若用 `--prebuilt`，本地 dist 会被直接当产物；非 prebuilt 时 dist 也会作为普通源码文件躺在构建容器里。
- 备注：当前 `dist/` 尚不存在（另一名队友正在构建，见 P1-14 的沙箱限制），但**构建后必须已在 ignore 列表中**。

### P1-2 `.vercelignore` 遗漏 `*.tsbuildinfo` —— 陈旧增量状态被上传（不致命）
- `tsconfig.tsbuildinfo` 存在于仓库根（458 B），`.gitignore:4` 有 `*.tsbuildinfo`，`.vercelignore` **没有** → CLI 上传会带上。
- 文件内容（TS 5.9.3 生成的“非增量 build info”，只有 `root`+`version`）里的 13 个路径**全部是小写**：`./src/app.tsx`、`./src/modules/overview/trafficchart.tsx` …（Windows 大小写不敏感，canonical name 被小写化）。Linux 上真实文件是 `App.tsx`/`TrafficChart.tsx`。
- 实测本地 `tsc -b --dry` 输出 `A non-dry build would build project 'D:/workspace/SILLAGE/tsconfig.json'`，即**该 buildinfo 已被判定为需要重建**；TS 源码中该判定为 `getNonIncrementalBuildInfoRoots()` 与当前 `seenRoots` 比对，不匹配只返回 `OutOfDateRoots` 状态（触发全量重建），**不会**抛错。
- 结论：**不会阻断**，但会让“增量跳过”彻底失效、并在 Linux 上产生一次无意义的全量类型检查；建议上传前排除以保持构建纯净/可复现。

### P1-3 `.vercelignore` 遗漏 `qa-output/`、`deploy/`、`scripts/*.mjs` 之外无价值文件
- `.gitignore:5` 有 `qa-output/`（当前目录不存在，属未来防漏）；`deploy/tmp/build.log`、`exp1.log` 被 `*.log` 覆盖（`.vercelignore:7`），但 `deploy/` 目录本身（含本审计报告）会随源码上传，建议 `/deploy/`。
- `scripts/` 下 5 个 .mjs/.py（≈76 KB）只被 `package.json:11-13` 的本地 QA 脚本引用，构建期不执行；`scripts/models/`（38.7 MB onnx）已被 `.vercelignore:1` 排除，**这点很关键**——否则仅 models 一项就吃掉 Hobby 100 MB 上传额度的 39%。

### P1-4 被忽略目录确实未被构建/运行时代码引用（安全）
逐一 grep（`src/**`、`index.html`、`vite.config.ts`、`package.json`）结果为：
| 目录 | 大小 | 构建/运行时引用 | 结论 |
|---|---|---|---|
| `evidence/` | 44.32 MB / 187 文件 | 0（仅出现在自身 QA JSON 的 `"file": "evidence/…"` 字段） | 可安全忽略 |
| `extended/` | 101.09 MB / 321 文件 | 1 处 **CSS 注释**：`src/styles.css:41-44` 的 `/* … Reference visual basis: extended/LAVISH_LiveVision_RealVideo_Demo.html */`，在注释块内，不参与构建 | 可安全忽略 |
| `tasks/` | 134.78 MB / 3,359 文件 | 0（仅 QA 结果 JSON 记录哈希/截图路径） | 可安全忽略 |
| `design/`（根） | 6.26 MB / 29 文件 | 仅 `vite.config.ts:7` 的 dev-watch 忽略串 `'**/design/screenshots/**'`（纯字符串，不读文件） | 可忽略（但必须写成 `/design/`，见 P0-1） |
| `scripts/models/` | 37.20 MB | 0（仅 `scripts/analyze_lavish_video.py` 使用，非构建链） | 可安全忽略 |
- 注：`design/DESIGN_SYSTEM.md:27` 提到 `public/licenses/`，属文档描述，不影响构建。

### P1-5 `vercel.json` 的 `/live` rewrite 语义正确，但缺 `trailingSlash` → `/live/` 会 404
- `vercel.json:5-7` `{ "source": "/live", "destination": "/index.html" }`：`source` 按文档是**区分大小写**的路径匹配（`.md` 文档 “Case sensitivity” 节），精确匹配 `/live`。
- 深链入口只有 1 个：`src/main.tsx:12` `if (window.location.pathname === '/live') window.history.replaceState(null, '', '/')`。全仓库无 router / `href` / `pushState` / 其他深链（grep 仅此 1 处命中）。**因此单条 rewrite 足够，不需要 SPA fallback `/(.*) → /index.html`。**
- 风险点：`trailingSlash` 未设置（默认 `undefined`，文档明确“不会重定向”），`/live/` 不会命中精确 pattern `/live` → 404。建议 `"trailingSlash": false`（`/live/` 308 → `/live`，再命中 rewrite）。`cleanUrls` 不需要（App 不依赖 `.html` 后缀）。
- 附带确认：`framework: "vite"` 是合法 slug（文档 Framework Preset 列表含 Vite）；`buildCommand`/`outputDirectory` 与 Vite 默认一致，属冗余但无害且更显式。

### P1-6 静态资源缓存：需要 `headers`（Vite 预设不会自动加 immutable）
- 默认 `cache-control` = `public, max-age=0, must-revalidate`（文档 “Default cache-control value”），也就是说**每个 JS/CSS/字体/mp4 每次访问都会回源校验**。
- 文档 “Immutable static assets (hashed JS, CSS, fonts)” 建议 `max-age=31536000, immutable`，并注明 “**Frameworks like Next.js set this automatically**”——Vite 预设没有这一步，需要手工配置（`vercel.json` `headers`，见第四节）。`/assets/*` 是 Vite 内容哈希文件名，可安全长缓存。
- mp4 文件名**不含哈希**（`/demo/lavish-mall.mp4` 等），建议 `max-age=86400, stale-while-revalidate` 而非 immutable（换片后无需 purge）。
- 成本：`headers` 每项计 1 条 Route，本方案 4 条，远低于 2,048 条上限（<https://vercel.com/docs/limits#routes-created-per-deployment>）。

### P1-7 mp4 的 Range 与 MIME：播放/循环不受影响，拖动依赖平台 Range，需上线后 curl 确认
- MIME：`.mp4` 由静态层按扩展名下发 `video/mp4`（Vite 把 `public/` 原样复制到 `dist/`，Vercel 静态产物由扩展名决定 Content-Type）→ `<video>` 可播。
- Range：静态产物由 CDN/静态文件层直接响应（不经 Function、不经 rewrite 代理），正常支持 `Accept-Ranges: bytes` / `206`。**但 Vercel 官方文档未把 “Range 支持” 写成对外契约**，故列入上线验证项（第六节 curl）。
- 影响面评估：`loop` 复播只依赖已缓冲数据，**不依赖 Range**；`preload="auto"`（`src/modules/vision/LiveVisionModule.tsx:154`）会把 9.9 MB 全量拉取，拖动定位在完整下载后也正常。即最坏情况是“首帧拖动延迟”，不是功能失败。
- 明确不建议的做法：把 mp4 放到 rewrite/外部存储代理后面（走 120 s 代理层，Range 语义更不可控）；保持在 `public/` 里由静态层直出即可。
- 单文件与体积：`lavish-mall.mp4` 9.89 MB、`lavish-mall-b.mp4` 2.15 MB，远低于 Vercel 静态文件层面的尺寸约束；上传侧限制是 **Hobby 100 MB / Pro 1 GB、15,000 个源文件**（<https://vercel.com/docs/limits#static-file-uploads>、`#files`），当前 5,268 文件 / 599 MB 经 `.vercelignore` 过滤后约 **13.1 MB / ~45 文件**，安全。

### P1-8 `package-lock.json` 与 `package.json` 同步，但所有 tarball 指向 npmmirror
- 同步性：`lockfileVersion 3`、205 个 package；lock 根 `dependencies`/`devDependencies` 与 `package.json:14-34` 逐项一致；`npm ls --depth=0` 输出 17 个顶层包全部满足声明范围、无 missing/extraneous（本地实测）。
- 平台完整性（Linux 构建关键）：lock 内含 `@tailwindcss/oxide-linux-x64-gnu`、`lightningcss-linux-x64-gnu`、`@rollup/rollup-linux-x64-gnu`、`@esbuild/linux-x64` 等可选依赖条目 → **Vercel 的 Linux 镜像可正常安装**。
- 风险：204 条 `resolved` URL **全部是 `https://registry.npmmirror.com/...`**（`npm config get registry` 的产物）。`npm install`/`npm ci` 会按 lock 的 `resolved` 取包 → Vercel（美国/欧洲构建网络）需回源国内镜像，首次安装延迟或镜像抖动会直接拖慢/搞挂构建。
- 建议（择一）：① 用默认 registry 重新生成 lock：`npm i --package-lock-only --registry=https://registry.npmjs.org`；② 或删除 `package-lock.json` 让 Vercel 在自己 registry 上解析（牺牲可复现性，不推荐）。
- 另：Vercel 默认安装 **包括 devDependencies**（文档 “Install Command”: “It installs dependencies from package.json, including devDependencies”）——本项目 `vite`/`typescript`/`@vitejs/plugin-react`/`@tailwindcss/vite` 全在 devDeps，**因此绝不能按文档建议用 `--only=production` 跳过 devDeps**（那会直接构建失败）。

### P1-9 playwright 1.58.2 作为 devDependency：**不会下载浏览器**，但也无必要留在生产安装链
- 关键实测：`node_modules/playwright/package.json` **没有 `scripts` 字段**（全文 72 行，无 `install`/`postinstall`），lock 中 `node_modules/playwright` 与 `playwright-core` 均无 `hasInstallScript` → **`npm install` 不会触发 `playwright install`**，不会下载 Chromium/Firefox/WebKit。
  - 对比参考：本机 `%LOCALAPPDATA%\ms-playwright` 已有 2.4 GB 浏览器缓存，但那是历史上显式执行 `npx playwright install` 的结果，与 npm install 无关。
- 真实成本：`playwright` 3.55 MB + `playwright-core` 8.88 MB（363 文件）≈ **12.4 MB / ~370 文件**，只影响 Vercel 安装时长（数秒级）与缓存体积，不构成 P0。
- 建议：保持现状即可（QA 脚本 `package.json:11-13` 需要它）；若想进一步瘦身，可把 `qa`/`qa:nav` 移到独立 `tools/` 包，或在 Vercel 项目设置中把 `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` 作为保险（对 1.58.2 冗余，但对未来升级有意义）。

### P1-10 缺少 `engines`：Vercel 现在默认 Node **26.x**
- Vite 7.3.7 的 `engines` 是 `^20.19.0 || >=22.12.0`（`node_modules/vite/package.json`）；`@vitejs/plugin-react@5.2.0` 同。Node 26 满足，不阻断。
- 但 Vercel 当前可用版本为 **26.x（默认）/ 24.x / 22.x**（<https://vercel.com/docs/functions/runtimes/node-js/node-js-versions>），本地验证环境是 v22.22.2 → 默认漂移到 26 会带来“本地能过、云端未知”的差异；且 Node 20 已于 2026-10-01 弃用。
- 建议 `package.json` 增加 `"engines": { "node": "22.x" }`（与本地一致、再稳定一个 LTS 周期），或在 Dashboard 固定 Node.js Version。

### P1-11 `npm install` vs `npm ci` 的后果
- Vercel 自动选择安装命令；有 lockfile 时 `npm install` 也能装出锁版本，但只要 `package.json` 与 lock 出现任何漂移（例如有人手改 ranges 未更新 lock），`npm install` 会**静默升级/改写**依赖树且不报错 → 构建不可复现。
- 建议显式 `"installCommand": "npm ci"`：lock 同步（已确认 17 个顶层包一致）且 Linux 可选依赖齐全（已确认），`npm ci` 可用，且能在漂移时**快速失败**而不是静默漂移。

### P1-12 `public/demo/face_uv_b_run.log` 会泄露本机绝对路径（取决于部署路径）
- 文件内容含 Windows 绝对路径：`public/demo/face_uv_b_run.log:13` → `outputs: D:\workspace\SILLAGE\extended\_uv_b\face_uv_metrics.json …`，另含 OpenCV `cv::dnn` 警告。
- CLI 部署下被 `.vercelignore:7` 的 `*.log` 排除 → 不会进入 `dist/`（`public/` 被 Vite 原样复制的行为因此也被间接规避），**当前 CLI 路径安全**。
- 但如果改用 Git 集成部署：`.gitignore` **没有** `*.log`（`.gitignore:1-5`），一旦该日志被提交，它会被 Vite 复制到 `dist/demo/face_uv_b_run.log` 并公开可读。建议 `.gitignore` 补 `*.log`（或直接删除该文件，仓库内无任何代码引用它）。

### P1-13 未引用的静态资源与首屏视频开销（非阻断）
- `public/licenses/Cormorant-Garamond-OFL.txt`、`public/licenses/DM-Sans-OFL.txt`（共 9,006 B）：**应用代码 0 引用**（仅 `design/DESIGN_SYSTEM.md:27` 提及）。无害，若要有“开源许可”入口需另加链接。
- 首屏即拉全量视频：`LiveVisionModule.tsx:154` `<video … preload="auto" muted autoPlay loop>`，默认 A 片 9.89 MB；切 A/B 再拉 2.15 MB。叠加 `three.js`（`vite.config.ts:8` 单独 chunk `scene-engine`）与两份 timeline JSON（108 KB + 48 KB，`videoAnalytics.ts:55-58`）。建议 `preload="metadata"` + 展开（`expanded`）后再挂载/播放，可把首屏流量从 ~12 MB 降到 ~0.1 MB。

### P1-14 本地无法完成构建验证（环境限制，非项目缺陷）
- `deploy/tmp/build.log`、`deploy/tmp/exp1.log` 记录：`tsc -b` 通过，随后 `vite build` 在加载 `vite.config.ts` 时 `Error: spawn EPERM`（`esbuild` 子进程/`vite` 的 `optimizeSafeRealPathSync` 被 DSH 沙箱禁止 spawn）。这是本会话沙箱限制，**与 Vercel Linux 构建无关**；因此本报告的 `dist/` 内容结论来自静态分析（`public/` 复制语义 + `vite.config.ts` 未开 sourcemap）。
- 上线前建议在普通终端跑一次 `npm run build`，确认 `dist/` 结构与本文预测一致。

---

## 四、可直接粘贴的配置片段

### 4.1 `.vercelignore`（推荐完整替换）

```gitignore
# --- 依赖/产物：不上传 ---
/node_modules/
/dist/
/.vercel/
*.tsbuildinfo
*.log

# --- 只用于本地评审/取证的大型目录（必须带根锚，否则会误伤 src/design） ---
/design/
/evidence/
/extended/
/tasks/
/scripts/models/

# --- 本地工具与报告 ---
/deploy/
/qa-output/
```

> 效果：上传从 5,268 文件 / 599.37 MB 降到约 **45 文件 / 13.1 MB**（`public` 11.76 MB + `src` 0.13 MB + `docs` 0.91 MB + 根配置/锁文件），远离 Hobby 100 MB / 15,000 文件限制。

### 4.2 `vercel.json`（推荐完整替换）

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "installCommand": "npm ci",
  "outputDirectory": "dist",
  "trailingSlash": false,
  "rewrites": [
    { "source": "/live", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/demo/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=86400, stale-while-revalidate=604800" }
      ]
    },
    {
      "source": "/brand/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=604800" }
      ]
    },
    {
      "source": "/favicon.svg",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=86400" }
      ]
    }
  ]
}
```

> 若只想做最小修复，保留现有 `vercel.json` 也可以（`framework`/`buildCommand`/`outputDirectory` 都正确）；`trailingSlash` 与 `headers` 属体验/性能优化。`installCommand: "npm ci"` 若不想引入风险可去掉（默认安装也能成功）。

### 4.3 `package.json` 片段

```json
{
  "name": "lavish-retail-intelligence",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": "22.x" }
}
```

> 同时建议把 `playwright` 的浏览器下载风险写成环境变量兜底（项目设置 → Environment Variables，仅 Build 环境）：`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`。1.58.2 当前无 install 脚本，此行纯属对未来升级的保险。

### 4.4 部署命令建议

```bash
# 首选：CLI 直接部署（本目录无 .git）
vercel --prod

# 需要本地验证产物时（普通终端，勿在受限沙箱内）
npm run build && ls -R dist | head -50
```

---

## 五、逐项核查证据

### 5.1 Linux 大小写敏感：根路径资源 URL ↔ `public/` 实际文件名（**全部一致，0 处错配**）

用脚本把 `src/**` + `index.html` 中所有 `/xxx/…` 字符串字面量提取出来，并按**逐段精确大小写**比对 `public/` 下的真实目录项：

| URL 字面量 | 出处 | `public/` 实际路径 | 结果 |
|---|---|---|---|
| `/brand/lavish-app-icon.png` | `src/App.tsx:33`（`<img src>` 在 `:122`） | `public/brand/lavish-app-icon.png` | ✅ |
| `/demo/lavish-mall.mp4` | `src/data/videos.ts:16` | `public/demo/lavish-mall.mp4` | ✅ |
| `/demo/face_uv_timeline.json` | `src/data/videos.ts:17`、`src/modules/vision/videoAnalytics.ts:55` | `public/demo/face_uv_timeline.json` | ✅ |
| `/demo/face_uv_metrics.json` | `src/data/videos.ts:18`、`videoAnalytics.ts:55` | `public/demo/face_uv_metrics.json` | ✅ |
| `/demo/lavish-mall-b.mp4` | `src/data/videos.ts:26` | `public/demo/lavish-mall-b.mp4` | ✅ |
| `/demo/face_uv_b_timeline.json` | `src/data/videos.ts:27` | `public/demo/face_uv_b_timeline.json` | ✅ |
| `/demo/face_uv_b_metrics.json` | `src/data/videos.ts:28` | `public/demo/face_uv_b_metrics.json` | ✅ |
| `/favicon.svg` | `index.html:9` | `public/favicon.svg` | ✅ |
| `/live` | `src/main.tsx:12` | 非文件（靠 `vercel.json:5-7` rewrite） | ✅ 路由 |
| `/src/main.tsx` | `index.html:11` | dev-only，Vite 构建时替换 | ✅ 不参与线上 |

- **无任何 `/assets/` 字面量**（hash 资源由 Vite 生成，运行时从构建后的 index.html 注入）。
- `public/` 下另有两个未被引用的 `licenses/Cormorant-Garamond-OFL.txt`、`licenses/DM-Sans-OFL.txt`（大小写无需匹配，因为没有 URL 指向）。
- 结论：**大小写敏感不构成风险**，Linux 与 Windows 行为一致。

### 5.2 import 的静态资源与 CSS `url()`
- 相对 import 的**精确大小写**全量校验：17 处相对 import 全部命中真实文件名（逐段 `readdir` 精确匹配），含 `./App`、`./data/overview`、`./modules/overview/TrafficChart`、`./modules/vision/LiveVisionModule`、`./design/tokens.css`、`./domain/replay`、`./modules/vision/VideoOverlay` 等。
- `@fontsource` 的 5 个 CSS 入口全部存在且大小写精确：`src/main.tsx:3-7` → `node_modules/@fontsource/{cormorant-garamond,dm-sans}/{latin-400,latin-500,latin-600}.css`（实测 `Test-Path` 均 True）。
- CSS `url()`：全仓库仅 `@fontsource` 内部有 `url(./files/*.woff2)`（相对路径，由 Vite 打包重写），**`src/` 下自写 CSS 无 `url()`**（grep `url(` 仅命中 `src/design/tokens.css:1` 的 `@import 'tailwindcss'`）。
- 字体不会走 CDN：`@fontsource` 的 woff2/woff 被打进 `dist/assets/`（dm-sans 36 个 woff2 / 0.38 MB，cormorant 50 个 / 0.73 MB，实际只打包被引用的 latin 子集）。
- 运行时**无外链**：`src` 中 grep `https?://` = 0 命中；`process.env` / `import.meta.env` / `VITE_*` = 0 命中；无 `axios/WebSocket/XMLHttpRequest`。唯一网络动作是 `videoAnalytics.ts:57-58` 对自身 `public/` JSON 的两次 `fetch()`，URL 均为根路径绝对地址。

### 5.3 硬编码路径 / 本机地址
- `src/**` 中 `localhost`、`127.0.0.1`、盘符（`C:\`/`D:\`）、反斜杠路径：**0 命中**。
- 反例仅存在于非运行时代码：
  - `package.json:7,9` `vite --host 127.0.0.1` / `vite preview --host 127.0.0.1`（仅本地脚本，不参与 Vercel 构建）。
  - `public/demo/face_uv_b_run.log:13` 的 `D:\workspace\SILLAGE\extended\…`（见 P1-12）。
  - `src/styles.css:43` 的 `extended/…html`（在 `/* */` 注释内）。
  - `deploy/tmp/*.log`（本地日志，`*.log` 已排除）。

### 5.4 `.vercelignore` 覆盖度与语义
- 现有 7 行（`.vercelignore:1-7`）：`scripts/models/`、`evidence/`、`extended/`、`tasks/`、`design/`、`node_modules/`、`*.log`。
- 覆盖正确的部分：`node_modules/`（Vercel 默认也忽略，双保险）、`*.log`（含 `public/demo/face_uv_b_run.log` 与 `deploy/tmp/*.log`，pattern 无 `/` → 任意层级生效）、四个大目录 + `scripts/models/` 共 **324 MB** 得以排除。
- 遗漏与过宽：`dist/`（P1-1）、`*.tsbuildinfo`（P1-2）、`qa-output/`、`deploy/`（P1-3）、`design/` 过宽误伤 `src/design/`（**P0-1**）。
- 语义确认：`.vercelignore` 只影响上传，不替代 `.gitignore`（文档原句 “works similarly to a `.gitignore` file, but it is specific to Vercel”）；本目录无 `.git`，因此**别指望 `.gitignore` 保护上传**。
- 被忽略目录无构建引用：见 P1-4 的 grep 结论表。

### 5.5 `vercel.json` 语义
| 字段 | 现值 | 判断 |
|---|---|---|
| `framework` | `"vite"`（`vercel.json:2`） | ✅ 合法 slug（Vite 在官方 Framework Preset 列表内） |
| `buildCommand` | `"npm run build"`（`:3`） | ✅ 与 `package.json:8` 一致，`tsc -b && vite build` |
| `outputDirectory` | `"dist"`（`:4`） | ✅ 与 Vite 默认输出一致 |
| `rewrites` | `/live → /index.html`（`:5-7`） | ✅ 语义正确（`source` 区分大小写、精确匹配；深链唯一）；⚠ 缺 `trailingSlash:false` 致 `/live/` 404（P1-5） |
| `headers` | 无 | ⚠ 建议补（P1-6），非阻断 |
| `cleanUrls` | 未设置 | ✅ 无需（无 `.html` 深链） |
- `tsc -b` 在 Linux 的可靠性：`tsconfig.json:5` `noEmit: true`、`:9` `include: ["src","vite.config.ts"]`、无 `references`/`composite`。TS 5.9.3 的 build 模式允许非 composite 根项目并只写 `tsconfig.tsbuildinfo`（本仓库已被上一轮构建写入，458 B），本地 `deploy/tmp/build.log` 显示 `tsc -b` **已通过**才进入 `vite build`。Linux 上没有大小写问题（见 5.1/5.2），且陈旧 buildinfo 只会触发重建（P1-2），**`tsc -b` 可移植**。
- `dist` 是否会带出 `tsbuildinfo` 或源码 map：
  - `vite.config.ts:5-8` 未设置 `build.sourcemap` → Vite 默认 `false` → **dist 内无 `.map`**；`vite.config.ts:8` 仅做 `manualChunks`。
  - `tsc` 是 `noEmit` → 不产出 JS/`.d.ts`/`.map`；`.tsbuildinfo` 写在项目根（不在 `dist/`）。
  - 因此 `dist/` 只会有：`index.html` + `assets/*`（hash JS/CSS/字体）+ `favicon.svg` + `brand/` + `demo/*.mp4` + `demo/*.json`。⚠ 唯一脏点是 `public/demo/face_uv_b_run.log`（若上传路径不排除，见 P1-12）。

### 5.6 运行时外部依赖 / 资源路径 / 体积
- 无后端：`src` 中无 `fetch` 到外部域名、无 API 路径（只有 `/demo/*.json` 两个自身资源），无环境变量读取 → **纯静态**，Vercel Static/`@vercel/static` 形态下不需要任何 Function、不需要配置 env。
- 资源全部根路径绝对地址（见 5.1 表），因此 `/live`（rewrite 后浏览器 pathname 仍是 `/live`，`main.tsx:12` 立即 `replaceState` 到 `/`）与任意挂载路径下资源都能正确加载；不存在相对路径在深层路径下 404 的问题。
- 部署体积：`public` 11.76 MB（`lavish-mall.mp4` 9.89 MB + `lavish-mall-b.mp4` 2.15 MB 占 96%）+ `assets`（three chunk + React + CSS + 字体子集，预计 1–2 MB）≈ **12.5–13.5 MB**。对比 Hobby 静态上传限制 100 MB / 单次 15,000 文件 → **余量充足**（约 13%）。mp4 单文件 9.89 MB 远小于任何单文件阈值；Vercel 对静态 mp4 无转码/分片特殊处理，就是按 `video/mp4` 直出 + Range。

### 5.7 其他运行时/构建环境兼容性
- `@tailwindcss/vite@4.3.3` + `tailwindcss@4.3.3`（满足 `package.json:23,30` 的 `^4.1.14`）：v4 依赖原生二进制 `@tailwindcss/oxide` 与 `lightningcss`，lock 内含 `linux-x64-gnu`/`linux-x64-musl` 等**全平台可选依赖**（实测列出 13 个 `@tailwindcss/oxide*`、12 个 `lightningcss*` 条目，含 linux-x64-gnu）→ Linux 构建镜像可正常安装与运行，不依赖本地 Windows 二进制。`source(none)` + `@source '../../src'`（`tokens.css:1-3`）使扫描范围固定为 `src`，Linux 路径分隔符差异不影响。
- `@fontsource`：纯 CSS + woff2，无平台依赖，无 postinstall。
- `playwright@1.58.2`：无 install 脚本（见 P1-9），`playwright-core` 8.88 MB 纯 JS。
- `lucide-react@0.468.0`、`react@19.3.1`、`three@0.180.0`：lock 与安装一致，无平台相关产物。
- `npm ls --depth=0` 显示 17 个顶层依赖全部就绪；`npm install`/`npm ci` 不会因 workspace/peer 冲突失败。

---

## 六、上线后验证清单（预览环境跑一遍即可，约 1 分钟）

```bash
BASE=https://<your-deployment>.vercel.app

# 1) 首页与 /live 深链
curl -s -o /dev/null -w '%{http_code}\n' $BASE/            # 200
curl -sI $BASE/live        | head -5                        # 200, content-type: text/html
curl -sI $BASE/live/       | head -3                        # 期望 308 → /live（加了 trailingSlash:false 后）

# 2) mp4：MIME + Range（关键验证）
curl -sI $BASE/demo/lavish-mall.mp4 | grep -iE 'content-type|accept-ranges|cache-control|content-length'
# 期望：content-type: video/mp4；accept-ranges: bytes；cache-control: public, max-age=86400...
curl -s -D - -o /dev/null -H 'Range: bytes=0-1023' $BASE/demo/lavish-mall.mp4 | head -8
# 期望：206 Partial Content + content-range: bytes 0-1023/<size>；若返回 200 则为全量下发（见 P1-7，不阻断播放）

# 3) JSON 资源与 hash 资源缓存
curl -s $BASE/demo/face_uv_metrics.json | head -c 120; echo
ASSET=$(curl -s $BASE/ | grep -o '/assets/[^"]*\.js' | head -1)
curl -sI "$BASE$ASSET" | grep -iE 'cache-control|content-type'
# 期望：public, max-age=31536000, immutable

# 4) 确认被忽略目录没有泄露到线上
curl -s -o /dev/null -w '%{http_code}\n' $BASE/design/DESIGN_SYSTEM.md   # 期望 404
curl -s -o /dev/null -w '%{http_code}\n' $BASE/demo/face_uv_b_run.log   # 期望 404
curl -s -o /dev/null -w '%{http_code}\n' $BASE/tasks/                    # 期望 404
```

---

## 七、审计边界（未验证项，如实标注）

1. **未能执行真实 Linux 构建**：本会话为 Windows + DSH 沙箱，`vite build` 因 `spawn EPERM`（esbuild/realpath 子进程受限）失败（`deploy/tmp/build.log`、`deploy/tmp/exp1.log`）。`tsc -b` 已实测通过、`tsc -b --dry` 可正常给出重建计划；`vite build` 的 Linux 行为依据配置静态分析（无平台相关代码、lock 含 Linux 二进制）。
2. **`dist/` 实际内容未观测**：审计时 `dist/` 不存在（另一名队友负责构建）。第 5.5 节结论来自 `vite.config.ts` 与 Vite 默认行为，请在正常终端构建后复核 `dist/demo/` 下是否混入 `.log`。
3. **`Range`/`Content-Type`/默认缓存响应头未对真实部署抓包**：依据 Vercel 文档（默认 `cache-control: public, max-age=0, must-revalidate`、哈希资源需手动加 immutable）与静态产物直出模型推断，故列入第六节验证清单。
4. **Git 集成部署下 `.vercelignore` 的作用范围**：文档措辞为「exclude files from deployments」，但本目录无 `.git`，无法实测；P0-1 的修复对两种路径都正确，无需区分。
5. **`.vercelignore` 的 pattern 语义**依据 Vercel 官方文档（"similar to .gitignore"）+ `@vercel/client` 当前源码（`ignore` 包）+ gitignore 规范推导；本机未安装 `ignore` 包，未做本地可执行复现。

---

*报告生成：只读审计，未修改任何源码/配置；唯一写入文件为本报告。*
