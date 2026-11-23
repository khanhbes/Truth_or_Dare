import React, { useEffect, useId, useRef, useState } from 'react';
import type {
  GarmentConfig,
  GarmentSlot,
  OutfitConfig,
  OutfitState,
  PlayerPresentation,
} from '../types';
import { GARMENT_LABELS, getDisplayGarment, getEquippedGarmentMap } from '../utils/wardrobe';
import './outfit.css';

const LAYER_ORDER: GarmentSlot[] = ['underwear', 'bra', 'pants', 'shirt'];

const HIT_PATHS: Record<PlayerPresentation, Record<GarmentSlot, string>> = {
  male: {
    shirt: 'M88 102C72 106 61 118 58 137l5 27c4 8 8 19 9 34l2 40c19 11 53 11 72 0l2-40c1-15 5-26 9-34l5-27c-3-19-14-31-30-35Z',
    pants: 'M77 202c21-6 45-6 66 0l4 48-5 130c-8 7-21 7-30 1l-3-104-7 104c-9 6-22 5-30-2l7-129Z',
    bra: 'M80 122c19-8 41-8 60 0l8 55c-22 12-54 12-76 0Z',
    underwear: 'M75 196c22-6 48-6 70 0l4 70c-11 8-27 9-39 3-12 6-28 5-39-3Z',
  },
  female: {
    shirt: 'M89 102c-16 5-27 16-30 34l4 46c4 9 9 20 11 34l-2 22c20 13 56 13 76 0l-2-22c2-14 7-25 11-34l4-46c-3-18-14-29-30-34Z',
    pants: 'M74 201c23-7 49-7 72 0l5 48-7 131c-8 7-21 7-30 1l-5-104-6 104c-9 6-22 5-30-2l8-130Z',
    bra: 'M80 122c19-8 41-8 60 0l8 55c-22 12-54 12-76 0Z',
    underwear: 'M71 187c24-7 54-7 78 0l3 75c-11 9-29 10-42 5-13 5-31 4-42-5Z',
  },
};

/** Where the sparkle burst starts when a garment comes off. */
const GARMENT_CENTER: Record<GarmentSlot, [number, number]> = {
  shirt: [110, 168],
  bra: [110, 152],
  pants: [110, 286],
  underwear: [110, 226],
};

/** Garments lifted over the head fly up; the others slide down. */
const LEAVE_DIRECTION: Record<GarmentSlot, 'up' | 'down'> = {
  shirt: 'up',
  bra: 'up',
  pants: 'down',
  underwear: 'down',
};

const BURST_RAYS: Array<[number, number]> = [
  [-30, -18], [30, -20], [-36, 10], [36, 8], [-12, -34], [14, 30],
];

const LEAVE_MS = 900;

export interface OutfitFigureProps {
  outfit: OutfitConfig;
  state?: OutfitState;
  remainingSlots?: GarmentSlot[];
  interactiveSlots?: GarmentSlot[];
  selectedSlot?: GarmentSlot | null;
  previewRemovedSlot?: GarmentSlot | null;
  editingSlot?: GarmentSlot | null;
  onSelectSlot?: (slot: GarmentSlot) => void;
  active?: boolean;
  compact?: boolean;
  name?: string;
  className?: string;
  ariaLabel?: string;
  /** 0–1: how warm the moment is. Deepens the blush, opens the smile, adds hearts. */
  mood?: number;
}

const normalizeSvgId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '');

const MALE_TORSO = 'M82 113c7-9 17-13 28-13 12 0 22 4 29 13 8 12 9 34 4 57-2 15-1 40 2 60-17 12-53 12-70 0 3-20 4-45 2-60-5-23-3-45 5-57Z';
const FEMALE_TORSO = 'M84 113c7-9 16-13 26-13 11 0 20 4 27 13 8 12 8 33 3 55-3 13-1 24 2 37 2 8 3 17 3 25-17 13-53 13-70 0 0-8 1-17 3-25 3-13 5-24 2-37-5-22-4-43 4-55Z';

interface PaintIds {
  skin: string;
  skinShade: string;
  hair: string;
  hairShine: string;
}

