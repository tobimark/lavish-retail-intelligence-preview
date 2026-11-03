# SILLAGE VISION — 香水连锁 AI 客流摄像头系统 Demo 开发方案 V2.0

> **本文件取代 V1.0。** 原 V1.0 错误地将智能试香瓶和 AI 店长置于核心；本版以 **AI 客流摄像头 → 人员检测/追踪 → 进出店计数/有限去重 → Unique Visitor 业务中台 → 总部客流看板** 为唯一主叙事。
>
> 日期：2026-11-02；性质：面向阿联酋连锁香水品牌的可交互销售 Demo，不是可直接安装在真实门店的生产系统。名称、门店、访客、指标、视频与人物均为虚构或授权素材。

## 0. 一句话产品定义

**Luxury-grade Camera Footfall Intelligence for Fragrance Retail**：一套具有奢侈品级界面质感的门店摄像头客流分析平台，使客户直观看到入口视频如何变为进出店事件、可解释的 Unique Visitor 数据，以及总部多店经营洞察。

### 0.1 成功标准（优先级从高到低）

1. 客户打开 Demo 后 15 秒内理解：这是 **摄像头客流分析系统**，不是香水电商网站、智能试香瓶系统或普通通用 BI。
2. Live Vision 为最重要的视觉主界面：入口摄像头场景、检测标注、追踪编号、计数线、事件流、实时统计必须联动。
3. 能讲清 `Visits`（访问次数）、`Distinct Tracks in Clip`（演示片段内不同轨迹）和 `Known Unique Customers`（有授权身份关联的独立顾客）的区别；不虚构所有陌生顾客跨天跨店唯一身份识别。
4. 多店看板各统计与 Live Vision 事件源一致，能筛选门店、时间和演示场景。
5. 产品美术达到高端香氛零售企业可接受的品质，克制而统一，优先可读性与现场演示稳定性。
6. 所有核心按钮可操作，整个 5–7 分钟导览不需摄像头、后台服务、第三方 API、网络或人工随机应答。

### 0.2 明确不做（首期）

- 不接入真实门店摄像头、不声称实时完成 AI 人脸识别、不训练真实人脸识别模型；不采集或保存生物识别数据。
- 不在本 Demo 中做无同意的长期人脸跟踪、跨天跨店自然人识别。
- 不开发完整 BLE 试香瓶、POS、CRM、WhatsApp、真实大模型 Agent、视频热区模型；相关能力只在 Extensions 作为增值模块展示。
- 不做大量无效的奢侈品宣传首页。`/` 直接到 `/live`，可选品牌欢迎画面必须可跳过。
- 不用伪造的“99.9% Accuracy”或无证据的准确度、ROI 声明。

## 1. 产品定位与展示对象

**客户决策层：** 看总部多店指标、客流趋势、新客与复访业务潜力和采购价值。

**运营管理者：** 看入口真实事件、按小时流量、客流拥堵峰值、设备状态和管理行动。

**中间商/售前：** 打开浏览器即可演示；支持一键重置、一键切换故事场景、全屏及离线运行，英文界面；中英双语售前台词单列文件。

核心商业叙事：

> “门店入口摄像头识别到一位顾客进店” → “系统在视频里形成可解释的事件” → “去重规则避免同一轨迹重复计数” → “已授权会员可关联到 Known Unique / Returning Customer” → “总部看到不同门店与时间段的经营趋势” → “加购模块作为扩展”。

## 2. 信息架构：6 个核心屏 + 1 个增值展厅

默认入口：`/live`。统一左侧紧凑栏可收起；顶部统一门店、演示时间、场景切换。工作区最大化内容，不做四周一圈卡片包围视频。

| 路由 | 菜单英文名 | 中文 | 等级 | 关键作用 |
|---|---|---|---|---|
| `/live` | Live Vision | 实时视觉 | P0 主角 | 入口摄像头、轨迹、计数线、进出事件、快照指标 |
| `/command` | Command Center | 总部驾驶舱 | P0 | 全品牌客流、店铺排名、时段趋势、门店健康 |
| `/visitors` | Visitor Intelligence | 独立访客分析 | P0 | 访问口径、场景去重、授权顾客、新客/回访 |
| `/traffic` | Traffic Analytics | 客流趋势分析 | P0 | 进出量、时段、日周趋势、峰时、同比环比演示 |
| `/network` | Store Network | 多门店与设备 | P1 | 5 家虚构店、摄像头状态、出入口、门店对比 |
| `/insights` | AI Insights | 经营洞察 | P1 | 基于统一数据的可解释预设洞察与建议 |
| `/extensions` | Extensions | 香水行业增值服务 | P2 | 11 个可选模块的售前展厅，不喧宾夺主 |

