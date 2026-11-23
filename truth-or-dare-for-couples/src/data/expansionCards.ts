import type {
  CardItem,
  CardLevel,
  ClothingIntensity,
  DifficultyStars,
  PositionDifficultyStars,
  TurnAudience,
} from '../types';
import { CARD_FRAME_PREFIX } from '../utils/cardFrames';

/**
 * Expansion set from the 2026-11 balance audit.
 *
 * - Clothing cards: complete, playable Dares that remove garments as part of
 *   the story (2–4★), so undressing does not rely only on injected banners.
 * - Frames: metadata-complete placeholders. Their text starts with
 *   CARD_FRAME_PREFIX, which keeps them out of every game until the admin
 *   writes the real content (and optionally an image) in the Admin collection.
 *
 * They behave like built-in system cards: Admin edits are saved as overrides
 * and the metadata below (stars, type, level, audience) stays authoritative.
 */

const LEVEL_BY_STAR: Record<DifficultyStars, CardLevel> = {
  1: 'gentle',
  2: 'gentle',
  3: 'intimate',
  4: 'passionate',
  5: 'passionate',
};

const HEAT_BY_LEVEL: Record<CardLevel, number> = { gentle: 2, intimate: 5, passionate: 8 };

const AUDIENCE_COPY: Record<TurnAudience, string> = {
  both: 'Cả hai lượt',
  male: 'Lượt Nam',
  female: 'Lượt Nữ',
};

const pad = (value: number) => String(value).padStart(2, '0');

const standardCard = (input: {
  id: string;
  type: CardItem['type'];
  stars: DifficultyStars;
  turnAudience: TurnAudience;
  content: string;
  hint?: string;
  icon: string;
  timerSeconds?: number | null;
  clothingEffect?: CardItem['clothingEffect'];
  clothingIntensity?: ClothingIntensity;
}): CardItem => {
  const level = LEVEL_BY_STAR[input.stars];
  const heat = Math.min(10, HEAT_BY_LEVEL[level] + (input.clothingEffect ? 1 : 0));
  return {
    id: input.id,
    type: input.type,
    level,
    deck: 'standard',
    content: input.content,
    ...(input.hint ? { hint: input.hint } : {}),
    icon: input.icon,
    ...(input.timerSeconds !== undefined ? { timerSeconds: input.timerSeconds } : {}),
    ...(input.clothingEffect ? { clothingEffect: input.clothingEffect } : {}),
    phaseTag: level,
    heat,
    progression: {
      difficultyStars: input.stars,
      turnAudience: input.turnAudience,
      phaseTag: level,
      heat,
      ...(input.clothingIntensity ? { clothingIntensity: input.clothingIntensity } : {}),
    },
  };
};

// ---------------------------------------------------------------------------
// Clothing cards (playable, content proposed in the audit)
// ---------------------------------------------------------------------------

