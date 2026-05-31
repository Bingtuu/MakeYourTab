# MakeYourTab — Technical Specification

> 版本: 1.0.0  
> 状态: 已发布，维护阶段  
> 目标读者: 开发者、AI 协作者

---

## 1. 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Chrome Extension Manifest V3 |
| 语言 | Vanilla JavaScript (ES2020+) |
| 模块 | ES Modules (`import`/`export`) |
| 样式 | CSS3 (原生变量、flex/grid、backdrop-filter) |
| 存储 | `chrome.storage.local` |
| 构建工具 | 无（零外部依赖）|
| 测试 | 暂无（1.0.1 计划补充 validator 单元测试）|

---

## 2. 架构概览

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Popup     │     │   Options   │     │   Content   │
│  (popup/)   │     │  (options/) │     │  (content/) │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │ chrome.runtime.sendMessage
                           ▼
              ┌─────────────────────────┐
              │  Service Worker         │
              │  (background/main.js)   │
              │  ── 消息路由 & 编排 ──   │
              └───────────┬─────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │  Storage Layer          │
              │  (background/storage.js)│
              │  ── chrome.storage.local │
              └─────────────────────────┘
```

### 2.1 设计哲学

- **Background 为唯一状态机**: 所有写操作、tabs API 调用集中在 Service Worker
- **Popup/Options 为无状态视图**: 只负责渲染和转发用户操作
- **Content Script 为纯执行器**: 只操作 DOM，不持有业务状态
- **Shared 为契约层**: 常量、消息类型、校验规则、i18n 全量共享

---

## 3. 模块详细设计

### 3.1 Background (`background/`)

#### `main.js` — 消息路由与编排

**核心职责:**
- 接收并路由所有 `chrome.runtime.onMessage` 请求
- 管理 tab marker 的生命周期（应用、清除、恢复）
- 监听 Chrome tabs 事件（`onRemoved`, `onUpdated`）
- 处理快捷键命令（`commands.onCommand`）
- 广播浮动面板更新

**关键函数:**

| 函数 | 职责 |
|------|------|
| `getCurrentTab()` | 获取当前激活标签页 |
| `buildPopupData()` | 聚合 popup 所需的全部数据 |
| `applyMarkerToTab(tabId, marker)` | 应用标记：存 storage → 注入 content → 广播更新 |
| `clearMarkerFromTab(tabId)` | 清除标记：删 storage → 通知 content → 广播更新 |
| `broadcastOverlayUpdate(windowId)` | 向窗口内所有已标记标签发送最新面板数据 |
| `applyVisualMarker(tabId, ...)` | 向指定 tab 的内容脚本发送应用指令 |
| `ensureContentScriptInjected(tabId)` | 动态注入内容脚本（处理 SW 休眠后失效）|

**事件监听:**

```javascript
chrome.tabs.onRemoved      → cleanupClosedTab → broadcastOverlayUpdate
chrome.tabs.onUpdated      → status === "complete" → applyVisualMarker (if marked)
chrome.commands.onCommand  → clear-current-marker / apply-preset-1~3
chrome.runtime.onInstalled → init storage
```

#### `storage.js` — 持久化层

**Storage Key:** `tabmarkerState`

**接口列表:**

```typescript
getState(): Promise<State>
saveState(state): Promise<State>
upsertTabMarker(tabId, payload): Promise<MarkerState>
upsertTabMarkerWithRecent(tabId, payload, marker): Promise<{ markerState, recentMarkers }>
getTabMarker(tabId): Promise<MarkerState | null>
removeTabMarker(tabId): Promise<MarkerState | null>
cleanupClosedTab(tabId): Promise<MarkerState | null>
savePreset(preset): Promise<Preset[]>      // 超限抛出 error.maxPresets
updatePreset(presetId, updates): Promise<Preset[]>
deletePreset(presetId): Promise<Preset[]>
pushRecentMarker(marker): Promise<Recent[]>
reorderPresets(orderedPresetIds): Promise<Preset[]>
updateSetting(key, value): Promise<Settings>
```

**注意:** 预设排序已从 `updateSetting()` 中分离，当前使用独立的 `REORDER_PRESETS` 消息和 `reorderPresets()` mutation。

### 3.2 Content Script (`content/marker.js`)

**运行模式:** IIFE，通过 `window.__TABMARKER_CONTENT_INITIALIZED__` 防止重复执行。

**状态对象:**

```javascript
pageState = {
  originalTitle, originalFaviconHref,
  titleSyncTimer, faviconSyncTimer, attentionTimer,
  desiredTitle, desiredFaviconHref,
  markerActive, currentMarker, overlayItems,
  settings, currentTabId,
  dragOffsetX/Y, isDragging, overlayClickTimer
}
```

**核心机制:**

| 机制 | 实现 |
|------|------|
| 标题重写 | `document.title = desiredTitle` + `setInterval` 500ms 同步防覆盖 |
| Favicon 重写 | 创建/更新 `id="tabmarker-favicon"` 的 `<link rel="icon">` + MutationObserver + `setInterval` 2000ms 同步 |
| 原 Favicon 禁用 | 将页面原有 `<link rel*="icon">` 的 rel 改为 `tabmarker-disabled-icon`，恢复时还原 |
| 浮动面板 | 创建 `id="tabmarker-page-badge"` 的 fixed div，z-index 2147483647 |
| 面板拖拽 | `pointerdown/move/up/cancel` 事件 + `setPointerCapture` |
| 点击/双击 | `setTimeout` 220ms 区分，dblclick 清除 pending click timer |
| Attention | `setInterval` 350ms 切换标题 8 次 + favicon 闪烁 + `overlay.animate` 呼吸灯效果，不激活目标 tab |

**消息处理:**

```javascript
APPLY_CONTENT_MARKER → applyMarker()     → 重写 title/favicon/渲染面板
CLEAR_CONTENT_MARKER → clearMarker()     → 恢复 title/favicon/移除面板
UPDATE_CONTENT_OVERLAY → updateOverlay() → 更新面板列表数据
FLASH_TAB_ATTENTION  → flashTabAttention() → 播放 attention 动画
```

### 3.3 Popup (`popup/`)

**状态对象:**

```javascript
state = {
  currentTab, currentMarker,
  presets, recentMarkers,
  settings, selectedColor, selectedEmoji, editingPresetId
}
```

**渲染流程:**

```
loadPopupData() ──► GET_STATE ──► 回填 state ──► 全量 render
```

**渲染函数:**

| 函数 | 职责 |
|------|------|
| `renderStaticText()` | i18n 文本替换 |
| `renderCurrentTab()` | 当前标签信息 + 受限提示 |
| `renderColorGrid()` | 12 色预设网格 + active 态 |
| `renderEmojiGrid()` | 12 Emoji 网格 + toggle 选中 |
| `renderRecentList()` | 最近使用列表 |
| `renderPresetList()` | 预设卡片列表 + 拖拽事件 |
| `updatePreview()` | 实时预览芯片 |

**用户操作流程:**

```
选择颜色/Emoji/文字 → updatePreview() → 点击 Apply
  → APPLY_MARKER → bg → 成功后 loadPopupData() 全量刷新
