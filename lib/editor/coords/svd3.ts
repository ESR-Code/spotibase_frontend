/** 3×3 row-major helpers + Jacobi SVD for Umeyama alignment. */

export type Mat3 = [
  number, number, number,
  number, number, number,
  number, number, number,
];

export function mat3Identity(): Mat3 {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

export function mat3Mul(a: Mat3, b: Mat3): Mat3 {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
  ];
}

export function mat3Transpose(a: Mat3): Mat3 {
  return [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
}

export function mat3Det(a: Mat3): number {
  return (
    a[0] * (a[4] * a[8] - a[5] * a[7]) -
    a[1] * (a[3] * a[8] - a[5] * a[6]) +
    a[2] * (a[3] * a[7] - a[4] * a[6])
  );
}

export function mat3MulVec(
  a: Mat3,
  v: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  return {
    x: a[0] * v.x + a[1] * v.y + a[2] * v.z,
    y: a[3] * v.x + a[4] * v.y + a[5] * v.z,
    z: a[6] * v.x + a[7] * v.y + a[8] * v.z,
  };
}

function at(m: number[], r: number, c: number): number {
  return m[r * 3 + c];
}

function setAt(m: number[], r: number, c: number, v: number): void {
  m[r * 3 + c] = v;
}

/** Jacobi eigen-decomposition of a symmetric 3×3. `evecs` columns are eigenvectors. */
function jacobiEigen3(sym: Mat3): { evals: [number, number, number]; evecs: Mat3 } {
  const a = sym.slice() as number[];
  const v: number[] = [1, 0, 0, 0, 1, 0, 0, 0, 1];

  for (let iter = 0; iter < 64; iter++) {
    let p = 0;
    let q = 1;
    let max = Math.abs(at(a, 0, 1));
    const a02 = Math.abs(at(a, 0, 2));
    const a12 = Math.abs(at(a, 1, 2));
    if (a02 > max) {
      max = a02;
      p = 0;
      q = 2;
    }
    if (a12 > max) {
      max = a12;
      p = 1;
      q = 2;
    }
    if (max < 1e-15) break;

    const app = at(a, p, p);
    const aqq = at(a, q, q);
    const apq = at(a, p, q);
    const tau = (aqq - app) / (2 * apq);
    const t =
      Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
    const c = 1 / Math.sqrt(1 + t * t);
    const s = t * c;

    for (let k = 0; k < 3; k++) {
      const vkp = at(v, k, p);
      const vkq = at(v, k, q);
      setAt(v, k, p, c * vkp - s * vkq);
      setAt(v, k, q, s * vkp + c * vkq);
    }

    const rp = [at(a, p, 0), at(a, p, 1), at(a, p, 2)];
    const rq = [at(a, q, 0), at(a, q, 1), at(a, q, 2)];
    for (let k = 0; k < 3; k++) {
      setAt(a, p, k, c * rp[k] - s * rq[k]);
      setAt(a, k, p, at(a, p, k));
      setAt(a, q, k, s * rp[k] + c * rq[k]);
      setAt(a, k, q, at(a, q, k));
    }
    setAt(a, p, p, c * c * app + s * s * aqq - 2 * s * c * apq);
    setAt(a, q, q, s * s * app + c * c * aqq + 2 * s * c * apq);
    setAt(a, p, q, 0);
    setAt(a, q, p, 0);
  }

  return {
    evals: [at(a, 0, 0), at(a, 1, 1), at(a, 2, 2)],
    evecs: v as Mat3,
  };
}

export type Svd3 = { U: Mat3; S: [number, number, number]; V: Mat3 };

function col(m: Mat3, c: number): { x: number; y: number; z: number } {
  return { x: m[c], y: m[3 + c], z: m[6 + c] };
}

function setCol(
  m: Mat3,
  c: number,
  v: { x: number; y: number; z: number },
): void {
  m[c] = v.x;
  m[3 + c] = v.y;
  m[6 + c] = v.z;
}

function normalizeOrZero(v: { x: number; y: number; z: number }): {
  x: number;
  y: number;
  z: number;
} {
  const n = Math.hypot(v.x, v.y, v.z);
  if (n < 1e-15) return { x: 0, y: 0, z: 0 };
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

function cross(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function fillOrthonormal(U: Mat3): void {
  const c0 = col(U, 0);
  const c1 = col(U, 1);
  const c2 = col(U, 2);
  const n0 = Math.hypot(c0.x, c0.y, c0.z);
  const n1 = Math.hypot(c1.x, c1.y, c1.z);
  const n2 = Math.hypot(c2.x, c2.y, c2.z);
  if (n0 >= n1 && n0 >= n2 && n0 > 1e-12) {
    const a = normalizeOrZero(c0);
    let b = n1 > 1e-12 ? normalizeOrZero(c1) : { x: 0, y: 1, z: 0 };
    if (Math.abs(a.x * b.x + a.y * b.y + a.z * b.z) > 0.9) {
      b = Math.abs(a.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    }
    b = normalizeOrZero(cross(a, cross(b, a)));
    const c = normalizeOrZero(cross(a, b));
    setCol(U, 0, a);
    setCol(U, 1, b);
    setCol(U, 2, c);
    return;
  }
  // Fall back to identity if everything vanished.
  if (n0 < 1e-12 && n1 < 1e-12 && n2 < 1e-12) {
    U[0] = 1;
    U[1] = 0;
    U[2] = 0;
    U[3] = 0;
    U[4] = 1;
    U[5] = 0;
    U[6] = 0;
    U[7] = 0;
    U[8] = 1;
  }
}

/**
 * SVD of a 3×3 matrix: A = U S Vᵀ.
 * V columns are right singular vectors; U columns are left.
 */
export function svd3(A: Mat3): Svd3 {
  const At: Mat3 = mat3Transpose(A);
  const AtA = mat3Mul(At, A);
  const { evals, evecs } = jacobiEigen3(AtA);

  const order: [number, number, number] = [0, 1, 2];
  order.sort((i, j) => evals[j] - evals[i]);

  const V = mat3Identity();
  const S: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const src = order[i];
    setCol(V, i, col(evecs, src));
    S[i] = Math.sqrt(Math.max(0, evals[src]));
  }

  const U = mat3Mul(A, V);
  for (let i = 0; i < 3; i++) {
    const c = col(U, i);
    if (S[i] > 1e-12) {
      setCol(U, i, {
        x: c.x / S[i],
        y: c.y / S[i],
        z: c.z / S[i],
      });
    } else {
      setCol(U, i, { x: 0, y: 0, z: 0 });
    }
  }
  fillOrthonormal(U);

  if (mat3Det(U) < 0 && mat3Det(V) < 0) {
    // Keep both right-handed if possible by flipping a zero singular vector.
  }

  return { U, S, V };
}
