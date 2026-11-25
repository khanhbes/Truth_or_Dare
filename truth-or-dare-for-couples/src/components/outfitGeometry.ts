/**
 * Geometry helpers for the chibi outfit figure (viewBox 0 0 220 420).
 *
 * Arms and legs are drawn as thick strokes along cubic Bézier centrelines.
 * Sleeves and trouser legs are built from the same centrelines so that they
 * wrap the limb exactly, instead of being hand-drawn boxes that only roughly
 * line up with it.
 */

export type Pt = readonly [number, number];
export type Cubic = readonly [Pt, Pt, Pt, Pt];
/** A limb centreline: one or more joined cubic segments. Position `s` runs 0..segments. */
export type Limb = readonly Cubic[];
/** Width along the limb: a constant, or [s, width] stops interpolated linearly. */
export type WidthProfile = number | ReadonlyArray<readonly [number, number]>;

export interface BodyFit {
  armL: Limb;
  armR: Limb;
  legL: Limb;
  legR: Limb;
}

export const MALE_FIT: BodyFit = {
  armL: [[[80, 124], [68, 139], [64, 161], [67, 183]], [[67, 183], [69, 200], [75, 215], [83, 228]]],
  armR: [[[140, 124], [152, 140], [156, 160], [153, 181]], [[153, 181], [151, 197], [145, 211], [138, 224]]],
  legL: [[[94, 231], [93, 274], [87, 327], [85, 375]]],
  legR: [[[126, 231], [130, 275], [134, 326], [131, 375]]],
};

export const FEMALE_FIT: BodyFit = {
  armL: [[[81, 124], [69, 140], [66, 162], [70, 183]], [[70, 183], [73, 200], [78, 215], [85, 228]]],
  armR: [[[139, 124], [151, 139], [154, 158], [150, 177]], [[150, 177], [147, 192], [141, 205], [134, 217]]],
  legL: [[[95, 232], [92, 275], [87, 327], [89, 375]]],
  legR: [[[125, 232], [132, 275], [136, 326], [130, 375]]],
};

const round = (value: number) => Math.round(value * 10) / 10;
export const fmt = (p: Pt) => `${round(p[0])} ${round(p[1])}`;

const bezierPoint = (c: Cubic, t: number): Pt => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return [
    a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0],
    a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1],
  ];
};

const bezierTangent = (c: Cubic, t: number): Pt => {
  const u = 1 - t;
  const x = 3 * (u * u * (c[1][0] - c[0][0]) + 2 * u * t * (c[2][0] - c[1][0]) + t * t * (c[3][0] - c[2][0]));
  const y = 3 * (u * u * (c[1][1] - c[0][1]) + 2 * u * t * (c[2][1] - c[1][1]) + t * t * (c[3][1] - c[2][1]));
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
};

/** Point and unit tangent at position `s`; outside 0..segments it extends along the end tangent. */
export const limbAt = (limb: Limb, s: number): { p: Pt; tangent: Pt } => {
  const last = limb.length - 1;
  const segment = Math.min(last, Math.max(0, Math.floor(s)));
  const t = s - segment;
  const curve = limb[segment];
  if (t >= 0 && t <= 1) return { p: bezierPoint(curve, t), tangent: bezierTangent(curve, t) };
  const edge = t < 0 ? 0 : 1;
  const base = bezierPoint(curve, edge);
  const tangent = bezierTangent(curve, edge);
  const chord = Math.hypot(curve[3][0] - curve[0][0], curve[3][1] - curve[0][1]);
  const distance = (t - edge) * chord;
  return { p: [base[0] + tangent[0] * distance, base[1] + tangent[1] * distance], tangent };
};

const widthAt = (profile: WidthProfile, s: number) => {
  if (typeof profile === 'number') return profile;
  if (s <= profile[0][0]) return profile[0][1];
  for (let index = 1; index < profile.length; index += 1) {
    const [s1, w1] = profile[index];
    if (s <= s1) {
      const [s0, w0] = profile[index - 1];
      return w0 + ((w1 - w0) * (s - s0)) / (s1 - s0 || 1);
    }
  }
  return profile[profile.length - 1][1];
};

/** The two points across the limb at `s`: [toward -x, toward +x] for a limb pointing down. */
export const acrossLimb = (limb: Limb, s: number, width: number): [Pt, Pt] => {
  const { p, tangent } = limbAt(limb, s);
  const nx = -tangent[1];
  const ny = tangent[0];
  const half = width / 2;
  return [[p[0] + nx * half, p[1] + ny * half], [p[0] - nx * half, p[1] - ny * half]];
};

