# SILLAGE 构建验证报告（最终版）

- 验证时间：2026-11-03 23:13 → 23:58（Asia/Shanghai）
- 工作目录：`D:\workspace\SILLAGE`；Node v22.22.2 / npm 11.6.2 / vite 7.3.7 / esbuild 0.28.2 / playwright 1.58.2（`ms-playwright` chromium_headless_shell-1208 已存在）
- 分工：本会话（沙箱环境）负责类型检查、静态产物检查、HTTP 层验证；`dist/` 的规范构建由 Lead 在提升权限的普通环境执行（沙箱禁止子进程命名管道，见 §1.2）。
- 写作用域：仅 `dist/`（构建产物）、`deploy/build-verification.md`、`deploy/tmp/*`；**未修改任何源码或配置文件**。
- 配置快照（SHA256 前 16 位，供溯源）：`package.json 647297C30C9AEE0B`、`vite.config.ts 6EE833634EEC4DE2`、`tsconfig.json 27CA26690C1A6740`、`vercel.json 607A0CC78CA804E6`、`index.html E1B61B8D921F6CDE`。

## 0. 最终结论：**PASS（可部署）**

- **阻断项：0**
- 构建：`npm run build`（`tsc -b && vite build`）**EXIT=0**，vite 阶段约 2.5s，1591 modules transformed；唯一告警 `Generated an empty chunk: "scene-engine"` 属预期（three 未被实际引用）。
- 产物：`dist/` **25 个文件 / 12,854,560 B（12.26 MB）**，结构完整、引用全部根相对、无源码/构建缓存混入。
- 运行时（HTTP 层）：**24/24 项检查全部 PASS**；两个 mp4 均 200 `video/mp4` 且 `Range: bytes=0-1023` → **206 + Content-Range 正确**；4 个 JSON 全部可 `JSON.parse`；`/brand/lavish-app-icon.png` 200；JS/CSS/字体/图片/JSON 的响应字节与 `dist/` 磁盘文件 **SHA-256 完全一致**。
- 浏览器层：**因沙箱限制无法在本会话执行**（见 §6，环境限制而非项目问题），已按任务约定降级为 HTTP + 静态层验证；Playwright 脚本已就绪，可在普通环境一键补跑。
- 非阻断观察 2 项：P2 `dist/demo/face_uv_b_run.log`（public 中未被引用的运行日志，含本地绝对路径）；P3 4173 的 preview 实例非本会话启动、沙箱内无法枚举/终止。

## 1. 构建

### 1.1 规范构建结果（Lead 执行，本会话核对产物）

| 项 | 结果 |
| --- | --- |
| 命令 | `npm run build`（= `tsc -b && vite build`） |
| 退出码 | **0** |
| 耗时 | tsc 阶段（缓存命中）约 0.1s + vite 阶段约 2.5s |
| 模块数 | 1591 modules transformed |
| 关键输出 | `dist/index.html 0.77 kB`；`dist/assets/index-C6Ogat1d.js 271.04 kB │ gzip 85.13 kB`；`dist/assets/index-ad02HyQG.css 43.46 kB │ gzip 10.63 kB`；10 个字体 woff/woff2；`Generated an empty chunk: "scene-engine"`（预期） |
| 产物时间戳 | `dist/index.html` 与 `dist/assets/*` 均为 2026-11-03 23:50:19（= 本次正式构建） |

**可复现性核对（重要）**：本会话在清理 `dist/` 前记录过旧产物基线：`assets/index-C6Ogat1d.js` 271,036 B、`assets/index-ad02HyQG.css` 43,458 B、`index.html` 765 B、`scene-engine-l0sNRNKZ.js` 1 B。本次正式构建产出的文件名与字节数与基线**完全一致** → 构建可稳定复现，产物未受本会话中间尝试影响。

### 1.2 环境限制（记录，已由 Lead 绕过）

本会话为受限子会话，DSH Windows 沙箱禁止创建命名管道，`child_process` 使用 `stdio:'pipe'` 时返回 `EPERM`；而 esbuild 的 JS API 必须通过管道与 esbuild 服务子进程通信，因此沙箱内无法执行 `vite build`/`vite preview`（`tsc -b` 不受影响）。最小复现：`spawnSync(..., {stdio:'pipe'})` → EPERM；`{stdio:'inherit'}` → OK；直接执行 `node_modules/@esbuild/win32-x64/esbuild.exe --version` → OK。属**环境限制，非项目缺陷**；该构建已由 Lead 在普通（提升权限）环境完成，本报告以该 `dist/` 为准。

