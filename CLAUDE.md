# MakeYourTab — AI Collaboration Guide

> 本文档供 AI 编码助手阅读。在修改本项目前，请先阅读此文件。

## 1. 项目定位

MakeYourTab 是一个 Chrome Manifest V3 扩展，让用户通过颜色、Emoji、文字标签来标记和管理浏览器标签页。

- **当前版本**: 1.0.0
- **技术栈**: 纯原生 JS / CSS / HTML，无框架
- **数据存储**: 完全本地，`chrome.storage.local`
- **权限**: `storage`, `tabs`, `activeTab`, `scripting`, `commands`, `<all_urls>`

## 2. 目录结构与文件职责

```
makeyourtab/
├── manifest.json              # MV3 配置，权限、入口、快捷键
├── background/
│   ├── main.js                # Service Worker：消息路由、tab 操作、状态流转
│   └── storage.js             # Storage 封装：读写、CRUD、去重
├── content/
│   └── marker.js              # 内容脚本：标题/favicon 重写、浮动面板、拖拽
├── popup/
│   ├── popup.html             # 弹窗结构
│   ├── popup.css              # 弹窗样式（dark theme，固定宽度 468px）
│   └── popup.js               # 弹窗逻辑：表单、预设、最近使用、已标记标签
├── options/
│   ├── options.html           # 设置页结构
│   ├── options.css            # 设置页样式
│   └── options.js             # 设置页逻辑：开关、语言、预设删除
├── shared/
│   ├── constants.js           # 常量：颜色预设、Emoji、消息类型、默认值
│   ├── i18n.js                # 国际化：zh-CN / en 双语
│   └── validators.js          # 校验：marker 内容、预设名称
├── icons/                     # 扩展图标（16/32/48/128）
├── scripts/
│   └── generate-icons.ps1     # 图标生成脚本
├── docs/
│   ├── PRD.md                 # 产品需求文档
│   ├── TECH_SPEC.md           # 技术设计说明
│   ├── FIX_PLAN.md            # 问题修复方案与进度
│   ├── MakeYourTab_Release_Guide_EN.md
│   ├── MakeYourTab_Tech_Handoff_v1.md
│   └── archive/               # 历史规划文档（只读参考）
├── STATE.md                   # 项目当前状态、待办、已知问题
├── README.md
├── PRIVACY_POLICY.md
└── RELEASE_CHECKLIST.md
```

### 运行时依赖关系

```
manifest.json
    ├── background/main.js  ──import──► background/storage.js
    │                          ──import──► shared/constants.js
    │                          ──import──► shared/validators.js
    │                          ──import──► shared/i18n.js
    ├── content/marker.js
    ├── popup/popup.js  ──import──► shared/constants.js
    │                      ──import──► shared/i18n.js
    ├── options/options.js  ──import──► shared/constants.js
    │                          ──import──► shared/i18n.js
    └── shared/*
```

## 3. 核心架构原则

### 3.1 数据流：单向

```
User Action → Popup/Options → Background (main.js) → Storage → Broadcast → Content
                                    ↓
                              chrome.tabs API
```

- **Popup/Options** 只发消息，不直接操作 storage
- **Background** 是唯一的存储写入方和 tabs API 调用方
- **Content** 只响应消息和上报 `CONTENT_READY`，不发主动写请求

### 3.2 消息类型（完整清单）

| 类型 | 方向 | 用途 |
|------|------|------|
| `GET_STATE` | popup/options → bg | 获取完整状态 |
| `APPLY_MARKER` | popup → bg | 给 tab 打标记 |
| `CLEAR_MARKER` | popup → bg | 清除 tab 标记 |
| `SAVE_PRESET` | popup → bg | 保存新预设 |
| `UPDATE_PRESET` | popup → bg | 更新预设 |
| `DELETE_PRESET` | popup/options → bg | 删除预设 |
| `REORDER_PRESETS` | popup → bg | 持久化预设拖拽排序 |
| `TOGGLE_SETTING` | popup/options → bg | 更新设置项 |
| `SAVE_BADGE_POSITION` | content → bg | 保存面板位置 |
| `ACTIVATE_MARKED_TAB` | content → bg | 激活指定 tab |
| `PING_MARKED_TAB` | content → bg | 触发 tab attention |
| `CONTENT_READY` | content → bg | 页面加载完成，请求恢复标记 |
| `APPLY_CONTENT_MARKER` | bg → content | 应用视觉标记 |
| `CLEAR_CONTENT_MARKER` | bg → content | 清除视觉标记 |
| `UPDATE_CONTENT_OVERLAY` | bg → content | 更新浮动面板数据 |
| `FLASH_TAB_ATTENTION` | bg → content | 播放 attention 动画 |
| `OPEN_SHORTCUTS_PAGE` | options → bg | 打开 chrome 快捷键页 |

