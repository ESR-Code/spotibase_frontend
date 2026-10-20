import type { Application, Entity, Vec3 } from "playcanvas";
import type * as pc from "playcanvas";
import { useSettingsStore } from "@/lib/editor/state/settings-store";
import type { CameraMode } from "@/lib/editor/types/scene-type";

type OrbitPoseState = {
  yaw: number;
  pitch: number;
  distance: number;
  target: Vec3;
};

type OrbitState = {
  mode: CameraMode;
  yaw: number;
  pitch: number;
  distance: number;
  target: Vec3;
  zoomTarget: number | null;
  /** Animations interpolate orbit parameters (not positions) so they never pass the pole. */
  anim: {
    active: boolean;
    t: number;
    duration: number;
    from: OrbitPoseState;
    to: OrbitPoseState;
  } | null;
  dragging: boolean;
  panning: boolean;
  lastX: number;
  lastY: number;
  enabled: boolean;
};

const ZOOM_STEP = 0.036;
const ZOOM_SMOOTH = 7.5;
const PAN_ZOOM_YAW = 0;
const PAN_ZOOM_PITCH = 0;
/** Orbit pitch is elevation: 0° horizon, 90° straight down. Past ±90° the view turns over. */
const PITCH_LIMIT = 90;
/** 3D: the orbit target may leave the subject box by this fraction of its size per side. */
const PAN_MARGIN_3D = 0.5;
/** 2D: at least this share of the image (or of the view, when zoomed in) stays on screen. */
const PAN_KEEP_2D = 0.25;
/** Rubber-band zone past a pan limit, as a fraction of the camera distance. */
const PAN_SOFT_ZONE = 0.15;
/** Spring-back speed after a pan past the limit is released. */
const PAN_SPRING = 12;

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
  /** Immediately apply a stored orbit pose without animating. */
  snapToOrbitPose: (pose: CameraOrbitPose) => void;
  /** Recompute and store default home from entity bounds without moving the camera. */
  storeHomeFromEntity: (entity: Entity) => void;
  nudgeZoom: (notches: number) => void;
  setMode: (mode: CameraMode) => void;
  getMode: () => CameraMode;
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
    mode: "orbit",
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

  const lastPose = {
    yaw: Number.NaN,
    pitch: Number.NaN,
    distance: Number.NaN,
    tx: Number.NaN,
    ty: Number.NaN,
    tz: Number.NaN,
  };
  const panRight = new pcModule.Vec3();
  const panUp = new pcModule.Vec3();
  const animTarget = new pcModule.Vec3();

  //#region Pan limits
  type SubjectBox = { center: Vec3; halfExtents: Vec3 };
  /** Subject world box from the last framing; null = no subject, no limits. */
  let subjectBox: SubjectBox | null = null;
  /** Unconstrained target while panning; the shown target is rubber-banded from it. */
  const rawPanTarget = new pcModule.Vec3();
  /** Limits for the current gesture (widened to include where it started). */
  let gestureLimits: { min: Vec3; max: Vec3 } | null = null;
  let springBack = false;

  /** Pass `out` to reuse vectors (per-frame callers); omit for limits you keep. */
  const panLimits = (out?: {
    min: Vec3;
    max: Vec3;
  }): { min: Vec3; max: Vec3 } | null => {
    if (!subjectBox || !settings().limitPanToSubject) return null;
    const { center, halfExtents } = subjectBox;
    const min = out?.min ?? new pcModule.Vec3();
    const max = out?.max ?? new pcModule.Vec3();
    if (state.mode === "panZoom") {
      // Image lies in the XY plane, viewed straight on along -Z.
      const halfVFov = (((camera.camera?.fov ?? 42) * Math.PI) / 180) / 2;
      const aspect =
        camera.camera?.aspectRatio ??
        canvas.clientWidth / Math.max(canvas.clientHeight, 1);
      const viewHalfH = state.distance * Math.tan(halfVFov);
      const viewHalf = [viewHalfH * aspect, viewHalfH];
      const c = [center.x, center.y];
      const h = [halfExtents.x, halfExtents.y];
      const lo = [0, 0];
      const hi = [0, 0];
      for (let axis = 0; axis < 2; axis++) {
        const keep = PAN_KEEP_2D * 2 * Math.min(h[axis]!, viewHalf[axis]!);
        const reach = h[axis]! + viewHalf[axis]! - keep;
        lo[axis] = c[axis]! - reach;
        hi[axis] = c[axis]! + reach;
      }
      min.set(lo[0]!, lo[1]!, -Infinity);
      max.set(hi[0]!, hi[1]!, Infinity);
      return { min, max };
    }
    const largest = Math.max(halfExtents.x, halfExtents.y, halfExtents.z);
    // Thin axes (flat models) still get some room.
    const margin = (h: number) => Math.max(h, largest * 0.25) * 2 * PAN_MARGIN_3D;
    min.set(
      center.x - halfExtents.x - margin(halfExtents.x),
      center.y - halfExtents.y - margin(halfExtents.y),
      center.z - halfExtents.z - margin(halfExtents.z),
    );
    max.set(
      center.x + halfExtents.x + margin(halfExtents.x),
      center.y + halfExtents.y + margin(halfExtents.y),
      center.z + halfExtents.z + margin(halfExtents.z),
    );
    return { min, max };
  };

  /** Ease past a limit: overshoot o shows as o / (1 + o / soft), never beyond `soft`. */
  const rubberBand = (value: number, lo: number, hi: number, soft: number) => {
    if (value < lo) {
      const over = lo - value;
      return lo - over / (1 + over / soft);
    }
    if (value > hi) {
      const over = value - hi;
      return hi + over / (1 + over / soft);
    }
    return value;
  };

  const beginPanGesture = () => {
    rawPanTarget.copy(state.target);
    springBack = false;
    const limits = panLimits();
    if (!limits) {
      gestureLimits = null;
      return;
    }
    // Starting outside (e.g. after focusing a far hotspot): don't jump; allow panning back in.
    limits.min.min(state.target);
    limits.max.max(state.target);
    gestureLimits = limits;
  };

  const applyPanDelta = (delta: Vec3) => {
    rawPanTarget.add(delta);
    if (!gestureLimits) {
      state.target.copy(rawPanTarget);
      return;
    }
    const soft = Math.max(state.distance * PAN_SOFT_ZONE, 0.05);
    const { min, max } = gestureLimits;
    state.target.set(
      rubberBand(rawPanTarget.x, min.x, max.x, soft),
      rubberBand(rawPanTarget.y, min.y, max.y, soft),
      rubberBand(rawPanTarget.z, min.z, max.z, soft),
    );
  };

  const endPanGesture = () => {
    springBack = gestureLimits != null;
  };

  const scratchLimits = { min: new pcModule.Vec3(), max: new pcModule.Vec3() };
  const clamped = new pcModule.Vec3();

  /**
   * 2D limits depend on zoom, target, aspect, subject box, and the setting.
   * Once the target sits inside them, skip the per-frame check until one of
   * those inputs changes (zoom, pan, resize, reframe, setting toggle).
   */
  const settled2d = {
    distance: Number.NaN,
    tx: Number.NaN,
    ty: Number.NaN,
    aspect: Number.NaN,
    limited: false,
    box: null as SubjectBox | null,
  };
  const viewAspect = () =>
    camera.camera?.aspectRatio ??
    canvas.clientWidth / Math.max(canvas.clientHeight, 1);
  const markSettled2d = () => {
    settled2d.distance = state.distance;
    settled2d.tx = state.target.x;
    settled2d.ty = state.target.y;
    settled2d.aspect = viewAspect();
    settled2d.limited = settings().limitPanToSubject;
    settled2d.box = subjectBox;
  };
  const isSettled2d = () =>
    settled2d.distance === state.distance &&
    settled2d.tx === state.target.x &&
    settled2d.ty === state.target.y &&
    settled2d.aspect === viewAspect() &&
    settled2d.limited === settings().limitPanToSubject &&
    settled2d.box === subjectBox;

  /** After release (or a zoom that tightens 2D limits), ease the target back inside. */
  const updateSpringBack = (dt: number) => {
    if (state.panning || state.anim?.active) return;
    if (!springBack && (state.mode !== "panZoom" || isSettled2d())) return;
    // Gesture limits are widened; only the strict 2D check may mark settled.
    const strict = !springBack;
    const limits = strict ? panLimits(scratchLimits) : gestureLimits;
    if (!limits) {
      springBack = false;
      if (strict) markSettled2d();
      return;
    }
    clamped.set(
      clamp(state.target.x, limits.min.x, limits.max.x),
      clamp(state.target.y, limits.min.y, limits.max.y),
      clamp(state.target.z, limits.min.z, limits.max.z),
    );
    const gap = clamped.distance(state.target);
    if (gap < 1e-4) {
      if (gap > 0) state.target.copy(clamped);
      springBack = false;
      if (strict) markSettled2d();
      return;
    }
    const alpha = 1 - Math.exp(-PAN_SPRING * Math.max(dt, 0));
    state.target.lerp(state.target, clamped, alpha);
  };
  //#endregion

  const clampPitch = (pitch: number) => {
    const s = settings();
    const min = clamp(s.minPitch, -PITCH_LIMIT, PITCH_LIMIT);
    const max = clamp(s.maxPitch, min, PITCH_LIMIT);
    return clamp(pitch, min, max);
  };

  /** Full-circle yaw range: wrap instead of clamping so orbiting never hits a wall. */
  const yawIsUnbounded = () => {
    const s = settings();
    return s.maxYaw - s.minYaw >= 360;
  };

  const clampYaw = (yaw: number) => {
    const s = settings();
    return yawIsUnbounded() ? wrapDegrees(yaw) : clamp(yaw, s.minYaw, s.maxYaw);
  };

  const applyPose = () => {
    const s = settings();
    if (state.mode === "panZoom") {
      state.pitch = PAN_ZOOM_PITCH;
      state.yaw = PAN_ZOOM_YAW;
    } else {
      state.pitch = clampPitch(state.pitch);
      state.yaw = clampYaw(state.yaw);
    }
    state.distance = clamp(state.distance, s.minDistance, s.maxDistance);

    if (
      lastPose.yaw === state.yaw &&
      lastPose.pitch === state.pitch &&
      lastPose.distance === state.distance &&
      lastPose.tx === state.target.x &&
      lastPose.ty === state.target.y &&
      lastPose.tz === state.target.z
    ) {
      return;
    }

    const pitchRad = (state.pitch * Math.PI) / 180;
    const yawRad = (state.yaw * Math.PI) / 180;

    const x =
      state.target.x + state.distance * Math.sin(yawRad) * Math.cos(pitchRad);
    const y = state.target.y + state.distance * Math.sin(pitchRad);
    const z =
      state.target.z + state.distance * Math.cos(yawRad) * Math.cos(pitchRad);

    camera.setPosition(x, y, z);
    // Orientation from yaw / pitch, not lookAt: lookAt uses world up and
    // flips the view when looking straight down.
    camera.setEulerAngles(-state.pitch, state.yaw, 0);
    lastPose.yaw = state.yaw;
    lastPose.pitch = state.pitch;
    lastPose.distance = state.distance;
    lastPose.tx = state.target.x;
    lastPose.ty = state.target.y;
    lastPose.tz = state.target.z;
  };

  const storeHome = () => {
    home.yaw = state.yaw;
    home.pitch = state.pitch;
    home.distance = state.distance;
    home.target.copy(state.target);
    home.ready = true;
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
      bbox.center.set(0, state.mode === "panZoom" ? 0 : 1, 0);
      bbox.halfExtents.set(1, 1, 1);
    }
    subjectBox = hasMesh
      ? { center: bbox.center.clone(), halfExtents: bbox.halfExtents.clone() }
      : null;

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

    const frontal = state.mode === "panZoom";
    return {
      yaw: frontal ? PAN_ZOOM_YAW : 35,
      pitch: frontal ? PAN_ZOOM_PITCH : 28,
      distance,
      target: bbox.center.clone(),
      minDistance,
      maxDistance,
    };
  };

  /** Session camera only. Do not write computed zoom extents into authored settings. */
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
    applyPose();
    if (storeAsHome) storeHome();
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!state.enabled || state.anim?.active) return;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    if (e.button === 0 || e.button === 2) {
      if (state.mode === "panZoom") {
        // Image scenes: any drag pans; orbit is disabled.
        state.dragging = false;
        state.panning = true;
      } else {
        state.dragging = e.button === 0;
        state.panning = e.button === 2 || e.shiftKey;
      }
      // Shift-drag can switch an orbit into a pan mid-gesture; start limits now either way.
      beginPanGesture();
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!state.enabled || (!state.dragging && !state.panning)) return;
    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;

    const shouldPan =
      state.mode === "panZoom" || state.panning || e.shiftKey;
    if (shouldPan) {
      const panScale = state.distance * 0.0018;
      panRight.copy(camera.right).mulScalar(-dx * panScale);
      panUp.copy(camera.up).mulScalar(dy * panScale);
      applyPanDelta(panRight.add(panUp));
    } else if (state.dragging) {
      state.yaw -= dx * 0.35;
      state.pitch += dy * 0.3;
    }
    applyPose();
  };

  const onPointerUp = (e: PointerEvent) => {
    if (state.dragging || state.panning) endPanGesture();
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
      const { from, to } = anim;
      const yawDelta = yawIsUnbounded()
        ? wrapDegrees(to.yaw - from.yaw)
        : to.yaw - from.yaw;
      state.yaw = from.yaw + yawDelta * ease;
      state.pitch = from.pitch + (to.pitch - from.pitch) * ease;
      // Log-space zoom so near and far moves feel equally smooth.
      state.distance =
        from.distance * Math.pow(to.distance / from.distance, ease);
      animTarget.lerp(from.target, to.target, ease);
      state.target.copy(animTarget);
      applyPose();
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

    updateSpringBack(dt);
    applyPose();
  };

  const currentPose = (): OrbitPoseState => ({
    yaw: state.yaw,
    pitch: state.pitch,
    distance: state.distance,
    target: state.target.clone(),
  });

  const startAnim = (to: OrbitPoseState, duration: number) => {
    state.zoomTarget = null;
    state.anim = {
      active: true,
      t: 0,
      duration,
      from: currentPose(),
      to: {
        ...to,
        yaw: state.mode === "panZoom" ? PAN_ZOOM_YAW : clampYaw(to.yaw),
        pitch: state.mode === "panZoom" ? PAN_ZOOM_PITCH : clampPitch(to.pitch),
        distance: Math.max(0.05, to.distance),
      },
    };
  };

  const frameToEntity = (entity: Entity, options?: { storeHome?: boolean }) => {
    applyFramePose(computeFramePose(entity), options?.storeHome !== false);
  };

  const focusOnPoint = (point: Vec3, duration = 0.8) => {
    const homeDist = home.ready
      ? home.distance
      : Math.max(state.distance, 8);
    const focusDist = clamp(homeDist * 0.42, homeDist * 0.35, homeDist * 0.7);
    // Keep the current viewing direction; move in and re-centre on the point.
    startAnim(
      {
        yaw: state.yaw,
        pitch: state.pitch,
        distance: focusDist,
        target: point.clone(),
      },
      duration,
    );
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
    }

    if (!home.ready) {
      applyPose();
      storeHome();
      return;
    }

    startAnim(
      {
        yaw: home.yaw,
        pitch: home.pitch,
        distance: home.distance,
        target: home.target.clone(),
      },
      0.85,
    );
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

  const resolveOrbitPose = (pose: CameraOrbitPose) => {
    const s = settings();
    if (state.mode === "panZoom") {
      return {
        yaw: PAN_ZOOM_YAW,
        pitch: PAN_ZOOM_PITCH,
        distance: clamp(pose.distance, s.minDistance, s.maxDistance),
        target: new pcModule.Vec3(pose.target.x, pose.target.y, pose.target.z),
      };
    }
    return {
      yaw: clampYaw(pose.yaw),
      pitch: clampPitch(pose.pitch),
      distance: clamp(pose.distance, s.minDistance, s.maxDistance),
      target: new pcModule.Vec3(pose.target.x, pose.target.y, pose.target.z),
    };
  };

  const setMode = (mode: CameraMode) => {
    if (state.mode === mode) return;
    state.mode = mode;
    state.anim = null;
    state.zoomTarget = null;
    state.dragging = false;
    state.panning = false;
    if (mode === "panZoom" || mode === "globe") {
      state.yaw = PAN_ZOOM_YAW;
      state.pitch = PAN_ZOOM_PITCH;
    }
    applyPose();
  };

  const snapToOrbitPose = (pose: CameraOrbitPose) => {
    const resolved = resolveOrbitPose(pose);
    state.anim = null;
    state.zoomTarget = null;
    state.yaw = resolved.yaw;
    state.pitch = resolved.pitch;
    state.distance = resolved.distance;
    state.target.copy(resolved.target);
    applyPose();
  };

  const animateToOrbitPose = (pose: CameraOrbitPose, duration = 0.85) => {
    startAnim(resolveOrbitPose(pose), duration);
  };

  const storeHomeFromEntity = (entity: Entity) => {
    const pose = computeFramePose(entity);
    home.yaw = pose.yaw;
    home.pitch = pose.pitch;
    home.distance = pose.distance;
    home.target.copy(pose.target);
    home.ready = true;
  };

  applyPose();

  return {
    update,
    frameToEntity,
    focusOnPoint,
    resetHome,
    getOrbitPose,
    animateToOrbitPose,
    snapToOrbitPose,
    storeHomeFromEntity,
    nudgeZoom,
    setMode,
    getMode: () => state.mode,
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

/** Wrap an angle into [-180, 180). */
function wrapDegrees(deg: number) {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}