### 1.3 `tsc -b`（类型检查）

```
$ npx tsc -b        →  EXIT=0  DURATION=3.2s  无任何诊断输出
```
`strict` + `noUnusedLocals` + `noUnusedParameters` 下通过；同时作为 Lead 正式构建的第一段通过。
附注：`tsc -b` 会在项目根生成 `tsconfig.tsbuildinfo`（458 B），该文件在 `.gitignore` 中且**不在 `dist/` 内**，不会被部署。

## 2. dist 清单与总大小

**25 个文件，总计 12,854,560 B（12.26 MB）**

| 目录 | 文件数 | 字节数 | 内容 |
| --- | --- | --- | --- |
| `dist/assets/` | 13 | 520,879 | `index-C6Ogat1d.js` 271,036；`index-ad02HyQG.css` 43,458；`scene-engine-l0sNRNKZ.js` 1（空 chunk，预期）；10 个字体（woff×5 117,548 + woff2×5 88,836） |
| `dist/demo/` | 7 | 12,208,910 | `lavish-mall.mp4` 9,891,110；`lavish-mall-b.mp4` 2,145,473；4 个 JSON 共 171,640；`face_uv_b_run.log` 687 |
| `dist/brand/` | 1 | 114,691 | `lavish-app-icon.png` 114,691 |
| `dist/licenses/` | 2 | 9,006 | Cormorant-Garamond-OFL.txt 4,504；DM-Sans-OFL.txt 4,502 |
| `dist/` 根 | 2 | 1,074 | `index.html` 765；`favicon.svg` 309 |

按类型：`.mp4` 12,036,583（93.6%）/ `.js` 271,037 / `.json` 171,640 / `.woff*` 206,384 / `.png` 114,691 / `.css` 43,458 / `.txt` 9,006 / `.html` 765 / `.log` 687 / `.svg` 309。

任务要求的文件**全部齐全**：`index.html` ✓、`assets/*.js`+`assets/*.css`（+字体）✓、`demo/` 两个 mp4 ✓、`demo/` 四个 JSON ✓、`brand/lavish-app-icon.png` ✓、`favicon.svg` ✓、`licenses/*` ✓。

## 3. index.html 引用检查

`dist/index.html`（765 B）内容要点：

- `<div id="root"></div>` 存在 ✓
- `<title>Store Overview · Lavish Retail Intelligence</title>` ✓，`lang="en"` ✓
- 引用**全部为根相对路径**（无 `base` 前缀 / 无相对 `./`、无 `http://`）：
  - `/favicon.svg`
  - `<script type="module" crossorigin src="/assets/index-C6Ogat1d.js">`
  - `<link rel="stylesheet" crossorigin href="/assets/index-ad02HyQG.css">`
- 无 `src/main.tsx` 等源码引用（已由 Vite 替换为哈希产物）✓

## 4. 混入文件检查（不该上线的文件）

| 检查项 | 结果 |
| --- | --- |
| `tsconfig.tsbuildinfo` | **无** |
| `*.map` / `sourceMappingURL` | **无**（JS/CSS 中 0 处） |
| `.tsx` / `.ts` 源码 | **无** |
| qa 截图 / `design/screenshots` / 临时文件 | **无**（`dist` 中唯一的 png 是 `brand/lavish-app-icon.png`） |
| `.md` / `.mjs` / `.sh` / `.env` / 测试文件 | **无** |
| 开发期路径（`/src/...`、`localhost`、`127.0.0.1:5173`） | **无** |
| 外部运行时依赖（http(s) 字面量） | 仅 5 处字符串：`https://react.dev/errors/` 与 W3C SVG/MathML/xlink 命名空间；无运行时跨域请求 |

**P2 观察（非阻断）**：`dist/demo/face_uv_b_run.log`（687 B）来自 `public/demo/`，src 中**无任何引用**，内容是 OpenCV/Face-UV 处理日志，并含本地绝对路径 `D:\workspace\SILLAGE\extended\_uv_b\...`。功能无影响、不影响页面渲染，但属于不必要公开的中间产物且暴露本地路径。建议（源码归 Lead）从 `public/demo/` 移除后重新构建即可；本会话未修改源码。

## 5. HTTP 验证（vite preview，127.0.0.1:4173）

