/**
 * Garment artwork for the chibi outfit figure (viewBox 0 0 220 420).
 *
 * Every garment is split into:
 *  - `shape`: flat filled paths only (no <g>), so the same nodes can be reused
 *    inside a <clipPath>, as the selection outline and as the hit area;
 *  - `detail`: seams, collars, pockets, stitching and folds, drawn clipped to
 *    the shape so nothing spills past the fabric edge.
 *
 * Sleeves and trouser legs are built around the limb centrelines in
 * `outfitGeometry`, so they follow the arms and legs instead of boxing them.
 * Undressed areas never get anatomical detail; underwear stays plain.
 */
import React from 'react';
import type { GarmentConfig, GarmentSlot, PlayerPresentation } from '../types';
import {
  FEMALE_FIT,
  MALE_FIT,
  alongLimb,
  hemLine,
  pantsPath,
  tubePath,
  type BodyFit,
  type Pt,
  type WidthProfile,
} from './outfitGeometry';

export interface GarmentDrawing {
  shape: React.ReactNode;
  detail?: React.ReactNode;
}

const INK = '#1d0c13';
const WHITE = '#ffffff';
const STITCH = '#e3a95c';
const BRASS = '#d9b567';

interface LineProps {
  d: string;
  o?: number;
  w?: number;
  color?: string;
  dash?: string;
}

const Line: React.FC<LineProps> = ({ d, o = 0.2, w = 1.1, color = INK, dash }) => (
  <path d={d} fill="none" stroke={color} strokeOpacity={o} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
);

const Tint: React.FC<{ d: string; o: number; color?: string }> = ({ d, o, color = INK }) => <path d={d} fill={color} opacity={o} />;

const Fill: React.FC<{ d: string; fill: string }> = ({ d, fill }) => <path d={d} fill={fill} />;

const sleevePair = (fit: BodyFit, to: number, width: WidthProfile) => [
  tubePath(fit.armL, 0, to, width, { roundStart: true }),
  tubePath(fit.armR, 0, to, width, { roundStart: true }),
];

const bandPair = (fit: BodyFit, from: number, to: number, width: WidthProfile) => [
  tubePath(fit.armL, from, to, width),
  tubePath(fit.armR, from, to, width),
];

/** Sleeves sit slightly behind the body panel, so they carry a little shadow. */
const Sleeves = ({ paths, fill }: { paths: string[]; fill: string }) => (
  <>
    {paths.map((d, index) => <Fill key={`f${index}`} d={d} fill={fill} />)}
    {paths.map((d, index) => <Tint key={`t${index}`} d={d} o={0.09} />)}
  </>
);

/** Short rib lines across a curved band between two quadratic edges. */
const ribLines = (x0: number, x1: number, step: number, top: (x: number) => number, bottom: (x: number) => number) => {
  let d = '';
  for (let x = x0; x <= x1 + 0.01; x += step) d += `M${x.toFixed(1)} ${top(x).toFixed(1)}V${bottom(x).toFixed(1)}`;
  return d;
};

/** Belt loops sitting on a waistline that dips to `dip` at the centre. */
const beltLoops = (xs: number[], waistL: Pt, waistR: Pt, dip: number, height = 8.5) => {
  const half = (waistR[0] - waistL[0]) / 2;
  const centre = waistL[0] + half;
  return xs
    .map((x) => {
      const u = (x - centre) / half;
      const y = waistL[1] + (dip - waistL[1]) * (1 - u * u);
      return `M${(x - 1.3).toFixed(1)} ${y.toFixed(1)}h2.6v${height}h-2.6Z`;
    })
    .join('');
};

/* ------------------------------------------------------------------ */
/* Male tops                                                           */
/* ------------------------------------------------------------------ */

const M = MALE_FIT;
const F = FEMALE_FIT;

const MALE_ARMHOLES = 'M69.5 119C70.5 127 71.5 135 72.5 142M150.5 119C149.5 127 148.5 135 147.5 142';
const MALE_SIDE_DRAG = 'M76.5 147c4.5 2.5 8 6.5 10 11.5M143.5 147c-4.5 2.5-8 6.5-10 11.5';

const MALE_TEE = {
  body: 'M92.5 103.5L96 105Q110 119 124 105L127.5 103.5C134 106 141 109.5 147 113C150 114.5 151.5 117 151.5 120L147.5 142C146.5 158 144.5 176 144.5 196C144.5 208 145.5 216 146.5 223C134 228.5 86 228.5 73.5 223C74.5 216 75.5 208 75.5 196C75.5 176 73.5 158 72.5 142L68.5 120C68.5 117 70 114.5 73 113C79 109.5 86 106 92.5 103.5Z',
  sleeves: sleevePair(M, 0.5, [[0, 27], [0.5, 25.5]]),
  sleeveHems: hemLine(M.armL, 0.44, 26) + hemLine(M.armR, 0.44, 26),
};

const maleTee = (color: string): GarmentDrawing => ({
  shape: (
    <>
      <Sleeves paths={MALE_TEE.sleeves} fill={color} />
      <Fill d={MALE_TEE.body} fill={color} />
    </>
  ),
  detail: (
    <>
      <Line d="M94.2 104.4Q110 121.5 125.8 104.4" o={0.2} w={3.4} />
      <Line d="M96.6 105.8Q110 118.6 123.4 105.8" color={WHITE} o={0.3} w={0.8} />
      <Line d={MALE_ARMHOLES} o={0.2} w={1} />
      <Line d={MALE_TEE.sleeveHems} o={0.2} w={0.9} />
      <Line d={MALE_SIDE_DRAG} o={0.15} w={1.2} />
      <Line d="M86 214c6 2.2 12 2.4 17 .6M119 215.6c6 1.4 11.5.6 16-2.4" o={0.15} w={1.2} />
      <Line d="M90 125c8-3.5 17-4.5 25-3" color={WHITE} o={0.18} w={1.6} />
      <Line d="M75 219.3C87 224.3 133 224.3 145 219.3" o={0.18} w={0.9} />
    </>
  ),
});

