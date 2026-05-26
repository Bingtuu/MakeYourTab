# MakeYourTab Release Checklist

Use this checklist for preparing and submitting new versions of MakeYourTab to the Chrome Web Store.

## Pre-Release Checks

### Code and Functionality
- [ ] Update version number in `manifest.json`
- [ ] Verify all runtime files are present:
  - `manifest.json`
  - `background/`
  - `content/`
  - `popup/`
  - `options/`
  - `shared/`
  - `icons/`
- [ ] Regenerate icons if needed using `scripts/generate-icons.ps1`
- [ ] Run manual tests (see test checklist below)
- [ ] Verify no console errors in popup or background
- [ ] Check for any new permissions or host permissions

### Documentation
- [ ] Update `README.md` if needed
- [ ] Update `PRIVACY_POLICY.md` if needed
- [ ] Update `docs/MakeYourTab_Tech_Handoff_v1.md` if needed
- [ ] Update `docs/MakeYourTab_Release_Guide_EN.md` if needed

### Localization
- [ ] Verify all new user-facing text is in `shared/i18n.js`
- [ ] Test both Chinese and English UI

## Release Package
- [ ] Create release directory: `release/MakeYourTab-x.y.z/`
- [ ] Copy runtime files to the release directory
- [ ] Zip the release directory
- [ ] Verify zip file size is reasonable (< 1MB)

## Chrome Web Store Submission
- [ ] Log in to Chrome Web Store Developer Dashboard
- [ ] Upload the new zip file
- [ ] Update version number in the dashboard
- [ ] Update description if needed
- [ ] Upload new screenshots if needed
- [ ] Update privacy policy link if needed
- [ ] Review and confirm all permission justifications
- [ ] Submit for review

## Post-Submission
- [ ] Monitor review status
- [ ] Address any review feedback promptly
- [ ] Publish the extension when approved
- [ ] Update release notes if applicable

## Manual Test Checklist

### Popup
- [ ] Popup opens with `Alt + T`
- [ ] Color picker works
- [ ] Emoji picker works
- [ ] Text input works with length limit
- [ ] Apply marker updates tab title and favicon
- [ ] Clear marker restores original title and favicon
- [ ] Recent tags appear and work
- [ ] Presets save and apply
- [ ] Marked tabs list shows and allows switching
- [ ] Language toggle works
- [ ] Settings button opens options page

### Floating Panel
- [ ] Panel appears on marked pages
- [ ] Panel shows up to 15 marked tabs
- [ ] Clicking panel items activates target tab
- [ ] Double-clicking panel items pings target tab
- [ ] Panel is draggable and position is saved

### Options Page
- [ ] Language switch works
- [ ] Badge visibility toggle works
- [ ] Shortcut page opens
- [ ] Preset deletion works

### Edge Cases
- [ ] Page refresh restores marker
- [ ] Service worker restart still works
- [ ] Unsupported pages fail gracefully
- [ ] Local file pages behave correctly when file access is enabled

## Versioning

Follow semantic versioning:
- `MAJOR.MINOR.PATCH`
- `MAJOR`: Breaking changes
- `MINOR`: New features
- `PATCH`: Bug fixes

## Release Artifacts

Keep the following artifacts for each release:
- `release/MakeYourTab-x.y.z-chrome-web-store.zip`
- Screenshots used in Chrome Web Store listing
- Release notes (if applicable)