const Face = ({ presentation }: { presentation: PlayerPresentation }) => {
  const female = presentation === 'female';
  const eyeRx = female ? 4.4 : 4.1;
  const eyeRy = female ? 5.7 : 5.2;
  return (
    <g className="outfit-figure__face">
      {/* soft light on the cheek gives the face some roundness */}
      <ellipse cx="101" cy="52" rx="21" ry="17" fill="#fff6f0" opacity=".13" />
      <g className="outfit-figure__brows" fill="none" stroke={female ? '#5a3142' : '#35212b'} strokeLinecap="round" strokeWidth={female ? 1.7 : 2.4}>
        <path d={female ? 'M90.5 55.5c3-2.2 7.5-2.6 10.5-1.2' : 'M90 55c3.2-2.4 8.2-2.8 11.4-1.2'} />
        <path d={female ? 'M119 54.3c3 -1.4 7.5-1 10.5 1.2' : 'M118.6 53.8c3.2-1.6 8.2-1.2 11.4 1.2'} />
      </g>
      <g className="outfit-figure__eyes">
        <ellipse cx="96.5" cy="64" rx={eyeRx} ry={eyeRy} fill="#2b1720" />
        <ellipse cx="123.5" cy="64" rx={eyeRx} ry={eyeRy} fill="#2b1720" />
        <ellipse cx="96.5" cy="65.8" rx={eyeRx * 0.62} ry={eyeRy * 0.42} fill={female ? '#7a3b55' : '#5a3a2e'} opacity=".85" />
        <ellipse cx="123.5" cy="65.8" rx={eyeRx * 0.62} ry={eyeRy * 0.42} fill={female ? '#7a3b55' : '#5a3a2e'} opacity=".85" />
        <circle cx="98" cy="61.8" r="1.7" fill="#fff" />
        <circle cx="125" cy="61.8" r="1.7" fill="#fff" />
        <circle cx="95.4" cy="66.6" r=".8" fill="#fff" opacity=".8" />
        <circle cx="122.4" cy="66.6" r=".8" fill="#fff" opacity=".8" />
        {female && (
          <path d="M91.6 60.4 88.6 58.6M92.8 58.7 90.6 56.4M128.4 60.4l3-1.8M127.2 58.7l2.2-2.3" fill="none" stroke="#2b1720" strokeLinecap="round" strokeWidth="1.3" />
        )}
      </g>
      <path d="M110.4 69.6c1.2 1.5 1.3 2.8.1 3.8" fill="none" stroke="#b0646a" strokeLinecap="round" strokeWidth="1.4" opacity=".55" />
      <ellipse className="outfit-figure__blush" cx="88" cy="72.5" rx="7.2" ry="3.7" fill="#f2808f" />
      <ellipse className="outfit-figure__blush" cx="132" cy="72.5" rx="7.2" ry="3.7" fill="#f2808f" />
      <path className="outfit-figure__mouth outfit-figure__mouth--calm" d="M104.5 77.4c3.4 2.7 7.8 2.7 11 0" fill="none" stroke={female ? '#b04a60' : '#8c4750'} strokeLinecap="round" strokeWidth="2" />
      <path className="outfit-figure__mouth outfit-figure__mouth--happy" d="M103.8 76.6c4 5.4 8.8 5.4 12.6 0-4.2 1.4-8.4 1.4-12.6 0Z" fill={female ? '#a83d57' : '#8a3a48'} />
    </g>
  );
};

const MaleHead = ({ paint }: { paint: PaintIds }) => (
  <g transform="rotate(-4 110 59)">
    <circle cx="77" cy="63" r="7.2" fill="#d98b84" />
    <circle cx="143" cy="63" r="7.2" fill="#c97d79" />
    <path d="M76 61c1.6-1.4 3.6-1.2 4.4.6M144 61c-1.6-1.4-3.6-1.2-4.4.6" fill="none" stroke="#a85d5f" strokeLinecap="round" strokeWidth="1.2" opacity=".6" />
    <ellipse cx="110" cy="59" rx="34" ry="38" fill={`url(#${paint.skin})`} />
    <Face presentation="male" />
    <g className="outfit-figure__hair-front">
      <path
        d="M76 66C71 37 88 13 111 13s40 22 35 53q-2-14-5-23q-2 5-5 8q-4-6-8-10q-3 5-6 9q-4-6-8-10q-3 6-6 9q-4-5-8-8q-3 5-7 8q-3-4-6-6q-3 6-5 11q-2 4-2 15Z"
        fill={`url(#${paint.hair})`}
      />
      <path d="M86 30c8-9 22-12 35-8" fill="none" stroke={`url(#${paint.hairShine})`} strokeLinecap="round" strokeWidth="3.4" />
      <path d="M104 22c-4 4-6 9-6 14M121 22c2 5 2 10 0 15" fill="none" stroke="#1f1218" strokeLinecap="round" strokeWidth="1.2" opacity=".35" />
    </g>
  </g>
);

const FemaleHead = ({ paint }: { paint: PaintIds }) => (
  <g transform="rotate(4 110 59)">
    <circle cx="78" cy="63" r="6.6" fill="#d98b84" />
    <circle cx="142" cy="63" r="6.6" fill="#c97d79" />
    <ellipse cx="110" cy="59" rx="33" ry="38" fill={`url(#${paint.skin})`} />
    <Face presentation="female" />
    <g className="outfit-figure__hair-front">
      <path
        d="M76 66C71 35 89 13 111 13c23 0 40 20 35 53-3-12-6-19-10-25-11 8-31 12-50 12-4 3-7 7-10 13Z"
        fill={`url(#${paint.hair})`}
      />
      <path d="M136 41c-11 8-30 12-48 12" fill="none" stroke="#2a1520" strokeLinecap="round" strokeWidth="1.3" opacity=".4" />
      <path d="M78 60c-5 15-4 31 1 45" fill="none" stroke={`url(#${paint.hair})`} strokeLinecap="round" strokeWidth="7" />
      <path d="M142 58c5 15 4 31-1 45" fill="none" stroke={`url(#${paint.hair})`} strokeLinecap="round" strokeWidth="7" />
      <path d="M88 27c9-8 23-10 36-5" fill="none" stroke={`url(#${paint.hairShine})`} strokeLinecap="round" strokeWidth="3.6" />
      {/* small golden heart clip */}
      <path className="outfit-figure__hair-clip" d="M131 33.5c-1.6-2.6-5.4-1.4-4.9 1.5.4 2 2.8 3.4 4.9 5 2.1-1.6 4.5-3 4.9-5 .5-2.9-3.3-4.1-4.9-1.5Z" fill="#e8c46a" stroke="#fff3c4" strokeWidth=".7" />
    </g>
  </g>
);

