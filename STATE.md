# MakeYourTab — Project State

> 本文档是项目当前状态的"活文档"，记录已完成工作、待办事项、已知问题和阻塞项。  
> 最后更新: 2026-05-31

---

## 1. 当前版本

**v1.0.0** — 已发布至 Chrome Web Store

---

## 2. 已完成 ✅

### 2.1 核心功能
- [x] 标签页标记（颜色 + Emoji + 文字）
- [x] 标记实时应用到页面标题和 favicon
- [x] 最近使用标签（去重、倒序、最多 6 条）
- [x] 预设保存/应用/编辑/删除/拖拽排序（最多 5 个）
- [x] 浮动面板（显示当前窗口已标记标签、点击跳转、双击 ping）
- [x] 面板拖拽与位置持久化
- [x] 标记状态在页面刷新后自动恢复
- [x] 标签关闭后自动清理 storage
- [x] 快捷键支持（打开 popup、清除标记、3 个预设槽位）

### 2.2 UI/UX
- [x] Popup 界面（暗色主题、响应式布局）
- [x] Options 设置页
- [x] 中英文双语切换
- [x] 英文态 Popup 颜色/Emoji 网格完整显示
- [x] 页面抽屉保持常驻显示，避免 popup 生命周期导致抽屉恢复失败
- [x] Popup 移除与页面抽屉重复的已标记标签列表
- [x] 最近使用/预设对“仅符号、仅文字、无颜色”等 marker 组合给出准确描述
- [x] 页面抽屉文案跟随中英文设置切换
- [x] 双击 ping 设计明确为“不跳转定位”，通过标题与 favicon 闪烁提示目标 tab
- [x] 实时预览芯片
- [x] 字符计数器
- [x] 操作反馈提示（成功/失败）

### 2.3 工程
- [x] Manifest V3 配置
- [x] Service Worker 架构
- [x] Content Script 注入与防重复机制
- [x] Storage 封装与默认值合并
- [x] 消息类型定义与路由
- [x] 校验器（marker、preset name）
- [x] i18n 双语言包
- [x] 图标资源（16/32/48/128）
- [x] 发布流程文档与 checklist

---

## 3. 待办 📝

### 3.1 高优先级（1.0.1）
- [x] 修复：Popup shortcuts 列表未国际化
- [x] 修复：Options 页面预设删除按钮未走 i18n
- [x] 修复：已标记标签页列表未按 `updatedAt` 排序
- [x] 修复：Color picker 与预设色值大小写不一致导致 active 状态失效
- [x] 修复：Storage 竞态风险（read-modify-write 非原子）
- [x] 修复：Content script message listener 返回值不统一

### 3.2 中优先级（1.0.1 或 1.1.0）
- [x] 优化：`clearMarkerFromTab` 对受限页面处理顺序
- [x] 优化：Favicon 同步持续 DOM 污染问题
- [x] 优化：移除 Popup 中与页面抽屉重复的 `markedTabs` 列表
- [x] 优化：Overlay badge 切换 tab 后当前项高亮不更新
- [x] 优化：窗口 resize 后 badge 可能跑出视口
- [x] 重构：将 `GET_POPUP_DATA` 重命名为 `GET_STATE`
- [x] 重构：分离 `updateSetting` 的 presets 排序职责

### 3.3 低优先级（未来版本）
- [ ] 提取 content script 内联样式为 CSS 类
- [ ] 拆分 `content/marker.js` 为子模块（title/favicon/overlay/attention）
- [ ] 添加自动化测试（validator、i18n fallback、storage merge）
- [ ] 添加发布脚本（自动 bump version、copy、zip）
- [ ] 跨窗口标记标签页管理
- [ ] 标记数据导出/导入

---

## 4. 已知问题 🐛

### 4.1 功能缺陷

| # | 问题 | 影响 | 状态 |
|---|------|------|------|
| F-1 | Popup shortcuts 列表文本硬编码中文，切换语言不更新 | 英文用户看到中文 | ✅ 已修复 |
| F-2 | Options 删除按钮硬编码 "删除"/"Delete" | 维护成本，未统一走 i18n | ✅ 已修复 |
| F-3 | Popup 中 `markedTabs` 与页面抽屉重复 | 信息冗余，打开工具时遮挡页面抽屉 | ✅ 已移除 |
| F-4 | Color picker 返回小写 hex，预设为大写，active 判断失败 | 用户选色后预设按钮无高亮 | ✅ 已修复 |
| F-5 | Overlay 切 tab 后当前项高亮不更新 | 用户不知道当前在哪个标签 | ✅ 已修复 |
| F-6 | 窗口 resize 后 badge 可能跑出视口 | 面板找不到 | ✅ 已修复 |

### 4.2 代码缺陷

