(function initTabMarkerContent() {
  if (window.__TABMARKER_CONTENT_INITIALIZED__) {
    return;
  }

  window.__TABMARKER_CONTENT_INITIALIZED__ = true;

  const OVERLAY_ID = "tabmarker-page-badge";
  const FAVICON_ID = "tabmarker-favicon";
  const DISABLED_ICON_ATTR = "data-tabmarker-disabled";
  const ORIGINAL_REL_ATTR = "data-tabmarker-original-rel";
  const MAX_OVERLAY_ITEMS = 15;

  const pageState = {
    originalTitle: document.title,
    originalFaviconHref: getCurrentFaviconHref(),
    titleSyncTimer: null,
    faviconSyncTimer: null,
    attentionTimer: null,
    desiredTitle: "",
    desiredFaviconHref: "",
    markerActive: false,
    currentMarker: {},
    overlayItems: [],
    settings: {
      showPageBadge: true,
      badgePosition: null
    },
    currentTabId: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    isDragging: false,
    overlayClickTimer: null,
    faviconObserver: null
  };

  function getCurrentFaviconHref() {
    const favicon = document.querySelector("link[rel*='icon']");
    return favicon ? favicon.href : "";
  }

  function getInjectedFavicon() {
    return document.getElementById(FAVICON_ID);
  }

  function ensureFaviconElement() {
    let favicon = getInjectedFavicon();
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.id = FAVICON_ID;
      favicon.rel = "icon";
      document.head.prepend(favicon);
    }

    return favicon;
  }

  function shortenTitle(title = "") {
    return title.length > 24 ? `${title.slice(0, 24)}...` : title;
  }

  function buildMarkerLabel(marker = {}) {
    return [marker.emoji, marker.text].filter(Boolean).join(" ") || "TAG";
  }

  function getExistingIconLinks() {
    return Array.from(document.querySelectorAll("link[rel*='icon']")).filter(
      (link) => link.id !== FAVICON_ID
    );
  }

  function disableExistingIcons() {
    getExistingIconLinks().forEach((link) => {
      if (link.hasAttribute(DISABLED_ICON_ATTR)) {
        return;
      }

      link.setAttribute(DISABLED_ICON_ATTR, "true");
      link.setAttribute(ORIGINAL_REL_ATTR, link.getAttribute("rel") || "icon");
      link.setAttribute("rel", "tabmarker-disabled-icon");
    });
  }

  function restoreExistingIcons() {
    Array.from(document.querySelectorAll(`link[${DISABLED_ICON_ATTR}]`)).forEach((link) => {
      const originalRel = link.getAttribute(ORIGINAL_REL_ATTR) || "icon";
      link.setAttribute("rel", originalRel);
      link.removeAttribute(DISABLED_ICON_ATTR);
      link.removeAttribute(ORIGINAL_REL_ATTR);
    });
  }

  function buildTitle(marker, originalTitle) {
    const parts = [];

    if (marker.emoji) {
      parts.push(marker.emoji);
    }

    if (marker.text) {
      parts.push(`[${marker.text}]`);
    }

    if (!parts.length) {
      return originalTitle;
    }

    return `${parts.join(" ")} ${originalTitle}`;
  }

  function ensureOverlayRoot() {
    let root = document.getElementById(OVERLAY_ID);
    if (!root) {
      root = document.createElement("div");
      root.id = OVERLAY_ID;
      root.style.position = "fixed";
      root.style.top = "16px";
      root.style.right = "16px";
      root.style.zIndex = "2147483647";
      root.style.width = "280px";
      root.style.padding = "10px";
      root.style.borderRadius = "18px";
      root.style.background = "rgba(15, 23, 42, 0.78)";
      root.style.backdropFilter = "blur(14px)";
      root.style.boxShadow = "0 14px 34px rgba(15, 23, 42, 0.28)";
      root.style.border = "1px solid rgba(148, 163, 184, 0.2)";
      root.style.fontFamily = "Arial, sans-serif";
      root.style.color = "#F8FAFC";
      root.style.userSelect = "none";
      root.style.cursor = "grab";
      root.style.display = "grid";
      root.style.gap = "8px";
      bindDrag(root);
      document.documentElement.appendChild(root);
    }

    return root;
  }

  function applyOverlayPosition(root) {
    const position = pageState.settings?.badgePosition;

    if (position?.ratioLeft !== undefined && position?.ratioTop !== undefined) {
      const left = Math.round(position.ratioLeft * window.innerWidth);
      const top = Math.round(position.ratioTop * window.innerHeight);
      root.style.left = `${Math.max(8, Math.min(window.innerWidth - root.offsetWidth - 8, left))}px`;
      root.style.top = `${Math.max(8, Math.min(window.innerHeight - root.offsetHeight - 8, top))}px`;
      root.style.right = "auto";
      root.style.bottom = "auto";
      return;
    }

    if (position && Number.isFinite(position.left) && Number.isFinite(position.top)) {
      root.style.left = `${position.left}px`;
      root.style.top = `${position.top}px`;
      root.style.right = "auto";
      root.style.bottom = "auto";
      return;
    }

    root.style.top = "16px";
    root.style.right = "16px";
    root.style.left = "auto";
    root.style.bottom = "auto";
  }

  function saveOverlayPosition(left, top) {
    chrome.runtime
      .sendMessage({
        type: "SAVE_BADGE_POSITION",
        position: {
          left,
          top,
          ratioLeft: left / window.innerWidth,
          ratioTop: top / window.innerHeight
        }
      })
      .catch(() => undefined);
  }

  function bindDrag(root) {
    root.addEventListener("pointerdown", (event) => {
      if (event.target.closest("[data-tabmarker-item='true']")) {
        return;
      }

      pageState.isDragging = true;
      pageState.dragOffsetX = event.clientX - root.getBoundingClientRect().left;
      pageState.dragOffsetY = event.clientY - root.getBoundingClientRect().top;
      root.style.cursor = "grabbing";
      root.setPointerCapture(event.pointerId);
    });

    root.addEventListener("pointermove", (event) => {
      if (!pageState.isDragging) {
        return;
      }

      const nextLeft = Math.max(8, Math.min(window.innerWidth - root.offsetWidth - 8, event.clientX - pageState.dragOffsetX));
      const nextTop = Math.max(8, Math.min(window.innerHeight - root.offsetHeight - 8, event.clientY - pageState.dragOffsetY));

      root.style.left = `${nextLeft}px`;
      root.style.top = `${nextTop}px`;
      root.style.right = "auto";
      root.style.bottom = "auto";
    });

    function finishDrag(event) {
      if (!pageState.isDragging) {
        return;
      }

      pageState.isDragging = false;
      root.style.cursor = "grab";
      if (event?.pointerId !== undefined && root.hasPointerCapture(event.pointerId)) {
        root.releasePointerCapture(event.pointerId);
      }

      const rect = root.getBoundingClientRect();
      saveOverlayPosition(Math.round(rect.left), Math.round(rect.top));
    }

    root.addEventListener("pointerup", finishDrag);
    root.addEventListener("pointercancel", finishDrag);
  }

  function startTitleSync() {
    stopTitleSync();

    pageState.titleSyncTimer = window.setInterval(() => {
      if (!pageState.markerActive || !pageState.desiredTitle) {
        return;
      }

      if (document.title !== pageState.desiredTitle) {
        document.title = pageState.desiredTitle;
      }
    }, 500);
  }

  function stopTitleSync() {
    if (pageState.titleSyncTimer) {
      window.clearInterval(pageState.titleSyncTimer);
      pageState.titleSyncTimer = null;
    }
  }

  function startFaviconObserver() {
    if (pageState.faviconObserver) return;
    pageState.faviconObserver = new MutationObserver((mutations) => {
      const hasNewIcon = mutations.some((m) =>
        Array.from(m.addedNodes).some(
          (n) => n.tagName === "LINK" && (n.rel || "").includes("icon")
        )
      );
      if (hasNewIcon) {
        disableExistingIcons();
      }
    });
    pageState.faviconObserver.observe(document.head, { childList: true, subtree: true });
  }

  function stopFaviconObserver() {
    if (pageState.faviconObserver) {
      pageState.faviconObserver.disconnect();
      pageState.faviconObserver = null;
    }
  }

  function startFaviconSync() {
    stopFaviconSync();
    startFaviconObserver();

    pageState.faviconSyncTimer = window.setInterval(() => {
      if (!pageState.markerActive || !pageState.desiredFaviconHref) {
        return;
      }

      disableExistingIcons();
      const favicon = ensureFaviconElement();
      if (favicon.href !== pageState.desiredFaviconHref) {
        favicon.href = pageState.desiredFaviconHref;
      }
    }, 2000);
  }

  function stopFaviconSync() {
    if (pageState.faviconSyncTimer) {
      window.clearInterval(pageState.faviconSyncTimer);
      pageState.faviconSyncTimer = null;
    }
    stopFaviconObserver();
  }

  function renderBadge(marker, settings, overlayItems = [], currentTabId = null) {
    pageState.settings = {
      ...pageState.settings,
      ...(settings || {})
    };
    pageState.overlayItems = overlayItems.slice(0, MAX_OVERLAY_ITEMS);
    pageState.currentTabId = currentTabId;

    if (pageState.settings.showPageBadge === false) {
      clearBadge();
      return;
    }
    const badge = ensureOverlayRoot();
    applyOverlayPosition(badge);
    badge.innerHTML = "";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "8px";
    header.style.padding = "0 2px";

    const headerLeft = document.createElement("div");
    const title = document.createElement("div");
    title.textContent = buildMarkerLabel(marker);
    title.style.fontSize = "13px";
    title.style.fontWeight = "700";

    const hint = document.createElement("div");
    hint.textContent = "Click to open · Double click to ping";
    hint.style.fontSize = "11px";
    hint.style.color = "rgba(226, 232, 240, 0.72)";

    headerLeft.append(title, hint);

    const handle = document.createElement("div");
    handle.textContent = "⋮⋮";
    handle.style.fontSize = "14px";
    handle.style.color = "rgba(226, 232, 240, 0.72)";

    header.append(headerLeft, handle);
    badge.appendChild(header);

    pageState.overlayItems.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.tabmarkerItem = "true";
      button.style.display = "flex";
      button.style.alignItems = "center";
      button.style.justifyContent = "space-between";
      button.style.gap = "8px";
      button.style.width = "100%";
      button.style.padding = "10px 12px";
      button.style.border = item.tabId === currentTabId
        ? "1px solid rgba(96, 165, 250, 0.55)"
        : "1px solid rgba(148, 163, 184, 0.18)";
      button.style.borderRadius = "14px";
      button.style.background = "rgba(15, 23, 42, 0.56)";
      button.style.cursor = "pointer";
      button.style.color = "#F8FAFC";
      button.style.textAlign = "left";

      const main = document.createElement("div");
      main.style.minWidth = "0";

      const line1 = document.createElement("div");
      line1.textContent = buildMarkerLabel(item.marker);
      line1.style.fontSize = "13px";
      line1.style.fontWeight = "700";

      const line2 = document.createElement("div");
      line2.textContent = shortenTitle(item.title);
      line2.style.fontSize = "11px";
      line2.style.color = "rgba(226, 232, 240, 0.72)";
      line2.style.whiteSpace = "nowrap";
      line2.style.overflow = "hidden";
      line2.style.textOverflow = "ellipsis";
      line2.style.maxWidth = "168px";

      main.append(line1, line2);

      const tagDot = document.createElement("div");
      tagDot.style.width = "12px";
      tagDot.style.height = "12px";
      tagDot.style.borderRadius = "999px";
      tagDot.style.background = item.marker?.color || "#475569";
      tagDot.style.boxShadow = "0 0 0 3px rgba(255, 255, 255, 0.04)";

      button.append(main, tagDot);
      button.addEventListener("click", () => {
        if (pageState.overlayClickTimer) {
          window.clearTimeout(pageState.overlayClickTimer);
          pageState.overlayClickTimer = null;
        }

        pageState.overlayClickTimer = window.setTimeout(() => {
          chrome.runtime
            .sendMessage({
              type: "ACTIVATE_MARKED_TAB",
              tabId: item.tabId
            })
            .catch(() => undefined);
          pageState.overlayClickTimer = null;
        }, 220);
      });

      button.addEventListener("dblclick", () => {
        if (pageState.overlayClickTimer) {
          window.clearTimeout(pageState.overlayClickTimer);
          pageState.overlayClickTimer = null;
        }

        chrome.runtime
          .sendMessage({
            type: "PING_MARKED_TAB",
            tabId: item.tabId
          })
          .catch(() => undefined);
      });

      badge.appendChild(button);
    });
  }

  function clearBadge() {
    document.getElementById(OVERLAY_ID)?.remove();
  }

  function buildFaviconDataUrl(marker) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return "";
    }

    ctx.fillStyle = marker.color || "#334155";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const symbol = marker.emoji || (marker.text ? marker.text[0].toUpperCase() : "T");
    ctx.fillText(symbol, canvas.width / 2, canvas.height / 2 + 1);

    return canvas.toDataURL("image/png");
  }

  function applyMarker(payload) {
    const marker = payload?.marker || {};
    const original = payload?.original || {};
    const settings = payload?.settings || {};
    const overlayItems = payload?.overlayItems || [];
    const currentTabId = payload?.currentTabId || null;

    pageState.originalTitle = original.title ?? pageState.originalTitle ?? document.title;
    pageState.originalFaviconHref = original.faviconUrl ?? pageState.originalFaviconHref ?? getCurrentFaviconHref();

    pageState.markerActive = true;
    pageState.currentMarker = marker;
    pageState.desiredTitle = buildTitle(marker, pageState.originalTitle);
    document.title = pageState.desiredTitle;

    const dataUrl = buildFaviconDataUrl(marker);
    if (dataUrl) {
      pageState.desiredFaviconHref = dataUrl;
      disableExistingIcons();
      const favicon = ensureFaviconElement();
      favicon.href = dataUrl;
    }

    renderBadge(marker, settings, overlayItems, currentTabId);
    startTitleSync();
    startFaviconSync();

    return {
      ok: true
    };
  }

  function clearMarker(payload) {
    const original = payload || {};
    pageState.markerActive = false;
    pageState.currentMarker = {};
    pageState.desiredTitle = "";
    pageState.desiredFaviconHref = "";
    stopTitleSync();
    stopFaviconSync();

    document.title = original.title ?? pageState.originalTitle ?? document.title;

    const injectedFavicon = getInjectedFavicon();
    if (injectedFavicon) {
      injectedFavicon.remove();
    }

    pageState.originalFaviconHref = original.faviconUrl || pageState.originalFaviconHref;
    restoreExistingIcons();

    clearBadge();

    return {
      ok: true
    };
  }

  function updateOverlay(payload) {
    if (!pageState.markerActive) {
      return { ok: true };
    }

    renderBadge(
      pageState.currentMarker,
      payload?.settings || pageState.settings,
      payload?.overlayItems || pageState.overlayItems,
      payload?.currentTabId || pageState.currentTabId
    );

    return { ok: true };
  }

  function flashTabAttention(payload) {
    const marker = payload?.marker || {};
    const baseTitle = pageState.desiredTitle || buildTitle(marker, payload?.title || pageState.originalTitle || document.title);
    const attentionTitle = `<<< ${buildMarkerLabel(marker)} >>> ${payload?.title || pageState.originalTitle || document.title}`;
    let tick = 0;

    if (pageState.attentionTimer) {
      window.clearInterval(pageState.attentionTimer);
      pageState.attentionTimer = null;
    }

    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.animate(
        [
          { boxShadow: "0 14px 34px rgba(15, 23, 42, 0.28)" },
          { boxShadow: "0 0 0 4px rgba(96, 165, 250, 0.32), 0 18px 38px rgba(15, 23, 42, 0.34)" },
          { boxShadow: "0 14px 34px rgba(15, 23, 42, 0.28)" }
        ],
        {
          duration: 1200,
          iterations: 2
        }
      );
    }

    stopTitleSync();
    pageState.attentionTimer = window.setInterval(() => {
      document.title = tick % 2 === 0 ? attentionTitle : baseTitle;
      tick += 1;

      if (tick >= 8) {
        window.clearInterval(pageState.attentionTimer);
        pageState.attentionTimer = null;
        document.title = baseTitle;
        if (pageState.markerActive) {
          startTitleSync();
        }
      }
    }, 350);

    return { ok: true };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "APPLY_CONTENT_MARKER") {
      sendResponse(applyMarker(message.payload));
      return true;
    }

    if (message?.type === "CLEAR_CONTENT_MARKER") {
      sendResponse(clearMarker(message.payload));
      return true;
    }

    if (message?.type === "UPDATE_CONTENT_OVERLAY") {
      sendResponse(updateOverlay(message.payload));
      return true;
    }

    if (message?.type === "FLASH_TAB_ATTENTION") {
      sendResponse(flashTabAttention(message.payload));
      return true;
    }

    return true;
  });

  window.addEventListener("resize", () => {
    const root = document.getElementById(OVERLAY_ID);
    if (root) {
      applyOverlayPosition(root);
    }
  });

  chrome.runtime
    .sendMessage({ type: "CONTENT_READY" })
    .then((response) => {
      if (response?.ok && response.data?.marker) {
        applyMarker(response.data);
      }
    })
    .catch(() => undefined);
})();
