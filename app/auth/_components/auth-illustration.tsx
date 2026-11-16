/**
 * Flat isometric illustration for the auth hero: a 3D site on a gridded
 * platform with hotspots, plus floating map / image / scene / action pieces.
 * Pure SVG, flat fills only.
 */

type Pt = [number, number];
type V3 = [number, number, number];

const C = {
  top: "#1b2640",
  left: "#121a2e",
  right: "#17213a",
  raised: "#22304f",
  line: "#33466e",
  grid: "#212e4b",
  window: "#0d1323",
  teal: "#4cd7f6",
  amber: "#f4a740",
  white: "#eef1f8",
  muted: "#8d94a8",
};

const COS = Math.cos(Math.PI / 6);

function project(o: Pt, [x, y, z]: V3): Pt {
  return [o[0] + (x - y) * COS, o[1] + (x + y) * 0.5 - z];
}

function pts(o: Pt, list: V3[]) {
  return list
    .map((p) => project(o, p).map((n) => n.toFixed(1)).join(","))
    .join(" ");
}

function Face({ o, p, fill, stroke = C.line }: { o: Pt; p: V3[]; fill: string; stroke?: string }) {
  return <polygon points={pts(o, p)} fill={fill} stroke={stroke} strokeWidth={1} strokeLinejoin="round" />;
}

