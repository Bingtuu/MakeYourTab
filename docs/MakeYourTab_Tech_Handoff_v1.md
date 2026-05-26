# MakeYourTab Technical Handoff

## 1. Document Purpose

This document is the primary technical handoff for `MakeYourTab 1.0.0`.

It is written for the next development phase, especially for:

- `1.0.1` maintenance
- future feature iteration
- vibe-coding style collaboration
- new contributors who need fast project context

This document should be treated as the current engineering source of truth for implementation, architecture, storage, permissions, and extension behavior.

---

## 2. Product Summary

`MakeYourTab` is a Chrome extension for visually marking and managing open tabs.

It helps users:

- mark the current tab with color, emoji, and text
- reuse recent tags quickly
- save and apply presets
- manage marked tabs from the popup
- manage marked tabs from a floating in-page panel
- switch language between Chinese and English

The extension is local-first and stores data only in browser-local extension storage.

---

## 3. Recommended Project Layout

For ongoing development, the project should be mentally divided into four groups:

### 3.1 Runtime Source Files

These are required for the extension to run.

```text
manifest.json
background/
content/
popup/
options/
shared/
icons/
```

### 3.2 Developer Support Files

These are not required at runtime, but should be kept for maintenance and future release work.

```text
scripts/
docs/MakeYourTab_Release_Guide_EN.md
docs/MakeYourTab_Tech_Handoff_v1.md
```

### 3.3 Historical Planning Documents

These are useful as archive/reference, but they are no longer the best starting point for implementation work.

```text
docs/archive/TabMarker_Documentation.md
docs/archive/TabMarker_Spec_v2.md
docs/archive/02_TabMarker_TechSpec.md
docs/archive/03_TabMarker_PrivacySecurity.md
docs/archive/04_TabMarker_DevTasks.md
docs/archive/05_TabMarker_ImplementationPlan.md
```

### 3.4 Release Artifacts

These are generated outputs. They are useful for release history but are not source files.

```text
release/
```

---

## 4. What To Keep In The Current Project

If the goal is to keep the repository clean but still fully usable, keep the following files and folders in the main project:

### 4.1 Must Keep

```text
manifest.json
background/
content/
popup/
options/
shared/
icons/
scripts/generate-icons.ps1
docs/MakeYourTab_Tech_Handoff_v1.md
docs/MakeYourTab_Release_Guide_EN.md
```

### 4.2 Recommended To Keep As Archive

```text
docs/TabMarker_Documentation.md
docs/TabMarker_Spec_v2.md
docs/02_TabMarker_TechSpec.md
docs/03_TabMarker_PrivacySecurity.md
docs/04_TabMarker_DevTasks.md
docs/05_TabMarker_ImplementationPlan.md
```

These documents are useful for tracing earlier decisions, but new development should not rely on them as the primary implementation guide.

### 4.3 Can Be Moved Out Of The Main Development Path

```text
release/
```

Recommended handling:

- keep it if this repository also acts as a release archive
- move it to a separate `artifacts/` or external release storage if you want a cleaner source repo

Important:

- do not delete `release/` unless you no longer need historical build outputs
- do not store future release zips in the root directory

---

## 5. Suggested Clean Structure

If you want a cleaner repo for `1.0.1+`, the project can be treated like this:

```text
makeyourtab/
├── manifest.json
├── background/
├── content/
├── popup/
├── options/
├── shared/
├── icons/
├── scripts/
│   └── generate-icons.ps1
├── docs/
│   ├── MakeYourTab_Tech_Handoff_v1.md
│   ├── MakeYourTab_Release_Guide_EN.md
│   └── archive/
│       ├── TabMarker_Documentation.md
│       ├── TabMarker_Spec_v2.md
│       ├── 02_TabMarker_TechSpec.md
│       ├── 03_TabMarker_PrivacySecurity.md
│       ├── 04_TabMarker_DevTasks.md
│       └── 05_TabMarker_ImplementationPlan.md
└── release/
    └── MakeYourTab-1.0.0-chrome-web-store.zip
```

This is a recommendation only. No files need to be moved immediately unless you want me to reorganize them.

---

## 6. Runtime Architecture

The extension uses `Manifest V3`.

### 6.1 Main Layers

#### `background/`

The service worker is the central control layer.

Responsibilities:

- read/write extension state
- manage tab marker lifecycle
- inject content logic when needed
- broadcast floating panel updates
- handle popup and options requests
- activate tabs and send tab attention signals

Main file:

- `background/main.js`

#### `content/`

The content script is the page-level visual layer.

Responsibilities:

- update `document.title`
- replace favicon with generated marker icon
- show floating panel
- make floating panel draggable
- open or ping tabs from the floating panel
- restore page state after marker removal

Main file:

- `content/marker.js`

#### `popup/`

The popup is the primary user-facing control panel.

Responsibilities:

