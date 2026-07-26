export type EditorSettings = {
  hotspotSize: number;
  hotspotRefDist: number;
  minDistance: number;
  maxDistance: number;
  minYaw: number;
  maxYaw: number;
  minPitch: number;
  maxPitch: number;
  gridColor: string;
  gridOpacity: number;
  gridSize: number;
};

export type EnvironmentSettings = {
  bgMode: "grid" | "color";
  bgColor: string;
  show3dGrid: boolean;
  keyIntensity: number;
  keyColor: string;
  fillIntensity: number;
  fillColor: string;
  fillPitch: number;
  fillYaw: number;
};