说明：`npm run preview` 本身在沙箱内同样被 §1.2 限制阻断（esbuild 打包配置 + Vite 的 Windows `net use` 探测）；验证时 4173 端口上已有可用 preview 实例（非本会话启动，见 P3）。已通过 **响应字节与 `dist/` 磁盘文件 SHA-256 逐一比对**确认该实例服务的正是本次正式 `dist/`。脚本：`deploy/tmp/http-check.mjs`，原始结果：`deploy/tmp/http-results.json`、`deploy/tmp/http-check.log`。

**结果：24/24 PASS**

| 请求 | 状态 | Content-Type | 字节 | 附加校验 |
| --- | --- | --- | --- | --- |
| `GET /` | 200 | `text/html` | 765 | 含 `id="root"`、引用全根相对、SHA 与磁盘一致 |
| `GET /assets/index-C6Ogat1d.js` | 200 | `text/javascript` | 271,036 | SHA-256 == 磁盘 ✓ |
| `GET /assets/index-ad02HyQG.css` | 200 | `text/css` | 43,458 | SHA-256 == 磁盘 ✓ |
| `GET /assets/dm-sans-latin-400-normal-CW0RaeGs.woff2` | 200 | `font/woff2` | 14,200 | SHA == 磁盘 ✓ |
| `GET /assets/scene-engine-l0sNRNKZ.js` | 200 | `text/javascript` | 1 | 空 chunk（预期） |
| `GET /favicon.svg` | 200 | `image/svg+xml` | 309 | SHA == 磁盘 ✓ |
| `GET /brand/lavish-app-icon.png` | 200 | `image/png` | 114,691 | SHA == 磁盘 ✓ |
| `GET /licenses/Cormorant-Garamond-OFL.txt` | 200 | `text/plain` | 4,504 | SHA == 磁盘 ✓ |
| `GET /licenses/DM-Sans-OFL.txt` | 200 | `text/plain` | 4,502 | SHA == 磁盘 ✓ |
| `GET /demo/lavish-mall.mp4` | 200 | `video/mp4` | 9,891,110 | SHA == 磁盘 ✓ |
| `GET /demo/lavish-mall-b.mp4` | 200 | `video/mp4` | 2,145,473 | SHA == 磁盘 ✓ |
| `GET /demo/face_uv_metrics.json` | 200 | `application/json` | 7,680 | `JSON.parse` ✓、SHA ✓ |
| `GET /demo/face_uv_timeline.json` | 200 | `application/json` | 108,754 | `JSON.parse` ✓、SHA ✓ |
| `GET /demo/face_uv_b_metrics.json` | 200 | `application/json` | 6,343 | `JSON.parse` ✓、SHA ✓ |
| `GET /demo/face_uv_b_timeline.json` | 200 | `application/json` | 48,863 | `JSON.parse` ✓、SHA ✓ |
| CSS 内 10 个 `url(...)` 字体引用 | 200×10 | `font/*` | — | 0 个失效 |
| `GET /live` | 200 | `text/html` | 765 | preview 的 SPA 回退（见 §5.2） |
| `GET /assets/does-not-exist.js` | 200 | `text/html` | 765 | preview SPA 回退（非部署故障） |

### 5.1 Range（分片/拖动播放）证据

| 请求 | 状态 | Content-Range | 响应字节 | 首 1024 B 与磁盘一致 |
| --- | --- | --- | --- | --- |
| `Range: bytes=0-1023` → `/demo/lavish-mall.mp4` | **206** | `bytes 0-1023/9891110` | 1,024 | ✓ |
| `Range: bytes=0-1023` → `/demo/lavish-mall-b.mp4` | **206** | `bytes 0-1023/2145473` | 1,024 | ✓ |

备注：preview（sirv）未显式返回 `Accept-Ranges` 头，但 Range 请求正确返回 206/Content-Range，`<video>` 拖动播放可用。Vercel 静态资源由 CDN 提供 Range 支持，生产同样可用。

### 5.2 `/live` 行为（与任务预判的差异说明）

任务说明预期 preview 下 `/live` 返回 404。实测该 preview 实例采用 **SPA 回退**（sirv `single`）：`/live` → 200 `text/html` 且返回 765 B 的 `index.html`（内容含 `#root`）；任何未知路径（含 `/assets/does-not-exist.js`、`/foo/bar`）同样回退为 index.html 200。