const MaleBase = ({ paint, garments, clipPrefix }: { paint: PaintIds; garments?: Partial<Record<GarmentSlot, GarmentConfig>>; clipPrefix?: string }) => {
  const hasShirt = Boolean(garments?.shirt);
  const hasPants = Boolean(garments?.pants);
  const hasUnderwear = Boolean(garments?.underwear);
  const isShorts = garments?.pants?.styleId === 'shorts';
  const armClip = hasShirt && clipPrefix ? `url(#${clipPrefix}-a)` : undefined;
  const legClip = clipPrefix ? (hasPants ? (isShorts ? `url(#${clipPrefix}-ls)` : `url(#${clipPrefix}-ll)`) : hasUnderwear ? `url(#${clipPrefix}-lu)` : undefined) : undefined;

  return (
    <g className="outfit-figure__body outfit-figure__body--male" aria-hidden="true">
      <g className="outfit-figure__limbs">
        <g clipPath={armClip}>
          <path d="M80 124c-12 15-16 37-13 59 2 17 8 32 16 45" fill="none" stroke={`url(#${paint.skin})`} strokeLinecap="round" strokeWidth="20" />
          <path d="M140 124c12 16 16 36 13 57-2 16-8 30-15 43" fill="none" stroke={`url(#${paint.skin})`} strokeLinecap="round" strokeWidth="20" />
          <circle cx="83" cy="230" r="10.5" fill={`url(#${paint.skin})`} />
          <circle cx="138" cy="226" r="10.5" fill={`url(#${paint.skin})`} />
          <path d="M79 234c2 2 5 3 8 2M134 230c2 2 5 3 8 2" fill="none" stroke="#a85d5f" strokeLinecap="round" strokeWidth="1.2" opacity=".45" />
        </g>
        <g clipPath={legClip}>
          <path d="M94 231c-1 43-7 96-9 144" fill="none" stroke={`url(#${paint.skin})`} strokeLinecap="round" strokeWidth="25" />
          <path d="M126 231c4 44 8 95 5 144" fill="none" stroke={`url(#${paint.skin})`} strokeLinecap="round" strokeWidth="25" />
          <path d="M86 300c3 2 7 2 10 0M122 300c3 2 7 2 10 0" fill="none" stroke="#a85d5f" strokeLinecap="round" strokeWidth="1.3" opacity=".4" />
        </g>
      </g>
      <path d={MALE_TORSO} fill={`url(#${paint.skin})`} />
      <path d={MALE_TORSO} fill={`url(#${paint.skinShade})`} />
      <path d="M95 113c5 3 10 3 14 1M112 114c4 2 9 2 14-1" fill="none" stroke="#b46a6e" strokeLinecap="round" strokeWidth="1.3" opacity=".45" />
      <path d="M98 82h25l3 27c-7 8-25 8-32 0Z" fill={`url(#${paint.skin})`} />
      <ellipse cx="110" cy="95" rx="13" ry="4.5" fill="#9e5b60" opacity=".32" />
      <MaleHead paint={paint} />
      <path d="M74 221c5 3 11 2 15-2M135 218c5 4 11 4 15 0" fill="none" stroke="#9e5b60" strokeLinecap="round" strokeWidth="2" opacity=".35" />
      <path d="M72 382c9-4 19-3 27 2l4 9c-11 6-33 6-43 0 1-5 5-9 12-11Zm52 2c9-5 20-4 27 1 6 4 8 8 8 11-11 5-31 4-41-2Z" fill="#7d4a52" />
      <path d="M66 388c8-3 20-3 30 0M126 388c8-3 20-3 30 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".22" strokeWidth="1.6" />
    </g>
  );
};

const FemaleBase = ({ paint, garments, clipPrefix }: { paint: PaintIds; garments?: Partial<Record<GarmentSlot, GarmentConfig>>; clipPrefix?: string }) => {
  const hasShirt = Boolean(garments?.shirt);
  const isCamisole = garments?.shirt?.styleId === 'camisole';
  const hasPants = Boolean(garments?.pants);
  const hasUnderwear = Boolean(garments?.underwear);
  const isShorts = garments?.pants?.styleId === 'shorts';
  const armClip = hasShirt && !isCamisole && clipPrefix ? `url(#${clipPrefix}-a)` : undefined;
  const legClip = clipPrefix ? (hasPants ? (isShorts ? `url(#${clipPrefix}-ls)` : `url(#${clipPrefix}-ll)`) : hasUnderwear ? `url(#${clipPrefix}-lu)` : undefined) : undefined;

  return (
    <g className="outfit-figure__body outfit-figure__body--female" aria-hidden="true">
      {/* long hair falls behind the shoulders */}
      <path
        className="outfit-figure__hair-back"
        d="M72 60C68 30 88 11 111 11c24 0 43 19 39 49-1 22 6 44 2 66-4 14-16 18-24 10 6-18 4-36 2-50H90c-2 14-4 32 2 50-8 8-20 4-24-10-4-22 3-44 4-66Z"
        fill={`url(#${paint.hair})`}
      />
      <g className="outfit-figure__limbs">
        <g clipPath={armClip}>
          <path d="M81 124c-12 16-15 38-11 59 3 17 8 32 15 45" fill="none" stroke={`url(#${paint.skin})`} strokeLinecap="round" strokeWidth="19" />
          <path d="M139 124c12 15 15 34 11 53-3 15-9 28-16 40" fill="none" stroke={`url(#${paint.skin})`} strokeLinecap="round" strokeWidth="19" />
          <circle cx="85" cy="230" r="9.6" fill={`url(#${paint.skin})`} />
          <circle cx="134" cy="219" r="9.6" fill={`url(#${paint.skin})`} />
          <path d="M81 234c2 2 5 3 8 2M130 223c2 2 5 3 8 2" fill="none" stroke="#a85d5f" strokeLinecap="round" strokeWidth="1.2" opacity=".45" />
        </g>
        <g clipPath={legClip}>
          <path d="M95 232c-3 43-8 95-6 143" fill="none" stroke={`url(#${paint.skin})`} strokeLinecap="round" strokeWidth="24" />
          <path d="M125 232c7 43 11 94 5 143" fill="none" stroke={`url(#${paint.skin})`} strokeLinecap="round" strokeWidth="24" />
          <path d="M87 300c3 2 7 2 10 0M122 300c3 2 7 2 10 0" fill="none" stroke="#a85d5f" strokeLinecap="round" strokeWidth="1.3" opacity=".4" />
        </g>
      </g>
      <path d={FEMALE_TORSO} fill={`url(#${paint.skin})`} />
      <path d={FEMALE_TORSO} fill={`url(#${paint.skinShade})`} />
      <path d="M96 113c4 3 9 3 13 1M112 114c4 2 8 2 12-1" fill="none" stroke="#b46a6e" strokeLinecap="round" strokeWidth="1.2" opacity=".42" />
      <path d="M98 82h24l4 27c-7 8-25 8-32 0Z" fill={`url(#${paint.skin})`} />
      <ellipse cx="110" cy="95" rx="12" ry="4.3" fill="#9e5b60" opacity=".3" />
      <FemaleHead paint={paint} />
      <path d="M76 222c5 4 11 3 15-1M132 213c5 4 11 4 15 0" fill="none" stroke="#9e5b60" strokeLinecap="round" strokeWidth="2" opacity=".35" />
      <path d="M77 382c8-5 19-4 27 1l2 9c-12 6-32 6-42 0 1-4 6-8 13-10Zm46 2c9-5 20-4 27 1 5 3 8 7 8 10-11 5-30 4-41-2Z" fill="#a0546a" />
      <path d="M70 388c8-3 19-3 28 0M124 388c8-3 19-3 28 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".25" strokeWidth="1.6" />
    </g>
  );
};