### 2.1 `/live` — 主视觉与核心闭环

**布局**
- 顶栏 56–64px：SILLAGE VISION LOGO、当前位置、门店/摄像头选择、场景选择、`DEMO REPLAY` 常驻标识。
- 导航栏默认 68–76px 收起图标模式，允许展开为 210–230px。
- 视频/合成摄像头视觉区域占可用主要工作面的 **60–70%**，以 16:9 或监控视频真实比例呈现；支持沉浸式最大化。
- 右侧可收起 `Event Stream`，列表含时间、匿名 track ID、`ENTRY` / `EXIT` / `DEDUPED` 和解释标签；不得把 `Unknown Person` 伪装成身份确定的人。
- 下方尽量克制地展示 Entries、Exits、Estimated Occupancy、Camera Status、Counting Line Accuracy *未验证不可展示*。
- 播放控制：Play/Pause、0.5×/1×/2×、Step Event、Replay Reset、切换门店；键盘快捷键可选。

**画面内容**
- 演示入口相机 CAM-DXB-01；入口计数线和进出方向箭头清晰，检测框跟随画面对象；轨迹对象显示 `T-001` 而非人名。
- 人物经过计数线触发 **恰好一条** count event；同一 track 因画面抖动重复触线只记录一次（解释冷却规则）。
- 可以切换两个演示场景：`Normal Traffic`（平常日）和 `Peak Hour`（高峰）；第三个 `Repeat Entrance` 用来解释去重规则。
- 系统事件和 KPI 更新必须与回放的进度同步，不能只是点击按钮随机增加数字。
- 用专门的模式弹窗 `How Unique Works` 展示跨天/跨店的难点；已授权会员身份关联的 **模拟流程** 可以点开看，但不得作为默认匿名摄像头功能。

**视频实现方案（严格区分演示和真实识别）**
1. 首先实现一个 **Synthetic Camera Scene**（合成门店入口动态图），人物为匿名抽象轮廓，追踪框与事件轨迹来自同一份时序 fixture。这样完全离线、可重复、无版权/隐私问题。
2. 有素材时可增加 **Recorded Video Replay**：使用授权的人群/商店片段或自行拍摄的授权素材，加上**离线预先标注**的轨迹 JSON，并准确同步至视频时间轴。标识 `PRE-RECORDED DEMONSTRATION`。
3. Demo 不应制造“静态照片叠加会乱跑的检测框”的假实时检测效果。纯合成画面必须标为 `SIMULATED CAMERA SCENE`。
4. 后续真正 POC 接入摄像头，才建立 edge adapter / live inference，与 UI 数据结构兼容；不得在 Demo 里假装已经实现。

### 2.2 `/command` — 总部经营看板

第一屏：Visits、Entries、Exits、Known Unique Customers（如已授权身份演示模式开启）、Returning Known Customers、Active Cameras。所有指标有口径说明。

主体：多门店时段趋势、5 家门店排序、进出客流结构、设备状态、当日异常摘要。下方可选经营扩展，不主动推智能试香瓶。

统一筛选后所有相关图表来自同一 selector；门店卡可直接跳转 `/live?store=...`。

### 2.3 `/visitors` — Unique Visitor 业务定义

固定设置三层概念卡，防止商业承诺不清：

1. `Store Visits`：入店计数线触发的到访次数，重复到访分别记；多人入店分别计；可在摄像头区域计算。
2. `Distinct Tracks (Scene)`：同一演示片段内被追踪的不同匿名 track ID，仅对片段/摄像头观察窗口成立；不等于跨天独立自然人。
3. `Known Unique Customers`：通过合法、明确授权的会员/CRM 身份事件关联后在指定统计期内去重的 customer IDs；并展示 `Known Returning Customers` 和 `Known Return Rate`。