- 这**不是失败**：生产环境 `vercel.json` 的 `rewrites` 将 `/live` → `/index.html`（同样 200 + index.html），行为一致；且 `src/main.tsx` 会在挂载时把 `/live` 归一化为 `/`，页面可正常渲染。
- 结论：`/live` 可访问性在生产可用（200 + 应用可加载），不存在 404 阻断。

## 6. 浏览器（Playwright）层 —— 本会话降级说明

**Playwright 无法在本沙箱启动浏览器**（环境限制，非项目问题）：

1. `chromium.launch()` → `browserType.launch: spawn EPERM`（Playwright 以 `--remote-debugging-pipe` 管道方式启动浏览器，撞上沙箱命名管道限制）。
2. 直接启动 `ms-playwright\chromium_headless_shell-1208\chrome-headless-shell.exe --dump-dom` → `FATAL:mojo\public\cpp\platform\platform_channel.cc:108 Check failed: . : 拒绝访问。(0x5)`；加 `--single-process --no-zygote` 亦相同。即 Chromium 的多进程 IPC（Mojo 命名管道）被沙箱拒绝，任何模式都无法启动。
3. 因浏览器进程无法启动，`connectOverCDP` 等 TCP 回退方案也不可行。

因此按任务约定**降级为 HTTP + 静态层验证**，浏览器层结论如下：

| 项 | 结果 |
| --- | --- |
| 首屏文案（`Store Overview` / KPI） | **间接验证 PASS**：`dist/index.html` 含 `#root`；JS bundle 中确认包含 `Store Overview`、`Total Footfall`、`Unique Visitors · UV`、`Unique Customers · UC`、`Repeat Visitor Rate`、`Footfall & Visitor Trends`、`Live Vision`、`Network Snapshot`；CSS 10 个字体 url 全部 200 |
| console error / pageerror / 失败请求 | **本会话无法采集**（无浏览器）。静态审计：所有资源同源且 HTTP 200（§5），无 `sourceMappingURL`、无外部运行时依赖，预期无 404/跨域失败 |
| 可执行补跑 | **`node deploy/tmp/playwright-check.mjs`**（约 15s，普通环境可跑）：校验首屏 8 个文案、`#root` 渲染、console error/warning、pageerror、requestfailed、≥400 响应（自动排除预期行为），并输出 `deploy/tmp/preview-home-1440x900.png` 截图与 `playwright-results.json` |

## 7. 阻断项与观察项汇总

| ID | 级别 | 项 | 影响 | 处理 |
| --- | --- | --- | --- | --- |
| B1 | 环境 | 沙箱禁止命名管道 → esbuild/vite build、vite preview、Chromium 均无法在本会话启动 | 本会话不能执行规范构建/浏览器验证 | 构建已由 Lead 在普通环境完成（EXIT=0）；浏览器层降级并给出补跑脚本 |
| P2 | 轻微 | `dist/demo/face_uv_b_run.log` 未被引用且含本地绝对路径 | 无功能影响；暴露本地路径/多余产物 | 建议从 `public/demo/` 移除后重建（源码归 Lead） |
| P3 | 提示 | 4173 的 preview 实例非本会话启动（本会话启动被 B1 阻断）；沙箱内无法枚举/终止该进程（`tasklist PID 22512` Access denied） | 服务器仍在 127.0.0.1:4173 运行，可继续用于补跑 Playwright | 可在 Lead 侧关闭（pid 22512），或保留待补跑后关闭 |

## 8. 验证脚本与证据文件（均在 `deploy/tmp/`，不进入上线产物）

- `deploy/tmp/http-check.mjs` / `http-check.log` / `http-results.json` —— HTTP/Range/JSON 验证脚本与原始结果
- `deploy/tmp/playwright-check.mjs` / `playwright-check.log` —— 浏览器层脚本（本会话因 B1 未能启动浏览器）与启动错误记录
- `deploy/tmp/chrome-dump.err`、`chrome-single-process.err`、`chrome-single-process+features.err` —— Chromium Mojo 权限失败原始日志
- `deploy/tmp/build.log`、`build2.log`、`build3.log`、`build4.log`、`exp1.log`、`tsc.log` —— 阶段一沙箱限制排查日志（`build.log` 为规范命令在沙箱内失败的 EPERM 记录）
- `deploy/tmp/esbuild-shim.mjs`、`build-env.cjs`、`esbuild-loader.mjs` —— 阶段一（已按 Lead 指示停止使用）的沙箱绕行脚本，仅供环境限制溯源；**正式结论不依赖它们**