/**
 * Soft light over areas no garment covers any more. The figure never shows
 * anatomical detail; the glow keeps an undressed character tasteful.
 */
const ModestyGlow = ({ presentation, garments, veilId }: { presentation: PlayerPresentation; garments: Partial<Record<GarmentSlot, GarmentConfig>>; veilId: string }) => {
  const chestOpen = presentation === 'female' && !garments.shirt && !garments.bra;
  const hipsOpen = !garments.pants && !garments.underwear;
  if (!chestOpen && !hipsOpen) return null;
  return (
    <g className="outfit-figure__veil" aria-hidden="true">
      {chestOpen && <ellipse cx="110" cy="150" rx="31" ry="17" fill={`url(#${veilId})`} />}
      {hipsOpen && <ellipse cx="110" cy="226" rx="36" ry="22" fill={`url(#${veilId})`} />}
      {[
        chestOpen ? [92, 144] : null,
        chestOpen ? [129, 156] : null,
        hipsOpen ? [96, 222] : null,
        hipsOpen ? [126, 232] : null,
      ].filter(Boolean).map((point, index) => (
        <g key={index} transform={`translate(${point![0]} ${point![1]})`}>
          <path className="outfit-figure__twinkle" style={{ animationDelay: `${index * 0.7}s` }} d="M0-4.5 1.1-1.1 4.5 0 1.1 1.1 0 4.5-1.1 1.1-4.5 0-1.1-1.1Z" fill="#fff6d8" />
        </g>
      ))}
    </g>
  );
};

/** Fabric volume (side shadows, a soft highlight) and a few creases, clipped to the garment. */
const GarmentShading = ({ slot, clip, shadeH, shadeV }: { slot: GarmentSlot; clip: string; shadeH: string; shadeV: string }) => (
  <g clipPath={`url(#${clip})`} className="outfit-figure__fabric" aria-hidden="true">
    <rect x="40" y="90" width="140" height="310" fill={`url(#${shadeH})`} />
    <rect x="40" y="90" width="140" height="310" fill={`url(#${shadeV})`} />
    {slot === 'shirt' && (
      <>
        <path d="M84 214c8 3 16 4 24 3M114 219c7 0 14-2 20-5M99 140c4 6 5 12 4 18M66 150c4 4 7 9 8 14M154 150c-4 4-7 9-8 14" fill="none" stroke="#1d0c13" strokeLinecap="round" strokeOpacity=".2" strokeWidth="1.6" />
        <path d="M90 120c6-3 13-4 20-3M122 128c4 5 6 10 6 16" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".18" strokeWidth="1.6" />
      </>
    )}
    {slot === 'pants' && (
      <>
        <path d="M88 300c4 3 9 3 13 1M119 302c4 2 9 2 13-1M105 214c2 9 4 17 4 25M84 250c2 10 2 22 1 34" fill="none" stroke="#1d0c13" strokeLinecap="round" strokeOpacity=".22" strokeWidth="1.6" />
        <path d="M126 250c2 12 3 26 2 40" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".14" strokeWidth="2" />
      </>
    )}
    {(slot === 'underwear' || slot === 'bra') && (
      <path d={slot === 'bra' ? 'M86 158c6 3 13 3 18 0M117 158c6 3 13 3 18 0' : 'M86 214c8 4 16 5 24 4'} fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".22" strokeWidth="1.5" />
    )}
  </g>
);

