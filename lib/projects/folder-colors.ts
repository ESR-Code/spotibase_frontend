/** Folder accent colors shown in the studio UI. Stored as text in `project_folders.color`. */
export const FOLDER_COLORS = ["crimson", "amber", "teal", "violet", "rose"] as const;
export type FolderColor = (typeof FOLDER_COLORS)[number];

export const FOLDER_COLOR_HEX: Record<FolderColor, string> = {
  crimson: "#fe516d",
  amber: "#ffba5b",
  teal: "#4cd7f6",
  violet: "#a78bfa",
  rose: "#ffb0b6",
};

export const FOLDER_COLOR_LABEL: Record<FolderColor, string> = {
  crimson: "Crimson",
  amber: "Amber",
  teal: "Cyan",
  violet: "Violet",
  rose: "Rose",
};

export function isFolderColor(value: string): value is FolderColor {
  return (FOLDER_COLORS as readonly string[]).includes(value);
}

export function folderHex(value: string) {
  return isFolderColor(value) ? FOLDER_COLOR_HEX[value] : FOLDER_COLOR_HEX.crimson;
}