const MALE_SHIRT = {
  body: 'M93 103L110 116L127 103C134 106 141 109.5 147 113C150 114.5 151.5 117 151.5 120L148 142C147 158 145.5 176 145 196C145 206 145.8 212 146.5 218C141 226 128 230.5 110 230.5C92 230.5 79 226 73.5 218C74.2 212 75 206 75 196C74.5 176 73 158 72 142L68.5 120C68.5 117 70 114.5 73 113C79 109.5 86 106 93 103Z',
  collar: [
    'M92 101L109.3 114L100.5 122.5C96 116 91.5 111.5 88.5 108C89 105 90.2 102.8 92 101Z',
    'M128 101L110.7 114L119.5 122.5C124 116 128.5 111.5 131.5 108C131 105 129.8 102.8 128 101Z',
  ],
  // Sleeves rolled up to just below the elbow.
  sleeves: sleevePair(M, 1.2, [[0, 27], [1, 24.5], [1.2, 24.5]]),
  cuffs: bandPair(M, 1.0, 1.2, 27),
  cuffLines: [1.0, 1.1, 1.2].map((s) => hemLine(M.armL, s, 27) + hemLine(M.armR, s, 27)).join(''),
};

const maleButtonShirt = (color: string): GarmentDrawing => ({
  shape: (
    <>
      <Sleeves paths={MALE_SHIRT.sleeves} fill={color} />
      {MALE_SHIRT.cuffs.map((d, index) => <Fill key={`c${index}`} d={d} fill={color} />)}
      <Fill d={MALE_SHIRT.body} fill={color} />
      {MALE_SHIRT.collar.map((d, index) => <Fill key={`k${index}`} d={d} fill={color} />)}
    </>
  ),
  detail: (
    <>
      {MALE_SHIRT.cuffs.map((d, index) => <Tint key={`c${index}`} d={d} o={0.1} color={WHITE} />)}
      <Line d={MALE_SHIRT.cuffLines} o={0.22} w={0.9} />
      <Line d={MALE_ARMHOLES} o={0.2} w={1} />
      <Line d="M107.6 117V230M112.4 117V230" o={0.16} w={0.9} />
      {[127, 145, 163, 181, 199, 216].map((y) => (
        <circle key={y} cx="110" cy={y} r="1.55" fill={WHITE} fillOpacity=".82" stroke={INK} strokeOpacity=".22" strokeWidth=".6" />
      ))}
      <Line d="M119.5 137.5h14v13.5c0 2.2-1.6 3.8-3.8 3.8h-6.4c-2.2 0-3.8-1.6-3.8-3.8Z" o={0.24} w={0.9} />
      <Line d="M119.5 140.6h14" o={0.16} w={0.8} />
      {MALE_SHIRT.collar.map((d, index) => (
        <React.Fragment key={`k${index}`}>
          <Tint d={d} o={0.1} color={WHITE} />
          <Line d={d} o={0.3} w={0.9} />
        </React.Fragment>
      ))}
      <Line d={MALE_SIDE_DRAG} o={0.15} w={1.2} />
      <Line d="M75.5 214.5C81 223 93 227 110 227C127 227 139 223 144.5 214.5" o={0.16} w={0.9} />
      <Line d="M118 168c4 1 8 1 11-.5" color={WHITE} o={0.16} w={1.4} />
    </>
  ),
});

const HOODIE = {
  body: 'M95 102L110 121L125 102C133 105 141 109 147.5 113C151 115 153 118 153 122L149.5 143C148.5 160 147 180 147 198C147 208 147.5 216 148 226C136 231 84 231 72 226C72.5 216 73 208 73 198C73 180 71.5 160 70.5 143L67 122C67 118 69 115 72.5 113C79 109 87 105 95 102Z',
  hood: [
    'M100 98C101.5 106 105 114 110 121.5L110 127C103 123 94 118.5 86 114C86 108 89.5 101.5 95 99Z',
    'M120 98C118.5 106 115 114 110 121.5L110 127C117 123 126 118.5 134 114C134 108 130.5 101.5 125 99Z',
  ],
  sleeves: sleevePair(M, 1.62, [[0, 28], [0.9, 26], [1.45, 25], [1.62, 23.5]]),
  cuffs: bandPair(M, 1.49, 1.62, 23.6),
  cuffRibs: [-8, -4.8, -1.6, 1.6, 4.8, 8].map((offset) => alongLimb(M.armL, 1.5, 1.61, offset, 2) + alongLimb(M.armR, 1.5, 1.61, offset, 2)).join(''),
  band: 'M72.7 216.5C84 220.5 136 220.5 147.3 216.5L148 226C136 231 84 231 72 226Z',
  pocket: 'M92 182C104 179.5 116 179.5 128 182C130.5 190 133 197.5 136.5 205L137 214.5C119 217 101 217 83 214.5L83.5 205C87 197.5 89.5 190 92 182Z',
};
const HOODIE_BAND_RIBS = ribLines(75, 145, 3.5, (x) => 217 + 3 * (1 - ((x - 110) / 38) ** 2), (x) => 226.5 + 3.5 * (1 - ((x - 110) / 38) ** 2));