const MaleShirt = ({ garment }: { garment: GarmentConfig }) => {
  const fill = garment.color;
  if (garment.styleId === 'hoodie') {
    return (
      <>
        <path d="M91 102c8-5 30-5 38 0c10 3 19 8 25 15c6 8 9 20 8 33l-12 5c-2-7-4-14-6-20c1 28 3 66 4 103c-18 12-58 12-76 0c1-37 3-75 4-103c-2 6-4 13-6 20l-12-5c-1-13 2-25 8-33c6-7 15-12 25-15Z" fill={fill} />
        <path d="M89 104c0-16 42-16 42 0-3 16-14 24-21 24s-18-8-21-24Z" fill="#28141e" opacity=".22" />
        <path d="M83 192c16-7 38-7 54 0l3 24c-18 8-42 8-60 0Z" fill="#28141e" opacity=".16" />
        <path d="M101 119v30m18-30v30" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".55" strokeWidth="2" />
        <circle cx="101" cy="150" r="2" fill="#fff" opacity=".72" />
        <circle cx="119" cy="150" r="2" fill="#fff" opacity=".72" />
      </>
    );
  }
  if (garment.styleId === 'button_shirt') {
    return (
      <>
        <path d="M91 102c8-4 30-4 38 0c10 3 19 8 25 15c6 7 9 19 8 31l-12 5c-2-6-4-12-6-18c1 28 3 66 4 103c-18 12-58 12-76 0c1-37 3-75 4-103c-2 6-4 12-6 18l-12-5c-1-12 2-24 8-31c6-7 15-12 25-15Z" fill={fill} />
        <path d="m93 102 17 21 17-21m-17 21v116" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".56" strokeWidth="2" />
        {[142, 161, 180, 199].map((y) => <circle key={y} cx="110" cy={y} r="1.8" fill="#fff" opacity=".72" />)}
        <path d="M117 150h13v16h-13" fill="none" stroke="#fff" strokeOpacity=".34" strokeWidth="1.7" />
        <path d="M74 236c18 6 44 6 62 0" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2" />
      </>
    );
  }
  return (
    <>
      <path d="M91 102c8-4 30-4 38 0c10 3 19 8 25 15c6 7 9 19 8 31l-12 5c-2-6-4-12-6-18c1 28 3 66 4 103c-18 12-58 12-76 0c1-37 3-75 4-103c-2 6-4 12-6 18l-12-5c-1-12 2-24 8-31c6-7 15-12 25-15Z" fill={fill} />
      <path d="M93 102c3 13 31 13 34 0" fill="#2c1822" opacity=".22" />
      <path d="M74 236c18 6 44 6 62 0" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="2.2" />
    </>
  );
};

const FemaleShirt = ({ garment }: { garment: GarmentConfig }) => {
  const fill = garment.color;
  if (garment.styleId === 'camisole') {
    return (
      <>
        <path d="M91 103h7v23c7 6 17 6 24 0v-23h7v23c8 16 12 36 14 57c1 17 3 38 5 60c-18 14-58 14-76 0c1-22 3-43 5-60c2-21 7-41 14-57Z" fill={fill} />
        <path d="M80 182c16 7 40 7 56 0m-58 34c18 8 44 8 62 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".38" strokeWidth="2.1" />
      </>
    );
  }
  if (garment.styleId === 'blouse') {
    return (
      <>
        <path d="M91 102c8-4 30-4 38 0c10 3 19 8 25 15c6 8 9 20 8 33l-4 31-18-4 5-37 3 102c-18 13-56 13-76 0l3-102 5 37-18 4-4-31c-1-13 2-25 8-33c6-7 15-12 25-15Z" fill={fill} />
        <path d="M93 102c2 14 32 14 34 0M72 240c18 8 44 8 62 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".44" strokeWidth="2.1" />
        <path d="M104 114c0 7 3 10 6 10s6-3 6-10" fill="#fff" opacity=".18" />
        <circle cx="110" cy="144" r="1.8" fill="#fff" opacity=".7" />
        <circle cx="110" cy="165" r="1.8" fill="#fff" opacity=".7" />
      </>
    );
  }
  return (
    <>
      <path d="M91 102c8-4 30-4 38 0c10 3 19 8 24 14c6 8 9 20 8 31l-12 5c-2-6-4-12-6-18c0 30 2 68 3 108c-17 13-55 13-72 0c1-40 3-78 3-108c-2 6-4 12-6 18l-12-5c-1-11 2-23 8-31c5-6 14-11 24-14Z" fill={fill} />
      <path d="M93 102c3 13 31 13 34 0" fill="#2c1822" opacity=".22" />
      <path d="M72 240c18 8 44 8 62 0" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="2.2" />
    </>
  );
};

const MalePants = ({ garment }: { garment: GarmentConfig }) => {
  const isShorts = garment.styleId === 'shorts';
  const isJeans = garment.styleId === 'jeans';
  if (isShorts) {
    return (
      <>
        <path d="M75 198c21-6 49-6 70 0l1 53-3 22c-9 5-22 6-32 1l-2-27-5 27c-10 5-23 4-32-2l2-21Z" fill={garment.color} />
        <path d="M77 208c20 6 46 6 66 0m-33 1-1 38" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".4" strokeWidth="2.1" />
        <path d="M78 232c9 1 17-3 21-13m42 13c-9 1-17-3-21-13" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="1.7" />
      </>
    );
  }
  return (
    <>
      <path d="M75 198c21-6 49-6 70 0l1 51-4 129c-8 6-20 6-29 1l-4-108-7 109c-9 5-21 4-29-2l6-129Z" fill={garment.color} />
      <path d="M77 208c20 6 46 6 66 0m-33 1-1 62" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".38" strokeWidth="2.1" />
      {isJeans ? (
        <>
          <path d="M78 232c9 1 17-4 21-14m42 14c-9 1-17-4-21-14" fill="none" stroke="#fff" strokeOpacity=".32" strokeWidth="1.7" />
          <path d="M75 356c8 3 17 3 25 1m15 0c8 3 17 3 25 0" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2.1" />
        </>
      ) : (
        <path d="M91 215 84 373m43-158 6 158" fill="none" stroke="#fff" strokeOpacity=".17" strokeWidth="1.7" />
      )}
    </>
  );
};

