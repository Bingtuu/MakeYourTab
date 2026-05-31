# MakeYourTab — Fix Plan (v1.0.1)

> 本文档汇总了 v1.0.0 Code Review 中发现的问题，并为每个问题提供修复方案。  
> 修复实施前，请先阅读 `STATE.md` 和 `CLAUDE.md`。  
> 最后更新: 2026-05-31
> 状态说明: 本文档为 1.0.1 修复规划的历史记录；当前实现状态以 `STATE.md` 和 `docs/MakeYourTab_Tech_Handoff_v1.md` 为准。

---

## 修复清单总览

| 编号 | 问题 | 优先级 | 涉及文件 | 预估工作量 |
|------|------|--------|----------|-----------|
| FIX-01 | Popup shortcuts 列表未国际化 | 🔴 高 | `popup.html`, `popup.js`, `shared/i18n.js` | 小 |
| FIX-02 | Options 删除按钮未走 i18n | 🔴 高 | `options/options.js` | 极小 |
| FIX-03 | Popup 中 `markedTabs` 与页面抽屉重复 | 🔴 高 | `popup/*`, `background/main.js` | 小 |
| FIX-04 | Color picker 大小写不匹配导致 active 失效 | 🔴 高 | `popup/popup.js` | 小 |
| FIX-05 | Storage 竞态风险 | 🔴 高 | `background/storage.js` | 中 |
| FIX-06 | Content script message listener 返回值不统一 | 🔴 高 | `content/marker.js` | 极小 |
| FIX-07 | `clearMarkerFromTab` 对受限页面处理顺序 | 🟡 中 | `background/main.js` | 小 |
| FIX-08 | Favicon 同步持续 DOM 污染 | 🟡 中 | `content/marker.js` | 中 |
| FIX-09 | Overlay 切 tab 后高亮不更新 | 🟡 中 | `background/main.js`, `content/marker.js` | 小 |
| FIX-10 | 窗口 resize 后 badge 跑出视口 | 🟡 中 | `content/marker.js` | 小 |
| FIX-11 | `original.title` 为空字符串时回退逻辑错误 | 🟡 中 | `content/marker.js` | 极小 |
| FIX-12 | `tabs.onUpdated` iframe 重复触发 | 🟢 低 | `background/main.js` | 极小 | **无需修复** |

---

## FIX-01: Popup shortcuts 列表未国际化

### 问题描述
`popup.html` 中 `shortcutsList` 的文本（"打开工具"、"清除标记"、快捷键说明）是硬编码中文。`popup.js` 的 `renderStaticText()` 没有处理这部分翻译，语言切换后 shortcuts 区域仍显示中文。

### 修复方案
1. 在 `shared/i18n.js` 的 `zh-CN` 和 `en` 中新增 keys:
   - `popup.shortcut.openPopup` / `popup.shortcut.clearMarker`
2. 给 `popup.html` 中 shortcuts list 的文本节点加上 `id` 或 `data-i18n` 标识
3. 在 `popup.js` 的 `renderStaticText()` 中补充对这些元素的文本赋值

### 代码修改点
```javascript
// shared/i18n.js 新增
"popup.shortcut.openPopup": "打开工具" / "Open Tool"
"popup.shortcut.clearMarker": "清除标记" / "Clear Marker"

// popup.html: 给 shortcut-name 元素加 id
<span id="shortcutOpenPopupLabel" class="shortcut-name">打开工具</span>
<span id="shortcutClearMarkerLabel" class="shortcut-name">清除标记</span>

// popup.js: elements 对象新增
shortcutOpenPopupLabel: document.getElementById("shortcutOpenPopupLabel"),
shortcutClearMarkerLabel: document.getElementById("shortcutClearMarkerLabel"),

// popup.js: renderStaticText() 新增
elements.shortcutOpenPopupLabel.textContent = tr("popup.shortcut.openPopup");
elements.shortcutClearMarkerLabel.textContent = tr("popup.shortcut.clearMarker");
```

---

## FIX-02: Options 删除按钮未走 i18n

### 问题描述
`options.js:112` 硬编码了删除按钮文本:
```javascript
remove.textContent = currentLanguage() === "zh-CN" ? "删除" : "Delete";
```

### 修复方案
直接使用 `tr("popup.delete")`（该 key 已在 i18n 中存在）。

### 代码修改点
```javascript
// options.js:112
remove.textContent = tr("popup.delete");
```