function Box({
  o,
  at: [x, y, z],
  size: [w, d, h],
  top = C.top,
}: {
  o: Pt;
  at: V3;
  size: V3;
  top?: string;
}) {
  return (
    <g>
      <Face o={o} fill={C.left} p={[[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]} />
      <Face o={o} fill={C.right} p={[[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]} />
      <Face o={o} fill={top} p={[[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]} />
    </g>
  );
}

function Cylinder({ o, at, r, h }: { o: Pt; at: V3; r: number; h: number }) {
  const [cx, cy] = project(o, at);
  const rx = r * Math.SQRT2 * COS;
  const ry = r * Math.SQRT2 * 0.5;
  const ty = cy - h;
  const band = (y: number) => `M ${cx - rx} ${y} A ${rx} ${ry} 0 0 0 ${cx + rx} ${y}`;
  return (
    <g stroke={C.line} strokeWidth={1}>
      <path
        d={`M ${cx - rx} ${ty} L ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy} L ${cx + rx} ${ty} Z`}
        fill={C.left}
      />
      <path d={`M ${cx} ${ty + ry} L ${cx} ${cy + ry}`} />
      <path d={`M ${cx} ${ty + ry} L ${cx + rx} ${ty} L ${cx + rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx} ${cy + ry} Z`} fill={C.right} />
      <path d={band(ty + h * 0.35)} fill="none" />
      <path d={band(ty + h * 0.7)} fill="none" />
      <ellipse cx={cx} cy={ty} rx={rx} ry={ry} fill={C.top} />
      <ellipse cx={cx} cy={ty} rx={rx * 0.55} ry={ry * 0.55} fill="none" />
    </g>
  );
}

function Pin({
  o,
  at,
  label,
  color,
  side = "right",
  stem = 36,
  delay = "0s",
}: {
  o: Pt;
  at: V3;
  label: string;
  color: string;
  side?: "left" | "right";
  stem?: number;
  delay?: string;
}) {
  const [x, y] = project(o, at);
  const ty = y - stem;
  const w = label.length * 6.4 + 18;
  const lx = side === "right" ? x + 12 : x - 12 - w;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={7} ry={4} fill="none" stroke={color} strokeWidth={1} opacity={0.6} />
      <line x1={x} y1={y} x2={x} y2={ty} stroke={color} strokeWidth={1.25} />
      <circle
        className="auth-ill-ping"
        cx={x}
        cy={ty}
        r={7}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        style={{ animationDelay: delay }}
      />
      <circle cx={x} cy={ty} r={5.5} fill={color} stroke={C.window} strokeWidth={2} />
      <rect x={lx} y={ty - 11} width={w} height={22} rx={6} fill={C.left} stroke={C.line} />
      <text x={lx + 9} y={ty + 4} fontSize={11} fontWeight={600} fill={C.white}>
        {label}
      </text>
    </g>
  );
}

function Dashed({ from, to }: { from: Pt; to: Pt }) {
  const mx = (from[0] + to[0]) / 2;
  return (
    <path
      d={`M ${from[0]} ${from[1]} C ${mx} ${from[1]}, ${mx} ${to[1]}, ${to[0]} ${to[1]}`}
      fill="none"
      stroke={C.line}
      strokeWidth={1.25}
      strokeDasharray="3 5"
    />
  );
}

export function AuthIllustration({ className }: { className?: string }) {
  const base: Pt = [300, 262];
  const map: Pt = [108, 100];
  const image: Pt = [518, 118];
  const layers: Pt = [104, 432];
  const nodes: Pt = [494, 424];

  const gridLines = [];
  for (let i = -130; i <= 130; i += 26) {
    gridLines.push(
      <polyline key={`a${i}`} points={pts(base, [[i, -130, 14], [i, 130, 14]])} />,
      <polyline key={`b${i}`} points={pts(base, [[-130, i, 14], [130, i, 14]])} />,
    );
  }

  return (
    <svg viewBox="0 0 600 500" className={className} role="img" aria-label="Spotibase hotspots placed on a 3D model, an image, and a map">
      {/* Connectors */}
      <Dashed from={project(map, [45, 45, 0])} to={project(base, [-130, -40, 14])} />
      <Dashed from={project(image, [2, 40, 0])} to={project(base, [60, -130, 14])} />
      <Dashed from={project(layers, [35, -35, 36])} to={project(base, [-40, 130, 0])} />
      <Dashed from={project(nodes, [-40, 30, 9])} to={project(base, [130, 40, 0])} />

      {/* Base platform with grid */}
      <Box o={base} at={[-130, -130, 0]} size={[260, 260, 14]} />
      <g stroke={C.grid} strokeWidth={1} fill="none">
        {gridLines}
      </g>
      <polygon points={pts(base, [[-130, -130, 14], [130, -130, 14], [130, 130, 14], [-130, 130, 14]])} fill="none" stroke={C.line} />

      {/* Selection outline around the tower */}
      <polygon
        points={pts(base, [[12, -58, 14], [68, -58, 14], [68, -2, 14], [12, -2, 14]])}
        fill="none"
        stroke={C.teal}
        strokeWidth={1.25}
        strokeDasharray="4 4"
      />

      {/* Site: hall, tank, tower, annex (back to front) */}
      <Box o={base} at={[-70, -50, 14]} size={[90, 80, 46]} />
      {[-62, -42, -22, -2].map((x, i) => (
        <Face
          key={x}
          o={base}
          fill={i === 1 ? C.teal : C.window}
          stroke="none"
          p={[[x, 30, 28], [x + 12, 30, 28], [x + 12, 30, 44], [x, 30, 44]]}
        />
      ))}
      <Box o={base} at={[-58, -38, 60]} size={[14, 14, 8]} top={C.raised} />
      <Box o={base} at={[-34, -38, 60]} size={[14, 14, 8]} top={C.raised} />
      <Cylinder o={base} at={[-92, 72, 14]} r={22} h={50} />
      <Box o={base} at={[20, -50, 14]} size={[40, 40, 96]} />
      {[34, 54, 74, 94].map((z) => (
        <Face key={z} o={base} fill={C.window} stroke="none" p={[[60, -42, z], [60, -18, z], [60, -18, z + 10], [60, -42, z + 10]]} />
      ))}
      <Box o={base} at={[20, -10, 14]} size={[56, 44, 28]} />
      <Box o={base} at={[84, 50, 14]} size={[22, 22, 12]} top={C.raised} />

      {/* Hotspots */}
      <Pin o={base} at={[-25, -10, 60]} label="Pump room" color={C.teal} side="left" />
      <Pin o={base} at={[-92, 72, 64]} label="Valve A-12" color={C.amber} side="left" delay="0.9s" />
      <Pin o={base} at={[40, -30, 110]} label="Control room" color={C.white} delay="1.8s" />

      {/* Floating map tile */}
      <Box o={map} at={[-45, -45, 0]} size={[90, 90, 8]} />
      <Face o={map} fill={C.raised} stroke="none" p={[[-40, -40, 8], [-12, -40, 8], [-12, -12, 8], [-40, -12, 8]]} />
      <g stroke={C.line} strokeWidth={2} fill="none" strokeLinecap="round">
        <polyline points={pts(map, [[-45, 0, 8], [45, 0, 8]])} />
        <polyline points={pts(map, [[18, -45, 8], [18, 45, 8]])} />
        <polyline points={pts(map, [[-45, 28, 8], [18, 28, 8]])} />
      </g>
      <polyline
        points={pts(map, [[-30, 38, 8], [-30, 0, 8], [18, 0, 8], [18, -32, 8]])}
        fill="none"
        stroke={C.teal}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {(() => {
        const [x, y] = project(map, [18, -32, 8]);
        return (
          <g>
            <line x1={x} y1={y} x2={x} y2={y - 18} stroke={C.teal} strokeWidth={1.25} />
            <circle cx={x} cy={y - 18} r={4.5} fill={C.teal} stroke={C.window} strokeWidth={2} />
          </g>
        );
      })()}

      {/* Floating image panel */}
      <Box o={image} at={[-24, -30, 0]} size={[48, 60, 4]} />
      <Box o={image} at={[-2, -40, 4]} size={[4, 80, 84]} />
      <Face o={image} fill={C.left} p={[[2, -32, 14], [2, 32, 14], [2, 32, 80], [2, -32, 80]]} />
      <Face o={image} fill={C.raised} stroke="none" p={[[2, 30, 16], [2, 4, 46], [2, -6, 34], [2, -18, 52], [2, -30, 16]]} />
      <Face o={image} fill={C.amber} stroke="none" p={[[2, 20, 62], [2, 12, 62], [2, 12, 70], [2, 20, 70]]} />
      {(() => {
        const [x, y] = project(image, [2, -12, 52]);
        return <circle cx={x} cy={y} r={4.5} fill={C.teal} stroke={C.window} strokeWidth={2} />;
      })()}

      {/* Scene layers */}
      <Box o={layers} at={[-35, -35, 0]} size={[70, 70, 4]} />
      <Box o={layers} at={[-35, -35, 16]} size={[70, 70, 4]} />
      <Box o={layers} at={[-35, -35, 32]} size={[70, 70, 4]} top={C.raised} />
      <Face o={layers} fill={C.teal} stroke="none" p={[[-25, -25, 36], [-5, -25, 36], [-5, -5, 36], [-25, -5, 36]]} />
      <g stroke={C.line} strokeWidth={2} strokeLinecap="round">
        <polyline points={pts(layers, [[5, -22, 36], [25, -22, 36]])} />
        <polyline points={pts(layers, [[5, -10, 36], [20, -10, 36]])} />
      </g>

      {/* Action graph nodes */}
      <polyline
        points={pts(nodes, [[-30, 30, 9], [0, 0, 9], [30, -30, 9]])}
        fill="none"
        stroke={C.teal}
        strokeWidth={1.25}
      />
      <Box o={nodes} at={[-40, 20, 0]} size={[20, 20, 18]} />
      <Box o={nodes} at={[-10, -10, 0]} size={[20, 20, 18]} top={C.teal} />
      <Box o={nodes} at={[20, -40, 0]} size={[20, 20, 18]} />
    </svg>
  );
}
