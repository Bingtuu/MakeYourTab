/*
 * MakeYourTab local race test
 *
 * 用法：
 * 1. 在 Chrome 中加载本地扩展目录。
 * 2. 打开任意普通网页。
 * 3. 点击 MakeYourTab 图标打开 popup。
 * 4. 右键 popup 页面 -> Inspect / 检查，打开 DevTools Console。
 * 5. 将本文件整段复制到 Console 中执行。
 *
 * 覆盖场景：
 * - 快速连续 APPLY_MARKER，验证最近标签不会因 storage 竞态丢失或写坏。
 * - 连续 SAVE_PRESET 后 REORDER_PRESETS，验证预设排序保存正确。
 *
 * 默认会备份并恢复 chrome.storage.local 中的 tabmarkerState。
 */
(async function runMakeYourTabLocalRaceTest() {
  const STORAGE_KEY = "tabmarkerState";
  const APPLY_COUNT = 24;
  const RESTORE_AFTER_TEST = true;

  const MESSAGE_TYPES = {
    GET_STATE: "GET_STATE",
    APPLY_MARKER: "APPLY_MARKER",
    CLEAR_MARKER: "CLEAR_MARKER",
    SAVE_PRESET: "SAVE_PRESET",
    REORDER_PRESETS: "REORDER_PRESETS"
  };

  const colors = [
    "#EF4444",
    "#F97316",
    "#F59E0B",
    "#22C55E",
    "#14B8A6",
    "#3B82F6",
    "#6366F1",
    "#A855F7"
  ];

  const emojis = ["📌", "🔥", "⭐", "✅", "📘", "📚", "💼", "🧪"];

  function assert(condition, message, details = null) {
    if (!condition) {
      const error = new Error(message);
      error.details = details;
      throw error;
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          resolve({
            ok: false,
            error: lastError.message
          });
          return;
        }

        resolve(response);
      });
    });
  }

  function storageGet(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, resolve);
    });
  }

  function storageSet(value) {
    return new Promise((resolve) => {
      chrome.storage.local.set(value, resolve);
    });
  }

  function markerKey(marker) {
    return [marker.color || "", marker.emoji || "", marker.text || ""].join("|");
  }

  function makeMarker(index) {
    return {
      color: colors[index % colors.length],
      emoji: emojis[index % emojis.length],
      text: `R${String(index).padStart(2, "0")}`
    };
  }

  function makePreset(index) {
    const marker = makeMarker(index);
    return {
      name: `Race ${index + 1}`,
      marker
    };
  }

  async function getPopupData() {
    const response = await sendMessage({
      type: MESSAGE_TYPES.GET_STATE
    });
    assert(response?.ok, "GET_STATE failed", response);
    return response.data;
  }

  async function getStoredState() {
    const result = await storageGet(STORAGE_KEY);
    return result[STORAGE_KEY] || null;
  }

  async function runRapidApplyTest(tabId) {
    console.group("1. Rapid marker apply test");

    const markers = Array.from({ length: APPLY_COUNT }, (_, index) => makeMarker(index));
    const responses = await Promise.all(
      markers.map((marker) =>
        sendMessage({
          type: MESSAGE_TYPES.APPLY_MARKER,
          tabId,
          payload: marker
        })
      )
    );

    assert(
      responses.every((response) => response?.ok),
      "Some APPLY_MARKER requests failed",
      responses
    );

    await sleep(500);

    const state = await getStoredState();
    const recentMarkers = state?.recentMarkers || [];
    const recentKeys = recentMarkers.map(markerKey);
    const uniqueRecentKeys = new Set(recentKeys);
    const popupData = await getPopupData();
    const currentMarker = popupData.currentMarker?.marker;
    const expectedKeys = new Set(markers.map(markerKey));

    assert(currentMarker, "Current marker was not saved");
    assert(expectedKeys.has(markerKey(currentMarker)), "Current marker is not from rapid apply input", {
      currentMarker,
      expected: markers
    });
    assert(recentMarkers.length > 0, "Recent markers should not be empty");
    assert(recentMarkers.length <= 6, "Recent markers exceeded MAX_RECENT_MARKERS", recentMarkers);
    assert(
      uniqueRecentKeys.size === recentKeys.length,
      "Recent markers contain duplicate markerKey values",
      recentMarkers
    );
    assert(
      recentMarkers.every((marker) => expectedKeys.has(markerKey(marker))),
      "Recent markers contain unexpected values",
      recentMarkers
    );

    console.table(
      recentMarkers.map((marker, index) => ({
        index,
        color: marker.color,
        emoji: marker.emoji,
        text: marker.text,
        markerKey: marker.markerKey
      }))
    );
    console.log("PASS: rapid apply test");
    console.groupEnd();
  }

  async function runPresetReorderTest() {
    console.group("2. Preset save and reorder test");

    const currentState = await getStoredState();
    await storageSet({
      [STORAGE_KEY]: {
        ...currentState,
        savedPresets: []
      }
    });

    const saveResponses = [];
    for (let index = 0; index < 5; index += 1) {
      const preset = makePreset(index);
      saveResponses.push(
        await sendMessage({
          type: MESSAGE_TYPES.SAVE_PRESET,
          payload: preset
        })
      );
    }

    assert(
      saveResponses.every((response) => response?.ok),
      "Some SAVE_PRESET requests failed",
      saveResponses
    );

    const beforeState = await getStoredState();
    const beforePresets = beforeState.savedPresets || [];
    assert(beforePresets.length === 5, "Expected exactly 5 saved presets", beforePresets);

    const reversedIds = beforePresets.map((preset) => preset.id).reverse();
    const reorderResponse = await sendMessage({
      type: MESSAGE_TYPES.REORDER_PRESETS,
      orderedPresetIds: reversedIds
    });

    assert(reorderResponse?.ok, "REORDER_PRESETS failed", reorderResponse);

    const afterState = await getStoredState();
    const afterPresets = afterState.savedPresets || [];
    const afterIds = afterPresets.map((preset) => preset.id);

    assert(
      JSON.stringify(afterIds) === JSON.stringify(reversedIds),
      "Preset order did not persist correctly",
      {
        expected: reversedIds,
        actual: afterIds,
        afterPresets
      }
    );

    console.table(
      afterPresets.map((preset, index) => ({
        index,
        id: preset.id,
        name: preset.name,
        color: preset.color,
        emoji: preset.emoji,
        text: preset.text
      }))
    );
    console.log("PASS: preset reorder test");
    console.groupEnd();
  }

  async function restoreOriginalState(originalStorage, currentTabId) {
    console.group("Restore");

    await sendMessage({
      type: MESSAGE_TYPES.CLEAR_MARKER,
      tabId: currentTabId
    });

    await storageSet(originalStorage);

    const originalState = originalStorage[STORAGE_KEY];
    const originalCurrentMarker = originalState?.tabMarkers?.[String(currentTabId)]?.marker;

    if (originalCurrentMarker) {
      await sendMessage({
        type: MESSAGE_TYPES.APPLY_MARKER,
        tabId: currentTabId,
        payload: originalCurrentMarker
      });
      await storageSet(originalStorage);
      console.log("Restored original current tab marker visually and restored storage snapshot.");
    } else {
      console.log("Restored storage snapshot and cleared temporary current tab marker.");
    }

    console.groupEnd();
  }

  const originalStorage = await storageGet(STORAGE_KEY);

  try {
    assert(
      typeof chrome !== "undefined" && chrome.runtime && chrome.storage,
      "This script must run inside an extension page, such as the MakeYourTab popup DevTools console."
    );

    const popupData = await getPopupData();
    const currentTab = popupData.currentTab;

    assert(currentTab?.id, "No active tab found. Open a normal web page and then open the popup.");

    console.group("MakeYourTab local race test");
    console.log("Current tab:", currentTab.title, currentTab.url);

    await runRapidApplyTest(currentTab.id);
    await runPresetReorderTest();

    console.log("ALL TESTS PASSED");
    console.groupEnd();
  } catch (error) {
    console.error("TEST FAILED:", error.message);
    if (error.details) {
      console.error("Details:", error.details);
    }
  } finally {
    if (RESTORE_AFTER_TEST) {
      const popupData = await getPopupData().catch(() => null);
      const currentTabId = popupData?.currentTab?.id;
      if (currentTabId) {
        await restoreOriginalState(originalStorage, currentTabId);
      } else {
        await storageSet(originalStorage);
      }
    }
  }
})();