---

## FIX-03: Popup 中 `markedTabs` 与页面抽屉重复

### 问题描述
早期方案同时在 popup 和页面抽屉中展示当前窗口已标记标签。后续用户反馈认为页面抽屉已经承担跳转和 ping 的管理职责，popup 再显示 `markedTabs` 会造成信息重复和界面拥挤。

### 修复方案
移除 popup 内“已标记标签”区域，保留页面抽屉作为唯一 marked tab 管理入口。`buildPopupData()` 不再返回 `markedTabs`。

### 代码修改点
```javascript
// popup/popup.html
// 删除 marked-panel section

// popup/popup.js
// 删除 renderMarkedTabs() 和 markedTabs state

// background/main.js
// buildPopupData() 不再构建 markedTabs
```

---

## FIX-04: Color picker 大小写不匹配导致 active 失效

### 问题描述
预设颜色是大写 hex（如 `#3B82F6`），浏览器 `<input type="color">` 返回小写（如 `#3b82f6`）。用户从 color picker 选一个与预设"相同"的颜色时，预设按钮的 `is-active` 类因字符串比较失败而不显示。

### 修复方案
在比较颜色时统一转为小写:
1. `renderColorGrid()` 中的 active 判断: `state.selectedColor.toLowerCase() === color.toLowerCase()`
2. `popup.js` 中保存 `state.selectedColor` 时统一存小写

### 代码修改点
```javascript
// popup.js: renderColorGrid
button.className = `color-swatch${state.selectedColor.toLowerCase() === color.toLowerCase() ? " is-active" : ""}`;

// popup.js: 所有给 state.selectedColor 赋值的地方，统一 .toLowerCase()
state.selectedColor = color.toLowerCase();
state.selectedColor = event.target.value.toLowerCase();
```

---

## FIX-05: Storage 竞态风险

### 问题描述
所有 storage 操作都是 `getState() -> 修改 -> saveState()` 模式。如果用户快速连续操作（如连续切换语言、快速应用标记），Service Worker 可能并发处理多个请求，导致 read-modify-write 竞态，数据丢失。

### 修复方案
**方案 A（推荐）: 引入简单的内存锁**
在 `storage.js` 中维护一个 `Promise` 链，将所有写操作串行化:

```javascript
let _storageQueue = Promise.resolve();

function enqueueStorageTask(task) {
  _storageQueue = _storageQueue.then(task).catch(() => undefined);
  return _storageQueue;
}
```

所有 `saveState` / `upsertTabMarker` / `removeTabMarker` / `savePreset` / `updatePreset` / `deletePreset` / `pushRecentMarker` / `updateSetting` 都通过 `enqueueStorageTask` 包装。

**方案 B: 使用 chrome.storage.local 的 get/set 原子性（局部）**
由于所有数据在一个 key 下，没有真正的原子增量操作，无法完全避免竞态。

### 代码修改点
```javascript
// background/storage.js
let _storageQueue = Promise.resolve();

function enqueue(task) {
  const result = _storageQueue.then(task);
  _storageQueue = result.catch(() => undefined);
  return result;
}

export async function upsertTabMarker(tabId, payload) {
  return enqueue(async () => {
    const state = await getState();
    state.tabMarkers[String(tabId)] = payload;
    await saveState(state);
    return payload;
  });
}

// ... 所有写操作函数同理
```

---

## FIX-06: Content script message listener 返回值不统一

### 问题描述
`content/marker.js:528-547` 中，前两个分支写了 `return`（不是 `return true`），后两个没有 `return`。Chrome 扩展消息通信中，如果 `sendResponse` 是异步调用的，需要 `return true` 以保持消息通道开放。这里虽然 `sendResponse` 是同步调用的，但写法不统一，后续修改容易出错。

### 修复方案
统一在所有分支末尾使用 `return true;`，显式声明消息通道保持开放（向后兼容，无副作用）。

### 代码修改点
```javascript
// content/marker.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "APPLY_CONTENT_MARKER") {
    sendResponse(applyMarker(message.payload));
    return true;
  }

  if (message?.type === "CLEAR_CONTENT_MARKER") {
    sendResponse(clearMarker(message.payload));
    return true;
  }

  if (message?.type === "UPDATE_CONTENT_OVERLAY") {
    sendResponse(updateOverlay(message.payload));
    return true;
  }

  if (message?.type === "FLASH_TAB_ATTENTION") {
    sendResponse(flashTabAttention(message.payload));
    return true;
  }

  return true;  // 对未知类型也保持通道开放
});
```

