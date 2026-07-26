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
  bgColor: string;
  show3dGrid: boolean;
  shadowIntensity: number;
  shadowColor: string;
  keyIntensity: number;
  keyColor: string;
  fillIntensity: number;
  fillColor: string;
  fillPitch: number;
  fillYaw: number;
};
