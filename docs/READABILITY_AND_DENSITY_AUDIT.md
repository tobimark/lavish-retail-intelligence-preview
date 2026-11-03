# V3.1 现状审计与实施边界

日期：2026-11-03。审计依据：当前源文件、上轮真实浏览器截图与布局 JSON；本轮尚未完成新布局实现或截图验收。

## 证据与问题

| 区域 | 仓库证据 | 当前问题 | 处理 |
|---|---|---|---|
| 默认监控 | src/styles.css `.workspace` / `.camera-aperture`；design/screenshots/layout-1440.json | 957×460，占工作区宽度73.6% | 改为约700×394紧凑预览 |
| 事件流 | src/styles.css `.event-title` / `.event-meta` / `.event-title time` | 11/10/10px；右栏319px | 约570px宽；事件正文15px，元数据14px |
| KPI | src/App.tsx `.metrics-strip` | 放在视频后方，说明10px | 移到主内容前；标签15px，说明14px |
| 摄像头网络 | `.camera-card strong/small` | 10/8px，窄屏还会缩小 | 独立全宽设备行，15/14px，状态文字明确 |
| 操作条 | `.overlay-controls` / `.speed-select` | 多个小控件横挤 | 常用播放操作与高级分析工具分层 |
| 展开态 | App.tsx `focus` | 只有图标入口；隐藏事件与设备；无显式焦点恢复 | 可读Expand/Collapse、事件侧栏、相机选择、原状态保留 |
| 弹窗 | `.definition p` / `.detail-list` | 11px说明，窄抽屉 | 与正文共用15–16px字号及滚动规则 |
| 品牌 | App.tsx wordmark | 当前SILLAGE主品牌 | 文字形式LAVISH / Retail Intelligence；保留Demo、Powered by SILLAGE |

Before证据：`docs/screenshots/before-compact.png`、`before-expanded.png`，均为此前实际浏览器截图的副本，不是本轮新截图。

## 可复用与保护

现有播放、速度、事件步进、寻址、重置、场景选择、离线状态、统计口径已实现。算法来源为 src/domain/replay.ts；3D与SVG叠层位于 src/modules/vision/CameraScene.tsx；当前哈希保存在 docs/preserved-logic-hashes.json，已核对一致。

本阶段禁止改变算法、场景几何、材质、人物、灯光、相机位姿、事件fixture及统计定义。仅LV04允许修改CameraScene中的叠层排版/标注显示，必须提供逐段diff证明未改3D与业务部分。domain文件必须保持字节不变。

已有其他导航是Next phase说明，不是已完成业务页面。只有英文实现；阿语/RTL尚未实现，不能把本轮英语截图写成双语通过。全站规范先覆盖当前壳层、Live Vision、弹窗、设备及帮助，未来页面复用。

未在仓库找到文档引用的“V2与32店报价差异”及“洞察基本版方案及报价”，未声称已读。未核验Lavish官方Logo授权及实际门店名单，本轮不引入官方图像、不生成客户已采购声明、不扩展门店数据。

完整V3的身份去重、UV/UC、员工排除、32店、多语言、报表及治理功能需单独阶段审计和实现；此次不能将UI重构误报为上述功能交付。