const maleHoodie = (color: string): GarmentDrawing => ({
  shape: (
    <>
      <Sleeves paths={HOODIE.sleeves} fill={color} />
      <Fill d={HOODIE.body} fill={color} />
      {HOODIE.hood.map((d, index) => <Fill key={index} d={d} fill={color} />)}
    </>
  ),
  detail: (
    <>
      {HOODIE.cuffs.map((d, index) => <Tint key={index} d={d} o={0.14} />)}
      <Line d={HOODIE.cuffRibs} o={0.16} w={0.8} />
      <Line d="M68 121C69.5 129 70.5 136 71 143M152 121C150.5 129 149.5 136 149 143" o={0.2} w={1} />
      <Tint d={HOODIE.band} o={0.14} />
      <Line d={HOODIE_BAND_RIBS} o={0.16} w={0.8} />
      <Tint d={HOODIE.pocket} o={0.06} />
      <Line d={HOODIE.pocket} o={0.22} w={1} />
      <Line d="M92 182C89.5 190 87 197.5 83.5 205M128 182C130.5 190 133 197.5 136.5 205" o={0.3} w={1.4} />
      {HOODIE.hood.map((d, index) => <Line key={index} d={d} o={0.22} w={0.9} />)}
      <Line d="M100 98.5C101.5 106 105 114 110 121.5C115 114 118.5 106 120 98.5" o={0.26} w={2.2} />
      <Line d="M88 113c4-7 8-11 12-13M132 113c-4-7-8-11-12-13" color={WHITE} o={0.16} w={1.3} />
      <circle cx="105.6" cy="121.4" r="1.25" fill={INK} opacity=".35" />
      <circle cx="114.4" cy="121.4" r="1.25" fill={INK} opacity=".35" />
      <Line d="M105.6 121.6C105 132 106 141 104.6 151M114.4 121.6C115 132 114 142 115.4 153" color="#f6efe7" o={0.9} w={1.4} />
      <rect x="103.5" y="150.5" width="2.2" height="3.6" rx="1" fill="#d5ccc2" />
      <rect x="114.3" y="152.5" width="2.2" height="3.6" rx="1" fill="#d5ccc2" />
      <Line d={MALE_SIDE_DRAG} o={0.14} w={1.2} />
    </>
  ),
});

/* ------------------------------------------------------------------ */
/* Female tops                                                         */
/* ------------------------------------------------------------------ */

const FEMALE_ARMHOLES = 'M71 119C72 127 73.5 134 74.5 141M149 119C148 127 146.5 134 145.5 141';

const FEMALE_TEE = {
  body: 'M93 104L96.5 105Q110 118.5 123.5 105L127 104C133.5 106.5 140 109.5 145.5 113.5C148.5 115 150 117.5 150 120.5L145.5 141C145 152 142.5 162 141 171C140 178 140.5 184 141.5 191C143 201 145.5 212 146.5 222C134 227.5 86 227.5 73.5 222C74.5 212 77 201 78.5 191C79.5 184 80 178 79 171C77.5 162 75 152 74.5 141L70 120.5C70 117.5 71.5 115 74.5 113.5C80 109.5 86.5 106.5 93 104Z',
  sleeves: sleevePair(F, 0.46, [[0, 25], [0.46, 23.5]]),
  sleeveHems: hemLine(F.armL, 0.4, 24) + hemLine(F.armR, 0.4, 24),
};

const femaleTee = (color: string): GarmentDrawing => ({
  shape: (
    <>
      <Sleeves paths={FEMALE_TEE.sleeves} fill={color} />
      <Fill d={FEMALE_TEE.body} fill={color} />
    </>
  ),
  detail: (
    <>
      <Line d="M94.6 104.6Q110 121 125.4 104.6" o={0.2} w={3.2} />
      <Line d="M97 106Q110 118 123 106" color={WHITE} o={0.3} w={0.8} />
      <Line d={FEMALE_ARMHOLES} o={0.2} w={1} />
      <Line d={FEMALE_TEE.sleeveHems} o={0.2} w={0.9} />
      <Line d="M80 173c2.5 3 4 7 4.5 11M140 173c-2.5 3-4 7-4.5 11" o={0.16} w={1.1} />
      <Line d="M88 213c5 2 10 2.4 15 1M118 214c5 1 10 .4 14.5-2" o={0.14} w={1.1} />
      <Line d="M91 126c7-3 15-4 22-2.5" color={WHITE} o={0.18} w={1.5} />
      <Line d="M75 218.3C87 223.3 133 223.3 145 218.3" o={0.17} w={0.9} />
    </>
  ),
});

const BLOUSE = {
  body: 'M93.5 104L110 128L126.5 104C133 106.5 140 109.5 145.5 113.5C148.5 115 150 117.5 150 120.5L145.5 141C145 152 142.5 162 141 171C140.3 177 140.3 182 141 187C145 197 149 208 150.5 220C139 228 81 228 69.5 220C71 208 75 197 79 187C79.7 182 79.7 177 79 171C77.5 162 75 152 74.5 141L70 120.5C70 117.5 71.5 115 74.5 113.5C80 109.5 87 106.5 93.5 104Z',
  // Puffed short sleeves gathered into an elastic band.
  sleeves: sleevePair(F, 0.43, [[0, 27], [0.22, 31], [0.38, 27], [0.43, 24.5]]),
  bands: bandPair(F, 0.37, 0.43, 25),
  gathers: [-8, -4, 0, 4, 8].map((offset) => alongLimb(F.armL, 0.3, 0.37, offset, 2) + alongLimb(F.armR, 0.3, 0.37, offset, 2)).join(''),
  pleats: Array.from({ length: 9 }, (_, index) => {
    const i = index - 4;
    return `M${(110 + i * 7).toFixed(1)} 190L${(110 + i * 9.6).toFixed(1)} 224`;
  }),
};

