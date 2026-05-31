import {
  MAX_OVERLAY_ITEMS,
  MESSAGE_TYPES
} from "../shared/constants.js";
import {
  cleanupClosedTab,
  deletePreset,
  getState,
  getTabMarker,
  reorderPresets,
  removeTabMarker,
  savePreset,
  updatePreset,
  updateSetting,
  upsertTabMarkerWithRecent
} from "./storage.js";
import {
  validateMarker,
  validatePresetName
} from "../shared/validators.js";
import { MAX_PRESETS } from "../shared/constants.js";
import { t } from "../shared/i18n.js";

function isInjectableUrl(url = "") {
  return /^(https?:|file:)/i.test(url);
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  });

  return tab || null;
}

async function buildWindowOverlayItems(windowId, existingState = null) {
  const state = existingState || await getState();
  const tabs = await chrome.tabs.query({ windowId });

  return tabs
    .filter((tab) => state.tabMarkers[String(tab.id)])
    .map((tab) => {
      const markerState = state.tabMarkers[String(tab.id)];
      return {
        tabId: tab.id,
        title: markerState.original?.title ?? tab.title ?? "Untitled",
        url: tab.url || markerState.url || "",
        active: Boolean(tab.active),
        updatedAt: markerState.updatedAt || 0,
        marker: markerState.marker
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_OVERLAY_ITEMS);
}

async function getLanguage() {
  const state = await getState();
  return state.settings?.language || "zh-CN";
}

function resolveErrorMessage(language, error, fallbackKey = "error.unknown") {
  if (!error) {
    return t(language, fallbackKey);
  }

  if (typeof error === "string") {
    return t(language, error, { max: MAX_PRESETS });
  }

  if (error.errorKey) {
    return t(language, error.errorKey, error.errorVars || {});
  }

  if (error.message) {
    return t(language, error.message, { max: MAX_PRESETS });
  }

  return t(language, fallbackKey);
}

async function safeSendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Content script not ready."
    };
  }
}

async function ensureContentScriptInjected(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/marker.js"]
    });
  } catch (error) {
    const message = error?.message || "";

    // Ignore duplicate-injection style errors and restricted-page errors here.
    if (
      message.includes("Cannot access") ||
      message.includes("chrome://") ||
      message.includes("The extensions gallery cannot be scripted")
    ) {
      return false;
    }

    return false;
  }

  return true;
}

async function applyVisualMarker(tabId, markerState, settings) {
  await ensureContentScriptInjected(tabId);
  const overlayItems = await buildWindowOverlayItems(markerState.windowId);

  return safeSendToTab(tabId, {
    type: MESSAGE_TYPES.APPLY_CONTENT_MARKER,
    payload: {
      marker: markerState.marker,
      original: markerState.original,
      settings,
      overlayItems,
      currentTabId: tabId
    }
  });
}

async function broadcastOverlayUpdate(windowId) {
  const state = await getState();
  const [tabs, overlayItems] = await Promise.all([
    chrome.tabs.query({ windowId }),
    buildWindowOverlayItems(windowId, state)
  ]);

  const targetTabs = tabs.filter((tab) => state.tabMarkers[String(tab.id)]);

  await Promise.all(
    targetTabs.map(async (tab) => {
      await ensureContentScriptInjected(tab.id);
      return safeSendToTab(tab.id, {
        type: MESSAGE_TYPES.UPDATE_CONTENT_OVERLAY,
        payload: {
          overlayItems,
          currentTabId: tab.id,
          settings: state.settings
        }
      });
    })
  );
}

async function buildPopupData() {
  const currentTab = await getCurrentTab();
  const state = await getState();
  const currentMarker = currentTab ? state.tabMarkers[String(currentTab.id)] || null : null;

  return {
    currentTab: currentTab
      ? {
          id: currentTab.id,
          title: currentTab.title || "未命名标签",
          url: currentTab.url || "",
          favIconUrl: currentTab.favIconUrl || "",
          injectable: isInjectableUrl(currentTab.url || "")
        }
      : null,
    currentMarker,
    presets: state.savedPresets,
    recentMarkers: state.recentMarkers || [],
    settings: state.settings
  };
}

function stripExistingMarkerPrefix(title = "", marker = {}) {
  let cleanTitle = title || "";

  if (marker.emoji && cleanTitle.startsWith(marker.emoji)) {
    cleanTitle = cleanTitle.slice(marker.emoji.length).trimStart();
  }

  if (marker.text) {
    const textPrefix = `[${marker.text}]`;
    if (cleanTitle.startsWith(textPrefix)) {
      cleanTitle = cleanTitle.slice(textPrefix.length).trimStart();
    }
  }

  return cleanTitle;
}

