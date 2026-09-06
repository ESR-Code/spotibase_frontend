import type { Application, Entity, StandardMaterial, Texture } from "playcanvas";
import type * as pc from "playcanvas";
import {
  MARKER_SPRITE_SIZE,
  PIN_SPRITE_SCALE,
} from "@/lib/editor/constants/default-settings";
import {
  createImageTexture,
  createLucideIconTexture,
  createPulseRingTexture,
  createTextTexture,
} from "@/lib/editor/engine/hotspot-text-texture";
import { hotspotTypeColors } from "@/lib/editor/theme/tokens";
import {
  DEFAULT_HOTSPOT_SHAPE,
  isHiddenHotspotStyle,
  normalizeHotspotShape,
  type Hotspot,
  type HotspotShape,
} from "@/lib/editor/types/hotspot";

export type HotspotVisual = {
  root: Entity;
  hitProxy: Entity;
  ring: Entity;
  stick: Entity;
  halo: Entity;
  core: Entity | null;
  ringMat: StandardMaterial;
  stickMat: StandardMaterial;
  haloMat: StandardMaterial;
  coreMat: StandardMaterial | null;
  coreTexture: Texture | null;
  ringTexture: Texture;
  styleKey: string;
};

export function visualStyleKey(h: Hotspot): string {
  return [
    h.style,
    normalizeHotspotShape(h.shape),
    h.color,
    h.type,
    h.number,
    h.icon,
    h.markerImage ? h.markerImage.slice(0, 64) : "",
    h.pulse ? "1" : "0",
    h.wick ? "1" : "0",
  ].join("|");
}

export function createHotspotVisual(
  app: Application,
  pcModule: typeof pc,
  hotspot: Hotspot,
): HotspotVisual {
  const colorHex = hotspot.color || hotspotTypeColors[hotspot.type];
  const color = hexToColor(pcModule, colorHex);

  const root = new pcModule.Entity(`Hotspot_${hotspot.id}`);
  root.setPosition(hotspot.position.x, hotspot.position.y, hotspot.position.z);
  (root as Entity & { hotspotId?: number }).hotspotId = hotspot.id;

  const hitProxy = makeSphere(pcModule, "HitProxy", 0.56, unlitMat(pcModule, color, 0), {
    castShadows: false,
    receiveShadows: false,
  });
  // Invisible but still in the scene graph for world-position queries
  if (hitProxy.render) hitProxy.render.enabled = false;
  root.addChild(hitProxy);

  // Soft billboard ring that expands + fades (radar-style pulse)
  const ringTexture = createPulseRingTexture(
    pcModule,
    app.graphicsDevice,
    normalizeHotspotShape(hotspot.shape ?? DEFAULT_HOTSPOT_SHAPE),
  );
  const ringMat = pulseRingMat(pcModule, color, ringTexture);
  const ring = makePlane(pcModule, "PulseRing", ringMat);
  ring.setLocalScale(0.4, 1, 0.4);
  ring.enabled = !!hotspot.pulse;
  root.addChild(ring);

  const stickMat = unlitMat(pcModule, color, 0.7);
  const stick = makeCylinder(pcModule, "Stick", stickMat);
  stick.setLocalScale(0.024, 0.2, 0.024);
  stick.setLocalPosition(0, -0.325, 0);
  stick.enabled = !!hotspot.wick;
  root.addChild(stick);

  const haloMat = unlitMat(pcModule, color, 0);
  const halo = makeSphere(pcModule, "Halo", 0.64, haloMat, {
    castShadows: false,
    receiveShadows: false,
  });
  root.addChild(halo);

  const visual: HotspotVisual = {
    root,
    hitProxy,
    ring,
    stick,
    halo,
    core: null,
    ringMat,
    stickMat,
    haloMat,
    coreMat: null,
    coreTexture: null,
    ringTexture,
    styleKey: visualStyleKey(hotspot),
  };

  void rebuildCore(app, pcModule, visual, hotspot);
  return visual;
}