const femaleBlouse = (color: string): GarmentDrawing => ({
  shape: (
    <>
      <Sleeves paths={BLOUSE.sleeves} fill={color} />
      <Fill d={BLOUSE.body} fill={color} />
    </>
  ),
  detail: (
    <>
      {BLOUSE.bands.map((d, index) => <Tint key={index} d={d} o={0.14} />)}
      <Line d={BLOUSE.gathers} o={0.16} w={0.9} />
      <Line d={FEMALE_ARMHOLES} o={0.2} w={1} />
      <Line d="M93.5 104L110 128L126.5 104" color={WHITE} o={0.36} w={2.6} />
      <Line d="M95.8 105.4L110 125.6L124.2 105.4" color={WHITE} o={0.5} w={1.3} dash="1.2 1.8" />
      <Line d="M79.2 186.5C95 190.5 125 190.5 140.8 186.5" o={0.22} w={1} />
      {BLOUSE.pleats.map((d, index) => <Line key={index} d={d} color={index % 2 ? WHITE : INK} o={0.12} w={1.1} />)}
      <Line d="M86 150c3 4 6 8 7 13M134 150c-3 4-6 8-7 13" o={0.13} w={1.1} />
      <Line d="M110 129l-3 7.5M110 129l3 7.5" color={WHITE} o={0.6} w={1.2} />
      <path d="M110 128.6c-2.6-3.3-7.4-4.1-7.8-.6-.3 2.9 4.1 3.1 7.8.6Zm0 0c2.6-3.3 7.4-4.1 7.8-.6.3 2.9-4.1 3.1-7.8.6Z" fill={WHITE} fillOpacity=".55" stroke={INK} strokeOpacity=".2" strokeWidth=".6" />
      <circle cx="110" cy="128.6" r="1.5" fill={WHITE} fillOpacity=".7" />
      <Line d="M72 217.5C85 224.5 135 224.5 148 217.5" o={0.16} w={0.9} />
    </>
  ),
});

const CAMISOLE = {
  body: 'M78.5 129C86 127 93 125.5 98 126.5C103 127.5 107 131 110 133.5C113 131 117 127.5 122 126.5C127 125.5 134 127 141.5 129C144.5 135 145 141 144.5 148C143.5 158 142 166 142 172C143.5 189 147.5 206 149.5 222C137 229 83 229 70.5 222C72.5 206 76.5 189 78 172C78 166 76.5 158 75.5 148C75 141 75.5 135 78.5 129Z',
  straps: ['M94.3 104.5L96.7 104.5L94.6 127.6L92.2 127.4Z', 'M123.3 104.5L125.7 104.5L127.8 127.4L125.4 127.6Z'],
  neckline: 'M78.5 129C86 127 93 125.5 98 126.5C103 127.5 107 131 110 133.5C113 131 117 127.5 122 126.5C127 125.5 134 127 141.5 129',
};

const femaleCamisole = (color: string): GarmentDrawing => ({
  shape: (
    <>
      {CAMISOLE.straps.map((d, index) => <Fill key={index} d={d} fill={color} />)}
      <Fill d={CAMISOLE.body} fill={color} />
    </>
  ),
  detail: (
    <>
      {CAMISOLE.straps.map((d, index) => <Tint key={index} d={d} o={0.14} />)}
      <Line d={CAMISOLE.neckline} color={WHITE} o={0.6} w={2.2} dash="0.1 2.6" />
      <Line d="M79 131.5C86 129.5 93 128 98 129C103 130 107 133.5 110 136C113 133.5 117 130 122 129C127 128 134 129.5 141 131.5" o={0.18} w={0.8} />
      <path d="M110 134.5c-1.8-2.2-5-2.7-5.2-.4-.2 1.9 2.7 2 5.2.4Zm0 0c1.8-2.2 5-2.7 5.2-.4.2 1.9-2.7 2-5.2.4Z" fill={WHITE} fillOpacity=".6" />
      <Line d="M84 176c3 13 5 28 5 44M110 176v48M136 176c-3 13-5 28-5 44" o={0.1} w={1.3} />
      <Line d="M97 180c1 14 1.5 28 1 43M123 180c-1 14-1.5 28-1 43" color={WHITE} o={0.12} w={1.3} />
      <Line d="M72 217.6C85 225 135 225 148 217.6" color={WHITE} o={0.5} w={1.8} dash="0.1 2.6" />
      <Line d="M90 140c7-2.5 15-3 22-1.5" color={WHITE} o={0.16} w={1.4} />
    </>
  ),
});

/* ------------------------------------------------------------------ */
/* Trousers, shorts and the like                                       */
/* ------------------------------------------------------------------ */

const MALE_WAIST = { waistL: [76.5, 199] as Pt, waistR: [143.5, 199] as Pt, waistDip: 202, hipL: [74, 228] as Pt, hipR: [146, 228] as Pt, crotch: [110.8, 263] as Pt };
const FEMALE_WAIST = { waistL: [80, 188] as Pt, waistR: [140, 188] as Pt, waistDip: 190.5, hipL: [74.5, 226] as Pt, hipR: [145.5, 226] as Pt, crotch: [111, 264] as Pt };
/** Long legs end just above the shoe (y ≈ 378.6). */
const FULL_LENGTH = 1.025;

