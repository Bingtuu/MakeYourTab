# MakeYourTab

> 一个用于 Chrome 的本地优先 Tab 标记与管理插件。
> A local-first Chrome extension for visually marking, finding, and managing browser tabs.

MakeYourTab 帮助你给正在打开的网页添加颜色、符号和文字标签，让重要页面在大量浏览器 Tab 中更容易被识别、复用和切换。它不尝试修改 Chrome 原生 Tab 背景色，而是使用更稳定、可发布的方式：标题前缀、动态 favicon、Popup 编辑器和页面内浮动抽屉。

[English README](#english)

Chrome Web Store: [MakeYourTab](https://chromewebstore.google.com/detail/makeyourtab/bieibdgkgcahflihdgkhdlhoggnhccdp?authuser=0&hl=zh-CN)

## 中文说明

### 产品定位

当浏览器里同时打开很多页面时，仅靠网页标题和 favicon 很难快速区分“文档”“待办”“监控”“工具”“交易”“稍后阅读”等不同任务。MakeYourTab 的目标是提供一个轻量、直观、隐私友好的 Tab 标记层，让用户可以在本地浏览器中快速组织当前工作上下文。

适合场景：

- 同时打开多个文档、后台、仪表盘或研究页面
- 需要临时标记“待处理”“重点”“稍后看”的网页
- 希望通过颜色、emoji、短文本快速识别 Tab
- 希望在当前窗口内快速跳转到已标记页面

### 核心功能

- **当前 Tab 标记**：为当前页面添加颜色、emoji 和短文本标签。
- **标题与图标增强**：通过修改页面标题前缀和生成标记 favicon，让浏览器 Tab 更容易识别。
- **最近使用**：自动记录最近使用的标签组合，支持一键复用。
- **预设管理**：保存常用标签组合，支持编辑、删除和拖拽排序。
- **页面浮动抽屉**：在网页右上角显示当前窗口已标记页面，支持拖拽移动。
- **快速跳转**：单击抽屉中的标签项，切换到对应浏览器 Tab。
- **双击 Ping**：双击抽屉项时不跳转页面，而是让目标 Tab 的标题和 favicon 短暂闪烁，帮助定位。
- **中英文界面**：Popup、Options 和页面抽屉支持中文/英文切换。
- **快捷键入口**：默认 `Alt + T` 打开插件，`Alt + Shift + C` 清除当前标记。
- **本地优先**：数据存储在 `chrome.storage.local`，不上传、不追踪、不依赖远程服务。

### 交互设计

MakeYourTab 采用“Popup 负责编辑，页面抽屉负责管理”的分工：

- **Popup** 用于选择颜色、emoji、文字，应用标记，管理最近使用和预设。
- **页面抽屉** 用于查看当前窗口已标记的页面，支持点击跳转和双击 Ping。
- **Options** 用于管理设置、语言和保存的预设。

基础流程：

```text
打开插件 Popup
  -> 选择颜色 / emoji / 文字
  -> 点击 Apply Marker
  -> 当前 Tab 标题和 favicon 被增强
  -> 页面右上角出现可拖拽抽屉
  -> 后续可从最近使用或预设快速复用
```

页面抽屉行为：

```text
单击抽屉项
  -> 激活对应 Tab

双击抽屉项
  -> 不切换当前页面
  -> 目标 Tab 标题和 favicon 闪烁
```

### 为什么不直接修改 Chrome 原生 Tab 颜色

Chrome 扩展无法稳定、正式地修改浏览器原生 Tab 背景色。MakeYourTab 因此采用以下替代方案：

- 通过 `document.title` 添加标签前缀
- 通过页面内 favicon link 生成彩色标记图标
- 通过 content script 注入页面浮动抽屉
- 通过 Popup 和 Options 提供可控的管理界面

这种方案更符合 Chrome Manifest V3 的能力边界，也更适合发布到 Chrome Web Store。

### 技术实现

MakeYourTab 是一个 Chrome Manifest V3 扩展，核心模块如下：

```text
manifest.json
background/       后台 service worker，负责消息路由、状态读写、Tab 操作
content/          注入网页的 content script，负责标题、favicon 和浮动抽屉
popup/            插件弹窗 UI，负责编辑标记、最近使用和预设管理
options/          设置页面，负责语言、开关和预设管理
shared/           常量、i18n、校验逻辑
icons/            插件图标
scripts/          本地辅助脚本
docs/             产品、技术和发布文档
```

关键实现点：

- **状态存储**：使用 `chrome.storage.local`，主状态 key 为 `tabmarkerState`。
- **消息通信**：Popup、Options、Content Script 和 Background 之间通过 `chrome.runtime.sendMessage` 通信。
- **内容注入**：通过 `chrome.scripting.executeScript` 在支持的页面重新注入 content script。
- **标题同步**：使用定时同步避免网站脚本覆盖标记标题。
- **Favicon 同步**：使用 `MutationObserver` 加低频 fallback，减少与页面脚本竞争。
- **并发保护**：Storage mutation 使用队列串行化，降低快速连续打标导致的数据竞争。
- **预设兼容**：读取状态时兼容旧版本嵌套 preset 结构，并自动规范化。
- **受限页面降级**：`chrome://` 等不可注入页面只保存扩展内状态，不强行修改页面。

### 权限说明

MakeYourTab 请求的权限只用于核心功能：

- `tabs`：识别、激活和管理已标记的浏览器 Tab。
- `activeTab`：读取并操作当前激活页面。
- `scripting`：向支持的网页注入标记逻辑。
- `storage`：保存本地标记、最近使用、预设和设置。
- `commands`：提供快捷键入口。
- `<all_urls>`：让用户可以在普通网页、本地文件页等不同站点使用标记能力。

### 安装方式

从 Chrome Web Store 安装：

1. 打开 [MakeYourTab Chrome Web Store 页面](https://chromewebstore.google.com/detail/makeyourtab/bieibdgkgcahflihdgkhdlhoggnhccdp?authuser=0&hl=zh-CN)。
2. 点击 `Add to Chrome`。
3. 按 Chrome 提示完成安装。

本地开发安装：

1. 克隆或下载本仓库。
2. 打开 Chrome，进入 `chrome://extensions/`。
3. 开启 `Developer mode`。
4. 点击 `Load unpacked`。
5. 选择项目根目录 `MakeYourTab`。

### 使用方式

1. 点击 Chrome 工具栏中的 MakeYourTab 图标，或使用 `Alt + T` 打开 Popup。
2. 选择颜色、emoji 和文字标签。
3. 点击 `Apply Marker` 应用到当前 Tab。
4. 使用 `Recent Tags` 快速复用最近标签。
5. 使用 `Presets` 保存、编辑、删除和排序常用标签。
6. 使用页面右上角抽屉管理当前窗口内的已标记页面。
7. 如需清除当前标记，点击 `Clear` 或使用 `Alt + Shift + C`。

### 快捷键

默认快捷键：

- 打开插件：`Alt + T`
- 清除当前标记：`Alt + Shift + C`

可配置命令：

- Apply preset 1
- Apply preset 2
- Apply preset 3

Chrome 不允许扩展在插件内部直接修改系统快捷键。如需自定义，请打开：

```text
chrome://extensions/shortcuts
```

### 隐私

MakeYourTab 是本地优先插件：

- 不收集个人信息
- 不上传浏览数据
- 不使用远程代码
- 不使用第三方分析服务
- 不出售或共享用户数据

完整隐私说明见 `PRIVACY_POLICY.md`。

### 开发文档

- `docs/MakeYourTab_Tech_Handoff_v1.md`：主要技术交接文档
- `docs/TECH_SPEC.md`：实现细节和模块说明
- `docs/PRD.md`：产品需求说明
- `STATE.md`：当前维护状态和技术债记录
- `RELEASE_CHECKLIST.md`：发布检查清单

### 当前版本

- Extension version: `1.0.1`
- Maintenance line: `1.0.1`
- Manifest: Chrome Manifest V3

### License

MIT

---

## English

MakeYourTab is a local-first Chrome extension for visually marking and managing open browser tabs. It helps users recognize important pages faster by adding color, emoji, and short text labels to tabs.

Instead of trying to change Chrome's native tab background color, MakeYourTab uses browser-compatible visual signals: title prefixes, generated favicons, a popup editor, and a draggable in-page drawer.

### Product Goal

When many tabs are open at the same time, page titles and default favicons are often not enough. MakeYourTab adds a lightweight visual layer on top of existing tabs so users can organize their current browsing context without sending data to any server.

It is useful for:

- marking documents, tools, dashboards, and research pages
- labeling pages as todo, important, review, or later
- recognizing tabs by color, emoji, and short text
- switching quickly between marked tabs in the current window

### Key Features

- **Visual tab marking**: Add color, emoji, and text tags to the current tab.
- **Title and favicon enhancement**: Add a marker prefix to the tab title and generate a custom marker favicon.
- **Recent tags**: Reuse recently used tag combinations with one click.
- **Saved presets**: Save common marker combinations, then edit, delete, reorder, and apply them.
- **Floating drawer**: Show marked tabs in a draggable in-page drawer.
- **Quick switching**: Click a drawer item to activate the related tab.
- **Tab pinging**: Double-click a drawer item to flash the target tab title and favicon without switching.
- **Chinese and English UI**: Popup, Options, and the in-page drawer follow the selected language.
- **Keyboard shortcuts**: Open the popup with `Alt + T`; clear the current marker with `Alt + Shift + C`.
- **Local-first privacy**: Data is stored locally in `chrome.storage.local`.

### Interaction Design

MakeYourTab separates editing and navigation:

- The **Popup** is used to edit markers, apply recent tags, and manage presets.
- The **Floating Drawer** is used to manage marked tabs in the current window.
- The **Options Page** is used for language, settings, and preset management.

Basic flow:

```text
Open popup
  -> choose color / emoji / text
  -> click Apply Marker
  -> tab title and favicon are enhanced
  -> draggable drawer appears on the page
  -> reuse markers from recent tags or presets later
```

Drawer behavior:

```text
Click drawer item
  -> activate the related tab

Double-click drawer item
  -> keep the current page active
  -> flash the target tab title and favicon
```

### Why It Does Not Change Native Chrome Tab Color

Chrome extensions cannot reliably or officially modify the native browser tab background color. MakeYourTab uses a more stable and Web Store friendly approach:

- `document.title` marker prefixes
- generated favicon overlays
- an injected in-page floating drawer
- popup and options pages for controlled management

This design follows Chrome Manifest V3 limitations while still providing strong visual recognition.

### Technical Implementation

MakeYourTab is built as a Chrome Manifest V3 extension.

```text
manifest.json
background/       service worker for message routing, storage, and tab actions
content/          content script for title, favicon, and floating drawer
popup/            popup UI for marker editing, recent tags, and presets
options/          settings page for language, toggles, and presets
shared/           constants, i18n, and validators
icons/            extension icons
scripts/          local utility scripts
docs/             product, technical, and release documents
```

Important implementation details:

- **Storage**: Uses `chrome.storage.local` with `tabmarkerState` as the main state key.
- **Messaging**: Popup, Options, Content Script, and Background communicate through `chrome.runtime.sendMessage`.
- **Injection**: Uses `chrome.scripting.executeScript` to reinject content scripts when needed.
- **Title sync**: Keeps marker prefixes stable even when websites update titles dynamically.
- **Favicon sync**: Uses `MutationObserver` plus a low-frequency fallback to avoid excessive DOM writes.
- **Storage queue**: Serializes storage mutations to reduce race conditions during rapid marker updates.
- **Preset migration**: Normalizes older nested preset structures when reading state.
- **Restricted pages**: Falls back gracefully on pages where content scripts cannot be injected.

### Permissions

MakeYourTab uses the following permissions only for its core functionality:

- `tabs`: Identify, activate, and manage marked tabs.
- `activeTab`: Work with the currently active tab.
- `scripting`: Inject marker logic into supported pages.
- `storage`: Store local marker data, recent tags, presets, and settings.
- `commands`: Provide keyboard shortcuts.
- `<all_urls>`: Let users apply markers across normal websites and supported local pages.

### Installation

From Chrome Web Store:

1. Visit the Chrome Web Store listing for MakeYourTab.
2. Click `Add to Chrome`.
3. Follow Chrome's installation prompts.

For development:

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the project root directory.

### Usage

1. Click the MakeYourTab toolbar icon or press `Alt + T`.
2. Choose a color, emoji, and text label.
3. Click `Apply Marker`.
4. Reuse markers from `Recent Tags`.
5. Save, edit, delete, reorder, and apply markers from `Presets`.
6. Use the in-page drawer to manage marked tabs in the current window.
7. Click `Clear` or press `Alt + Shift + C` to clear the current marker.

### Shortcuts

Default shortcuts:

- Open popup: `Alt + T`
- Clear current marker: `Alt + Shift + C`

Configurable commands:

- Apply preset 1
- Apply preset 2
- Apply preset 3

Chrome does not allow extensions to change system shortcuts directly inside the extension UI. To customize shortcuts, open:

```text
chrome://extensions/shortcuts
```

### Privacy

MakeYourTab is local-first:

- no personal data collection
- no browsing data upload
- no remote code execution
- no third-party analytics
- no selling or sharing of user data

See `PRIVACY_POLICY.md` for the full privacy policy.

### Documentation

- `docs/MakeYourTab_Tech_Handoff_v1.md`: main technical handoff
- `docs/TECH_SPEC.md`: implementation details
- `docs/PRD.md`: product requirements
- `STATE.md`: current maintenance state and technical debt
- `RELEASE_CHECKLIST.md`: release checklist

### Version

- Extension version: `1.0.1`
- Maintenance line: `1.0.1`
- Manifest: Chrome Manifest V3

### License

MIT
