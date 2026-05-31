import {
  COMMON_EMOJIS,
  MAX_TEXT_LENGTH,
  MESSAGE_TYPES,
  PRESET_COLORS
} from "../shared/constants.js";
import { normalizeLanguage, t } from "../shared/i18n.js";

const elements = {
  pageTitle: document.getElementById("pageTitle"),
  currentTabMeta: document.getElementById("currentTabMeta"),
  noticeText: document.getElementById("noticeText"),
  previewLabel: document.getElementById("previewLabel"),
  previewChip: document.getElementById("previewChip"),
  previewText: document.getElementById("previewText"),
  feedbackText: document.getElementById("feedbackText"),
  colorLabel: document.getElementById("colorLabel"),
  colorGrid: document.getElementById("colorGrid"),
  emojiLabel: document.getElementById("emojiLabel"),
  emojiGrid: document.getElementById("emojiGrid"),
  textLabel: document.getElementById("textLabel"),
  customColorInput: document.getElementById("customColorInput"),
  tagTextInput: document.getElementById("tagTextInput"),
  charCountText: document.getElementById("charCountText"),
  applyButton: document.getElementById("applyButton"),
  clearButton: document.getElementById("clearButton"),
  recentLabel: document.getElementById("recentLabel"),
  recentList: document.getElementById("recentList"),
  presetLabel: document.getElementById("presetLabel"),
  presetLimitText: document.getElementById("presetLimitText"),
  presetNameInput: document.getElementById("presetNameInput"),
  savePresetButton: document.getElementById("savePresetButton"),
  presetList: document.getElementById("presetList"),
  openOptionsButton: document.getElementById("openOptionsButton"),
  languageToggleButton: document.getElementById("languageToggleButton"),
  shortcutsLabel: document.getElementById("shortcutsLabel"),
  customizeShortcutsButton: document.getElementById("customizeShortcutsButton"),
  shortcutsList: document.getElementById("shortcutsList"),
  shortcutOpenPopupLabel: document.getElementById("shortcutOpenPopupLabel"),
  shortcutClearMarkerLabel: document.getElementById("shortcutClearMarkerLabel")
};

const state = {
  currentTab: null,
  currentMarker: null,
  presets: [],
  recentMarkers: [],
  settings: {
    language: "zh-CN"
  },
  selectedColor: "",
  selectedEmoji: "",
  editingPresetId: null
};

function currentLanguage() {
  return normalizeLanguage(state.settings?.language);
}

function tr(key, vars) {
  return t(currentLanguage(), key, vars);
}