function resolveOriginalSnapshot(tab, existingMarkerState) {
  const existingOriginal = existingMarkerState?.original || {};
  const existingOriginalTitle = typeof existingOriginal.title === "string" && existingOriginal.title.trim()
    ? existingOriginal.title
    : "";
  const fallbackTitle = stripExistingMarkerPrefix(
    tab.title || existingMarkerState?.title || "",
    existingMarkerState?.marker
  );

  return {
    title: existingOriginalTitle || fallbackTitle || tab.title || "",
    faviconUrl: existingOriginal.faviconUrl || tab.favIconUrl || ""
  };
}

async function applyMarkerToTab(tabId, marker) {
  const tab = await chrome.tabs.get(tabId);
  const existing = await getTabMarker(tabId);
  const state = await getState();
  const original = resolveOriginalSnapshot(tab, existing);

  const markerState = {
    tabId,
    windowId: tab.windowId,
    url: tab.url || "",
    title: tab.title || "",
    marker,
    original,
    updatedAt: Date.now()
  };

  await upsertTabMarkerWithRecent(tabId, markerState, marker);

  const injectable = isInjectableUrl(tab.url || "");
  let applyResult = { ok: false, skipped: true };

  if (injectable) {
    applyResult = await applyVisualMarker(tabId, markerState, state.settings);
  }

  await broadcastOverlayUpdate(tab.windowId);

  return {
    markerState,
    injectable,
    applyResult
  };
}

async function clearMarkerFromTab(tabId) {
  const [existing, tab] = await Promise.all([
    getTabMarker(tabId),
    chrome.tabs.get(tabId).catch(() => null)
  ]);
  if (!existing) {
    return null;
  }

  const windowId = existing.windowId;
  const injectable = tab?.url ? isInjectableUrl(tab.url) : false;
  const removed = await removeTabMarker(tabId);

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

async function pingMarkedTab(tabId) {
  const markerState = await getTabMarker(tabId);
  if (!markerState) {
    return { ok: false, error: "error.unknown" };
  }

  await ensureContentScriptInjected(tabId);
  const response = await safeSendToTab(tabId, {
    type: MESSAGE_TYPES.FLASH_TAB_ATTENTION,
    payload: {
      marker: markerState.marker,
      title: markerState.original?.title || markerState.title || ""
    }
  });

  return response;
}

async function activateMarkedTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  await chrome.tabs.update(tabId, { active: true });

  if (tab.windowId !== undefined) {
    await chrome.windows.update(tab.windowId, { focused: true });
    await broadcastOverlayUpdate(tab.windowId);
  }

  return { ok: true };
}