```

### 3.4 Options (`options/`)

**状态对象:**

```javascript
pageState = { presets, settings }
```

**与 Popup 的差异:**
- 通过同样的 `GET_STATE` 获取数据
- 只提供删除预设，不提供新增/编辑
- 语言切换用 `<select>` 而非 toggle 按钮

### 3.5 Shared (`shared/`)

#### `constants.js`

```javascript
STORAGE_KEY = "tabmarkerState"
MAX_PRESETS = 5
MAX_RECENT_MARKERS = 6
MAX_TEXT_LENGTH = 12
MAX_OVERLAY_ITEMS = 15
DEFAULT_SETTINGS = { showPageBadge: true, language: "zh-CN", badgePosition: null }
PRESET_COLORS = [12 色值]
COMMON_EMOJIS = [12 Emoji]
MESSAGE_TYPES = { ...16 种消息类型 }
```

#### `i18n.js`

- 双语言包：`zh-CN`, `en`
- 插值格式：`{varName}`
- fallback 链：`lang[key] → zh-CN[key] → key`

#### `validators.js`

```javascript
normalizeMarker(input) → { color, emoji, text }
validateMarker(input) → { isValid, marker?, errorKey?, errorVars? }
validatePresetName(name) → { isValid, name?, errorKey? }
```

---

## 4. 数据流时序

### 4.1 应用标记

```
User
  │ 点击 Apply
  ▼
popup.js: applyMarker()
  │ sendMessage { type: APPLY_MARKER, tabId, payload: marker }
  ▼
