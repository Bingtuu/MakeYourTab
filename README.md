# MakeYourTab

MakeYourTab is a Chrome extension for visually marking and managing open browser tabs. It helps users quickly recognize, organize, and switch between important pages by adding color, emoji, and text labels.

## Features

- **Visual Tab Marking**: Add color, emoji, and text tags to the current tab
- **Quick Recognition**: Updated tab titles and generated marker icons for faster identification
- **Recent Tags**: Reuse recent tag combinations with one click
- **Saved Presets**: Store frequently used tag combinations for easy application
- **Floating Panel**: Manage marked tabs from a draggable in-page panel that follows the selected language
- **Tab Switching**: Click panel items to jump to marked tabs
- **Tab Pinging**: Double-click panel items to ping a tab without switching, using title and favicon flashing
- **Language Support**: Switch between Chinese and English UI

## Installation

### From Chrome Web Store
1. Visit the Chrome Web Store listing for MakeYourTab
2. Click "Add to Chrome"
3. Follow the prompts to install

### For Development
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the project root directory

## Usage

1. **Open the extension**: Click the MakeYourTab icon in the Chrome toolbar or use the keyboard shortcut `Alt + T`
2. **Mark a tab**: Choose a color, emoji, and text label, then click "Apply Marker"
3. **Reuse tags**: Use the "Recent Tags" section for quick reuse
4. **Apply presets**: Save and apply frequently used tag combinations
5. **Manage marked tabs**: Use the floating in-page panel; the popup focuses on editing, recent tags, and presets
6. **Clear a marker**: Click "Clear" in the popup

## Keyboard Shortcuts

- **Open popup**: `Alt + T`
- **Clear current marker**: `Alt + Shift + C`
- **Apply preset 1-3**: `Alt + Shift + 1-3`

To customize shortcuts, visit `chrome://extensions/shortcuts`

## Technical Notes

- **Local-first**: All data is stored locally in the browser
- **Chrome Manifest V3**: Built for modern Chrome extensions
- **Permissions**: Uses `tabs`, `activeTab`, `scripting`, `storage`, and host permissions
- **Limitations**: Cannot directly change native Chrome tab background color
- **Marker descriptions**: Recent tags and presets distinguish color-only, symbol-only, text-only, and no-color marker combinations

## Development

For development guidelines and technical details, refer to:
- `docs/MakeYourTab_Tech_Handoff_v1.md`

## Privacy

MakeYourTab is a local-first extension that does not sell user data or transfer data to third parties. For more details, see `PRIVACY_POLICY.md`.

## Version

Current version: 1.0.0

## License

MIT