interface PantsGeometry {
  fit: BodyFit;
  waistL: Pt;
  waistR: Pt;
  waistDip: number;
  /** y offset from the waistline to the bottom of the waistband. */
  band: number;
}

const waistCurve = (g: PantsGeometry, offset: number) => {
  const control = 2 * g.waistDip - g.waistL[1];
  return `M${g.waistL[0] - 0.2} ${g.waistL[1] + offset}Q110 ${control + offset} ${g.waistR[0] + 0.2} ${g.waistR[1] + offset}`;
};

const legSeams = (fit: BodyFit, from: number, to: number, offset: number) =>
  alongLimb(fit.legL, from, to, offset) + alongLimb(fit.legR, from, to, -offset);

const hemPair = (fit: BodyFit, s: number, width: number) => hemLine(fit.legL, s, width) + hemLine(fit.legR, s, width);

const pantsWithDetails = (
  color: string,
  outline: string,
  g: PantsGeometry,
  variant: 'jeans' | 'trousers' | 'shorts',
  hem: number,
  hemWidth: number,
): GarmentDrawing => {
  const { fit } = g;
  const male = fit === MALE_FIT;
  const bandBottom = waistCurve(g, g.band);
  const top = g.waistL[1];
  const pocketL = male ? `M85 ${top + 8}C86.5 ${top + 17} 83.5 ${top + 23.5} 75.5 ${top + 26.5}` : `M88 ${top + 7.5}C89 ${top + 18} 85 ${top + 26} 76 ${top + 29}`;
  const pocketR = male ? `M135 ${top + 8}C133.5 ${top + 17} 136.5 ${top + 23.5} 144.5 ${top + 26.5}` : `M132 ${top + 7.5}C131 ${top + 18} 135 ${top + 26} 144 ${top + 29}`;
  const flyTop = g.waistDip + g.band + 0.5;
  return {
    shape: <Fill d={outline} fill={color} />,
    detail: (
      <>
        {variant === 'trousers' && male ? (
          <>
            <path d={`${waistCurve(g, 0)}L${g.waistR[0] + 0.2} ${g.waistR[1] + g.band}Q110 ${2 * g.waistDip - g.waistL[1] + g.band} ${g.waistL[0] - 0.2} ${g.waistL[1] + g.band}Z`} fill="#231719" />
            <rect x="105.8" y={g.waistDip + 0.6} width="8.4" height={g.band - 0.6} rx="1" fill="none" stroke="#dcc48d" strokeWidth="1.3" />
            <Line d={`M109.5 ${g.waistDip + 3.7}h5`} color="#dcc48d" o={1} w={1} />
          </>
        ) : (
          <>
            <Line d={bandBottom} o={0.26} w={1} />
            <Line d={waistCurve(g, 2.6)} color={variant === 'jeans' ? STITCH : WHITE} o={variant === 'jeans' ? 0.6 : 0.2} w={0.8} dash="1.6 1.3" />
            <path d={beltLoops(male ? [83, 97.5, 122.5, 137] : [86, 98.5, 121.5, 134], g.waistL, g.waistR, g.waistDip, g.band + 1.5)} fill={color} stroke={INK} strokeOpacity=".32" strokeWidth=".7" />
            <circle cx="110" cy={g.waistDip + g.band / 2} r="2.1" fill={variant === 'jeans' || variant === 'shorts' ? BRASS : color} stroke={INK} strokeOpacity=".35" strokeWidth=".6" />
          </>
        )}
        {variant === 'trousers' && !male && (
          <Line d="M96 199l.8 15M124 199l-.8 15" o={0.2} w={1} />
        )}
        <Line d={`M110 ${flyTop}V${flyTop + 38}`} o={0.22} w={0.9} />
        <Line d={`M114.4 ${flyTop}V${flyTop + 27}Q114.4 ${flyTop + 34.5} 108.8 ${flyTop + 37}`} color={variant === 'jeans' ? STITCH : INK} o={variant === 'jeans' ? 0.65 : 0.2} w={0.85} dash={variant === 'jeans' ? '1.6 1.3' : undefined} />
        {variant === 'jeans' || variant === 'shorts' ? (
          <>
            <Line d={pocketL + pocketR} o={0.32} w={1.1} />
            <Line d={male ? `M87.6 ${top + 8.5}C89 ${top + 18.5} 85.5 ${top + 26} 76 ${top + 29.2}M132.4 ${top + 8.5}C131 ${top + 18.5} 134.5 ${top + 26} 144 ${top + 29.2}` : `M90.6 ${top + 8}C91.6 ${top + 19.5} 87.4 ${top + 28} 76.6 ${top + 31.6}M129.4 ${top + 8}C128.4 ${top + 19.5} 132.6 ${top + 28} 143.4 ${top + 31.6}`} color={variant === 'jeans' ? STITCH : WHITE} o={variant === 'jeans' ? 0.55 : 0.2} w={0.8} dash="1.5 1.3" />
          </>
        ) : (
          <Line d={male ? `M87 ${top + 8}L79.5 ${top + 27}M133 ${top + 8}L140.5 ${top + 27}` : `M86 ${top + 10}L79 ${top + 31}M134 ${top + 10}L141 ${top + 31}`} o={0.3} w={1} />
        )}
        {variant !== 'shorts' && (
          <>
            <Line d={legSeams(fit, 0.32, hem - 0.02, hemWidth / 2 - 1.4)} o={0.14} w={0.9} />
            {variant === 'trousers'
              ? <Line d={legSeams(fit, 0.3, hem - 0.01, 0)} color={WHITE} o={0.17} w={1} />
              : (
                <>
                  <Line d={alongLimb(fit.legL, 0.36, 0.72, 1.5) + alongLimb(fit.legR, 0.36, 0.72, -1.5)} color={WHITE} o={0.028} w={12} />
                  <Line d={hemPair(fit, 0.6, 11)} o={0.12} w={1} />
                  <Line d={male ? 'M97 244c3 2.4 7 3.4 10.5 3.2M123 244c-3 2.4-7 3.4-10.5 3.2' : 'M97.5 246c3 2.4 7 3.4 10.5 3.2M124.5 246c-3 2.4-7 3.4-10.5 3.2'} color={WHITE} o={0.15} w={1.3} />
                </>
              )}
            <Line d={hemPair(fit, hem - 0.025, hemWidth)} color={variant === 'jeans' ? STITCH : INK} o={variant === 'jeans' ? 0.55 : 0.18} w={0.8} dash={variant === 'jeans' ? '1.6 1.3' : undefined} />
          </>
        )}
        {variant === 'shorts' && (
          <>
            {[tubePath(fit.legL, hem - 0.06, hem + 0.01, hemWidth + 1), tubePath(fit.legR, hem - 0.06, hem + 0.01, hemWidth + 1)].map((d, index) => (
              <Tint key={index} d={d} o={0.12} color={WHITE} />
            ))}
            <Line d={hemPair(fit, hem - 0.06, hemWidth + 1)} o={0.26} w={1} />
          </>
        )}
      </>
    ),
  };
};