const CLOTHING_CARDS: CardItem[] = [
  standardCard({
    id: 'x-cloth-2-01',
    type: 'dare',
    stars: 2,
    turnAudience: 'both',
    content: 'Cởi giúp người ấy 1 món đồ ngoài thật chậm, vừa cởi vừa nhìn vào mắt họ.',
    hint: 'Người được cởi chọn món nào sẽ được bỏ.',
    icon: 'button',
    timerSeconds: 30,
    clothingEffect: { kind: 'remove_garment', target: 'opponent' },
    clothingIntensity: 'C1',
  }),
  standardCard({
    id: 'x-cloth-2-02',
    type: 'dare',
    stars: 2,
    turnAudience: 'both',
    content: 'Ngân nga một bài hát và tự cởi 1 món đồ ngoài theo nhịp, rồi ôm người ấy 10 giây.',
    icon: 'music',
    timerSeconds: 30,
    clothingEffect: { kind: 'remove_garment', target: 'self' },
    clothingIntensity: 'C1',
  }),
  standardCard({
    id: 'x-cloth-2-03',
    type: 'dare',
    stars: 2,
    turnAudience: 'both',
    content: 'Người ấy nhắm mắt. Bạn cởi giúp họ 1 món đồ ngoài, rồi đặt một nụ hôn lên vai trước khi họ mở mắt.',
    icon: 'kiss_shoulder',
    timerSeconds: 30,
    clothingEffect: { kind: 'remove_garment', target: 'opponent' },
    clothingIntensity: 'C1',
  }),
  standardCard({
    id: 'x-cloth-3-01',
    type: 'dare',
    stars: 3,
    turnAudience: 'both',
    content: 'Cả hai cùng cởi 1 món đồ, rồi ôm sát nhau 20 giây không nói gì.',
    hint: 'Mỗi người tự chọn món của mình.',
    icon: 'couple_heartbeat_cuddle',
    timerSeconds: 20,
    clothingEffect: { kind: 'remove_garment', target: 'both' },
    clothingIntensity: 'C2',
  }),
  standardCard({
    id: 'x-cloth-3-02',
    type: 'dare',
    stars: 3,
    turnAudience: 'both',
    content: 'Hôn dọc từ cổ xuống vai người ấy, rồi cởi giúp họ 1 món đồ bạn muốn ngắm nhất.',
    icon: 'kiss_neck',
    timerSeconds: 45,
    clothingEffect: { kind: 'remove_garment', target: 'opponent' },
    clothingIntensity: 'C3',
  }),
  standardCard({
    id: 'x-cloth-3-03',
    type: 'dare',
    stars: 3,
    turnAudience: 'both',
    content: 'Tự cởi 1 món đồ thật chậm trong lúc người ấy chỉ được nhìn, không được chạm.',
    icon: 'eyes',
    timerSeconds: 30,
    clothingEffect: { kind: 'remove_garment', target: 'self' },
    clothingIntensity: 'C3',
  }),
  standardCard({
    id: 'x-cloth-3-04',
    type: 'dare',
    stars: 3,
    turnAudience: 'both',
    content: 'Đứng đối mặt nhau, mỗi người cởi giúp đối phương 1 món đồ cùng một lúc.',
    icon: 'couple_eye_contact',
    timerSeconds: 30,
    clothingEffect: { kind: 'remove_garment', target: 'both' },
    clothingIntensity: 'C3',
  }),
  standardCard({
    id: 'x-cloth-4-01',
    type: 'dare',
    stars: 4,
    turnAudience: 'both',
    content: 'Bịt mắt người ấy bằng một chiếc áo, rồi cởi giúp họ 1 món đồ thật chậm.',
    hint: 'Hỏi trước xem người ấy có thoải mái khi bị bịt mắt không.',
    icon: 'blindfold',
    timerSeconds: 45,
    clothingEffect: { kind: 'remove_garment', target: 'opponent' },
    clothingIntensity: 'C4',
  }),
  standardCard({
    id: 'x-cloth-4-02',
    type: 'dare',
    stars: 4,
    turnAudience: 'both',
    content: 'Đứng trước mặt người ấy, tự cởi 1 món đồ rồi để họ ôm bạn từ phía sau 20 giây.',
    icon: 'couple_back_hug',
    timerSeconds: 30,
    clothingEffect: { kind: 'remove_garment', target: 'self' },
    clothingIntensity: 'C4',
  }),
];

// ---------------------------------------------------------------------------
// Standard frames (admin writes the content)
// ---------------------------------------------------------------------------

interface StandardFramePlan {
  type: CardItem['type'];
  stars: DifficultyStars;
  counts: Partial<Record<TurnAudience, number>>;
  direction: string;
  icon: string;
}

const STANDARD_FRAME_PLAN: StandardFramePlan[] = [
  {
    type: 'dare',
    stars: 1,
    counts: { both: 4, male: 4, female: 4 },
    direction: 'trò nhỏ vui, chạm nhẹ (vẽ chữ lên lưng, bịt mắt đoán món ăn, nhảy chậm một bài).',
    icon: 'sparkle',
  },
  {
    type: 'dare',
    stars: 2,
    counts: { both: 1, male: 4, female: 4 },
    direction: 'ôm, hôn má, thì thầm, massage tay hoặc vai.',
    icon: 'sparkle',
  },
  {
    type: 'dare',
    stars: 3,
    counts: { both: 2, male: 5, female: 5 },
    direction: 'chạm qua lớp áo, hôn cổ và vai, massage có chủ đích.',
    icon: 'flame',
  },
  {
    type: 'dare',
    stars: 4,
    counts: { male: 2, female: 2 },
    direction: 'chạm trực tiếp, hôn phần thân trên, giữ nhịp chậm.',
    icon: 'flame',
  },
  {
    type: 'truth',
    stars: 1,
    counts: { both: 10 },
    direction: 'dạng "đoán ý người ấy": người rút đoán câu trả lời của đối phương, đoán sai thì chịu một phạt nhẹ.',
    icon: 'sparkle',
  },
];

