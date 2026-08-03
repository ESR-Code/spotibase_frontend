import type { Application, Entity, Vec3 } from "playcanvas";
import type * as pc from "playcanvas";
import { useSettingsStore } from "@/lib/editor/state/settings-store";

type OrbitState = {
  yaw: number;
  pitch: number;
  distance: number;
  target: Vec3;
  zoomTarget: number | null;
  anim: {
    active: boolean;
    t: number;
    duration: number;
    fromPos: Vec3;
    toPos: Vec3;
    fromTarget: Vec3;
    toTarget: Vec3;
  } | null;
  dragging: boolean;
  panning: boolean;
  lastX: number;
  lastY: number;
  enabled: boolean;
};

const ZOOM_STEP = 0.036;
const ZOOM_SMOOTH = 7.5;

export type CameraOrbitPose = {
  yaw: number;
  pitch: number;
  distance: number;
  target: { x: number; y: number; z: number };
};

export type CameraController = {
  update: (dt: number) => void;
  frameToEntity: (entity: Entity, options?: { storeHome?: boolean }) => void;
  focusOnPoint: (point: Vec3, duration?: number) => void;
  /** Animate back to home. Pass `entity` to recompute zoom-extents from its current (scaled) bounds first. */
  resetHome: (entity?: Entity) => void;
  /** Snapshot the current orbit pose (yaw / pitch / distance / target). */
  getOrbitPose: () => CameraOrbitPose;
  /** Animate the camera to a stored orbit pose (used by custom Reset view). */
  animateToOrbitPose: (pose: CameraOrbitPose, duration?: number) => void;
  nudgeZoom: (notches: number) => void;
  setEnabled: (enabled: boolean) => void;
  dispose: () => void;
  getTarget: () => Vec3;
};