const MALE_PANTS = {
  jeans: pantsPath(M, { ...MALE_WAIST, legFrom: 0.27, hem: FULL_LENGTH, width: [[0.27, 31.5], [0.6, 29], [FULL_LENGTH, 28]] }),
  trousers: pantsPath(M, { ...MALE_WAIST, legFrom: 0.27, hem: FULL_LENGTH, width: [[0.27, 31], [0.6, 28.5], [FULL_LENGTH, 28]] }),
  shorts: pantsPath(M, { ...MALE_WAIST, legFrom: 0.27, hem: 0.46, width: [[0.27, 32], [0.46, 33.5]] }),
};
const MALE_PANTS_GEOMETRY: PantsGeometry = { fit: M, waistL: MALE_WAIST.waistL, waistR: MALE_WAIST.waistR, waistDip: MALE_WAIST.waistDip, band: 7 };

const FEMALE_PANTS = {
  jeans: pantsPath(F, { ...FEMALE_WAIST, legFrom: 0.27, hem: FULL_LENGTH, width: [[0.27, 31], [0.6, 27.5], [FULL_LENGTH, 26.5]] }),
  // Wide-leg trousers that flare from the knee.
  trousers: pantsPath(F, { ...FEMALE_WAIST, legFrom: 0.27, hem: FULL_LENGTH, width: [[0.27, 31.5], [0.55, 34], [FULL_LENGTH, 39]] }),
  shorts: pantsPath(F, { ...FEMALE_WAIST, legFrom: 0.27, hem: 0.36, width: [[0.27, 31], [0.36, 33]] }),
};
const FEMALE_PANTS_GEOMETRY: PantsGeometry = { fit: F, waistL: FEMALE_WAIST.waistL, waistR: FEMALE_WAIST.waistR, waistDip: FEMALE_WAIST.waistDip, band: 7 };

const malePants = (garment: GarmentConfig) => {
  if (garment.styleId === 'shorts') return pantsWithDetails(garment.color, MALE_PANTS.shorts, MALE_PANTS_GEOMETRY, 'shorts', 0.46, 33.5);
  if (garment.styleId === 'trousers') return pantsWithDetails(garment.color, MALE_PANTS.trousers, MALE_PANTS_GEOMETRY, 'trousers', FULL_LENGTH, 28);
  return pantsWithDetails(garment.color, MALE_PANTS.jeans, MALE_PANTS_GEOMETRY, 'jeans', FULL_LENGTH, 28);
};

const femalePants = (garment: GarmentConfig) => {
  if (garment.styleId === 'shorts') return pantsWithDetails(garment.color, FEMALE_PANTS.shorts, FEMALE_PANTS_GEOMETRY, 'shorts', 0.36, 33);
  if (garment.styleId === 'trousers') return pantsWithDetails(garment.color, FEMALE_PANTS.trousers, { ...FEMALE_PANTS_GEOMETRY, band: 8.5 }, 'trousers', FULL_LENGTH, 39);
  return pantsWithDetails(garment.color, FEMALE_PANTS.jeans, FEMALE_PANTS_GEOMETRY, 'jeans', FULL_LENGTH, 26.5);
};

/* ------------------------------------------------------------------ */
/* Underwear (kept plain on purpose)                                   */
/* ------------------------------------------------------------------ */

const MALE_UNDERWEAR = {
  briefs: 'M77 207Q110 212 143 207L144.6 229C134 233 120 242 116 258L104 258C100 242 86 233 75.4 229Z',
  boxerBriefs: pantsPath(M, { waistL: [77, 206], waistR: [143, 206], waistDip: 208.5, hipL: [75, 228], hipR: [145, 228], crotch: [110.8, 262], legFrom: 0.27, hem: 0.37, width: [[0.27, 28.5], [0.37, 27.5]] }),
  boxers: pantsPath(M, { waistL: [76.5, 206], waistR: [143.5, 206], waistDip: 208.5, hipL: [73.5, 228], hipR: [146.5, 228], crotch: [110.8, 264], legFrom: 0.27, hem: 0.4, width: [[0.27, 33], [0.4, 36]] }),
};
const MALE_WAISTBAND = 'M76.6 206.5Q110 211.5 143.4 206.5L143.6 213Q110 218 76.4 213Z';