提供一个交互式 `Scenario Comparison`：匿名访客进入一次、短时间重复触线、已授权会员跨日返回。用户点击不同场景时，展示何时 Visits 增加、何时 Distinct Tracks 不变、何时 Known Unique 不变而 Known Visits 增加。

**严禁** 用人脸 Embedding 对未注册陌生人进行跨店持久识别演示，或以“100% Unique Customer”描述匿名摄像头数据。

### 2.4 `/traffic` — 趋势与经营分析

客流小时热力图、进店/离店对比、周客流曲线、高峰时段、平日/周末对照、短时间重入去重观察。日期筛选为 7/30/90 天；所有图表采用 UAE 时区 `Asia/Dubai`。

可以在这里体现节假日/促销情景标记，但若没有实际来源，标注为演示模拟情景，不能虚构已经接入天气或斋月日历。

### 2.5 `/network` — 门店和设备

5 家虚构示例门店：`Dubai Mall`、`Mall of the Emirates`、`Dubai Hills`、`Abu Dhabi Galleria`、`Yas Mall`（均为**虚构运营数据**，仅场所名可作为地理示例）。

门店卡包含入口数、摄像头在线/离线/延迟、今日进入量、小时峰值和健康状态；支持跳转当前摄像头页。多设备场景可以展示入口 A/B，但 Mock 首期实际回放只要求有一个完整 P0 入口。

### 2.6 `/insights` — AI 客流经营洞察

基于客流数据的预设分析：如“周五 18:00–20:00 客流峰值高于门店 4 周均值”、“某摄像头上报中断造成数据缺口”、“最近 7 天 B 店下午时段进店量走低”。给出时间范围、证据图和建议。

**禁止** 在没有 POS、排班、库存源数据时声称“转化率下降由店员不足和缺货导致”；只有接入对应数据后才可以增加此类分析。AI 可做规则驱动和模板化问答，以保证无网络可演示。

### 2.7 `/extensions` — 11 项香水行业可选模块

展示：智能试香瓶、未接待客流预警、橱窗吸引力分析、AI 店长、同意制复购提醒、气味 A/B、客流预测与排班、门店实验平台、匿名同行群体分析、AI 香水顾问、2D 动态客流回放。

- 本页仅展示卡片、业务收益、所需额外设备/数据、相较基础平台的依赖、`Concept Preview` / `Future Integration` 状态。
- 可以有少量预设交互预览，但不得为了增值模块牺牲摄像头客流的开发优先级。
- 智能试香瓶是售前增值卖点，不是核心导航、主数据源，也不进入 `/live` 首屏。
- 11 项报价仍可沿用既有商务方案，不作为开发交付承诺。

## 3. 高端视觉体系（Luxury Retail × Vision Technology）

不是香水广告页面，不是纯工业控制台，也不是泛滥黑金和霓虹赛博风。

**设计哲学**：`Quiet Luxury / Precision / Trust / Materiality / Camera First`。

| Token | HEX | 用途 |
|---|---|---|
| `--canvas` | `#141617` | 影像工作台主背景 |
| `--panel` | `#202323` | 摄像头操作面板 |
| `--panel-elevated` | `#292C2B` | 浮动侧栏 |
| `--ivory` | `#F3EFE7` | 数据报告内容底色 |
| `--paper` | `#FCFAF6` | 表格、报告卡片 |
| `--ink` | `#1F2221` | 浅色区主要文字 |
| `--muted` | `#9E9D96` | 深色区次要文字 |
| `--brass` | `#B59A6B` | 品牌/计数线重点强调，少量使用 |
| `--border-dark` | `#383C3A` | 深色面板边界 |
| `--border-light` | `#E2DDD4` | 浅色区分隔 |
| `--positive` | `#6C8D78` | 统计正常/在线状态 |
| `--warning` | `#C18C55` | 待关注 |
| `--danger` | `#B86661` | 故障/错误 |

