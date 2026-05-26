import { MAX_TEXT_LENGTH } from "./constants.js";

export function normalizeMarker(input = {}) {
  const color = typeof input.color === "string" ? input.color.trim() : "";
  const emoji = typeof input.emoji === "string" ? input.emoji.trim() : "";
  const text = typeof input.text === "string" ? input.text.trim() : "";

  return {
    color,
    emoji,
    text
  };
}

export function validateMarker(input = {}) {
  const marker = normalizeMarker(input);

  if (!marker.color && !marker.emoji && !marker.text) {
    return {
      isValid: false,
      errorKey: "error.markerRequired",
      error: "至少选择一种标记内容。"
    };
  }

  if (marker.text.length > MAX_TEXT_LENGTH) {
    return {
      isValid: false,
      errorKey: "error.textTooLong",
      errorVars: {
        max: MAX_TEXT_LENGTH
      },
      error: `文字标签最多 ${MAX_TEXT_LENGTH} 个字符。`
    };
  }

  return {
    isValid: true,
    marker
  };
}

export function validatePresetName(name = "") {
  const trimmed = String(name).trim();

  if (!trimmed) {
    return {
      isValid: false,
      errorKey: "error.presetNameRequired",
      error: "请输入预设名称。"
    };
  }

  if (trimmed.length > 20) {
    return {
      isValid: false,
      errorKey: "error.presetNameTooLong",
      error: "预设名称最多 20 个字符。"
    };
  }

  return {
    isValid: true,
    name: trimmed
  };
}