export async function rebuildCore(
  app: Application,
  pcModule: typeof pc,
  visual: HotspotVisual,
  hotspot: Hotspot,
): Promise<void> {
  destroyCore(visual);

  const colorHex = hotspot.color || hotspotTypeColors[hotspot.type];
  const color = hexToColor(pcModule, colorHex);
  visual.ringMat.emissive.copy(color);
  visual.ringMat.diffuse.copy(color);
  visual.ringMat.update();
  visual.stickMat.emissive.copy(color);
  visual.stickMat.diffuse.copy(color);
  visual.stickMat.update();
  visual.haloMat.emissive.copy(color);
  visual.haloMat.diffuse.copy(color);
  visual.haloMat.update();
  visual.ring.enabled = !!hotspot.pulse;
  if (visual.ring.enabled) {
    visual.ring.setLocalScale(0.4, 1, 0.4);
    visual.ringMat.opacity = 0;
    visual.ringMat.update();
  }

  const shape = normalizeHotspotShape(hotspot.shape ?? DEFAULT_HOTSPOT_SHAPE);
  replacePulseRingTexture(visual, pcModule, app, shape);

  const isHidden = isHiddenHotspotStyle(hotspot.style);
  const isImage = hotspot.style === "image";
  visual.stick.enabled = !!hotspot.wick && !isImage && !isHidden;
  visual.ring.enabled = !!hotspot.pulse && !isHidden;

  const requestKey = visualStyleKey(hotspot);
  visual.styleKey = requestKey;

  if (isHidden) {
    attachSpriteCore(
      visual,
      createTextTexture(
        pcModule,
        app.graphicsDevice,
        "",
        colorHex,
        false,
        shape,
      ),
      pcModule,
      0.28,
      shape,
    );
    visual.styleKey = requestKey;
    return;
  }

  if (isImage && hotspot.markerImage) {
    try {
      const { texture, aspect } = await createImageTexture(
        pcModule,
        app.graphicsDevice,
        hotspot.markerImage,
      );
      // Another rebuild may have started while the image loaded
      if (visual.styleKey !== requestKey) {
        texture.destroy();
        return;
      }
      destroyCore(visual);
      const mat = spriteMat(pcModule, texture);
      const core = makePlane(pcModule, "Core", mat);
      if (aspect >= 1) {
        core.setLocalScale(MARKER_SPRITE_SIZE, 1, MARKER_SPRITE_SIZE / aspect);
      } else {
        core.setLocalScale(MARKER_SPRITE_SIZE * aspect, 1, MARKER_SPRITE_SIZE);
      }
      visual.root.addChild(core);
      visual.core = core;
      visual.coreMat = mat;
      visual.coreTexture = texture;
      visual.styleKey = requestKey;
    } catch {
      destroyCore(visual);
      const mat = unlitMat(pcModule, color, 0.55);
      const core = makeSphere(pcModule, "Core", 0.24, mat, {
        castShadows: false,
        receiveShadows: false,
      });
      visual.root.addChild(core);
      visual.core = core;
      visual.coreMat = mat;
      visual.styleKey = requestKey;
    }
    return;
  }

  if (hotspot.style === "number" && hotspot.number !== "") {
    attachSpriteCore(
      visual,
      createTextTexture(
        pcModule,
        app.graphicsDevice,
        String(hotspot.number),
        colorHex,
        false,
        shape,
      ),
      pcModule,
      1,
      shape,
    );
  } else if (hotspot.style === "icon" && hotspot.icon) {
    try {
      const texture = await createLucideIconTexture(
        pcModule,
        app.graphicsDevice,
        hotspot.icon,
        colorHex,
        shape,
      );
      if (visual.styleKey !== requestKey) {
        texture.destroy();
        return;
      }
      destroyCore(visual);
      attachSpriteCore(visual, texture, pcModule, 1, shape);
    } catch {
      attachSpriteCore(
        visual,
        createTextTexture(
          pcModule,
          app.graphicsDevice,
          "",
          colorHex,
          false,
          shape,
        ),
        pcModule,
        1,
        shape,
      );
    }
  } else {
    // Dot (and image placeholder): same billboard sprite path as number/icon.
    // Unlit mesh spheres were failing to show under the transparent pass.
    attachSpriteCore(
      visual,
      createTextTexture(
        pcModule,
        app.graphicsDevice,
        "",
        colorHex,
        false,
        shape,
      ),
      pcModule,
      isImage ? 0.85 : 1,
      shape,
    );
  }

  visual.styleKey = visualStyleKey(hotspot);
}

export function destroyHotspotVisual(visual: HotspotVisual) {
  destroyCore(visual);
  visual.ringMat.destroy();
  visual.stickMat.destroy();
  visual.haloMat.destroy();
  visual.ringTexture.destroy();
  visual.root.destroy();
}

function destroyCore(visual: HotspotVisual) {
  if (visual.core) {
    visual.core.destroy();
    visual.core = null;
  }
  if (visual.coreMat) {
    visual.coreMat.destroy();
    visual.coreMat = null;
  }
  if (visual.coreTexture) {
    visual.coreTexture.destroy();
    visual.coreTexture = null;
  }
}

function replacePulseRingTexture(
  visual: HotspotVisual,
  pcModule: typeof pc,
  app: Application,
  shape: ReturnType<typeof normalizeHotspotShape>,
) {
  const next = createPulseRingTexture(pcModule, app.graphicsDevice, shape);
  const prev = visual.ringTexture;
  visual.ringTexture = next;
  visual.ringMat.diffuseMap = next;
  visual.ringMat.emissiveMap = next;
  visual.ringMat.opacityMap = next;
  visual.ringMat.update();
  if (prev !== next) prev.destroy();
}