export function createCameraController(
  app: Application,
  pcModule: typeof pc,
  camera: Entity,
  canvas: HTMLCanvasElement,
): CameraController {
  const settings = () => useSettingsStore.getState();

  const state: OrbitState = {
    yaw: 35,
    pitch: 28,
    distance: 8,
    target: new pcModule.Vec3(0, 1, 0),
    zoomTarget: null,
    anim: null,
    dragging: false,
    panning: false,
    lastX: 0,
    lastY: 0,
    enabled: true,
  };

  const home = {
    yaw: state.yaw,
    pitch: state.pitch,
    distance: state.distance,
    target: state.target.clone(),
    ready: false,
  };

  const applyPose = () => {
    const s = settings();
    const pitch = clamp(state.pitch, s.minPitch, s.maxPitch);
    const yaw = clamp(state.yaw, s.minYaw, s.maxYaw);
    state.pitch = pitch;
    state.yaw = yaw;
    state.distance = clamp(state.distance, s.minDistance, s.maxDistance);

    const pitchRad = (pitch * Math.PI) / 180;
    const yawRad = (yaw * Math.PI) / 180;

    const x = state.target.x + state.distance * Math.sin(yawRad) * Math.cos(pitchRad);
    const y = state.target.y + state.distance * Math.sin(pitchRad);
    const z = state.target.z + state.distance * Math.cos(yawRad) * Math.cos(pitchRad);

    camera.setPosition(x, y, z);
    camera.lookAt(state.target);
  };

  const storeHome = () => {
    home.yaw = state.yaw;
    home.pitch = state.pitch;
    home.distance = state.distance;
    home.target.copy(state.target);
    home.ready = true;
  };

  const orbitPosition = (
    target: Vec3,
    yaw: number,
    pitch: number,
    distance: number,
  ) => {
    const pitchRad = (pitch * Math.PI) / 180;
    const yawRad = (yaw * Math.PI) / 180;
    return new pcModule.Vec3(
      target.x + distance * Math.sin(yawRad) * Math.cos(pitchRad),
      target.y + distance * Math.sin(pitchRad),
      target.z + distance * Math.cos(yawRad) * Math.cos(pitchRad),
    );
  };

  /** Compute zoom-extents pose from the entity's current world AABB (includes scale/rotation). */
  const computeFramePose = (entity: Entity) => {
    entity.syncHierarchy();

    const bbox = new pcModule.BoundingBox();
    const scratch = new pcModule.BoundingBox();
    let hasMesh = false;

    entity.forEach((node) => {
      const render = (node as Entity).render;
      if (!render?.meshInstances?.length) return;
      for (const mi of render.meshInstances) {
        const meshAabb = mi.mesh?.aabb;
        const world = (mi.node ?? node).getWorldTransform();
        if (meshAabb && world) {
          scratch.setFromTransformedAabb(meshAabb, world);
          if (!hasMesh) {
            bbox.copy(scratch);
            hasMesh = true;
          } else {
            bbox.add(scratch);
          }
          continue;
        }

        if (!hasMesh) {
          bbox.copy(mi.aabb);
          hasMesh = true;
        } else {
          bbox.add(mi.aabb);
        }
      }
    });

    if (!hasMesh) {
      bbox.center.set(0, 1, 0);
      bbox.halfExtents.set(1, 1, 1);
    }

    const size = bbox.halfExtents.clone().mulScalar(2);
    const span = Math.max(size.length(), size.x, size.y, size.z, 1);
    const fovDeg = camera.camera?.fov ?? 42;
    const halfVFov = ((fovDeg * Math.PI) / 180) / 2;
    const aspect =
      camera.camera?.aspectRatio ??
      canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    const halfHFov = Math.atan(Math.tan(halfVFov) * aspect);
    // Fit the bounding sphere in the tighter FOV axis so the whole model is on screen.
    const radius = Math.max(bbox.halfExtents.length(), 0.5);
    const fitHalfFov = Math.min(halfVFov, halfHFov);
    // Modest padding (~12%) so edges aren't clipped, without looking too far away.
    let distance = (radius / Math.tan(fitHalfFov)) * 1.12;

    const minDistance = Math.max(0.4, +(span * 0.12).toFixed(2));
    const maxDistance = Math.max(20, +(span * 6).toFixed(1));
    distance = clamp(distance, minDistance, maxDistance);

    return {
      yaw: 35,
      pitch: 28,
      distance,
      target: bbox.center.clone(),
      minDistance,
      maxDistance,
    };
  };

  const applyFramePose = (
    pose: ReturnType<typeof computeFramePose>,
    storeAsHome: boolean,
  ) => {
    state.anim = null;
    state.zoomTarget = null;
    state.target.copy(pose.target);
    state.yaw = pose.yaw;
    state.pitch = pose.pitch;
    state.distance = pose.distance;
    useSettingsStore.getState().setSettings({
      minDistance: pose.minDistance,
      maxDistance: pose.maxDistance,
    });
    applyPose();
    if (storeAsHome) storeHome();
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!state.enabled || state.anim?.active) return;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    if (e.button === 0 || e.button === 2) {
      state.dragging = e.button === 0;
      state.panning = e.button === 2 || e.shiftKey;
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!state.enabled || (!state.dragging && !state.panning)) return;
    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;

    if (state.panning || e.shiftKey) {
      const panScale = state.distance * 0.0018;
      const right = new pcModule.Vec3().copy(camera.right).mulScalar(-dx * panScale);
      const up = new pcModule.Vec3().copy(camera.up).mulScalar(dy * panScale);
      state.target.add(right).add(up);
    } else if (state.dragging) {
      state.yaw -= dx * 0.35;
      state.pitch += dy * 0.3;
    }
    applyPose();
  };

  const onPointerUp = (e: PointerEvent) => {
    state.dragging = false;
    state.panning = false;
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!state.enabled || state.anim?.active) return;
    const notches =
      e.deltaMode === 1 ? e.deltaY : e.deltaMode === 2 ? e.deltaY * 10 : e.deltaY / 100;
    nudgeZoom(notches);
  };

  const onContextMenu = (e: Event) => e.preventDefault();

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", onContextMenu);

  const nudgeZoom = (notches: number) => {
    if (!notches) return;
    if (state.zoomTarget == null) state.zoomTarget = state.distance;
    state.zoomTarget *= Math.exp(notches * ZOOM_STEP);
    const s = settings();
    state.zoomTarget = clamp(state.zoomTarget, s.minDistance, s.maxDistance);
  };

  const update = (dt: number) => {
    if (state.anim?.active) {
      const anim = state.anim;
      anim.t += dt;
      const k = Math.min(1, anim.t / anim.duration);
      const ease = 1 - Math.pow(1 - k, 3);
      const pos = new pcModule.Vec3().lerp(anim.fromPos, anim.toPos, ease);
      const target = new pcModule.Vec3().lerp(anim.fromTarget, anim.toTarget, ease);
      camera.setPosition(pos);
      state.target.copy(target);
      camera.lookAt(state.target);
      syncOrbitFromPose();
      if (k >= 1) {
        state.anim = null;
        state.zoomTarget = null;
      }
      return;
    }

    if (state.zoomTarget != null) {
      const alpha = 1 - Math.exp(-ZOOM_SMOOTH * Math.max(dt, 0));
      state.distance += (state.zoomTarget - state.distance) * alpha;
      if (Math.abs(state.zoomTarget - state.distance) < 0.002) {
        state.distance = state.zoomTarget;
        state.zoomTarget = null;
      }
    }

    applyPose();
  };

  const syncOrbitFromPose = () => {
    const offset = camera.getPosition().clone().sub(state.target);
    state.distance = Math.max(0.2, offset.length());
    state.pitch = (Math.asin(clamp(offset.y / state.distance, -1, 1)) * 180) / Math.PI;
    state.yaw = (Math.atan2(offset.x, offset.z) * 180) / Math.PI;
  };

  const frameToEntity = (entity: Entity, options?: { storeHome?: boolean }) => {
    applyFramePose(computeFramePose(entity), options?.storeHome !== false);
  };

  const focusOnPoint = (point: Vec3, duration = 0.8) => {
    const homeDist = home.ready
      ? home.distance
      : Math.max(state.distance, 8);
    const offset = camera.getPosition().clone().sub(state.target);
    if (offset.lengthSq() < 1e-6) {
      offset.set(0.72, 0.48, 0.88);
    }
    offset.normalize();
    const focusDist = clamp(homeDist * 0.42, homeDist * 0.35, homeDist * 0.7);
    const toPos = new pcModule.Vec3().copy(point).add(offset.mulScalar(focusDist));

    state.anim = {
      active: true,
      t: 0,
      duration,
      fromPos: camera.getPosition().clone(),
      toPos,
      fromTarget: state.target.clone(),
      toTarget: point.clone(),
    };
    state.zoomTarget = null;
  };

  const resetHome = (entity?: Entity) => {
    // Recompute zoom-extents from the live (scaled) model before animating.
    if (entity) {
      const pose = computeFramePose(entity);
      home.yaw = pose.yaw;
      home.pitch = pose.pitch;
      home.distance = pose.distance;
      home.target.copy(pose.target);
      home.ready = true;
      useSettingsStore.getState().setSettings({
        minDistance: pose.minDistance,
        maxDistance: pose.maxDistance,
      });
    }

    if (!home.ready) {
      applyPose();
      storeHome();
      return;
    }

    state.zoomTarget = null;
    state.anim = {
      active: true,
      t: 0,
      duration: 0.85,
      fromPos: camera.getPosition().clone(),
      toPos: orbitPosition(home.target, home.yaw, home.pitch, home.distance),
      fromTarget: state.target.clone(),
      toTarget: home.target.clone(),
    };
  };

  const getOrbitPose = (): CameraOrbitPose => ({
    yaw: state.yaw,
    pitch: state.pitch,
    distance: state.distance,
    target: {
      x: state.target.x,
      y: state.target.y,
      z: state.target.z,
    },
  });

  const animateToOrbitPose = (pose: CameraOrbitPose, duration = 0.85) => {
    const s = settings();
    const yaw = clamp(pose.yaw, s.minYaw, s.maxYaw);
    const pitch = clamp(pose.pitch, s.minPitch, s.maxPitch);
    const distance = clamp(pose.distance, s.minDistance, s.maxDistance);
    const target = new pcModule.Vec3(pose.target.x, pose.target.y, pose.target.z);

    state.zoomTarget = null;
    state.anim = {
      active: true,
      t: 0,
      duration,
      fromPos: camera.getPosition().clone(),
      toPos: orbitPosition(target, yaw, pitch, distance),
      fromTarget: state.target.clone(),
      toTarget: target,
    };
  };

  applyPose();

  return {
    update,
    frameToEntity,
    focusOnPoint,
    resetHome,
    getOrbitPose,
    animateToOrbitPose,
    nudgeZoom,
    setEnabled: (enabled) => {
      state.enabled = enabled;
      if (!enabled) {
        state.dragging = false;
        state.panning = false;
      }
    },
    dispose: () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
    },
    getTarget: () => state.target,
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