function shortenUrl(url = "") {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

function showFeedback(text, isError = false) {
  elements.feedbackText.textContent = text;
  elements.feedbackText.style.color = isError ? "#FCA5A5" : "#7DD3FC";
}

function renderStaticText() {
  document.documentElement.lang = currentLanguage();
  document.body.dataset.lang = currentLanguage();
  elements.pageTitle.textContent = tr("popup.title");
  elements.previewLabel.textContent = tr("popup.preview");
  elements.colorLabel.textContent = tr("popup.color");
  elements.emojiLabel.textContent = tr("popup.emoji");
  elements.textLabel.textContent = tr("popup.textLabel");
  elements.clearButton.textContent = tr("popup.clear");
  elements.applyButton.textContent = tr("popup.apply");
  elements.recentLabel.textContent = tr("popup.recent");
  elements.presetLabel.textContent = tr("popup.presets");
  elements.shortcutsLabel.textContent = tr("popup.shortcuts");
  elements.shortcutOpenPopupLabel.textContent = tr("popup.shortcut.openPopup");
  elements.shortcutClearMarkerLabel.textContent = tr("popup.shortcut.clearMarker");
  elements.customizeShortcutsButton.textContent = tr("popup.customizeShortcuts");
  elements.presetLimitText.textContent = tr("popup.presetLimit");
  elements.savePresetButton.textContent = state.editingPresetId ? tr("popup.updatePreset") : tr("popup.saveCurrent");
  elements.openOptionsButton.textContent = tr("popup.settings");
  elements.tagTextInput.placeholder = tr("popup.textPlaceholder");
  elements.presetNameInput.placeholder = tr("popup.presetName");
  elements.languageToggleButton.textContent = currentLanguage() === "zh-CN" ? "EN" : "中文";
}

function getFormMarker() {
  return {
    color: state.selectedColor,
    emoji: state.selectedEmoji,
    text: elements.tagTextInput.value.trim()
  };
}

function buildMarkerText(marker = {}) {
  return [marker.emoji, marker.text].filter(Boolean).join(" ");
}

function describeMarker(marker = {}) {
  const hasColor = Boolean(marker.color);
  const hasEmoji = Boolean(marker.emoji);
  const hasText = Boolean(marker.text);

  if (hasEmoji && hasText) {
    return hasColor ? buildMarkerText(marker) : tr("popup.symbolAndText");
  }

  if (hasEmoji) {
    return hasColor ? marker.emoji : tr("popup.symbolOnly");
  }

  if (hasText) {
    return hasColor ? marker.text : tr("popup.textOnly");
  }

  if (hasColor) {
    return tr("popup.onlyColor");
  }

  return tr("popup.noColor");
}

function updateCharCount() {
  const value = elements.tagTextInput.value.trim();
  elements.charCountText.textContent = `${value.length} / ${MAX_TEXT_LENGTH}`;
}

function updatePreview() {
  const marker = getFormMarker();
  const parts = [];
  const hasMarker = Boolean(marker.color || marker.emoji || marker.text);

  if (marker.emoji) {
    parts.push(marker.emoji);
  }

  if (marker.text) {
    parts.push(`[${marker.text}]`);
  }

  parts.push(state.currentTab?.title || tr("popup.currentPage"));

  elements.previewText.textContent = hasMarker ? parts.join(" ") : tr("popup.unset");
  elements.previewChip.style.background = marker.color || "rgba(30, 41, 59, 0.88)";
  elements.applyButton.disabled = !marker.color && !marker.emoji && !marker.text;
}

function applyMarkerToForm(marker = {}, autoApply = false) {
  state.selectedColor = marker.color || "";
  state.selectedEmoji = marker.emoji || "";
  elements.customColorInput.value = marker.color || "#3B82F6";
  elements.tagTextInput.value = marker.text || "";
  renderColorGrid();
  renderEmojiGrid();
  updateCharCount();
  updatePreview();

  if (autoApply) {
    return applyMarker();
  }

  return Promise.resolve();
}

function renderColorGrid() {
  elements.colorGrid.innerHTML = "";

  PRESET_COLORS.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `color-swatch${state.selectedColor.toLowerCase() === color.toLowerCase() ? " is-active" : ""}`;
    button.style.background = color;
    button.title = color;
    button.addEventListener("click", () => {
      state.selectedColor = color.toLowerCase();
      elements.customColorInput.value = color;
      renderColorGrid();
      updatePreview();
    });
    elements.colorGrid.appendChild(button);
  });
}

function renderEmojiGrid() {
  elements.emojiGrid.innerHTML = "";

  COMMON_EMOJIS.forEach((emoji) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `emoji-button${state.selectedEmoji === emoji ? " is-active" : ""}`;
    button.textContent = emoji;
    button.addEventListener("click", () => {
      state.selectedEmoji = state.selectedEmoji === emoji ? "" : emoji;
      renderEmojiGrid();
      updatePreview();
    });
    elements.emojiGrid.appendChild(button);
  });
}

function renderPresetList() {
  elements.presetList.innerHTML = "";

  if (!state.presets.length) {
    elements.presetList.innerHTML = `<p class="meta-text">${tr("popup.noPreset")}</p>`;
    return;
  }

  state.presets.forEach((preset, index) => {
    const item = document.createElement("div");
    item.className = "preset-card";
    item.draggable = true;
    item.dataset.presetId = preset.id;
    item.dataset.index = index;

    // Drag events
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", preset.id);
      e.dataTransfer.effectAllowed = "move";
      item.classList.add("is-dragging");
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("is-dragging");
      document.querySelectorAll(".preset-card").forEach((card) => {
        card.classList.remove("is-drag-over");
      });
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      item.classList.add("is-drag-over");
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("is-drag-over");
    });

    item.addEventListener("drop", (e) => {
      e.preventDefault();
      item.classList.remove("is-drag-over");
      const draggedId = e.dataTransfer.getData("text/plain");
      if (draggedId && draggedId !== preset.id) {
        reorderPresets(draggedId, preset.id);
      }
    });

    const main = document.createElement("div");
    main.className = "preset-main";

    const name = document.createElement("p");
    name.className = "preset-name";
    name.textContent = preset.name;

    const meta = document.createElement("p");
    meta.className = "preset-meta";
    meta.textContent = describeMarker(preset);

    main.append(name, meta);

    const actions = document.createElement("div");
    actions.className = "preset-actions";

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "mini-chip";
    chip.style.background = preset.color || "#334155";
    chip.textContent = buildMarkerText(preset) || tr("popup.applyChip");
    chip.addEventListener("click", async () => {
      await applyMarkerToForm(preset, true);
    });

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "ghost-button";
    edit.textContent = tr("popup.edit");
    edit.addEventListener("click", () => startEditPreset(preset));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger-button";
    remove.textContent = tr("popup.delete");
    remove.addEventListener("click", () => deletePreset(preset.id));

    actions.append(chip, edit, remove);
    item.append(main, actions);
    elements.presetList.appendChild(item);
  });
}