| # | 问题 | 影响 | 状态 |
|---|------|------|------|
| C-1 | Storage `getState → modify → saveState` 非原子 | 快速操作可能丢数据 | ✅ 已修复 |
| C-2 | `content/marker.js` message listener 部分分支缺少 `return true` | 潜在消息通信 bug | ✅ 已修复 |
| C-3 | `clearMarkerFromTab` 对受限页面仍尝试注入和发消息 | 不必要的失败调用 | ✅ 已修复 |
| C-4 | Favicon sync 已改为 MutationObserver + 2000ms fallback，但仍可继续观察性能 | 低频性能开销 | 🟢 观察中 |
| C-5 | `applyMarker` 中 `original.title` 为空字符串时回退逻辑错误 | 可能累积错误原始值 | ✅ 已修复 |
| C-6 | `tabs.onUpdated` 可能因 iframe 触发重复应用 | 不必要的重复渲染 | 🟢 低优先级 |

### 4.3 可维护性问题

| # | 问题 | 状态 |
|---|------|------|
| M-1 | `GET_POPUP_DATA` 被 Options 复用，语义不清 | ✅ 已重构 |
| M-2 | `updateSetting` 同时处理 settings 和 presets 排序 | ✅ 已重构 |
| M-3 | `content/marker.js` 内联样式过多（500+ 行） | 🟡 待重构 |
| M-4 | `popup.css` 中 `@media (max-width: 480px)` 对 popup 无意义 | ✅ 已移除 |
| M-5 | 无自动化测试覆盖 | 🟡 待补充 |

---

## 5. 阻塞项 🚧

当前无阻塞项。1.0.1 后续维护以本文档和 `docs/MakeYourTab_Tech_Handoff_v1.md` 为准。

---

## 6. 决策记录

### ADR-1: 不使用构建工具
- **日期**: 2026-05
- **决策**: 保持零依赖，纯原生 JS/CSS/HTML
- **原因**: 降低维护成本，Chrome Web Store 审核更简单，用户侧无加载负担
- **影响**: 无法使用 TypeScript、JSX、tree-shaking 等现代工具链特性

### ADR-2: 使用 title 轮询 + favicon observer/fallback 同步
- **日期**: 2026-05
- **决策**: title 使用 500ms 轮询同步；favicon 使用 MutationObserver + 2000ms fallback
- **原因**: 许多网站动态改写 title/favicon，需要在可靠性和性能之间平衡
- **影响**: 仍存在轻微性能开销，但比持续高频 favicon DOM 修改更稳健

### ADR-3: Storage 单 Key 设计
- **日期**: 2026-05
- **决策**: 所有状态存储在 `tabmarkerState` 单个 key 下
- **原因**: 简化读写逻辑，便于默认值合并和迁移
- **影响**: 并发修改存在覆盖风险，单 key 数据量大时读写延迟增加

### ADR-4: Content Script 使用内联样式
- **日期**: 2026-05
- **决策**: 浮动面板和 favicon 逻辑全部使用 `element.style.xxx`
- **原因**: 避免与页面 CSS 冲突，确保隔离性
- **影响**: 代码冗长，难以主题化，维护成本高

---

## 7. 最近变更

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-05-31 | 修复 marker 描述与抽屉体验：区分仅颜色/仅符号/无颜色，抽屉文案跟随语言设置，增强双击 ping 为标题 + favicon 闪烁且不跳转 | AI Review |
| 2026-05-31 | 修复抽屉恢复与按钮边框：撤销 popup 打开时隐藏抽屉的策略，确保页面抽屉常驻；修复最近使用应用按钮默认白色边框 | AI Review |
| 2026-05-31 | 修复预设兼容与抽屉交互：兼容旧嵌套 preset 数据，语言切换保留编辑态按钮，并移除 Popup 内冗余已标记标签列表 | AI Review |
| 2026-05-31 | 修复英文态 Popup 布局：稳定颜色/Emoji 两行网格、补齐 emoji 字体、预设/快捷键长文案防溢出，并移除无效 media 规则 | AI Review |
| 2026-05-31 | 修复 C-3/C-5/M-1：受限页清除降级、原始标题快照回退、`GET_POPUP_DATA` 重命名为 `GET_STATE` | AI Review |
| 2026-05-31 | 修复 C-1/C-2：将应用标记与最近记录合并为队列内单次写入，新增独立 `REORDER_PRESETS` 消息，统一 content message listener 同步返回值 | AI Review |
| 2026-05-26 | 第二轮 Review 修复（6 项）：clearMarker `??` 回退、buildWindowOverlayItems `??` 回退、safeSendToTab 英文 fallback、broadcastOverlayUpdate 冗余 getState 优化、Popup 跳转走 background 消息、markedCount 英文显示 | AI Review |
| 2026-05-26 | 完成 1.0.1 全部修复（11/12 项）：国际化、排序、Storage 竞态、message listener、受限页面处理、Favicon MutationObserver、Overlay 高亮同步、百分比定位、空值合并运算符 | AI Review |
| 2026-05-26 | 创建 STATE.md、CLAUDE.md、PRD.md、TECH_SPEC.md、FIX_PLAN.md | AI Review |
| 2026-05 | 发布 v1.0.0 至 Chrome Web Store | - |
