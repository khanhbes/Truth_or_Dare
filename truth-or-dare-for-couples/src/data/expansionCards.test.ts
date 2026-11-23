import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { INITIAL_CARDS } from './cards';
import { EXPANSION_CARDS, EXPANSION_CLOTHING_CARDS, EXPANSION_FRAME_CARDS } from './expansionCards';
import { isStoredCard } from '../utils/cardSchema';
import { mergeEditedSystemCard } from '../utils/cardSelection';
import { CARD_FRAME_PREFIX, isCardFrame, withoutCardFrames } from '../utils/cardFrames';

const iconSource = readFileSync(fileURLToPath(new URL('../components/CardIcons.tsx', import.meta.url)), 'utf8');
const iconMapBody = iconSource.match(/const ICON_MAP:[\s\S]*?= \{([\s\S]*?)\n\};/)?.[1] ?? '';
const iconNames = new Set(Array.from(iconMapBody.matchAll(/^\s{2}([a-z0-9_]+):/gm), (match) => match[1]));

const countBy = <T,>(items: readonly T[], key: (item: T) => string) =>
  items.reduce<Record<string, number>>((counts, item) => {
    const value = key(item);
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});

test('expansion cards have unique ids that never collide with built-in cards', () => {
  const ids = EXPANSION_CARDS.map((card) => card.id);
  assert.equal(new Set(ids).size, ids.length);
  const builtIn = new Set(INITIAL_CARDS.map((card) => card.id));
  assert.deepEqual(ids.filter((id) => builtIn.has(id)), []);
  assert.ok(ids.every((id) => id.startsWith('x-')));
});

test('expansion cards pass the stored-card schema and use registered icons', () => {
  assert.deepEqual(EXPANSION_CARDS.filter((card) => !isStoredCard(card as unknown)).map((card) => card.id), []);
  assert.ok(iconNames.size > 0);
  assert.deepEqual(
    EXPANSION_CARDS.filter((card) => !card.icon || !iconNames.has(card.icon)).map((card) => `${card.id}:${card.icon}`),
    [],
  );
});

test('clothing cards are playable 2–4★ dares that each remove a garment', () => {
  assert.equal(EXPANSION_CLOTHING_CARDS.length, 9);
  for (const card of EXPANSION_CLOTHING_CARDS) {
    assert.equal(isCardFrame(card), false, card.id);
    assert.equal(card.type, 'dare', card.id);
    assert.equal(card.deck, 'standard', card.id);
    assert.equal(card.clothingEffect?.kind, 'remove_garment', card.id);
    const stars = card.progression?.difficultyStars ?? 0;
    assert.ok(stars >= 2 && stars <= 4, `${card.id} stars ${stars}`);
    assert.ok(card.progression?.clothingIntensity, card.id);
  }
  const targetOf = (card: (typeof EXPANSION_CLOTHING_CARDS)[number]) =>
    card.clothingEffect?.kind === 'remove_garment' ? card.clothingEffect.target : '?';
  assert.deepEqual(countBy(EXPANSION_CLOTHING_CARDS, targetOf), {
    opponent: 4,
    self: 3,
    both: 2,
  });
});

test('standard frames follow the planned star × audience grid', () => {
  const standard = EXPANSION_FRAME_CARDS.filter((card) => card.deck === 'standard');
  assert.equal(standard.length, 47);
  assert.deepEqual(
    countBy(standard, (card) => `${card.type}:${card.progression?.difficultyStars}:${card.progression?.turnAudience}`),
    {
      'dare:1:both': 4, 'dare:1:male': 4, 'dare:1:female': 4,
      'dare:2:both': 1, 'dare:2:male': 4, 'dare:2:female': 4,
      'dare:3:both': 2, 'dare:3:male': 5, 'dare:3:female': 5,
      'dare:4:male': 2, 'dare:4:female': 2,
      'truth:1:both': 10,
    },
  );
});

test('position frames fill the thin family × audience × star cells', () => {
  const positions = EXPANSION_FRAME_CARDS.filter((card) => card.deck === 'position');
  assert.equal(positions.length, 17);
  assert.deepEqual(
    countBy(positions, (card) => `${card.position?.family}:${card.position?.turnAudience}`),
    { 'oral:both': 5, 'blowjob:male': 4, 'blowjob:female': 4, 'handjob:male': 4 },
  );
  for (const card of positions) {
    const stars = card.position?.difficultyStars ?? 0;
    assert.ok(stars >= 6 && stars <= 9, `${card.id} stars ${stars}`);
    assert.equal(card.position?.rarity, 'luxury');
    assert.notEqual(card.position?.family, 'have_sex');
  }
});

test('frames stay out of the game until the admin writes their content', () => {
  assert.ok(EXPANSION_FRAME_CARDS.every((card) => card.content.startsWith(CARD_FRAME_PREFIX)));
  assert.equal(withoutCardFrames(EXPANSION_CARDS).length, EXPANSION_CLOTHING_CARDS.length);

  const frame = EXPANSION_FRAME_CARDS.find((card) => card.deck === 'standard')!;
  const edited = mergeEditedSystemCard(frame, { ...frame, content: 'Nội dung thật do admin viết.' });
  assert.equal(isCardFrame(edited), false);
  assert.deepEqual(edited.progression, frame.progression);
  assert.equal(withoutCardFrames([edited]).length, 1);
});