- current tab editing
- preview marker
- save presets
- reuse recent tags
- view marked tabs
- language toggle

#### `options/`

The options page contains lower-frequency settings.

Responsibilities:

- toggle page badge visibility
- switch language
- view/delete presets
- shortcut guidance

#### `shared/`

Shared constants, i18n strings, and validation helpers.

---

## 7. Core Files

### `manifest.json`

Defines:

- extension name/version
- service worker
- popup
- options page
- icons
- commands
- permissions and host permissions

### `background/main.js`

Main orchestration file.

Important responsibilities:

- `GET_POPUP_DATA`
- `APPLY_MARKER`
- `CLEAR_MARKER`
- `SAVE_PRESET`
- `DELETE_PRESET`
- `TOGGLE_SETTING`
- `SAVE_BADGE_POSITION`
- `ACTIVATE_MARKED_TAB`
- `PING_MARKED_TAB`
- `CONTENT_READY`

### `background/storage.js`

Persistent state layer built on `chrome.storage.local`.

### `content/marker.js`

Most visually complex part of the system.

Contains:

- title sync
- favicon sync
- floating overlay rendering
- drag behavior
- click / double-click overlay actions

### `popup/popup.js`

Main popup interaction logic and i18n rendering.

### `options/options.js`

Settings page logic and i18n rendering.

### `shared/constants.js`

Important values:

- `MAX_PRESETS`
- `MAX_RECENT_MARKERS`
- `MAX_TEXT_LENGTH`
- `MAX_OVERLAY_ITEMS`
- `DEFAULT_SETTINGS`
- `MESSAGE_TYPES`

### `shared/i18n.js`

Current language pack source.

### `shared/validators.js`

Marker and preset validation logic.

---

## 8. Current Feature Set In 1.0.0

### Marker Features

- color marker
- emoji marker
- text marker
- combined marker
- clear marker

### Storage Features

- save presets
- delete presets
- save recent tags
- save language
- save page badge visibility
- save floating panel position

### Visual Features

- tab title prefix
- generated favicon
- floating panel
- draggable panel
- up to 15 marked tabs displayed in floating panel

### Tab Interaction Features

- popup-based tab switching
- floating panel click to activate tab
- floating panel double-click to ping tab

### UX Features

- Chinese/English switching
- recent tag reuse
- preset reuse
- current-window marked tab list

---

## 9. Storage Model

Persistent storage lives under one key in `chrome.storage.local`.

### Root Storage Key

```javascript
tabmarkerState
```

### Shape

```javascript
{
  version: 1,
  tabMarkers: {},
  savedPresets: [],
  recentMarkers: [],
  settings: {
    showPageBadge: true,
    language: "zh-CN",
    badgePosition: null
  }
}
```

### `tabMarkers`

Indexed by `tabId` string.

Each item contains:

- `tabId`
- `windowId`
- `url`
- `title`
- `marker`
- `original.title`
- `original.faviconUrl`
- `updatedAt`

### `savedPresets`

Manually saved reusable marker combinations.

### `recentMarkers`

Auto-generated history of recently applied markers.

### `settings`

Current known settings:

- `showPageBadge`
- `language`
- `badgePosition`

---

## 10. Message Flow

### Popup Apply Flow

```text
popup -> background: APPLY_MARKER
background -> storage: save state
background -> content: APPLY_CONTENT_MARKER
background -> content: UPDATE_CONTENT_OVERLAY
```

### Popup Clear Flow

```text
popup -> background: CLEAR_MARKER
background -> storage: remove marker
background -> content: CLEAR_CONTENT_MARKER
background -> content: UPDATE_CONTENT_OVERLAY
```

### Page Load Restore Flow

```text
content -> background: CONTENT_READY
background -> content: marker + settings + overlayItems
content -> page: restore title / favicon / overlay
```

### Floating Panel Click Flow

```text
content -> background: ACTIVATE_MARKED_TAB
background -> Chrome tabs API: activate tab + focus window
```

### Floating Panel Double Click Flow

```text
content -> background: PING_MARKED_TAB
background -> content(target tab): FLASH_TAB_ATTENTION
```

---

## 11. Permissions And Why They Exist

### `storage`

Needed for:

- markers
- presets
- recent tags
- language
- panel position

### `tabs`

Needed for:

- tab metadata
- activating a marked tab
- building marked tab lists
- detecting lifecycle changes

### `activeTab`

Needed for:

- working with the current active tab when popup actions occur

### `scripting`

Needed for:

- injecting or re-injecting the content script into supported pages

### `host_permissions: <all_urls>`

Needed for:

- applying visual markers to user-opened pages
- restoring state after reload
- rendering the floating panel

---

## 12. Important Technical Limitations

These are critical for future contributors to understand.

### 12.1 Native Chrome Tab Background Color Cannot Be Changed