**规范**
- `/live` 使用深色影像工作台，重视频；`/command` `/traffic` 等可用暖白报告区；统一导航和交互组件。
- 摄像头边框线/轨迹以高对比、柔和颜色表达；品牌色仅用于计数线、高价值提示；不得用五种随机荧光色。
- 产品标题可使用开源优雅衬线字体，KPI、按钮、表格和所有数值统一无衬线，数值必须使用 tabular numerals；避免细字体降低识别。
- 图片：最多用于品牌背景/门店氛围。Live Vision 的检测结果和文字比摄影装饰重要。
- 统一 8px spacing、合理对齐、统一圆角（8/12/16）、阴影克制；图表选择一致，错误/加载/空态统一。
- 动效 150–350ms；计数器可 250–500ms 平滑变化；摄像头播放优先性能稳定；兼容 `prefers-reduced-motion`。
- 1440×900 与 1920×1080 为主要验收尺寸；1280×800 不横向滚动；移动端只保证报告阅读，不要求复刻复杂摄像头工作台。
- 登录不作为 Demo 首版强制关卡。所有可点击控件功能真实或明确标记为预览。

## 4. 统一的事件模型、去重与指标口径

**原则：演示由统一时间轴驱动，页面读取同一份 canonical store，禁止把核心数字分散硬编码到组件。**

核心类型（Astra 应细化为 TS interface）：

```ts
type CameraEventType =
  | 'track_started' | 'line_crossed_entry' | 'line_crossed_exit'
  | 'duplicate_crossing_ignored' | 'track_ended'
  | 'camera_offline' | 'camera_online' | 'consented_identity_linked';

type CameraEvent = {
  id: string; storeId: string; cameraId: string;
  atMs: number; type: CameraEventType;
  trackId?: string; visitSessionId?: string;
  direction?: 'entry' | 'exit';
  demoIdentityId?: string; // 仅 consented_identity_linked 合成事件
  payload?: Record<string, string | number | boolean>;
};

type TrackFrame = {
  atMs: number; cameraId: string; trackId: string;
  bbox: [number, number, number, number]; // normalized [x,y,w,h]
  status: 'approach' | 'crossing' | 'inside' | 'leaving';
};

type Camera = {
  id: string; storeId: string; name: string;
  source: 'synthetic' | 'recorded_demo' | 'future_live';
  entranceId: string; health: 'online' | 'offline' | 'delayed';
};

type KnownIdentityLink = {
  demoIdentityId: string; visitSessionId: string;
  consent: true; // 本地虚构演示身份，不是生产授权记录
};
```

**三组明确不同的指标**

- `Entries`：计数线入店事件数，过滤掉重复 crossing 事件。
- `Exits`：计数线离店事件数；`Estimated Occupancy = max(0, openingOccupancy + Entries - Exits)`，估算值需要指出出口覆盖限制。
- `Store Visits`：完成有效入店规则所形成的访问会话。业务规则对短时进出店的处理要可配置，默认不要将再次进店一概当成同一个人。
- `Distinct Scene Tracks`：当前回放窗口内不同 track IDs，跨摄像头、跨天、遮挡或轨迹断裂并无身份保证。
- `Known Unique Customers`：在所选时间范围内对有合成授权身份关联的 `demoIdentityId` 去重；没有关联的陌生访客不能被加进这个指标。
- `Known Return Rate`：有历史访问记录的已识别独立顾客数 / 同期间有已知身份的独立顾客数；须标注样本覆盖条件。

说明：真实人脸算法、会员扫码、CRM 身份确认与匿名计数摄像头是不同数据源，`Distinct Scene Tracks` 不得包装成跨天 Unique Customers。

**数据一致性规则**
1. 在模拟时间轴开始时以基线日汇总 `initialCounterSnapshot` 为初值，回放 event 以纯 reducer 增量更新；重播时绝不累计重复计数。
2. `Replay Reset` 将时间和所有增量恢复初值；事件输出和图表快照重算；多次操作结果可重复。
3. 任一事件 id 只入账一次；同一有效 track 的重复 crossing 事件必须有明确抑制规则并能在日志体现。
4. 统计切换日/店时由统一 selectors 推导；不同图表不能同时出现互相矛盾的数字。
5. 预置至少 5 店、每店 1–2 虚构入口、90 天确定性汇总数据；主摄像头至少 2 分钟可回放的时间轴+预标注轨迹。
6. 设备离线时展示数据缺口及恢复状态，不继续伪造实时统计。

## 5. 体验流程（客户面前 5–7 分钟）