const FemalePants = ({ garment }: { garment: GarmentConfig }) => {
  const isShorts = garment.styleId === 'shorts';
  const isJeans = garment.styleId === 'jeans';
  if (isShorts) {
    return (
      <>
        <path d="M72 194c23-7 53-7 76 0l1 55-3 21c-10 7-24 8-35 3l-2-28-5 28c-11 5-25 4-35-3l2-21Z" fill={garment.color} />
        <path d="M74 205c22 7 50 7 72 0m-36 1-1 39" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".4" strokeWidth="2.1" />
        <path d="M75 230c10 2 19-3 23-14m47 14c-10 2-19-3-23-14" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="1.7" />
      </>
    );
  }
  return (
    <>
      <path d="M72 194c23-7 53-7 76 0l1 53-6 131c-8 6-20 6-29 1l-5-108-6 109c-9 5-21 4-29-2l7-131Z" fill={garment.color} />
      <path d="M74 205c22 7 50 7 72 0m-36 1-1 65" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".38" strokeWidth="2.1" />
      {isJeans ? (
        <>
          <path d="M75 230c10 2 19-3 23-15m47 15c-10 2-19-3-23-15" fill="none" stroke="#fff" strokeOpacity=".32" strokeWidth="1.7" />
          <path d="M76 356c8 3 17 3 25 1m15 0c8 3 17 3 25 0" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2.1" />
        </>
      ) : (
        <path d="M91 212 85 373m42-161 5 161" fill="none" stroke="#fff" strokeOpacity=".17" strokeWidth="1.7" />
      )}
    </>
  );
};

const MaleUnderwear = ({ garment }: { garment: GarmentConfig }) => {
  if (garment.styleId === 'briefs') {
    return (
      <>
        <path d="M76 202c21-6 47-6 68 0l-6 38c-7 10-17 18-28 24-11-6-21-14-28-24Z" fill={garment.color} />
        <path d="M78 211c19 6 45 6 64 0m-32 2v39" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".42" strokeWidth="2.1" />
      </>
    );
  }
  const isBoxers = garment.styleId === 'boxers';
  return (
    <>
      <path d={`M75 200c22-6 48-6 70 0l${isBoxers ? '3 67c-10 7-24 8-36 2l-2-30-4 30c-12 6-26 5-36-2Z' : '1 59c-9 7-22 8-32 3l-3-28-4 28c-10 5-23 4-32-3Z'}`} fill={garment.color} />
      <path d="M77 211c20 6 46 6 66 0m-33 2-1 29" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".42" strokeWidth="2.1" />
      {isBoxers && <path d="M84 226h12m28 0h12" stroke="#fff" strokeLinecap="round" strokeOpacity=".3" strokeWidth="1.7" />}
    </>
  );
};

const FemaleBra = ({ garment }: { garment: GarmentConfig }) => {
  if (garment.styleId === 'sports_bra') {
    return (
      <>
        <path d="M84 128c16-6 36-6 52 0l7 45c-18 9-48 9-66 0Z" fill={garment.color} />
        <path d="m88 131 9-22m35 22-9-22M79 169c18 7 44 7 62 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".48" strokeWidth="2.3" />
      </>
    );
  }
  if (garment.styleId === 'bralette') {
    return (
      <>
        <path d="m77 173 9-43 24 24 24-24 9 43c-16 11-50 11-66 0Z" fill={garment.color} />
        <path d="m88 133 9-24m35 24-9-24M79 169c18 7 44 7 62 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".48" strokeWidth="2.3" />
        <path d="m87 131 23 23 23-23" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="1.7" />
      </>
    );
  }
  return (
    <>
      <path d="M77 152c2-15 13-20 33-3 20-17 31-12 33 3l-2 23c-19 8-43 8-62 0Z" fill={garment.color} />
      <path d="M110 149v28m-30-23-7-22m67 22 7-22M80 171c18 7 42 7 60 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".48" strokeWidth="2.2" />
    </>
  );
};

/** Geometry fitted to the male torso when a bra is transferred during a swap. */
const MaleReceivedBra = ({ garment }: { garment: GarmentConfig }) => (
  <>
    <path
      d="M76 139c18-7 50-7 68 0l2 28c-19 8-53 8-72 0Z"
      fill={garment.color}
    />
    <path
      d="m82 140 8-25m48 25-8-25M77 162c20 7 48 7 68 0M110 138v31"
      fill="none"
      stroke="#fff"
      strokeLinecap="round"
      strokeOpacity=".46"
      strokeWidth="2.2"
    />
  </>
);

const FemaleUnderwear = ({ garment }: { garment: GarmentConfig }) => {
  if (garment.styleId === 'high_waist') {
    return (
      <>
        <path d="M73 190c22-7 52-7 74 0l-9 59c-8 9-18 15-28 20-10-5-20-11-28-20Z" fill={garment.color} />
        <path d="M75 201c21 7 49 7 70 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".48" strokeWidth="2.3" />
      </>
    );
  }
  if (garment.styleId === 'boyshort') {
    return (
      <>
        <path d="M72 199c23-7 53-7 76 0l2 59c-10 8-25 9-37 4l-3-25-4 25c-12 5-27 4-37-4Z" fill={garment.color} />
        <path d="M74 210c22 7 50 7 72 0" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".48" strokeWidth="2.3" />
      </>
    );
  }
  return (
    <>
      <path d="M72 199c13 3 26 10 38 21 12-11 25-18 38-21l-11 53c-8 8-17 13-27 17-10-4-19-9-27-17Z" fill={garment.color} />
      <path d="M75 204c12 4 24 10 35 19 11-9 23-15 35-19" fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity=".48" strokeWidth="2.2" />
    </>
  );
};

const GarmentArtwork = ({ presentation, slot, garment }: { presentation: PlayerPresentation; slot: GarmentSlot; garment: GarmentConfig }) => {
  if (slot === 'shirt') return presentation === 'male' ? <MaleShirt garment={garment} /> : <FemaleShirt garment={garment} />;
  if (slot === 'pants') return presentation === 'male' ? <MalePants garment={garment} /> : <FemalePants garment={garment} />;
  if (slot === 'bra') return presentation === 'male'
    ? <MaleReceivedBra garment={garment} />
    : <FemaleBra garment={garment} />;
  return presentation === 'male' ? <MaleUnderwear garment={garment} /> : <FemaleUnderwear garment={garment} />;
};

