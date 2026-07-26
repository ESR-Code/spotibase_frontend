import type { Entity, Ray } from "playcanvas";
import type * as pc from "playcanvas";

export function screenRayFromEvent(
  pcModule: typeof pc,
  camera: Entity,
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Ray {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const near = camera.camera!.screenToWorld(x, y, camera.camera!.nearClip);
  const far = camera.camera!.screenToWorld(x, y, camera.camera!.farClip);
  const direction = new pcModule.Vec3().sub2(far, near).normalize();
  return new pcModule.Ray(near, direction);
}

export function raySphereHit(
  ray: Ray,
  center: pc.Vec3,
  radius: number,
  pcModule: typeof pc,
  outPoint?: pc.Vec3,
): boolean {
  const sphere = new pcModule.BoundingSphere(center, radius);
  return sphere.intersectsRay(ray, outPoint);
}

export function rayPlaneHit(
  ray: Ray,
  planePoint: pc.Vec3,
  planeNormal: pc.Vec3,
  pcModule: typeof pc,
  outPoint: pc.Vec3,
): boolean {
  const plane = new pcModule.Plane().setFromPointNormal(planePoint, planeNormal);
  return plane.intersectsRay(ray, outPoint);
}

/** Closest mesh AABB hit along ray (model picking for Add mode). */
export function raycastMeshes(
  pcModule: typeof pc,
  root: Entity,
  ray: Ray,
): { point: pc.Vec3; distance: number } | null {
  let best: { point: pc.Vec3; distance: number } | null = null;
  const hitPoint = new pcModule.Vec3();

  root.forEach((node) => {
    const entity = node as Entity;
    const render = entity.render;
    if (!render?.meshInstances?.length) return;
    for (const mi of render.meshInstances) {
      if (mi.aabb.intersectsRay(ray, hitPoint)) {
        const distance = hitPoint.distance(ray.origin);
        if (!best || distance < best.distance) {
          best = { point: hitPoint.clone(), distance };
        }
      }
    }
  });

  return best;
}
