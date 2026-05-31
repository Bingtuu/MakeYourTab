# MakeYourTab 1.0.0

MakeYourTab is a Chrome extension that helps users mark, recognize, and jump between tabs faster by adding visual labels such as color, emoji, and short text tags.

It is designed for people who keep many tabs open at the same time and need a lightweight way to organize them without leaving the browser.

---

## What It Does

- Adds a visual marker to the current tab
- Supports color, emoji, and text combinations
- Changes the tab title while the page is open
- Replaces the favicon with a generated icon for stronger visual recognition
- Shows a floating in-page marker panel
- Saves presets for frequently used tag combinations
- Saves recent tags for one-click reuse
- Shows marked tabs in the current browser window
- Lets users click a panel item to jump to that tab
- Lets users double-click a panel item to ping the tab without switching
- Supports Chinese and English UI switching

---

## Main Use Cases

### 1. Mark Important Tabs

Use a label like:

- `Red + 🔥 + HOT`
- `Blue + 📘 + DOC`
- `Green + ✅ + DONE`

This makes important pages easier to recognize at a glance.

### 2. Reuse the Same Tag on Similar Pages

If you just tagged one page, the same tag appears in the `Recent Tags` section, so you can apply it again on another page with one click.

### 3. Navigate Across Many Open Tabs

The floating panel on the page shows up to 15 marked tabs from the current browser window. Click one item to jump to the related page.

### 4. Ping a Tab Without Switching

Double-click a floating panel item to trigger an attention effect on the related tab instead of switching. The target tab flashes its title and favicon so users can locate it without leaving the current page.

---

## Core Interface

### Popup Panel

```text
+------------------------------------------------------+
| MakeYourTab                             EN | Settings |
+------------------------------------------------------+
| Current tab info                                       |
+------------------------------------------------------+
| Live Preview                                          |
| [ 📘 [DOC] Example Page ]                             |
+------------------------------------------------------+
| Color                                                 |
| [red] [orange] [yellow] [green] [blue] [purple] ...  |
| Emoji                                                 |
| [📌] [🔥] [⭐] [✅] [📘] [📚] ...                    |
| Text Tag                                              |
| [ DOC / TODO / HOT ]                                  |
| [Clear]                             [Apply Marker]    |
+------------------------------------------------------+
| Recent Tags                                           |
| [Apply] 🔥 HOT                                        |
| [Apply] 📘 DOC                                        |
+------------------------------------------------------+
| Presets                                               |
| [Save Current]                                        |
| [Apply] Work Docs                         [Delete]    |
+------------------------------------------------------+
```

### In-Page Floating Panel

```text
+--------------------------------------+
| Design                               |
| Click to open · Double click to ping |
+--------------------------------------+
| 🔥 HOT         Product Page      ●   |
| 📘 DOC         API Reference     ●   |
| ✅ DONE        Review Task       ●   |
+--------------------------------------+
```

Behavior:

- Drag the panel to move it
- Click an item to activate that tab
- Double-click an item to ping the related tab without switching
- The panel hint follows the selected Chinese/English language

---

## How Tagging Works

MakeYourTab does **not** change the native Chrome tab background color directly.

Instead, it builds visual recognition through:

```text
Tab Recognition Layer

1. Title Prefix
   Example:
   [📘 DOC] API Reference

2. Generated Favicon
   A small colored icon replaces the page favicon while the page is open

3. Floating Page Panel
   A visible in-page panel shows marked tabs and shortcuts

4. Popup Lists
   Recent tags and presets are accessible from the popup
```

This makes the experience practical while staying within Chrome extension capabilities.

---

## How To Use

### Install Locally

1. Open `chrome://extensions/`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select the extension folder

### Mark a Tab

1. Open any normal web page
2. Click the MakeYourTab extension icon
3. Pick a color
4. Pick an emoji
5. Enter a short text tag
6. Click `Apply Marker`

### Reuse a Recent Tag

1. Open another page
2. Open the popup
3. Go to `Recent Tags`
4. Click `Apply`

### Save a Preset

1. Configure a tag
2. Enter a preset name
3. Click `Save Current`

### Jump to Another Marked Tab

1. Open a marked page
2. Find the floating panel
3. Click a tab item

### Ping Another Marked Tab

1. Open a marked page
2. Double-click one item in the floating panel
3. The related tab gets an attention effect

---

## Keyboard Shortcuts

Default shortcuts:

- `Alt + T` to open the popup
- `Alt + Shift + C` to clear the current marker

Preset shortcuts can be assigned from:

- `chrome://extensions/shortcuts`

---

## Language Support

MakeYourTab supports:

- `Chinese`
- `English`

Users can switch language from:

- the popup header button
- the settings page

---

## Notes and Limitations

- Native Chrome tab background color cannot be changed directly by extensions
- Protected pages such as `chrome://*` and the Chrome Web Store do not allow normal script injection
- Local `file://` pages require enabling `Allow access to file URLs`
- Visual title/icon changes only remain while the page is open and controlled by the extension

---

## Best For

- Developers with many documentation tabs
- Researchers comparing multiple sources
- Operators handling dashboards and reports
- Anyone who wants faster visual tab recognition

---

## Version

- Product name: `MakeYourTab`
- Release version: `1.0.0`