---

## FIX-07: `clearMarkerFromTab` 对受限页面处理顺序

### 问题描述
对 `chrome://` 等受限页面，`clearMarkerFromTab` 仍会尝试 `ensureContentScriptInjected` 和 `safeSendToTab`，这些调用会失败（虽然错误被吞掉），但逻辑上应先判断页面是否可注入。

### 修复方案
在 `clearMarkerFromTab` 中加入 `isInjectableUrl` 判断，对不可注入页面跳过 content script 通信。

### 代码修改点
```javascript
// background/main.js
async function clearMarkerFromTab(tabId) {
  const existing = await getTabMarker(tabId);
  const windowId = existing?.windowId;
  const removed = await removeTabMarker(tabId);

  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const injectable = tab?.url ? isInjectableUrl(tab.url) : false;

  if (injectable) {
    await ensureContentScriptInjected(tabId);
    await safeSendToTab(tabId, {
      type: MESSAGE_TYPES.CLEAR_CONTENT_MARKER,
      payload: removed?.original || null
    });
  }

  if (windowId !== undefined) {
    await broadcastOverlayUpdate(windowId);
  }

  return removed;
}
```

---

## FIX-08: Favicon 同步持续 DOM 污染

### 问题描述
`startFaviconSync` 每 800ms 执行 `disableExistingIcons()`，持续修改所有 `<link rel*="icon">` 的 `rel` 属性。这会导致:
1. 与页面自身的 favicon 管理逻辑竞争
2. 动态添加的新 favicon 不会被及时禁用
3. 持续的 DOM 操作带来性能开销

### 修复方案
**改进现有同步逻辑:**
1. 使用 `MutationObserver` 监视 `<head>` 中新增的 `link[rel*="icon"]`，只在有新节点时执行 `disableExistingIcons`
2. 保留原有的 `setInterval`，但将间隔从 800ms 增加到 2000ms（作为 fallback）
3. 在 `disableExistingIcons` 中先检查是否已禁用，避免重复修改同一元素

### 代码修改点
```javascript
// content/marker.js
let _faviconObserver = null;

function startFaviconObserver() {
  if (_faviconObserver) return;
  _faviconObserver = new MutationObserver((mutations) => {
    const hasNewIcon = mutations.some((m) =>
      Array.from(m.addedNodes).some(
        (n) => n.tagName === "LINK" && (n.rel || "").includes("icon")
      )
    );
    if (hasNewIcon) {
      disableExistingIcons();
    }
  });
  _faviconObserver.observe(document.head, { childList: true, subtree: true });
}

function stopFaviconObserver() {
  if (_faviconObserver) {
    _faviconObserver.disconnect();
    _faviconObserver = null;
  }
}

function startFaviconSync() {
  stopFaviconSync();
  startFaviconObserver();
  pageState.faviconSyncTimer = window.setInterval(() => {
    if (!pageState.markerActive || !pageState.desiredFaviconHref) return;
    disableExistingIcons();
    const favicon = ensureFaviconElement();
    if (favicon.href !== pageState.desiredFaviconHref) {
      favicon.href = pageState.desiredFaviconHref;
    }
  }, 2000);  // 800ms -> 2000ms
}

function stopFaviconSync() {
  if (pageState.faviconSyncTimer) {
    window.clearInterval(pageState.faviconSyncTimer);
    pageState.faviconSyncTimer = null;
  }
  stopFaviconObserver();
}
```

---

## FIX-09: Overlay 切 tab 后高亮不更新

### 问题描述
用户点击 overlay 中的某一项切换到另一个标签页后，overlay 中所有标签页的"当前激活"蓝色边框不会更新，因为 `ACTIVATE_MARKED_TAB` 处理完成后没有广播 overlay 更新。

### 修复方案
在 `activateMarkedTab` 成功后，触发 `broadcastOverlayUpdate`。

### 代码修改点
```javascript
// background/main.js
async function activateMarkedTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  await chrome.tabs.update(tabId, { active: true });

  if (tab.windowId !== undefined) {
    await chrome.windows.update(tab.windowId, { focused: true });
    await broadcastOverlayUpdate(tab.windowId);  // 新增
  }

  return { ok: true };
}
```

