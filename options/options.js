import { MESSAGE_TYPES } from "../shared/constants.js";
import { normalizeLanguage, t } from "../shared/i18n.js";

const presetList = document.getElementById("presetList");
const showBadgeToggle = document.getElementById("showBadgeToggle");
const languageSelect = document.getElementById("languageSelect");
const openShortcutsButton = document.getElementById("openShortcutsButton");
const feedbackText = document.getElementById("feedbackText");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const displayTitle = document.getElementById("displayTitle");
const displayDesc = document.getElementById("displayDesc");
const showBadgeLabel = document.getElementById("showBadgeLabel");
const languageTitle = document.getElementById("languageTitle");
const languageDesc = document.getElementById("languageDesc");
const shortcutTitle = document.getElementById("shortcutTitle");
const shortcutDesc = document.getElementById("shortcutDesc");
const shortcutOpenLabel = document.getElementById("shortcutOpenLabel");
const shortcutClearLabel = document.getElementById("shortcutClearLabel");
const shortcutPresetLabel = document.getElementById("shortcutPresetLabel");
const shortcutPresetDesc = document.getElementById("shortcutPresetDesc");
const presetTitle = document.getElementById("presetTitle");
const presetDesc = document.getElementById("presetDesc");
const restrictedTitle = document.getElementById("restrictedTitle");
const restrictedDesc = document.getElementById("restrictedDesc");
const restrictedChrome = document.getElementById("restrictedChrome");
const restrictedStore = document.getElementById("restrictedStore");
const restrictedSecure = document.getElementById("restrictedSecure");

let pageState = {
  presets: [],
  settings: {
    showPageBadge: true,
    language: "zh-CN"
  }
};

function currentLanguage() {
  return normalizeLanguage(pageState.settings?.language);
}

function tr(key, vars) {
  return t(currentLanguage(), key, vars);
}

function showFeedback(text, isError = false) {
  feedbackText.textContent = text;
  feedbackText.style.color = isError ? "#FCA5A5" : "#7DD3FC";
}

async function request(type, payload = {}) {
  return chrome.runtime.sendMessage({
    type,
    ...payload
  });
}

function renderStaticText() {
  document.documentElement.lang = currentLanguage();
  document.body.dataset.lang = currentLanguage();
  pageTitle.textContent = tr("options.title");
  pageSubtitle.textContent = tr("options.subtitle");
  displayTitle.textContent = tr("options.display.title");
  displayDesc.textContent = tr("options.display.desc");
  showBadgeLabel.textContent = tr("options.showBadge");
  languageTitle.textContent = tr("options.language.title");
  languageDesc.textContent = tr("options.language.desc");
  shortcutTitle.textContent = tr("options.shortcuts.title");
  shortcutDesc.textContent = tr("options.shortcuts.desc");
  openShortcutsButton.textContent = tr("options.shortcuts.open");
  shortcutOpenLabel.textContent = tr("options.shortcuts.openPopup");
  shortcutClearLabel.textContent = tr("options.shortcuts.clear");
  shortcutPresetLabel.textContent = tr("options.shortcuts.presets");
  shortcutPresetDesc.textContent = tr("options.shortcuts.customize");
  presetTitle.textContent = tr("options.presets.title");
  presetDesc.textContent = tr("options.presets.desc");
  restrictedTitle.textContent = tr("options.restricted.title");
  restrictedDesc.textContent = tr("options.restricted.desc");
  restrictedChrome.textContent = tr("options.restricted.chrome");
  restrictedStore.textContent = tr("options.restricted.store");
  restrictedSecure.textContent = tr("options.restricted.secure");
  languageSelect.value = currentLanguage();
}

function renderPresets() {
  presetList.innerHTML = "";

  if (!pageState.presets.length) {
    presetList.innerHTML = `<p class="preset-meta">${tr("options.presets.empty")}</p>`;
    return;
  }

  pageState.presets.forEach((preset) => {
    const row = document.createElement("div");
    row.className = "preset-item";

    const left = document.createElement("div");

    const name = document.createElement("p");
    name.className = "preset-name";
    name.textContent = preset.name;

    const meta = document.createElement("p");
    meta.className = "preset-meta";
    meta.textContent = [preset.color, preset.emoji, preset.text].filter(Boolean).join(" · ");

    left.append(name, meta);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger-button";
    remove.textContent = tr("popup.delete");
    remove.addEventListener("click", async () => {
      const response = await request(MESSAGE_TYPES.DELETE_PRESET, {
        presetId: preset.id
      });

      if (!response?.ok) {
        showFeedback(response?.error || tr("feedback.deletePresetFailed"), true);
        return;
      }

      pageState.presets = response.data || [];
      renderPresets();
      showFeedback(tr("feedback.deletePresetSuccess"));
    });

    row.append(left, remove);
    presetList.appendChild(row);
  });
}

async function loadData() {
  const response = await request(MESSAGE_TYPES.GET_POPUP_DATA);
  if (!response?.ok) {
    showFeedback(response?.error || tr("feedback.loadFailed"), true);
    return;
  }

  pageState.presets = response.data.presets || [];
  pageState.settings = response.data.settings || pageState.settings;
  showBadgeToggle.checked = Boolean(pageState.settings.showPageBadge);
  renderStaticText();
  renderPresets();
}

showBadgeToggle.addEventListener("change", async (event) => {
  const response = await request(MESSAGE_TYPES.TOGGLE_SETTING, {
    key: "showPageBadge",
    value: event.target.checked
  });

  if (!response?.ok) {
    showFeedback(response?.error || tr("feedback.loadFailed"), true);
    return;
  }

  pageState.settings = response.data || pageState.settings;
  showFeedback(tr("feedback.settingsUpdated"));
});

languageSelect.addEventListener("change", async (event) => {
  const response = await request(MESSAGE_TYPES.TOGGLE_SETTING, {
    key: "language",
    value: event.target.value
  });

  if (!response?.ok) {
    showFeedback(response?.error || tr("feedback.loadFailed"), true);
    return;
  }

  pageState.settings = response.data || pageState.settings;
  renderStaticText();
  renderPresets();
  showFeedback(tr("feedback.languageUpdated"));
});

openShortcutsButton.addEventListener("click", async () => {
  const response = await request(MESSAGE_TYPES.OPEN_SHORTCUTS_PAGE);
  if (!response?.ok) {
    showFeedback(response?.error || tr("feedback.openShortcutsFailed"), true);
  }
});

loadData();