### 3.3 Storage Shape（唯一数据源）

```javascript
{
  version: 1,
  tabMarkers: {
    "<tabId>": {
      tabId, windowId, url, title,
      marker: { color, emoji, text },
      original: { title, faviconUrl },
      updatedAt
    }
  },
  savedPresets: [{ id, name, color, emoji, text, createdAt, updatedAt }],
  recentMarkers: [{ id, markerKey, color, emoji, text, updatedAt }],
  settings: {
    showPageBadge: true,
    language: "zh-CN",
    badgePosition: null | { left, top }
  }
}
```

## 4. AI 编码规范

### 4.1 修改前必须做的检查

1. 读取 `STATE.md`，确认当前待办和阻塞项
2. 读取 `docs/FIX_PLAN.md`，确认待修复问题的技术方案
3. 修改 `shared/i18n.js` 时，必须同时更新 `zh-CN` 和 `en`
4. 修改 `manifest.json` 时，必须同步更新版本号逻辑和权限说明

### 4.2 代码风格

- **JS**: ES Module，`import/export`，不使用 CommonJS
- **变量**: 优先 `const`，需要再赋值用 `let`，不使用 `var`
- **字符串**: 用户可见文本全部走 `shared/i18n.js`，禁止硬编码中文/英文
- **样式**: 
  - popup/options 用外部 CSS 文件
  - content script 因需隔离，当前允许内联 style，但新增代码应尽量提取为 CSS 变量或 class
- **错误处理**: async 函数统一用 `try/catch` 或 `.catch(() => undefined)` 吞掉非关键错误

### 4.3 禁止做的事

- ❌ 引入 npm 包或构建工具（当前项目零依赖）
- ❌ 修改 `docs/archive/` 下的任何历史文档
- ❌ 直接操作 `chrome.storage.local`，必须通过 `background/storage.js`
- ❌ 在 popup/options 中直接调用 `chrome.tabs.*` API（除 `chrome.tabs.create` 打开设置页外）
- ❌ 删除或重命名 `MESSAGE_TYPES` 中的已有字段（保持向后兼容）
- ❌ 试图实现"修改 Chrome 原生标签页背景色"（技术上不可行）

### 4.4 允许且鼓励做的事

- ✅ 给复杂函数补 JSDoc
- ✅ 提取 content script 中的重复样式片段为常量
- ✅ 添加轻量级的单元测试（validator、i18n、storage merge）
- ✅ 优化 popup 渲染性能（如虚拟列表、减少全量重绘）

## 5. 测试与验证

### 5.1 最小验证路径

任何修改后，至少验证：

1. **Popup**: 打开 → 应用标记 → 标题和 favicon 变化 → 清除 → 恢复
2. **Overlay**: 标记后页面出现浮动面板 → 拖拽 → 点击切换 tab → 双击 ping 只闪烁标题和 favicon，不切换 tab
3. **选项**: 语言切换 → badge 显示/隐藏 → 预设删除
4. **刷新**: 刷新标记页面 → 标记自动恢复

### 5.2 边界情况

- `chrome://` / Chrome Web Store 页面：应优雅降级，只记录状态不注入
- Service Worker 终止后重启：点击 popup 应正常加载
- 快速连续操作：不应出现 storage 数据丢失

## 6. 版本与发布

- 版本号遵循 SemVer：`MAJOR.MINOR.PATCH`
- 发布前执行 `RELEASE_CHECKLIST.md`
- 发布包放在 `release/MakeYourTab-x.y.z-chrome-web-store.zip`

## 7. 快速参考

| 问题 | 应查看的文件 |
|------|-------------|
| 这个功能是干什么的 | `docs/PRD.md` |
| 技术架构和消息流 | `docs/TECH_SPEC.md` |
| 当前已知 Bug 和待办 | `STATE.md` |
| 修复计划和技术方案 | `docs/FIX_PLAN.md` |
| 历史决策背景 | `docs/MakeYourTab_Tech_Handoff_v1.md` |
| 发布步骤 | `RELEASE_CHECKLIST.md` |