function unlitMat(
  pcModule: typeof pc,
  color: pc.Color,
  opacity: number,
): StandardMaterial {
  const mat = new pcModule.StandardMaterial();
  mat.diffuse = color.clone();
  mat.emissive = color.clone();
  mat.emissiveIntensity = 1;
  mat.useLighting = false;
  mat.useSkybox = false;
  mat.depthWrite = false;
  mat.depthTest = false;
  mat.opacity = opacity;
  mat.blendType = opacity < 1 ? pcModule.BLEND_NORMAL : pcModule.BLEND_NONE;
  mat.cull = pcModule.CULLFACE_NONE;
  mat.update();
  return mat;
}

function attachSpriteCore(
  visual: HotspotVisual,
  texture: Texture,
  pcModule: typeof pc,
  opacity = 1,
  shape: HotspotShape = DEFAULT_HOTSPOT_SHAPE,
) {
  const mat = spriteMat(pcModule, texture, opacity);
  const core = makePlane(pcModule, "Core", mat);
  const size =
    shape === "pin" ? MARKER_SPRITE_SIZE * PIN_SPRITE_SCALE : MARKER_SPRITE_SIZE;
  core.setLocalScale(size, 1, size);
  visual.root.addChild(core);
  visual.core = core;
  visual.coreMat = mat;
  visual.coreTexture = texture;
}

function spriteMat(
  pcModule: typeof pc,
  texture: Texture,
  opacity = 1,
): StandardMaterial {
  const mat = new pcModule.StandardMaterial();
  mat.diffuseMap = texture;
  mat.emissiveMap = texture;
  mat.emissive = new pcModule.Color(1, 1, 1);
  mat.emissiveIntensity = 1;
  mat.opacityMap = texture;
  mat.opacityMapChannel = "a";
  mat.useLighting = false;
  mat.useSkybox = false;
  mat.depthWrite = false;
  mat.depthTest = false;
  mat.opacity = opacity;
  mat.alphaTest = 0.08;
  mat.blendType = pcModule.BLEND_NORMAL;
  mat.cull = pcModule.CULLFACE_NONE;
  mat.update();
  return mat;
}

function pulseRingMat(
  pcModule: typeof pc,
  color: pc.Color,
  texture: Texture,
): StandardMaterial {
  const mat = new pcModule.StandardMaterial();
  mat.diffuseMap = texture;
  mat.emissiveMap = texture;
  mat.diffuse = color.clone();
  mat.emissive = color.clone();
  mat.emissiveIntensity = 1.15;
  mat.opacityMap = texture;
  mat.opacityMapChannel = "a";
  mat.useLighting = false;
  mat.useSkybox = false;
  mat.depthWrite = false;
  mat.depthTest = false;
  mat.opacity = 0;
  mat.blendType = pcModule.BLEND_NORMAL;
  mat.cull = pcModule.CULLFACE_NONE;
  mat.update();
  return mat;
}

function onHotspotLayer(entity: Entity, pcModule: typeof pc) {
  // UI draws after World and Immediate, so markers stay above mesh strokes.
  if (entity.render) {
    entity.render.layers = [pcModule.LAYERID_UI];
  }
}

function makeSphere(
  pcModule: typeof pc,
  name: string,
  diameter: number,
  material: StandardMaterial,
  opts: { castShadows: boolean; receiveShadows: boolean },
): Entity {
  const e = new pcModule.Entity(name);
  e.addComponent("render", {
    type: "sphere",
    castShadows: opts.castShadows,
    receiveShadows: opts.receiveShadows,
    material,
    layers: [pcModule.LAYERID_UI],
  });
  onHotspotLayer(e, pcModule);
  e.setLocalScale(diameter, diameter, diameter);
  return e;
}

function makeCylinder(
  pcModule: typeof pc,
  name: string,
  material: StandardMaterial,
): Entity {
  const e = new pcModule.Entity(name);
  e.addComponent("render", {
    type: "cylinder",
    castShadows: false,
    receiveShadows: false,
    material,
    layers: [pcModule.LAYERID_UI],
  });
  onHotspotLayer(e, pcModule);
  return e;
}

function makePlane(
  pcModule: typeof pc,
  name: string,
  material: StandardMaterial,
): Entity {
  const e = new pcModule.Entity(name);
  e.addComponent("render", {
    type: "plane",
    castShadows: false,
    receiveShadows: false,
    material,
    layers: [pcModule.LAYERID_UI],
  });
  onHotspotLayer(e, pcModule);
  // Default plane faces +Y; hotspot-manager billboards by copying camera
  // rotation then rotateLocal(-90,0,0) so the face looks at the camera.
  return e;
}

function hexToColor(pcModule: typeof pc, hex: string): pc.Color {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const num = parseInt(full, 16);
  return new pcModule.Color(
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  );
}