export interface TubeSides {
  /** Edge on the -x side of a downward limb (outer edge of a left limb). */
  minus: Pt[];
  /** Edge on the +x side of a downward limb (inner edge of a left limb). */
  plus: Pt[];
}

export const tubeSides = (limb: Limb, from: number, to: number, width: WidthProfile, steps = 10): TubeSides => {
  const minus: Pt[] = [];
  const plus: Pt[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const s = from + ((to - from) * index) / steps;
    const [a, b] = acrossLimb(limb, s, widthAt(width, s));
    minus.push(a);
    plus.push(b);
  }
  return { minus, plus };
};

/** Smooth Catmull-Rom curve through the points, as "C" commands (the pen must already be at points[0]). */
export const curveThrough = (points: readonly Pt[]) => {
  let path = '';
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    path += `C${fmt(c1)} ${fmt(c2)} ${fmt(p2)}`;
  }
  return path;
};

/** A smooth open line through the points (for seams, creases and hems). */
export const lineThrough = (points: readonly Pt[]) => `M${fmt(points[0])}${curveThrough(points)}`;

/** Closed tube around part of a limb. A round start reads as a set-in sleeve cap. */
export const tubePath = (limb: Limb, from: number, to: number, width: WidthProfile, options: { roundStart?: boolean; steps?: number } = {}) => {
  const { minus, plus } = tubeSides(limb, from, to, width, options.steps);
  const reversedPlus = [...plus].reverse();
  let path = `M${fmt(minus[0])}${curveThrough(minus)}L${fmt(reversedPlus[0])}${curveThrough(reversedPlus)}`;
  if (options.roundStart) {
    const radius = round(widthAt(width, from) / 2);
    path += `A${radius} ${radius} 0 0 0 ${fmt(minus[0])}`;
  }
  return `${path}Z`;
};

/** A smooth line along the limb centre, offset sideways by `offset` (for creases and seams). */
export const alongLimb = (limb: Limb, from: number, to: number, offset = 0, steps = 8) => {
  const points: Pt[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const s = from + ((to - from) * index) / steps;
    const { p, tangent } = limbAt(limb, s);
    points.push([p[0] - tangent[1] * offset, p[1] + tangent[0] * offset]);
  }
  return lineThrough(points);
};

/** A line straight across the limb at `s` (a hem or a cuff seam). */
export const hemLine = (limb: Limb, s: number, width: number) => {
  const [a, b] = acrossLimb(limb, s, width);
  return `M${fmt(a)}L${fmt(b)}`;
};

export interface PantsSpec {
  /** Outer waist corners and the dip of the front waistline. */
  waistL: Pt;
  waistR: Pt;
  waistDip: number;
  /** Outer hip points the side seam passes through on the way to the legs. */
  hipL: Pt;
  hipR: Pt;
  crotch: Pt;
  /** Where the legs separate (s on the leg) and where they end. */
  legFrom: number;
  hem: number;
  width: WidthProfile;
  /** Samples per leg edge (more = smoother, default 8). */
  steps?: number;
}

/**
 * One outline for a pair of trousers/shorts/briefs: waistband across the top,
 * side seams over the hips, each leg wrapped around its centreline, and a
 * crotch point where the inner seams meet.
 */
export const pantsPath = (fit: BodyFit, spec: PantsSpec) => {
  const left = tubeSides(fit.legL, spec.legFrom, spec.hem, spec.width, spec.steps ?? 8);
  const right = tubeSides(fit.legR, spec.legFrom, spec.hem, spec.width, spec.steps ?? 8);
  const leftOuter = [spec.waistL, spec.hipL, ...left.minus];
  const leftInner = [...[...left.plus].reverse(), spec.crotch];
  const rightInner = [spec.crotch, ...right.minus];
  const rightOuter = [...[...right.plus].reverse(), spec.hipR, spec.waistR];
  const mid: Pt = [(spec.waistL[0] + spec.waistR[0]) / 2, spec.waistDip];
  return [
    `M${fmt(spec.waistL)}`,
    curveThrough(leftOuter),
    `L${fmt(leftInner[0])}`,
    curveThrough(leftInner),
    curveThrough(rightInner),
    `L${fmt(rightOuter[0])}`,
    curveThrough(rightOuter),
    `Q${fmt([mid[0], 2 * mid[1] - (spec.waistL[1] + spec.waistR[1]) / 2])} ${fmt(spec.waistL)}Z`,
  ].join('');
};