const maleUnderwear = (garment: GarmentConfig): GarmentDrawing => {
  const color = garment.color;
  if (garment.styleId === 'briefs') {
    return {
      shape: <Fill d={MALE_UNDERWEAR.briefs} fill={color} />,
      detail: (
        <>
          <Tint d={MALE_WAISTBAND} o={0.2} />
          <Line d="M77.5 208.6Q110 213.6 142.5 208.6" color={WHITE} o={0.28} w={0.8} />
          <Line d="M75.4 229C86 233 100 242 104 258M144.6 229C134 233 120 242 116 258" o={0.24} w={1.6} />
        </>
      ),
    };
  }
  const boxers = garment.styleId === 'boxers';
  const outline = boxers ? MALE_UNDERWEAR.boxers : MALE_UNDERWEAR.boxerBriefs;
  return {
    shape: <Fill d={outline} fill={color} />,
    detail: (
      <>
        {boxers && <Line d={ribLines(78, 142, 6.4, () => 212, () => 300)} color={WHITE} o={0.16} w={1.6} />}
        <Tint d={MALE_WAISTBAND} o={0.2} />
        <Line d="M77.5 208.6Q110 213.6 142.5 208.6" color={WHITE} o={0.28} w={0.8} />
        {boxers ? (
          <>
            <Line d="M110 216V240" o={0.22} w={0.9} />
            <circle cx="110" cy="222" r="1.2" fill={WHITE} fillOpacity=".75" />
            <circle cx="110" cy="231" r="1.2" fill={WHITE} fillOpacity=".75" />
            <Line d={hemPair(M, 0.37, 36)} o={0.2} w={0.9} />
          </>
        ) : (
          <Line d={hemPair(M, 0.335, 28)} o={0.22} w={1.2} />
        )}
      </>
    ),
  };
};

const FEMALE_UNDERWEAR = {
  bikini: 'M76.5 212Q110 219 143.5 212L144.5 217C134 222 122 235 116 256L104 256C98 235 86 222 75.5 217Z',
  highWaist: 'M80.5 190Q110 194 139.5 190C142 202 144.5 214 145.5 224C134 230 121 241 116 258L104 258C99 241 86 230 74.5 224C75.5 214 78 202 80.5 190Z',
  boyshort: pantsPath(F, { waistL: [77, 210], waistR: [143, 210], waistDip: 212.5, hipL: [75, 228], hipR: [145, 228], crotch: [111, 262], legFrom: 0.27, hem: 0.31, width: [[0.27, 29], [0.31, 29]] }),
};

const femaleUnderwear = (garment: GarmentConfig): GarmentDrawing => {
  const color = garment.color;
  if (garment.styleId === 'high_waist') {
    return {
      shape: <Fill d={FEMALE_UNDERWEAR.highWaist} fill={color} />,
      detail: (
        <>
          <Tint d="M80.5 190Q110 194 139.5 190L140.6 196Q110 200 79.4 196Z" o={0.16} />
          <Line d="M74.5 224C86 230 99 241 104 258M145.5 224C134 230 121 241 116 258" color={WHITE} o={0.45} w={1.6} dash="0.1 2.4" />
          <Line d="M86 205c8 3 16 4 24 3.6" color={WHITE} o={0.16} w={1.4} />
        </>
      ),
    };
  }
  if (garment.styleId === 'boyshort') {
    return {
      shape: <Fill d={FEMALE_UNDERWEAR.boyshort} fill={color} />,
      detail: (
        <>
          <Tint d="M76.8 210Q110 215 143.2 210L143.4 215.5Q110 220.5 76.6 215.5Z" o={0.16} />
          <Line d={hemPair(F, 0.295, 29)} color={WHITE} o={0.5} w={1.6} dash="0.1 2.4" />
        </>
      ),
    };
  }
  return {
    shape: <Fill d={FEMALE_UNDERWEAR.bikini} fill={color} />,
    detail: (
      <>
        <Line d="M76.5 213.6Q110 220.6 143.5 213.6" color={WHITE} o={0.4} w={1} />
        <path d="M110 217.6c-1.6-2-4.6-2.5-4.8-.4-.2 1.8 2.5 1.9 4.8.4Zm0 0c1.6-2 4.6-2.5 4.8-.4.2 1.8-2.5 1.9-4.8.4Z" fill={WHITE} fillOpacity=".55" />
        <Line d="M75.5 217C86 222 98 235 104 256M144.5 217C134 222 122 235 116 256" o={0.2} w={1.2} />
      </>
    ),
  };
};

/* ------------------------------------------------------------------ */
/* Bras                                                                */
/* ------------------------------------------------------------------ */

const braShapes = (spread: number) => {
  // `spread` widens the band for the broader male torso (used after a swap).
  const l = 79 - spread;
  const r = 141 + spread;
  return {
    band: `M${l} 157C99 160.5 121 160.5 ${r} 157L${r + 0.5} 165C121 168.5 99 168.5 ${l - 0.5} 165Z`,
    cups: [
      `M${l + 1.5} 158C${l + 1} 147 ${87 - spread / 2} 138.5 ${96 - spread / 3} 137.5C102.5 137 107.5 141 109.5 147L110 159C100 160.5 90 160 ${l + 1.5} 158Z`,
      `M${r - 1.5} 158C${r - 1} 147 ${133 + spread / 2} 138.5 ${124 + spread / 3} 137.5C117.5 137 112.5 141 110.5 147L110 159C120 160.5 130 160 ${r - 1.5} 158Z`,
    ],
    straps: [
      `M${90 - spread / 2} 139L93 105.5L95.4 105.5L${92.4 - spread / 2} 139.5Z`,
      `M${130 + spread / 2} 139L127 105.5L124.6 105.5L${127.6 + spread / 2} 139.5Z`,
    ],
  };
};

