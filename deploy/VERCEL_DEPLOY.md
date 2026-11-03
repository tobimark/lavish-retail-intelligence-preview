# SILLAGE → Vercel 部署运行手册

> 本文件是本次部署的可执行记录。结论：**本地构建与运行验证全部 PASS，仓库已就绪，只差 GitHub 推送 + Vercel 导入两步。**

## 一、当前状态（已验证）

| 项 | 结果 | 证据 |
|---|---|---|
| `npm run build`（`tsc -b && vite build`） | **PASS**，EXIT=0，vite 2.5s / 1591 modules | `deploy/build-verification.md` |
| `dist/` 产物 | 25 文件 / 12,854,560 B（12.26 MB），无 `.map` / `.tsbuildinfo` / `.tsx` 混入 | 同上 |
| HTTP 资源（preview 4173） | **24/24 PASS**，响应 sha256 与磁盘一致 | 同上 §5 |
| 视频 Range | 两个 mp4 `Range: bytes=0-1023` → **206** + `content-range` 正确 | 同上 §5.1 |
| 浏览器渲染（Playwright 1440×900） | **PASS**：首屏 8 个关键文案全部渲染，`0 console error / 0 pageerror / 0 失败请求` | `deploy/tmp/playwright-results.json`、`deploy/tmp/preview-home-1440x900.png` |
| 本地 git 仓库 | `main` 分支，1 个提交，61 个文件 / 13.14 MB | `git log --oneline` |

## 二、本次为部署做的关键修复

| # | 文件 | 改动 | 原因 |
|---|---|---|---|
| 1 | `.vercelignore` | `design/` → **`/design/`**，其余大目录也全部加根锚 | **P0**：无根锚的 `design/` 会按 gitignore 语义连带排除 `src/design/`，导致 Tailwind 入口 `src/design/tokens.css` 不上传，Vercel 构建必失败 |
| 2 | `.vercelignore` | 新增 `/dist/`、`*.tsbuildinfo`、`/qa-output/`、`/deploy/`、`/.tools/`、`/.npm-cache/` | 上传体积 599 MB → 约 13 MB；避免陈旧增量状态 |
| 3 | `vercel.json` | 新增 `trailingSlash: false`、`/assets` 与 `/demo` 缓存头 | `/live/` 不再 404；哈希资源长缓存 |
| 4 | `package.json` | 新增 `"engines": { "node": "22.x" }` | 锁定 Vercel 构建 Node 版本（与本地验证环境一致） |
| 5 | `.gitignore` | 排除 `node_modules/`、`dist/`、`evidence/`、`extended/`、`tasks/`、`scripts/models/`、`*.log`、`*.tsbuildinfo` | 280 MB 离线取证/模型权重不进 GitHub；`*.log` 防止 `face_uv_b_run.log` 泄露本地路径 |

## 三、第 1 步：在 GitHub 创建空仓库

1. 打开 <https://github.com/new>
2. **Repository name**：`lavish-retail-intelligence-preview`
3. **Visibility**：Private（演示素材不公开；要 public 可自行改）
4. **不要**勾选 `Add a README file`、`.gitignore`、`license`（保持空仓库）
5. 创建后把仓库 URL 发给部署执行方

## 四、第 2 步：推送代码

```powershell
cd D:\workspace\SILLAGE
git remote add origin https://github.com/<你的用户名>/lavish-retail-intelligence-preview.git
git push -u origin main
```

> 首次推送会弹出 Git Credential Manager 的 GitHub 登录窗口，授权一次即可。

## 五、第 3 步：Vercel 导入（GitHub 集成）

1. 打开 <https://vercel.com/new> → **Import Git Repository**
2. 若列表没有该仓库：点 **Adjust GitHub App Permissions** / **Add GitHub Account**，授权该私有仓库
3. 选择 `lavish-retail-intelligence-preview`，配置如下：

| 设置项 | 值 |
|---|---|
| Project Name | `lavish-retail-intelligence-preview` |
| Framework Preset | **Vite**（自动识别） |
| Root Directory | `./`（默认） |
| Build Command | `npm run build`（来自 `vercel.json`，可留空用默认） |
| Output Directory | `dist` |
| Install Command | 默认 `npm install`（**不要**加 `--only=production`，vite/typescript/tailwind 都在 devDependencies） |
| Node.js Version | **22.x**（`package.json` 的 `engines` 已锁定） |
| Environment Variables | **无**（纯静态，无后端/无密钥） |

4. 点 **Deploy**，首次构建约 1–2 分钟。

## 六、第 4 步：上线后验证（约 1 分钟）

```bash
BASE=https://<你的部署域名>.vercel.app

curl -s -o /dev/null -w 'home %{http_code}\n' $BASE/                     # 200
curl -s -o /dev/null -w 'live %{http_code}\n' $BASE/live                 # 200
curl -s -o /dev/null -w 'live/ %{http_code}\n' $BASE/live/               # 308 → /live

curl -sI $BASE/demo/lavish-mall.mp4 | grep -iE 'content-type|accept-ranges|cache-control'
# 期望 content-type: video/mp4；accept-ranges: bytes；cache-control: public, max-age=86400...

curl -s -D - -o /dev/null -H 'Range: bytes=0-1023' $BASE/demo/lavish-mall.mp4 | head -8
# 期望 206 Partial Content + content-range: bytes 0-1023/9891110

curl -s $BASE/demo/face_uv_metrics.json | head -c 80                   # 合法 JSON
curl -s -o /dev/null -w 'log %{http_code}\n' $BASE/demo/face_uv_b_run.log   # 404（未部署）
```

浏览器打开首页，确认：Store Overview、4 张 KPI、趋势图、Live Vision 视频可播放、A/B 数据集切换、`/live` 深链可打开。

## 七、后续更新

```powershell
git add -A
git commit -m "feat: ..."
git push
```

Vercel 会自动触发新的生产构建；PR/分支推送会生成 Preview Deployment。

## 八、注意事项 / 已知项

- **不要去掉 `.vercelignore` 里的根锚点 `/`**：`design/`、`tasks/` 这类写法会在任意层级匹配，可能误伤 `src/` 下同名目录。
- 本地保留但**不进仓库**：`evidence/`（44 MB）、`extended/`（101 MB）、`tasks/`（135 MB）、`scripts/models/`（37 MB ONNX 权重）。它们只用于离线取证与模型重跑，不参与构建/运行；如需版本化，建议单独归档仓库 + Git LFS。
- `public/demo/face_uv_b_run.log`（687 B）含本机绝对路径，已被 `.gitignore`/`.vercelignore` 的 `*.log` 排除，不会上线；可择机删除。
- 首屏 `preload="auto"` 会立即拉取 9.9 MB 的 A 片视频（`LiveVisionModule.tsx:154`）。不影响功能，若要优化首屏流量可改为 `preload="metadata"` + 展开后再加载。
- `vite.config.ts` 的 `manualChunks` 会生成 1 B 的空 `scene-engine` chunk（`three` 当前未被实际引用），属无害警告。
- Vercel Hobby 静态上传限制 100 MB / 15,000 文件；本部署约 13 MB，余量充足。