function renderRecentList() {
  elements.recentList.innerHTML = "";

  if (!state.recentMarkers.length) {
    elements.recentList.innerHTML = `<p class="meta-text">${tr("popup.recentEmpty")}</p>`;
    return;
  }

  state.recentMarkers.forEach((recent) => {
    const item = document.createElement("div");
    item.className = "preset-card";

    const main = document.createElement("div");
    main.className = "preset-main";

    const name = document.createElement("p");
    name.className = "preset-name";
    name.textContent = buildMarkerText(recent) || describeMarker(recent);

    const meta = document.createElement("p");
    meta.className = "preset-meta";
    meta.textContent = recent.color || tr("popup.noColor");

    main.append(name, meta);

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "mini-chip";
    chip.style.background = recent.color || "#334155";
    chip.textContent = tr("popup.applyChip");
    chip.addEventListener("click", async () => {
      await applyMarkerToForm(recent, true);
    });

    item.append(main, chip);
    elements.recentList.appendChild(item);
  });
}

function syncForm(marker = null) {
  const safeMarker = marker?.marker || marker || {};
  applyMarkerToForm(safeMarker, false);
}

function renderCurrentTab() {
  if (!state.currentTab) {
    elements.currentTabMeta.textContent = tr("popup.noCurrentTab");
    return;
  }

  elements.currentTabMeta.textContent = `${state.currentTab.title} · ${shortenUrl(state.currentTab.url)}`;

  if (!state.currentTab.injectable) {
    elements.noticeText.textContent = tr("popup.restrictedNotice");
    elements.noticeText.classList.remove("hidden");
  } else {
    elements.noticeText.classList.add("hidden");
  }
}

async function request(type, payload = {}) {
  return chrome.runtime.sendMessage({
    type,
    ...payload
  });
}

async function loadPopupData() {
  const response = await request(MESSAGE_TYPES.GET_STATE);
  if (!response?.ok) {
    showFeedback(response?.error || tr("feedback.loadFailed"), true);
    return;
  }

  state.currentTab = response.data.currentTab;
  state.currentMarker = response.data.currentMarker;
  state.presets = response.data.presets || [];
  state.recentMarkers = response.data.recentMarkers || [];
  state.settings = response.data.settings || state.settings;

  renderStaticText();
  renderCurrentTab();
  syncForm(state.currentMarker);
  renderRecentList();
  renderPresetList();
}

async function applyMarker() {
  if (!state.currentTab?.id) {
    return;
  }

  const response = await request(MESSAGE_TYPES.APPLY_MARKER, {
    tabId: state.currentTab.id,
    payload: getFormMarker()
  });

  if (!response?.ok) {
    showFeedback(response?.error || tr("feedback.applyFailed"), true);
    return;
  }

  showFeedback(state.currentTab.injectable ? tr("feedback.applySuccess") : tr("feedback.applyRestricted"));
  await loadPopupData();
}

async function clearMarker() {
  if (!state.currentTab?.id) {
    return;
  }

  const response = await request(MESSAGE_TYPES.CLEAR_MARKER, {
    tabId: state.currentTab.id
  });

  if (!response?.ok) {
    showFeedback(response?.error || tr("feedback.clearFailed"), true);
    return;
  }

  showFeedback(tr("feedback.clearSuccess"));
  elements.presetNameInput.value = "";
  syncForm();
  await loadPopupData();
}