async function applyPresetCommand(index) {
  const tab = await getCurrentTab();
  if (!tab?.id) {
    return;
  }

  const state = await getState();
  const preset = state.savedPresets[index];

  if (!preset) {
    return;
  }

  await applyMarkerToTab(tab.id, {
    color: preset.color,
    emoji: preset.emoji,
    text: preset.text
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  await getState();
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  cleanupClosedTab(tabId)
    .then(() => {
      if (removeInfo?.windowId !== undefined) {
        return broadcastOverlayUpdate(removeInfo.windowId);
      }
      return undefined;
    })
    .catch(() => undefined);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") {
    return;
  }

  (async () => {
    if (!isInjectableUrl(tab.url || "")) {
      return;
    }

    const [markerState, state] = await Promise.all([
      getTabMarker(tabId),
      getState()
    ]);

    if (!markerState) {
      return;
    }

    await applyVisualMarker(tabId, markerState, state.settings);
  })().catch(() => undefined);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "clear-current-marker") {
    const tab = await getCurrentTab();
    if (tab?.id) {
      await clearMarkerFromTab(tab.id);
    }
    return;
  }

  if (command === "apply-preset-1") {
    await applyPresetCommand(0);
    return;
  }

  if (command === "apply-preset-2") {
    await applyPresetCommand(1);
    return;
  }

  if (command === "apply-preset-3") {
    await applyPresetCommand(2);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const language = await getLanguage();

    switch (message?.type) {
      case MESSAGE_TYPES.GET_STATE: {
        sendResponse({
          ok: true,
          data: await buildPopupData()
        });
        break;
      }

      case MESSAGE_TYPES.APPLY_MARKER: {
        const validation = validateMarker(message.payload);
        if (!validation.isValid) {
          sendResponse({
            ok: false,
            error: resolveErrorMessage(language, validation)
          });
          break;
        }

        const activeTabId = message.tabId;
        const result = await applyMarkerToTab(activeTabId, validation.marker);
        sendResponse({
          ok: true,
          data: result
        });
        break;
      }

      case MESSAGE_TYPES.CLEAR_MARKER: {
        await clearMarkerFromTab(message.tabId);
        sendResponse({
          ok: true
        });
        break;
      }

      case MESSAGE_TYPES.SAVE_PRESET: {
        const markerValidation = validateMarker(message.payload?.marker);
        if (!markerValidation.isValid) {
          sendResponse({
            ok: false,
            error: resolveErrorMessage(language, markerValidation)
          });
          break;
        }

        const nameValidation = validatePresetName(message.payload?.name);
        if (!nameValidation.isValid) {
          sendResponse({
            ok: false,
            error: resolveErrorMessage(language, nameValidation)
          });
          break;
        }

        const preset = {
          id: `preset_${Date.now()}`,
          name: nameValidation.name,
          ...markerValidation.marker,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const presets = await savePreset(preset);
        sendResponse({
          ok: true,
          data: presets
        });
        break;
      }

      case MESSAGE_TYPES.UPDATE_PRESET: {
        const markerValidation = validateMarker(message.payload?.marker);
        if (!markerValidation.isValid) {
          sendResponse({
            ok: false,
            error: resolveErrorMessage(language, markerValidation)
          });
          break;
        }

        const nameValidation = validatePresetName(message.payload?.name);
        if (!nameValidation.isValid) {
          sendResponse({
            ok: false,
            error: resolveErrorMessage(language, nameValidation)
          });
          break;
        }

        const presets = await updatePreset(message.presetId, {
          name: nameValidation.name,
          ...markerValidation.marker
        });
        sendResponse({
          ok: true,
          data: presets
        });
        break;
      }

      case MESSAGE_TYPES.DELETE_PRESET: {
        const presets = await deletePreset(message.presetId);
        sendResponse({
          ok: true,
          data: presets
        });
        break;
      }

      case MESSAGE_TYPES.REORDER_PRESETS: {
        const presets = await reorderPresets(message.orderedPresetIds || []);
        sendResponse({
          ok: true,
          data: presets
        });
        break;
      }

      case MESSAGE_TYPES.TOGGLE_SETTING: {
        const settings = await updateSetting(message.key, message.value);
        const currentTab = await getCurrentTab();
        if (currentTab?.windowId !== undefined) {
          await broadcastOverlayUpdate(currentTab.windowId);
        }
        sendResponse({
          ok: true,
          data: settings
        });
        break;
      }

      case MESSAGE_TYPES.SAVE_BADGE_POSITION: {
        const settings = await updateSetting("badgePosition", message.position || null);
        const currentTab = await getCurrentTab();
        if (currentTab?.windowId !== undefined) {
          await broadcastOverlayUpdate(currentTab.windowId);
        }
        sendResponse({
          ok: true,
          data: settings
        });
        break;
      }

      case MESSAGE_TYPES.PING_MARKED_TAB: {
        const result = await pingMarkedTab(message.tabId);
        sendResponse(result?.ok === false ? result : { ok: true });
        break;
      }

      case MESSAGE_TYPES.ACTIVATE_MARKED_TAB: {
        const result = await activateMarkedTab(message.tabId);
        sendResponse(result);
        break;
      }

      case MESSAGE_TYPES.OPEN_SHORTCUTS_PAGE: {
        await chrome.tabs.create({
          url: "chrome://extensions/shortcuts"
        });
        sendResponse({
          ok: true
        });
        break;
      }

      case MESSAGE_TYPES.CONTENT_READY: {
        const tabId = sender.tab?.id;
        if (!tabId) {
          sendResponse({ ok: true, data: null });
          break;
        }

        const [markerState, state] = await Promise.all([
          getTabMarker(tabId),
          getState()
        ]);
        if (!markerState) {
          sendResponse({ ok: true, data: null });
          break;
        }

        sendResponse({
          ok: true,
          data: {
            marker: markerState.marker,
            original: markerState.original,
            settings: state.settings,
            overlayItems: await buildWindowOverlayItems(markerState.windowId),
            currentTabId: tabId
          }
        });
        break;
      }

      default:
        sendResponse({
          ok: false,
          error: resolveErrorMessage(language, "error.unknown")
        });
    }
  })().catch((error) => {
    getLanguage()
      .then((language) => {
        sendResponse({
          ok: false,
          error: resolveErrorMessage(language, error)
        });
      })
      .catch(() => {
        sendResponse({
          ok: false,
          error: "处理请求失败。"
        });
      });
  });

  return true;
});