const STANDARD_FRAMES: CardItem[] = STANDARD_FRAME_PLAN.flatMap((plan) =>
  (['both', 'male', 'female'] as const).flatMap((audience) =>
    Array.from({ length: plan.counts[audience] ?? 0 }, (_, index) => standardCard({
      id: `x-frame-${plan.type === 'truth' ? 't' : 'd'}${plan.stars}-${audience}-${pad(index + 1)}`,
      type: plan.type,
      stars: plan.stars,
      turnAudience: audience,
      content: `${CARD_FRAME_PREFIX} ${plan.type === 'truth' ? 'Truth' : 'Dare'} ${plan.stars}★ · ${AUDIENCE_COPY[audience]} — viết nội dung: ${plan.direction}`,
      icon: plan.icon,
    })),
  ),
);

// ---------------------------------------------------------------------------
// Position frames (admin writes the content and adds the illustration)
// ---------------------------------------------------------------------------

type PositionFrameFamily = 'oral' | 'blowjob' | 'handjob';

interface PositionFramePlan {
  family: PositionFrameFamily;
  turnAudience: TurnAudience;
  label: string;
  stars: Partial<Record<PositionDifficultyStars, number>>;
}

const POSITION_FRAME_PLAN: PositionFramePlan[] = [
  { family: 'oral', turnAudience: 'both', label: 'Oral cùng nhau', stars: { 6: 2, 7: 2, 8: 1 } },
  { family: 'blowjob', turnAudience: 'male', label: 'Oral một người · Nam thực hiện', stars: { 6: 2, 7: 1, 8: 1 } },
  { family: 'blowjob', turnAudience: 'female', label: 'Oral một người · Nữ thực hiện', stars: { 7: 2, 8: 1, 9: 1 } },
  { family: 'handjob', turnAudience: 'male', label: 'Hand · Nam thực hiện', stars: { 6: 1, 7: 1, 8: 2 } },
];

const ORDER_GROUP: Record<PositionFrameFamily, 1 | 2 | 3> = { oral: 1, blowjob: 2, handjob: 3 };
const POSITION_ICON: Record<PositionFrameFamily, string> = {
  oral: 'position_oral',
  blowjob: 'position_blowjob',
  handjob: 'position_handjob',
};

const POSITION_FRAMES: CardItem[] = POSITION_FRAME_PLAN.flatMap((plan) =>
  ([6, 7, 8, 9] as PositionDifficultyStars[]).flatMap((star) =>
    Array.from({ length: plan.stars[star] ?? 0 }, (_, index): CardItem => ({
      id: `x-frame-pos-${plan.family}-${plan.turnAudience}-${star}-${pad(index + 1)}`,
      type: 'dare',
      level: 'passionate',
      deck: 'position',
      content: `${CARD_FRAME_PREFIX} Tư thế · ${plan.label} · ${star}★ · ${AUDIENCE_COPY[plan.turnAudience]} — ghi tên tư thế vào Gợi ý, mô tả 2–3 bước ngắn và thêm ảnh minh họa.`,
      icon: POSITION_ICON[plan.family],
      phaseTag: 'passionate',
      heat: Math.min(10, star + 2),
      position: {
        family: plan.family,
        turnAudience: plan.turnAudience,
        orderGroup: ORDER_GROUP[plan.family],
        rarity: 'luxury',
        difficultyStars: star,
      },
    })),
  ),
);

export const EXPANSION_CLOTHING_CARDS: readonly CardItem[] = CLOTHING_CARDS;
export const EXPANSION_FRAME_CARDS: readonly CardItem[] = [...STANDARD_FRAMES, ...POSITION_FRAMES];
export const EXPANSION_CARDS: readonly CardItem[] = [...CLOTHING_CARDS, ...STANDARD_FRAMES, ...POSITION_FRAMES];