The extension cannot directly recolor the native browser tab background.

Current workaround:

- title prefix
- generated favicon
- floating in-page panel
- popup lists

### 12.2 Protected Pages Cannot Be Fully Injected

Examples:

- `chrome://*`
- Chrome Web Store
- some restricted pages

Result:

- marker state may still exist in extension storage
- page-level title/favicon/panel changes may not apply

### 12.3 Title And Favicon Are Not Stable Without Sync

Many websites overwrite their own title or favicon dynamically.

Current solution:

- interval-based title sync
- interval-based favicon sync

This is functional but should be treated as a pragmatic workaround, not a perfect long-term architecture.

---

## 13. Known Technical Debt

This section matters for `1.0.1+`.

### 13.1 Overlay Styling Lives Inside JS

`content/marker.js` contains large amounts of inline style assignment.

Impact:

- hard to maintain
- hard to theme
- hard to localize hint text

Suggested future fix:

- move overlay UI generation toward a dedicated style template or injected CSS block

### 13.2 `content/marker.js` Is Too Large

It currently mixes:

- favicon logic
- title logic
- overlay rendering
- drag logic
- attention animation
- tab activation interactions

Suggested future split:

- `title-manager`
- `favicon-manager`
- `overlay-manager`
- `attention-manager`

### 13.3 Popup And Options Still Depend On Manual DOM Mapping

Current UI is fine for small scope, but more features will make it harder to maintain.

Suggested future fix:

- keep vanilla JS if desired
- but introduce a stricter render structure or UI helper layer

### 13.4 No Automated Test Coverage

Current version relies on manual verification only.

For `1.0.1`, add lightweight verification at least for:

- validators
- i18n fallback behavior
- storage shape migration

### 13.5 Some Strings Still Live Outside i18n Intent

Core UI is localized, but future work should keep all user-facing text in `shared/i18n.js`.

---

## 14. Recommended 1.0.1 Development Priorities

If the next version is a practical maintenance release, recommended priorities are:

### Priority A

- clean repository structure
- move old docs into `docs/archive/`
- keep one main handoff document
- keep one release guide

### Priority B

- refactor `content/marker.js`
- extract overlay style generation
- reduce inline style duplication

### Priority C

- improve floating panel UX for long lists
- consider internal scrolling or compact mode
- consider stronger grouping for marked tabs

### Priority D

- improve release workflow
- add a single script for build/package/release copy

### Priority E

- add a proper `README.md`
- add a standalone privacy policy file
- add a Chrome Web Store submission checklist

---

## 15. Recommended Manual QA Checklist

Before releasing any new version, manually verify:

### Popup

- popup opens
- current tab info loads
- apply marker works
- clear marker works
- recent tags update
- presets save/delete work
- language toggle works

### Content Behavior

- title updates correctly
- favicon updates correctly
- page panel appears
- panel drag persists
- up to 15 items display
- panel click activates target tab
- panel double-click pings target tab

### Options

- language switch works
- badge visibility toggle works
- shortcut page opens
- preset deletion works

### Edge Cases

- page refresh restores marker
- service worker restart still works
- unsupported pages fail gracefully
- local file pages behave correctly when file access is enabled

---

## 16. Release Workflow

Current release workflow is manual.

### Current Steps

1. update `manifest.json`
2. regenerate icons if needed using `scripts/generate-icons.ps1`
3. verify runtime files
4. copy runtime files to `release/MakeYourTab-x.y.z/`
5. zip the release folder

### Current Release Artifact

```text
release/MakeYourTab-1.0.0-chrome-web-store.zip
```

Suggested future improvement:

- add a single release script to automate version bump, asset copy, and zip generation

---

## 17. Suggested Rules For Future Vibe Coding

If another AI or developer continues this project, these rules will save time:

1. Treat `docs/MakeYourTab_Tech_Handoff_v1.md` as the starting point
2. Treat old `TabMarker*` docs as historical reference only
3. Do not redesign native Chrome tab background color features because they are not realistically available
4. Keep all new user-facing text inside `shared/i18n.js`
5. Avoid adding more large inline styles to `content/marker.js`
6. Prefer small, incremental changes because popup/content/background interactions are tightly coupled
7. Re-test popup, content overlay, and storage after every non-trivial change

---

## 18. Recommended Next Documentation Files

For a cleaner long-term repository, the next helpful docs would be:

- `README.md`
- `PRIVACY_POLICY.md`
- `RELEASE_CHECKLIST.md`
- `docs/archive/` for old planning docs

---

## 19. Practical Summary

If you only remember one thing:

`MakeYourTab` is a local-first MV3 Chrome extension whose runtime depends on `background + content + popup + options + shared + icons + manifest`.

For future work:

- keep runtime files small and explicit
- keep documentation centralized
- keep old planning docs archived, not deleted
- avoid using historical PRD files as implementation truth
