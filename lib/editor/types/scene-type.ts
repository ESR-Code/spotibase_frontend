export type SceneTypeId = "model" | "image";

export type CameraMode = "orbit" | "panZoom";

export type SceneTypeDescriptor = {
  id: SceneTypeId;
  label: string;
  shortLabel: string;
  accept: string;
  extensions: readonly string[];
  cameraMode: CameraMode;
  subjectControls: {
    scale: boolean;
    rotation: boolean;
    reflection: boolean;
  };
  emptySubjectName: string;
  emptySubjectInfo: string;
};