function startEditPreset(preset) {
  state.editingPresetId = preset.id;
  applyMarkerToForm(preset, false);
  elements.presetNameInput.value = preset.name;
  elements.savePresetButton.textContent = tr("popup.updatePreset");
  showFeedback(tr("feedback.editMode"));
}

function cancelEditPreset() {
  state.editingPresetId = null;
  elements.presetNameInput.value = "";
  elements.savePresetButton.textContent = tr("popup.saveCurrent");
}

async function savePreset() {
  if (state.editingPresetId) {
    const response = await request(MESSAGE_TYPES.UPDATE_PRESET, {
      presetId: state.editingPresetId,
      payload: {
        name: elements.presetNameInput.value,
        marker: getFormMarker()
      }
    });

    if (!response?.ok) {
      showFeedback(response?.error || tr("feedback.updatePresetFailed"), true);
      return;
    }

    cancelEditPreset();
    state.presets = response.data || [];
    renderPresetList();
    showFeedback(tr("feedback.updatePresetSuccess"));
    return;
  }

  const response = await request(MESSAGE_TYPES.SAVE_PRESET, {
    payload: {
      name: elements.presetNameInput.value,
      marker: getFormMarker()
    }
  });

  if (!response?.ok) {
    showFeedback(response?.error || tr("feedback.savePresetFailed"), true);
    return;
  }

  elements.presetNameInput.value = "";
  state.presets = response.data || [];
  renderPresetList();
  showFeedback(tr("feedback.savePresetSuccess"));
}

async function reorderPresets(draggedId, targetId) {
  const draggedIndex = state.presets.findIndex((p) => p.id === draggedId);
  const targetIndex = state.presets.findIndex((p) => p.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1) {
    return;
  }

  const newPresets = [...state.presets];
  const [draggedItem] = newPresets.splice(draggedIndex, 1);
  newPresets.splice(targetIndex, 0, draggedItem);

  const response = await request(MESSAGE_TYPES.REORDER_PRESETS, {
    orderedPresetIds: newPresets.map((preset) => preset.id)
  });

  if (!response?.ok) {
    showFeedback(tr("feedback.reorderFailed"), true);
    return;
  }

  state.presets = response.data || newPresets;
  renderPresetList();
}

async function deletePreset(presetId) {
  const response = await request(MESSAGE_TYPES.DELETE_PRESET, {
    presetId
  });

  if (!response?.ok) {
    showFeedback(response?.error || tr("feedback.deletePresetFailed"), true);
    return;
  }

  state.presets = response.data || [];
  renderPresetList();
  showFeedback(tr("feedback.deletePresetSuccess"));
}

async function toggleLanguage() {
  const nextLanguage = currentLanguage() === "zh-CN" ? "en" : "zh-CN";
  const response = await request(MESSAGE_TYPES.TOGGLE_SETTING, {
    key: "language",
    value: nextLanguage
  });

  if (!response?.ok) {
    showFeedback(response?.error || tr("feedback.loadFailed"), true);
    return;
  }

  state.settings = {
    ...state.settings,
    language: nextLanguage
  };
  renderStaticText();
  renderCurrentTab();
  updateCharCount();
  updatePreview();
  renderRecentList();
  renderPresetList();
  showFeedback(tr("feedback.languageUpdated"));
}

function bindEvents() {
  elements.customColorInput.addEventListener("input", (event) => {
    state.selectedColor = event.target.value.toLowerCase();
    renderColorGrid();
    updatePreview();
  });

  elements.tagTextInput.addEventListener("input", () => {
    updateCharCount();
    updatePreview();
  });

  elements.applyButton.addEventListener("click", applyMarker);
  elements.clearButton.addEventListener("click", clearMarker);
  elements.savePresetButton.addEventListener("click", savePreset);
  elements.openOptionsButton.addEventListener("click", async () => {
    await chrome.runtime.openOptionsPage();
  });
  elements.languageToggleButton.addEventListener("click", toggleLanguage);
  elements.customizeShortcutsButton.addEventListener("click", async () => {
    await chrome.tabs.create({
      url: "chrome://extensions/shortcuts"
    });
  });
}

bindEvents();
loadPopupData();
