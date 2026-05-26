# TabMarker Chrome浏览器标签标记插件

# 技术规范文档

**版本**: v1.0  
**日期**: 2026年4月  
**状态**: 待开发

---

## 目录

1. [技术架构](#1-技术架构)
   - 1.1 [整体架构](#11-整体架构)
   - 1.2 [组件说明](#12-组件说明)
2. [技术栈](#2-技术栈)
   - 2.1 [核心技术](#21-核心技术)
   - 2.2 [Chrome API使用](#22-chrome-api使用)
3. [项目结构](#3-项目结构)
   - 3.1 [文件目录](#31-文件目录)
   - 3.2 [核心模块](#32-核心模块)
4. [数据模型](#4-数据模型)
5. [API设计](#5-api设计)
6. [Manifest配置](#6-manifest配置)

---

## 1. 技术架构

### 1.1 整体架构

TabMarker采用Chrome Extension Manifest V3架构，主要由以下组件构成：

- **后台脚本** (Background Script / Service Worker)
- **弹窗页面** (Popup)
- **内容脚本** (Content Script)
- **选项页面** (Options Page)

### 1.2 组件说明

#### 1. 后台脚本 (Background Script)

后台脚本作为服务工作运行，负责处理插件的核心业务逻辑。

**职责：**
- 监听快捷键事件
- 管理标签页标记状态
- 与弹窗页面通信

#### 2. 弹窗页面 (Popup)

弹窗页面是用户主要的交互入口，提供标记设置界面。

**职责：**
- 显示当前标签页的标记状态
- 提供颜色、emoji、文字标记设置
- 展示常用tag组合

#### 3. 内容脚本 (Content Script)

内容脚本注入到网页中，用于处理页面级的交互。

**职责：**
- 监听页面事件
- 与后台脚本通信

#### 4. 选项页面 (Options Page)

选项页面提供插件的详细设置界面。

**职责：**
- 快捷键管理
- 常用tag组合管理
- 插件设置

---

## 2. 技术栈

### 2.1 核心技术

| 技术项 | 说明 |
|--------|------|
| Manifest Version | V3 (Chrome 88+) |
| JavaScript | ES2020+ (原生) |
| HTML | HTML5 |
| CSS | CSS3 + Flexbox/Grid |
| Storage | chrome.storage.local API |

### 2.2 Chrome API使用

| API | 用途 |
|-----|------|
| chrome.tabs | 标签页管理和标记 |
| chrome.storage | 本地数据存储 |
| chrome.commands | 快捷键注册和监听 |
| chrome.action | 工具栏图标和弹窗 |
| chrome.runtime | 扩展通信 |

---

## 3. 项目结构

### 3.1 文件目录

```
tabmarker/
├── manifest.json          # 插件配置文件
├── background/            # 后台脚本
│   ├── background.js      # 主脚本
│   └── storage.js         # 存储管理
├── popup/                 # 弹窗页面
│   ├── popup.html         # HTML结构
│   ├── popup.js           # 交互逻辑
│   └── popup.css          # 样式
├── options/               # 选项页面
│   ├── options.html       # HTML结构
│   ├── options.js         # 设置逻辑
│   └── options.css        # 样式
├── content/               # 内容脚本
│   └── content.js         # 页面脚本
└── icons/                 # 图标资源
    ├── icon16.png         # 16x16图标
    ├── icon32.png         # 32x32图标
    ├── icon48.png         # 48x48图标
    └── icon128.png        # 128x128图标
```

### 3.2 核心模块

| 模块 | 职责 |
|------|------|
| storage.js | 负责所有数据的读取、写入和缓存管理 |
| tabManager.js | 负责标签页标记的增删改查 |
| shortcutManager.js | 负责快捷键的注册、监听和处理 |
| uiComponents.js | 负责通用UI组件的封装 |

---

## 4. 数据模型

### 4.1 存储结构

使用chrome.storage.local存储用户数据。

#### 常用Tag组合

```json
{
  "savedTags": [
    {
      "id": "tag_001",
      "name": "工作文档",
      "color": "#FF6B6B",
      "emoji": "📋",
      "text": "WORK"
    }
  ]
}
```

#### 快捷键设置

```json
{
  "shortcuts": {
    "openPopup": {
      "key": "Alt+T",
      "description": "打开插件"
    },
    "quickTag1": {
      "key": "Alt+Shift+1",
      "description": "快速应用tag1"
    }
  }
}
```

#### 标签页标记

```javascript
// 使用chrome.tabs API存储
{
  "tabId": 12345,
  "marker": {
    "color": "#4ECDC4",
    "emoji": "📚",
    "text": "阅读"
  }
}
```

---

## 5. API设计

### 5.1 Storage API

| 方法 | 返回类型 | 说明 |
|------|----------|------|
| getSavedTags() | Promise<array> | 获取所有保存的tag组合 |
| saveTag(tag) | Promise<void> | 保存新的tag组合 |
| updateTag(id, tag) | Promise<void> | 更新指定tag组合 |
| deleteTag(id) | Promise<void> | 删除指定tag组合 |
| getShortcuts() | Promise<object> | 获取快捷键设置 |
| saveShortcuts(shortcuts) | Promise<void> | 保存快捷键设置 |

### 5.2 Tab API

| 方法 | 返回类型 | 说明 |
|------|----------|------|
| getTabMarker(tabId) | Promise<object> | 获取标签页标记 |
| setTabMarker(tabId, marker) | Promise<void> | 设置标签页标记 |
| clearTabMarker(tabId) | Promise<void> | 清除标签页标记 |
| applyQuickTag(tabId, tagId) | Promise<void> | 应用快速tag |

### 5.3 Shortcut API

| 方法 | 返回类型 | 说明 |
|------|----------|------|
| registerShortcut(key, callback) | void | 注册快捷键 |
| unregisterShortcut(key) | void | 注销快捷键 |
| validateShortcut(key) | boolean | 验证快捷键格式 |
| checkConflict(key) | boolean | 检查快捷键冲突 |

---

## 6. Manifest配置

```json
{
  "manifest_version": 3,
  "name": "TabMarker - 标签页标记助手",
  "version": "1.0.0",
  "description": "通过颜色、emoji和文字快速标记浏览器标签页",
  "permissions": [
    "tabs",
    "storage",
    "activeTab",
    "commands"
  ],
  "background": {
    "service_worker": "background/background.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png"
    }
  },
  "options_page": "options/options.html",
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Alt+T"
      }
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

---

*文档结束*