1. **0:00–0:40** 在 Live Vision 看到门店入口“摄像头”演示画面，强调设备与系统链接。解释这是标明为 Demo Replay 的合成回放，不是实时识别。
2. **0:40–1:50** Play 演示顾客进/出、同一轨迹被重复触发时系统避免重复计数；视频上的框、事件流、右侧 Entries/Exits 同步。
3. **1:50–2:50** 打开 Visitor Intelligence：演示 Visits vs Scene Tracks；点击授权会员跨天返回情景，Known Unique 保持不变而 Visits 更新；强调实际项目需明确身份关联方案及合规评估。
4. **2:50–3:50** 跳转 Command Center：筛选 Dubai Mall → Mall of the Emirates；观察品牌与各店指标、设备在线率改变。
5. **3:50–4:40** 打开 Traffic Analytics：看客流高峰，解释如何优化排班与营销评估（基于客流本身，不宣称真实销售转化）。
6. **4:40–5:30** 打开 AI Insights：出现基于当前图表和设备数据的明确异常证据与行动建议。
7. **5:30–6:20** 快速看 Extensions，说明智能试香瓶等 11 项均可基于基础客流平台扩展；然后返回 Live Vision 结束。

必须有 `Start Guided Demo`、`Reset Demo`、`Offline Demo Ready` 状态。任何一页出现加载失败都应有静态降级，不得卡住售前流程。

## 6. 技术栈和工程边界

### 6.1 推荐技术栈（首版纯前端）

- React + TypeScript + Vite
- Tailwind CSS + 自建 Design Tokens + 可复用 primitives（可用 shadcn/ui 作为基础，必须定制视觉）
- Zustand（中心数据 store，Replay 由时间位置+event reducer/selector 得出）
- React Router（固定 7 个主路由）
- Apache ECharts（统一主题，包含热力图/曲线图/排行）
- Motion for React（小幅可控的动画）
- SVG/Canvas 作为合成摄像头演示画布与 detection overlay
- Vitest + React Testing Library + Playwright（数据单测与 5 分钟演示 E2E）
- 所有 Demo 素材和数据随静态包部署，缓存可选，离线演示无需外部服务

### 6.2 软件适配层

```
src/
  app/            # router, layouts, route loader
  design/         # theme tokens, Typography, Button, Panel, ChartTheme
  modules/
    vision/       # SyntheticCameraScene, CountingLine, TrackOverlay, EventRail
    command/      # HQ indicators & store charts
    visitors/     # Visits / Scene Tracks / Known IDs definitions and demo
    traffic/      # time trends and heatmaps
    network/      # stores, cameras, statuses
    insights/     # rule-driven explanation cards
    extensions/   # feature catalog only
  domain/
    types/         # canonical camera/visitor/event/store contracts
    metrics/       # pure metric calculators and label definitions
    replay/        # deterministic timeline reducer / clock / snapshots
  data/
    fixtures/      # stores, cameras, 90-day metrics, tracks, event timeline
    repositories/  # DemoRepository now, LiveRepository future
  state/           # shared selectors and view state
  assets/          # locally packaged licensed assets
  tests/           # integration + E2E
```

未来真实 POC 的替换层：`DeviceAdapter` → `EventNormalizer` → `MetricsService` → `API/Websocket` → `frontend repositories`；Demo 先定义接口，但不架空搭微服务。

`Video Source` 与 `Detection/Event Source` 必须有 timestamp / cameraId 对齐契约，不能让视频循环与事件时间线分离。

### 6.3 核心一致性与可靠性要求

- 固定随机种子、固定演示基线时间（例如 `2026-10-31 14:00 Asia/Dubai`），避免一周后 Demo 被“今天”这种动态展示搞乱。
- 时区只用 Asia/Dubai、金额 AED。演示门店数据必须标注 synthetic，不使用真实客流或授权不明视频。
- 视频或合成动画播放和事件计算由同一 replayClock 驱动，寻址到 t 时数据可重算；播放/暂停/快进/重置均可预测。
- 默认无音频；首屏渲染 <2s 目标（普通笔记本本地运行，静态资源经过优化）；连续演示没有明显掉帧。
- UI 多种状态（offline/delayed/empty/loading/error/partial data）能正确呈现。

## 7. 分期里程碑与 Gates