bg/main.js: onMessage APPLY_MARKER
  │ validateMarker()
  │ applyMarkerToTab(tabId, marker)
  │   ├─ upsertTabMarkerWithRecent(tabId, markerState, marker)
  │   ├─ applyVisualMarker(tabId, markerState, settings)
  │   │    ├─ ensureContentScriptInjected(tabId)
  │   │    └─ safeSendToTab(tabId, APPLY_CONTENT_MARKER)
  │   └─ broadcastOverlayUpdate(windowId)
  │        └─ safeSendToTab(tabIds, UPDATE_CONTENT_OVERLAY)
  ▼
content/marker.js: applyMarker()
  ├─ 设置 desiredTitle, desiredFaviconHref
  ├─ document.title = desiredTitle
  ├─ ensureFaviconElement().href = dataUrl
  ├─ renderBadge(marker, settings, overlayItems)
  ├─ startTitleSync()      // setInterval 500ms
  └─ startFaviconSync()    // MutationObserver + setInterval 2000ms fallback
```

### 4.2 页面刷新后恢复

```
Page Load
  ▼
content/marker.js: init
  │ sendMessage { type: CONTENT_READY }
  ▼
bg/main.js: onMessage CONTENT_READY
  │ getTabMarker(tabId)
  │ buildWindowOverlayItems(windowId)
  │ sendResponse { marker, original, settings, overlayItems, currentTabId }
  ▼
content/marker.js: .then(response)
  │ if response.data.marker → applyMarker(response.data)
```

### 4.3 清除标记

```
User
  │ 点击 Clear
  ▼
popup.js: clearMarker()
  │ sendMessage { type: CLEAR_MARKER, tabId }
  ▼
bg/main.js: onMessage CLEAR_MARKER
  │ clearMarkerFromTab(tabId)
  │   ├─ removeTabMarker(tabId)
  │   ├─ safeSendToTab(tabId, CLEAR_CONTENT_MARKER)
  │   └─ broadcastOverlayUpdate(windowId)
  ▼
content/marker.js: clearMarker()
  ├─ document.title = original.title
  ├─ remove injected favicon
  ├─ restoreExistingIcons()
  ├─ clearBadge()
  ├─ stopTitleSync()
  └─ stopFaviconSync()
```

---

## 5. 接口契约

### 5.1 Marker 数据格式

```typescript
interface Marker {
  color?: string;   // hex color, e.g. "#3B82F6"
  emoji?: string;   // single emoji, e.g. "📘"
  text?: string;    // max 12 chars
}
```

约束: `color || emoji || text` 至少一个非空。

### 5.2 TabMarkerState 数据格式

```typescript
interface TabMarkerState {
  tabId: number;
  windowId: number;
  url: string;
  title: string;
  marker: Marker;
  original: {
    title: string;
    faviconUrl: string;
  };
  updatedAt: number;
}
```

### 5.3 Preset 数据格式

```typescript
interface Preset {
  id: string;           // "preset_<timestamp>"
  name: string;         // max 20 chars
  color?: string;
  emoji?: string;
  text?: string;
  createdAt: number;
  updatedAt: number;
}
```

### 5.4 Message 响应格式

所有 Background 消息处理统一返回:

```typescript
interface Response {
  ok: boolean;
  data?: any;
  error?: string;   // 已本地化的错误提示文本
}
```

---

## 6. 安全与权限

### 6.1 权限清单

| 权限 | 用途 |
|------|------|
| `storage` | 持久化标记、预设、设置 |
| `tabs` | 查询标签信息、激活标签、监听关闭和更新 |
| `activeTab` | popup 打开时临时获取当前标签权限 |
| `scripting` | 向页面动态注入内容脚本 |
| `commands` | 注册键盘快捷键 |
| `<all_urls>` | 在所有网页上注入内容脚本和应用标记 |

### 6.2 受限页面处理

```javascript
function isInjectableUrl(url) {
  return /^(https?:|file:)/i.test(url);
}
```

对受限页面:
- 标记状态仍写入 storage（popup 中可见）
- `applyVisualMarker` 被跳过
- `ensureContentScriptInjected` 返回 false
- popup 显示受限提示

---

## 7. 已知技术债务

1. **Content Script 内联样式过多**: 难以维护，应逐步提取为 CSS 类
2. **tabs.onUpdated 可能重复应用**: 可能造成不必要的重复渲染
3. **无自动化测试**: 后续应补充 validator、i18n、storage migration 的基础测试

---

## 8. 变更日志

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-05 | 初始发布 |