const BRA_CLASSIC = braShapes(0);
const BRA_MALE = braShapes(2);

const classicBra = (color: string, shapes = BRA_CLASSIC): GarmentDrawing => ({
  shape: (
    <>
      {shapes.straps.map((d, index) => <Fill key={`s${index}`} d={d} fill={color} />)}
      <Fill d={shapes.band} fill={color} />
      {shapes.cups.map((d, index) => <Fill key={`c${index}`} d={d} fill={color} />)}
    </>
  ),
  detail: (
    <>
      <Tint d={shapes.band} o={0.12} />
      {shapes.cups.map((d, index) => <Line key={index} d={d} o={0.2} w={0.9} />)}
      <Line d="M86 151c6-4 13-5.5 20-4M134 151c-6-4-13-5.5-20-4" color={WHITE} o={0.25} w={1.2} />
      <path d="M110 155.5c-1.5-1.9-4.3-2.3-4.5-.4-.2 1.7 2.4 1.8 4.5.4Zm0 0c1.5-1.9 4.3-2.3 4.5-.4.2 1.7-2.4 1.8-4.5.4Z" fill={WHITE} fillOpacity=".6" />
    </>
  ),
});

const BRALETTE = {
  cups: [
    'M80.5 159L93 133C99 139 105 146 109.5 156L109.5 159.5C100 161 90 160.5 80.5 159Z',
    'M139.5 159L127 133C121 139 115 146 110.5 156L110.5 159.5C120 161 130 160.5 139.5 159Z',
  ],
  band: 'M79 158C99 161.5 121 161.5 141 158L141.3 166.5C121 170 99 170 78.7 166.5Z',
  straps: ['M92 133.5L93.6 105.5L95.6 105.5L94 133.5Z', 'M128 133.5L126.4 105.5L124.4 105.5L126 133.5Z'],
};

const bralette = (color: string): GarmentDrawing => ({
  shape: (
    <>
      {BRALETTE.straps.map((d, index) => <Fill key={`s${index}`} d={d} fill={color} />)}
      <Fill d={BRALETTE.band} fill={color} />
      {BRALETTE.cups.map((d, index) => <Fill key={`c${index}`} d={d} fill={color} />)}
    </>
  ),
  detail: (
    <>
      {BRALETTE.cups.map((d, index) => <Line key={index} d={d} o={0.2} w={0.9} />)}
      <Line d="M93 133C99 139 105 146 109.5 156M127 133C121 139 115 146 110.5 156" color={WHITE} o={0.55} w={1.6} dash="0.1 2.2" />
      <Line d="M79 166C99 169.5 121 169.5 141 166" color={WHITE} o={0.55} w={1.8} dash="0.1 2.4" />
      <Tint d={BRALETTE.band} o={0.1} />
    </>
  ),
});

const SPORTS_BRA = {
  body: 'M79.5 129C86 127 92 127.5 96 129.5C100 135 105 138 110 138C115 138 120 135 124 129.5C128 127.5 134 127 140.5 129C143.5 137 143.5 147 142.5 156L142 168C121 172 99 172 78 168L77.5 156C76.5 147 76.5 137 79.5 129Z',
  straps: ['M84 129.5L91.5 104.5L98 104.5L93.5 129Z', 'M136 129.5L128.5 104.5L122 104.5L126.5 129Z'],
  band: 'M77.6 160C99 164 121 164 142.4 160L142 168C121 172 99 172 78 168Z',
};

const sportsBra = (color: string): GarmentDrawing => ({
  shape: (
    <>
      {SPORTS_BRA.straps.map((d, index) => <Fill key={index} d={d} fill={color} />)}
      <Fill d={SPORTS_BRA.body} fill={color} />
    </>
  ),
  detail: (
    <>
      <Tint d={SPORTS_BRA.band} o={0.22} />
      <Line d="M80 161.5C99 165.5 121 165.5 140 161.5" color={WHITE} o={0.3} w={0.8} />
      <Line d="M96 129.5C100 135 105 138 110 138C115 138 120 135 124 129.5" o={0.22} w={2} />
      <Line d="M90 145c6-3 13-4 19-3M111 142c6-1 13 0 19 3" color={WHITE} o={0.18} w={1.3} />
    </>
  ),
});

/* ------------------------------------------------------------------ */

export const drawGarment = (presentation: PlayerPresentation, slot: GarmentSlot, garment: GarmentConfig): GarmentDrawing => {
  const color = garment.color;
  if (slot === 'shirt') {
    if (presentation === 'male') {
      if (garment.styleId === 'hoodie') return maleHoodie(color);
      if (garment.styleId === 'button_shirt') return maleButtonShirt(color);
      return maleTee(color);
    }
    if (garment.styleId === 'camisole') return femaleCamisole(color);
    if (garment.styleId === 'blouse') return femaleBlouse(color);
    return femaleTee(color);
  }
  if (slot === 'pants') return presentation === 'male' ? malePants(garment) : femalePants(garment);
  if (slot === 'bra') {
    if (presentation === 'male') return classicBra(color, BRA_MALE);
    if (garment.styleId === 'sports_bra') return sportsBra(color);
    if (garment.styleId === 'bralette') return bralette(color);
    return classicBra(color);
  }
  return presentation === 'male' ? maleUnderwear(garment) : femaleUnderwear(garment);
};
