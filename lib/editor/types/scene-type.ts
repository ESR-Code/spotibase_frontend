export type SceneTypeId = "model" | "image" | "geo";

export type SceneEngine = "playcanvas" | "map";

export type CameraMode = "orbit" | "panZoom" | "globe";

export type SceneSettingsSections = {
  grid: boolean;
  effects: boolean;
  environment: boolean;
  camera: boolean;
  geoDetails: boolean;
  mapStyle: boolean;
  georeference: boolean;
};

export type SceneTypeDescriptor = {
  id: SceneTypeId;
  label: string;
  shortLabel: string;
  description: string;
  accept: string;
  extensions: readonly string[];
  engine: SceneEngine;
  cameraMode: CameraMode;
  subjectControls: {
    scale: boolean;
    rotation: boolean;
    reflection: boolean;
  };
  settingsSections: SceneSettingsSections;
  outlinerTabs: {
    layers: boolean;
  };
  emptySubjectName: string;
  emptySubjectInfo: string;
};
