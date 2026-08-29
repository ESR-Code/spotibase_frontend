import { align2Point } from "@/lib/editor/coords/align-2point";
import { align3Point } from "@/lib/editor/coords/align-3point";
import { geoToWorld, worldToGeo } from "@/lib/editor/coords/enu";
import { mat4TransformPoint } from "@/lib/editor/coords/mat4";
import { vec3Dist } from "@/lib/editor/coords/vec3";
import { buildGeoReference } from "@/lib/editor/coords/build-geo-reference";
import { validateControlPoints } from "@/lib/editor/coords/validate";

const EPS = 1e-4;

function assert(cond: boolean, msg: string): string | null {
  return cond ? null : msg;
}

export function runAlignmentSelfCheck(): { ok: boolean; failures: string[] } {
  const failures: string[] = [];
  const fail = (msg: string | null) => {
    if (msg) failures.push(msg);
  };

  const origin = { latitude: 40.99, longitude: 29.02, altitude: 10 };
  const geo = { latitude: 41.0, longitude: 29.03, altitude: 25 };
  const enu = geoToWorld(geo, origin);
  const back = worldToGeo(enu, origin);
  fail(
    assert(
      Math.abs(back.latitude - geo.latitude) < 1e-8 &&
        Math.abs(back.longitude - geo.longitude) < 1e-8 &&
        Math.abs(back.altitude - geo.altitude) < 1e-8,
      `geo round-trip failed: ${JSON.stringify(back)}`,
    ),
  );
  fail(assert(enu.x > 0 && enu.y > 0 && Math.abs(enu.z - 15) < 1e-6, "ENU signs/up failed"));

  const two = align2Point(
    [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ],
    [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 10, z: 0 },
    ],
  );
  fail(assert(two.ok, "2-point 90° failed to solve"));
  if (two.ok) {
    const p = mat4TransformPoint(two.transform.matrix, { x: 1, y: 0, z: 0 });
    fail(
      assert(
        Math.abs(p.x) < EPS && Math.abs(p.y - 10) < EPS,
        `2-point mapped (1,0) to (${p.x},${p.y}) expected (0,10)`,
      ),
    );
    fail(
      assert(
        Math.abs(two.transform.scale - 10) < EPS,
        `2-point scale ${two.transform.scale} expected 10`,
      ),
    );
  }

  const three = align3Point(
    [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    ],
    [
      { x: 10, y: 20, z: 0 },
      { x: 12, y: 20, z: 0 },
      { x: 10, y: 22, z: 0 },
    ],
  );
  fail(assert(three.ok, "3-point translate+scale failed to solve"));
  if (three.ok) {
    fail(
      assert(
        Math.abs(three.transform.scale - 2) < 0.02,
        `3-point scale ${three.transform.scale} expected ~2`,
      ),
    );
    const p = mat4TransformPoint(three.transform.matrix, { x: 1, y: 0, z: 0 });
    fail(
      assert(
        vec3Dist(p, { x: 12, y: 20, z: 0 }) < 0.05,
        `3-point mapped (1,0,0) to (${p.x},${p.y},${p.z}) expected (12,20,0)`,
      ),
    );
  }

  const rot = align3Point(
    [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    ],
    [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: -1, y: 0, z: 0 },
    ],
  );
  fail(assert(rot.ok, "3-point yaw failed to solve"));
  if (rot.ok) {
    const p = mat4TransformPoint(rot.transform.matrix, { x: 1, y: 0, z: 0 });
    fail(
      assert(
        vec3Dist(p, { x: 0, y: 1, z: 0 }) < 0.05,
        `3-point yaw mapped (1,0,0) to (${p.x},${p.y},${p.z}) expected (0,1,0)`,
      ),
    );
  }

  const built = buildGeoReference({
    geoSceneId: "scene-geo",
    alignmentMethod: "2-point",
    controlPoints: [
      {
        id: "cp-1",
        local: { x: 0, y: 0, z: 0 },
        geo: { latitude: 40, longitude: 29, altitude: 0 },
      },
      {
        id: "cp-2",
        local: { x: 10, y: 0, z: 0 },
        geo: { latitude: 40, longitude: 29.001, altitude: 0 },
      },
    ],
  });
  fail(assert(built.ok, "buildGeoReference 2-point failed"));
  if (built.ok) {
    fail(assert(built.residualRms < 0.05, `2-point RMS ${built.residualRms}`));
  }

  const dup = buildGeoReference({
    geoSceneId: "scene-geo",
    alignmentMethod: "2-point",
    controlPoints: [
      {
        id: "cp-1",
        local: { x: 0, y: 0, z: 0 },
        geo: { latitude: 40, longitude: 29, altitude: 0 },
      },
      {
        id: "cp-2",
        local: { x: 0, y: 0, z: 0 },
        geo: { latitude: 40.1, longitude: 29.1, altitude: 0 },
      },
    ],
  });
  fail(assert(!dup.ok, "duplicate local points should fail"));

  const street = validateControlPoints("3-point", [
    {
      id: "cp-1",
      local: { x: -0.96, y: 0.06, z: 1 },
      geo: { latitude: 39.85949, longitude: 32.85466, altitude: 0 },
    },
    {
      id: "cp-2",
      local: { x: 1, y: 0.03, z: 0.99 },
      geo: { latitude: 39.85983, longitude: 32.85511, altitude: 0 },
    },
    {
      id: "cp-3",
      local: { x: 1, y: 0.02, z: -0.99 },
      geo: { latitude: 39.85963, longitude: 32.85535, altitude: 0 },
    },
  ]);
  fail(
    assert(
      street.ok,
      `nearby map triangle should be valid, got: ${street.ok ? "" : street.error}`,
    ),
  );
  const streetBuilt = buildGeoReference({
    geoSceneId: "scene-geo",
    alignmentMethod: "3-point",
    controlPoints: [
      {
        id: "cp-1",
        local: { x: -0.96, y: 0.06, z: 1 },
        geo: { latitude: 39.85949, longitude: 32.85466, altitude: 0 },
      },
      {
        id: "cp-2",
        local: { x: 1, y: 0.03, z: 0.99 },
        geo: { latitude: 39.85983, longitude: 32.85511, altitude: 0 },
      },
      {
        id: "cp-3",
        local: { x: 1, y: 0.02, z: -0.99 },
        geo: { latitude: 39.85963, longitude: 32.85535, altitude: 0 },
      },
    ],
  });
  fail(
    assert(
      streetBuilt.ok,
      `3-point street alignment should solve, got: ${"error" in streetBuilt ? streetBuilt.error : ""}`,
    ),
  );

  return { ok: failures.length === 0, failures };
}

const isDirectRun =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv.some((arg) => arg.includes("verify-alignment"));

if (isDirectRun) {
  const result = runAlignmentSelfCheck();
  if (!result.ok) {
    console.error("Alignment self-check failed:");
    for (const f of result.failures) console.error(" -", f);
    process.exitCode = 1;
  } else {
    console.log("Alignment self-check passed");
  }
}
