export const editorColors = {
  bg: "#0b1424",
  bg2: "#0e1a30",
  panel: "#111e36",
  panel2: "#15243f",
  line: "#1f3358",
  lineSoft: "#1a2b4a",
  fg: "#eef1f8",
  muted: "#8a98b8",
  muted2: "#5b6989",
  crimson: "#e63946",
  crimson2: "#ff5a6a",
  amber: "#f4a259",
  teal: "#3fb8af",
  inputBg: "#0c1730",
  errorBg: "#1a0a0e",
  activeText: "#ffb3bb",
  scrollbar: "#243a5e",
  scrollbarHover: "#2f4d7a",
  btnHoverBg: "#1a2c4d",
  btnHoverBorder: "#2f4d7a",
  primaryBorder: "#8a1622",
  primaryGradientEnd: "#b51e2c",
  primaryHoverEnd: "#c92635",
  avatarGradientEnd: "#1d6b66",
  gridColor: "rgba(120,160,230,0.06)",
} as const;

export const hotspotTypeColors = {
  none: "#8a98b8",
  info: "#e63946",
  warning: "#f4a259",
  spec: "#3fb8af",
  link: "#9b8cff",
} as const;

export const markerColorSwatches = [
  "#e63946",
  "#ff5a6a",
  "#f4a259",
  "#ffd166",
  "#06d6a0",
  "#3fb8af",
  "#118ab2",
  "#4361ee",
  "#9b8cff",
  "#ff006e",
  "#ffffff",
  "#1a1a1a",
] as const;

export const markerIcons = [
  { value: "ℹ", label: "Info (ℹ)" },
  { value: "⚠", label: "Warning (⚠)" },
  { value: "⚙", label: "Gear (⚙)" },
  { value: "★", label: "Star (★)" },
  { value: "⚡", label: "Bolt (⚡)" },
  { value: "✓", label: "Check (✓)" },
  { value: "❓", label: "Question (❓)" },
  { value: "✋", label: "Stop (✋)" },
] as const;

export const PROJECT_NAME = "Factory Tour";
export const DEFAULT_SCENE_NAME = "Assembly Line B";
export const DEFAULT_MODEL_NAME = "Default_Box.glb";
