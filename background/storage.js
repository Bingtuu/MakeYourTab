import {
  DEFAULT_SETTINGS,
  MAX_RECENT_MARKERS,
  MAX_PRESETS,
  STORAGE_KEY
} from "../shared/constants.js";

let _storageQueue = Promise.resolve();

function enqueue(task) {
  const result = _storageQueue.then(task);
  _storageQueue = result.catch(() => undefined);
  return result;
}

function getDefaultState() {
  return {
    version: 1,
    tabMarkers: {},
    savedPresets: [],
    recentMarkers: [],
    settings: { ...DEFAULT_SETTINGS }
  };
}

export async function getState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const storedState = result[STORAGE_KEY];

  if (!storedState) {
    return getDefaultState();
  }

  return {
    ...getDefaultState(),
    ...storedState,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(storedState.settings || {})
    }
  };
}

export async function saveState(state) {
  await chrome.storage.local.set({
    [STORAGE_KEY]: state
  });
  return state;
}

export async function upsertTabMarker(tabId, payload) {
  return enqueue(async () => {
    const state = await getState();
    state.tabMarkers[String(tabId)] = payload;
    await saveState(state);
    return payload;
  });
}

export async function getTabMarker(tabId) {
  const state = await getState();
  return state.tabMarkers[String(tabId)] || null;
}

export async function removeTabMarker(tabId) {
  return enqueue(async () => {
    const state = await getState();
    const key = String(tabId);
    const removed = state.tabMarkers[key] || null;

    delete state.tabMarkers[key];
    await saveState(state);

    return removed;
  });
}

export async function cleanupClosedTab(tabId) {
  return removeTabMarker(tabId);
}

export async function savePreset(preset) {
  return enqueue(async () => {
    const state = await getState();
    const presetIndex = state.savedPresets.findIndex((item) => item.id === preset.id);

    if (presetIndex >= 0) {
      state.savedPresets[presetIndex] = preset;
    } else {
      if (state.savedPresets.length >= MAX_PRESETS) {
        throw new Error("error.maxPresets");
      }

      state.savedPresets.push(preset);
    }

    await saveState(state);
    return state.savedPresets;
  });
}

export async function updatePreset(presetId, updates) {
  return enqueue(async () => {
    const state = await getState();
    const index = state.savedPresets.findIndex((item) => item.id === presetId);

    if (index === -1) {
      throw new Error("error.presetNotFound");
    }

    state.savedPresets[index] = {
      ...state.savedPresets[index],
      ...updates,
      updatedAt: Date.now()
    };

    await saveState(state);
    return state.savedPresets;
  });
}

export async function deletePreset(presetId) {
  return enqueue(async () => {
    const state = await getState();
    state.savedPresets = state.savedPresets.filter((item) => item.id !== presetId);
    await saveState(state);
    return state.savedPresets;
  });
}

export async function pushRecentMarker(marker) {
  return enqueue(async () => {
    const state = await getState();
    const markerKey = [marker.color || "", marker.emoji || "", marker.text || ""].join("|");

    state.recentMarkers = [
      {
        id: `recent_${Date.now()}`,
        markerKey,
        color: marker.color || "",
        emoji: marker.emoji || "",
        text: marker.text || "",
        updatedAt: Date.now()
      },
      ...state.recentMarkers.filter((item) => item.markerKey !== markerKey)
    ].slice(0, MAX_RECENT_MARKERS);

    await saveState(state);
    return state.recentMarkers;
  });
}

export async function updateSetting(key, value) {
  return enqueue(async () => {
    const state = await getState();

    if (key === "presets") {
      state.savedPresets = value;
      await saveState(state);
      return state.savedPresets;
    }

    state.settings = {
      ...state.settings,
      [key]: value
    };
    await saveState(state);
    return state.settings;
  });
}