| Gate | 核心交付 | 视觉/逻辑验收 |
|---|---|---|
| G0 Design First | 摄像头主屏、高端设计系统、Command 首屏、导航样板 | 1440×900 与 1920×1080 截图审查；**不合格不得批量实现页面** |
| G1 Domain Foundation | 事件/轨迹/门店统一模型；mock repository；replayClock；指标 selectors | 单元测试：计数线、重复事件抑制、回放一致性、去重术语 |
| G2 Live Vision Vertical Slice | 可操作的摄像头演示、track overlay、event rail、KPI 联动 | 端到端：play/pause/step/reset/切情景，信息一致 |
| G3 Business Analytics | Command/Visitors/Traffic/Network 四页 | 过滤联动；同一数据源；对指标解释无误 |
| G4 Insight & Extensions | AI Insights、增值模块展厅、guided demo | 关键售前故事 5–7 分钟闭环 |
| G5 Polish & Delivery | 视觉统一、适配、性能、e2e、离线部署、操作手册 | 三种视口，核心流程 100% 可以完成；可离线展示 |

**优先级：Live Vision > Visitors > Command > Traffic > Network > Insights > Extensions。**

## 8. 验收标准（不可含糊）

### 功能验收
- 点击 Play，画面轨迹与事件按时间同步；一次有效入店过线 KPI 恰好 +1，重复过线被抑制；Reset 恢复原始状态。
- 时间与门店筛选能影响对应统计；导航返回后数据状态一致。
- `Known Unique` 仅从 synthetic consent-linked IDs 计算；没有绑定的陌生访客不参与这一人数字段。
- 进入/离店/当前在店人数基线与计算公式一致，不能出现负数。
- 任何功能在概念态必须标示 `Concept Preview`；用户知道真实摄像头还未接入。
- 主要按钮可操作；无无意义空链接；支持键盘基本导航。

### 视觉验收
- 截屏审查 `/live` `/command` `/visitors`，首先达到品牌级视觉统一再开发其它屏；视频画面不应被侧栏 KPI 挤成小角落。
- 所有页面共用相同导航、排版、颜色、间距、空态和操作面板。
- 数据视图优先可读性；不用过度放大的香水瓶取代摄像头视频；信息密度有层次。
- 高级感来自材质、字体、留白、摄影、精密图表，而不是金色边框堆砌。

### 合规与销售表述
- 全局常驻标识 `DEMO REPLAY · SYNTHETIC DATA` 或 `RECORDED DEMONSTRATION`。
- 说明：访客跨天与跨店去重并非匿名计数摄像头自带能力；人脸生物识别若作为真实项目需要单独法律评估、必要授权和验证。
- 不能将“场景轨迹数”冒充“全部人脸去重后的独立顾客数”，不能承诺未经验证的识别准确率。

## 9. 对 Codex Astra 和 DeepSeek 的工作方式要求

**Astra 的职责：** 读本 PRD、约束范围、冻结 UI tokens 和数据契约、拆分文件互斥的 task cards、review 截图和测试，对术语与销售承诺把关。

**DeepSeek 的职责：** 每次执行一个短任务，改动限制文件、遵守共享数据契约、提供执行命令、测试结果、截图和演示说明。不得独立改变系统核心定位或临时新增 11 个增值页。

首批任务次序：1) UI Shell + `/live` 静态高保真框架，2) 合成场景与轨迹同步样板，3) 事件模型与计数 reducer，4) Live 互动联动，5) Visitor unique 口径模块，之后才是多店 BI 与 Extensions。

## 10. 下一步正式项目路线（不属于本 Demo 合同范围）

- 现场勘察：门店门口数量、摄像头视角/布点、网络及电源、光照、人流密度。
- 硬件评估：专用客流计数摄像头或普通摄像头 + 边缘算法，在真实环境对比准确率及成本。
- 视频/计数事件协议：支持厂商 API、ONVIF/RTSP 取流（具体能力由选型决定），断网缓存、重复事件幂等、服务端校时。
- Unique Customer 方案单独评估：一次访问轨迹 vs 跨天回访 vs 跨店身份识别是三类不同难度，不应默认实现。
- UAE 数据保护与安防要求：真实摄像头和生物识别项目必须由当地合规顾问审核，部署与数据访问权限明确。
- 再报价：PoC 设备、当地安装、边缘计算、总部中台、云端运维、维护费用分列。

**结束原则：摄像头是主角，Unique Visitor 是业务重点，客流分析是客户付费理由；香水行业增值模块是围绕客流平台的扩展商业空间。**