type GarmentMap = Partial<Record<GarmentSlot, GarmentConfig>>;

const garmentSignature = (garments: GarmentMap) =>
  LAYER_ORDER.map((slot) => (garments[slot] ? `${slot}:${garments[slot]!.styleId}:${garments[slot]!.color}` : '')).join('|');

export const OutfitFigure: React.FC<OutfitFigureProps> = ({
  outfit,
  state,
  remainingSlots,
  interactiveSlots = [],
  selectedSlot = null,
  previewRemovedSlot = null,
  editingSlot = null,
  onSelectSlot,
  active = false,
  compact = false,
  name,
  className = '',
  ariaLabel,
  mood = 0,
}) => {
  const generatedId = normalizeSvgId(useId());
  const paint: PaintIds = {
    skin: `outfit-skin-${generatedId}`,
    skinShade: `outfit-skin-shade-${generatedId}`,
    hair: `outfit-hair-${generatedId}`,
    hairShine: `outfit-hair-shine-${generatedId}`,
  };
  const shadeH = `outfit-fabric-h-${generatedId}`;
  const shadeV = `outfit-fabric-v-${generatedId}`;
  const veilId = `outfit-veil-${generatedId}`;
  const runtimeGarments = state ? getEquippedGarmentMap(state) : null;
  const visibleSlots = new Set(
    remainingSlots ?? (runtimeGarments ? Object.keys(runtimeGarments) : Object.keys(outfit.garments)) as GarmentSlot[],
  );
  const interactive = new Set(interactiveSlots);
  const presentation = outfit.presentation;
  const clipId = `oc-${generatedId}`;
  const visibleGarments: GarmentMap = {};
  for (const slot of LAYER_ORDER) {
    const garment = runtimeGarments?.[slot] ?? outfit.garments[slot];
    if (visibleSlots.has(slot) && garment) {
      visibleGarments[slot] = 'originPresentation' in garment
        ? getDisplayGarment(garment, presentation)
        : garment;
    }
  }

  // Garments that just came off keep rendering briefly so they can fly away.
  const signature = garmentSignature(visibleGarments);
  const previousGarmentsRef = useRef<GarmentMap | null>(null);
  const timersRef = useRef<number[]>([]);
  const [leaving, setLeaving] = useState<GarmentMap>({});
  const [reacting, setReacting] = useState(false);

  useEffect(() => {
    const previous = previousGarmentsRef.current;
    previousGarmentsRef.current = visibleGarments;
    if (!previous) return;
    const removed = LAYER_ORDER.filter((slot) => previous[slot] && !visibleGarments[slot]);
    if (removed.length === 0) return;
    const leavingNow: GarmentMap = {};
    for (const slot of removed) leavingNow[slot] = previous[slot];
    setLeaving((current) => ({ ...current, ...leavingNow }));
    setReacting(true);
    timersRef.current.push(
      window.setTimeout(() => setReacting(false), 760),
      window.setTimeout(() => {
        setLeaving((current) => {
          const next = { ...current };
          for (const slot of removed) delete next[slot];
          return next;
        });
      }, LEAVE_MS),
    );
    // visibleGarments is derived from `signature`; depending on it alone is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<SVGGElement>, slot: GarmentSlot) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectSlot?.(slot);
    }
  };

  const clampedMood = Math.max(0, Math.min(1, mood));
  const leavingSlots = LAYER_ORDER.filter((slot) => leaving[slot] && !visibleGarments[slot]);

  return (
    <figure
      className={`outfit-figure outfit-figure--${presentation} ${compact ? 'outfit-figure--compact' : ''} ${active ? 'outfit-figure--active' : ''} ${clampedMood >= 0.5 ? 'outfit-figure--happy' : ''} ${className}`.trim()}
      style={{ '--outfit-mood': clampedMood } as React.CSSProperties}
      aria-label={ariaLabel ?? `${name || (presentation === 'male' ? 'Nam' : 'Nữ')} và trang phục hiện có`}
    >
      <div className="outfit-figure__halo" aria-hidden="true" />
      {active && clampedMood >= 0.6 && (
        <span className="outfit-figure__hearts" aria-hidden="true">
          <i>♥</i><i>♥</i><i>♥</i>
        </span>
      )}
      <svg
        className="outfit-figure__svg"
        viewBox="0 0 220 420"
        role={interactive.size > 0 ? 'group' : undefined}
        aria-label={interactive.size > 0 ? 'Các món đồ có thể chọn' : undefined}
        aria-hidden={interactive.size === 0 ? true : undefined}
      >
        <defs>
          <linearGradient id={paint.skin} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6c2b4" />
            <stop offset=".5" stopColor="#e39c91" />
            <stop offset="1" stopColor="#c27476" />
          </linearGradient>
          <linearGradient id={paint.skinShade} gradientUnits="userSpaceOnUse" x1="70" y1="0" x2="150" y2="0">
            <stop offset="0" stopColor="#7d3d48" stopOpacity=".34" />
            <stop offset=".3" stopColor="#7d3d48" stopOpacity="0" />
            <stop offset=".46" stopColor="#fff4ea" stopOpacity=".16" />
            <stop offset=".62" stopColor="#fff4ea" stopOpacity="0" />
            <stop offset="1" stopColor="#7d3d48" stopOpacity=".38" />
          </linearGradient>
          <linearGradient id={paint.hair} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={presentation === 'male' ? '#4a2f3c' : '#6e3a55'} />
            <stop offset="1" stopColor={presentation === 'male' ? '#24151c' : '#371b2b'} />
          </linearGradient>
          <linearGradient id={paint.hairShine} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#ffe9f2" stopOpacity=".55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={shadeH} gradientUnits="userSpaceOnUse" x1="58" y1="0" x2="162" y2="0">
            <stop offset="0" stopColor="#14060c" stopOpacity=".36" />
            <stop offset=".28" stopColor="#14060c" stopOpacity="0" />
            <stop offset=".46" stopColor="#ffffff" stopOpacity=".08" />
            <stop offset=".62" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="1" stopColor="#14060c" stopOpacity=".4" />
          </linearGradient>
          <linearGradient id={shadeV} gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="390">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".12" />
            <stop offset=".18" stopColor="#ffffff" stopOpacity="0" />
            <stop offset=".85" stopColor="#14060c" stopOpacity="0" />
            <stop offset="1" stopColor="#14060c" stopOpacity=".22" />
          </linearGradient>
          <radialGradient id={veilId}>
            <stop offset="0" stopColor="#fff1f4" stopOpacity=".62" />
            <stop offset=".55" stopColor="#ffd3de" stopOpacity=".3" />
            <stop offset="1" stopColor="#ffd3de" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${clipId}-a`}><rect x="0" y="144" width="220" height="290" /></clipPath>
          <clipPath id={`${clipId}-ll`}><rect x="0" y="376" width="220" height="50" /></clipPath>
          <clipPath id={`${clipId}-ls`}><rect x="0" y="268" width="220" height="160" /></clipPath>
          <clipPath id={`${clipId}-lu`}><rect x="0" y="256" width="220" height="180" /></clipPath>
          {LAYER_ORDER.filter((slot) => visibleGarments[slot]).map((slot) => (
            <clipPath key={slot} id={`${clipId}-g-${slot}`}>
              <GarmentArtwork presentation={presentation} slot={slot} garment={visibleGarments[slot]!} />
            </clipPath>
          ))}
        </defs>
        <ellipse className="outfit-figure__ground" cx="110" cy="398" rx="58" ry="9" aria-hidden="true" />
        <g className={`outfit-figure__character ${reacting ? 'is-reacting' : ''}`}>
          <g className="outfit-figure__breath">
            {presentation === 'male'
              ? <MaleBase paint={paint} garments={visibleGarments} clipPrefix={clipId} />
              : <FemaleBase paint={paint} garments={visibleGarments} clipPrefix={clipId} />}
            <ModestyGlow presentation={presentation} garments={visibleGarments} veilId={veilId} />
            {LAYER_ORDER.map((slot) => {
              const garment = visibleGarments[slot];
              if (!garment || !visibleSlots.has(slot)) return null;
              // Pants fully cover the underwear; drawing it underneath only lets a sliver peek out at the hip.
              const coveredByPants = slot === 'underwear' && visibleGarments.pants
                && editingSlot !== 'underwear' && previewRemovedSlot !== 'pants' && !interactive.has('underwear');
              if (coveredByPants) return null;
              const canInteract = interactive.has(slot) && Boolean(onSelectSlot);
              const isPreviewRemoved = previewRemovedSlot === slot;
              const shouldDim = (editingSlot === 'bra' && slot === 'shirt') || (editingSlot === 'underwear' && slot === 'pants');
              const hitPath = HIT_PATHS[presentation][slot];

              return (
                <g
                  key={slot}
                  role={canInteract ? 'button' : undefined}
                  tabIndex={canInteract ? 0 : undefined}
                  aria-label={canInteract ? `${isPreviewRemoved ? 'Giữ lại' : 'Chọn bỏ'} ${GARMENT_LABELS[slot].toLocaleLowerCase('vi')}` : undefined}
                  aria-pressed={canInteract ? selectedSlot === slot : undefined}
                  onClick={canInteract ? () => onSelectSlot?.(slot) : undefined}
                  onKeyDown={canInteract ? (event) => handleKeyDown(event, slot) : undefined}
                  className={`outfit-figure__garment outfit-figure__garment--${slot} ${canInteract ? 'is-interactive' : ''} ${selectedSlot === slot ? 'is-selected' : ''} ${isPreviewRemoved ? 'is-preview-removed' : ''} ${shouldDim ? 'is-dimmed' : ''}`}
                  data-slot={slot}
                >
                  <g className="outfit-figure__garment-artwork">
                    <GarmentArtwork presentation={presentation} slot={slot} garment={garment} />
                    <GarmentShading slot={slot} clip={`${clipId}-g-${slot}`} shadeH={shadeH} shadeV={shadeV} />
                  </g>
                  {hitPath && (
                    <>
                      <path className="outfit-figure__selection-outline" d={hitPath} />
                      <path className="outfit-figure__hit-area" d={hitPath} />
                    </>
                  )}
                </g>
              );
            })}
            {leavingSlots.map((slot) => (
              <g key={`leaving-${slot}`} className="outfit-figure__leaving" aria-hidden="true">
                <g className={`outfit-figure__leaving-garment is-${LEAVE_DIRECTION[slot]}`}>
                  <GarmentArtwork presentation={presentation} slot={slot} garment={leaving[slot]!} />
                </g>
                <g transform={`translate(${GARMENT_CENTER[slot][0]} ${GARMENT_CENTER[slot][1]})`}>
                  {BURST_RAYS.map(([dx, dy], index) => (
                    <path
                      key={index}
                      className="outfit-figure__spark"
                      style={{ '--dx': `${dx}px`, '--dy': `${dy}px`, animationDelay: `${index * 35}ms` } as React.CSSProperties}
                      d="M0-5 1.3-1.3 5 0 1.3 1.3 0 5-1.3 1.3-5 0-1.3-1.3Z"
                      fill={index % 2 ? '#ffd27a' : '#ffc2d4'}
                    />
                  ))}
                </g>
              </g>
            ))}
          </g>
        </g>
      </svg>
      {name && <figcaption className="outfit-figure__name">{name}</figcaption>}
    </figure>
  );
};