---

## FIX-10: 窗口 resize 后 badge 跑出视口

### 问题描述
`saveOverlayPosition` 保存的是绝对坐标。当浏览器窗口 resize 后，badge 可能位于视口之外，用户找不到面板。

### 修复方案
1. 保存位置时，同时保存相对坐标（相对于视口宽高的百分比）
2. 在 `applyOverlayPosition` 中优先使用百分比位置，回退到像素位置
3. 添加 `window.resize` 监听，resize 时重新约束 badge 在视口内

### 代码修改点
```javascript
// content/marker.js
function applyOverlayPosition(root) {
  const position = pageState.settings?.badgePosition;

  if (position?.ratioLeft !== undefined && position?.ratioTop !== undefined) {
    const left = Math.round(position.ratioLeft * window.innerWidth);
    const top = Math.round(position.ratioTop * window.innerHeight);
    root.style.left = `${Math.max(8, Math.min(window.innerWidth - root.offsetWidth - 8, left))}px`;
    root.style.top = `${Math.max(8, Math.min(window.innerHeight - root.offsetHeight - 8, top))}px`;
    root.style.right = "auto";
    root.style.bottom = "auto";
    return;
  }

  // 原有像素位置逻辑...
}

function saveOverlayPosition(left, top) {
  chrome.runtime.sendMessage({
    type: "SAVE_BADGE_POSITION",
    position: {
      left,
      top,
      ratioLeft: left / window.innerWidth,
      ratioTop: top / window.innerHeight
    }
  }).catch(() => undefined);
}

// 新增 resize 监听
window.addEventListener("resize", () => {
  const root = document.getElementById(OVERLAY_ID);
  if (root) {
    applyOverlayPosition(root);
  }
});
```

---

## FIX-11: `original.title` 为空字符串时回退逻辑错误

### 问题描述
`content/marker.js`:
```javascript
pageState.originalTitle = original.title || pageState.originalTitle || document.title;
```
如果页面的原始标题是空字符串 `""`（合法但罕见），`original.title` 为 falsy，会错误地回退到 `pageState.originalTitle` 或 `document.title`，导致累积错误的原始值。

### 修复方案
使用 `??`（空值合并运算符）替代 `||`，只跳过 `null`/`undefined`，不跳过空字符串。

### 代码修改点
```javascript
// content/marker.js: applyMarker
pageState.originalTitle = original.title ?? pageState.originalTitle ?? document.title;
pageState.originalFaviconHref = original.faviconUrl ?? pageState.originalFaviconHref ?? getCurrentFaviconHref();
```

---

## FIX-12: `tabs.onUpdated` iframe 重复触发

### 问题描述
`chrome.tabs.onUpdated` 在子框架（iframe）加载完成时也会触发，`changeInfo.status === "complete"` 无法区分主框架和 iframe，可能导致对已有标记的页面重复调用 `applyVisualMarker`。

### 结论：无需修复
经验证，Chrome `tabs.onUpdated` 仅在**主框架**状态变化时触发，iframe 加载不会触发该事件。且任何试图添加 `changeInfo.url` 判断的修复都会**破坏页面刷新后的标记恢复**（刷新时 url 不变但 status 变为 complete）。

`applyVisualMarker` 本身是幂等的，重复调用无实际危害。

### 状态
🟢 **无需修复** — 已确认无实际影响。

---

## 实施建议

### 批次安排

**第一批次（高优先级，可一次性完成）:**
- FIX-01, FIX-02, FIX-03, FIX-04, FIX-06, FIX-11

**第二批次（高优先级，独立改动）:**
- FIX-05（Storage 串行化，改动面较大，需单独测试）

**第三批次（中优先级）:**
- FIX-07, FIX-08, FIX-09, FIX-10

**第四批次（低优先级，可选）:**
- FIX-12

### 测试重点

每批次修改后，至少执行:
1. Popup 打开 -> 应用标记 -> 刷新页面 -> 恢复验证
2. 快速连续应用 3 个不同标记 -> storage 数据正确
3. 语言切换 -> 所有文本更新（尤其 shortcuts）
4. 颜色选择器选 `#3b82f6` -> 蓝色预设按钮显示 active
5. 浮动面板拖拽 -> resize 窗口 -> 位置合理
6. 标记两个标签 -> 点击 overlay 切换 -> 高亮更新
