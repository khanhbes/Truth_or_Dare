import assert from 'node:assert/strict';
import test from 'node:test';
import type { CardItem } from '../types';
import { chooseDirectedCard, createCardDirectorState, getCardHeat, getDirectorWeights, recordDirectedCard } from './cardDirector';
import { createOutfitState, DEFAULT_GAME_SETTINGS } from './wardrobe';

const card = (id: string, type: 'truth' | 'dare', heat: number): CardItem => ({ id, type, level: 'intimate', content: id, deck: 'standard', progression: { difficultyStars: 3, heat, phaseTag: 'intimate' } });
const outfits = [createOutfitState(DEFAULT_GAME_SETTINGS.outfits[0]), createOutfitState(DEFAULT_GAME_SETTINGS.outfits[1])] as const;

test('director suppresses repeated type and heat spikes while keeping every card sampleable', () => {
  const state = recordDirectedCard(recordDirectedCard(createCardDirectorState(), card('dare-1', 'dare', 4)), card('dare-2', 'dare', 4));
  const candidates = [card('dare-hot', 'dare', 9), card('truth-calm', 'truth', 4)];
  const weights = getDirectorWeights(candidates, state, 0, outfits);
  assert.ok((weights.get('truth-calm') ?? 0) > (weights.get('dare-hot') ?? 0));
  assert.ok(chooseDirectedCard(candidates, weights, () => .999)?.id);
  assert.equal(getCardHeat(card('explicit', 'truth', 7)), 7);
});

test('director reduces weight of already-unlocked cards by 90% when unopened cards exist', () => {
  const state = createCardDirectorState();
  const c1Unopened = card('c1-new', 'truth', 4);
  const c2Unlocked = card('c2-old', 'truth', 4);
  const candidates = [c1Unopened, c2Unlocked];

  // Pass c2-old in accountUnlockedCardIds
  const weights = getDirectorWeights(candidates, state, 0, outfits, ['c2-old']);
  const wNew = weights.get('c1-new') ?? 0;
  const wOld = weights.get('c2-old') ?? 0;

  // wOld should be reduced by roughly 10x relative to wNew
  assert.ok(wNew > wOld * 8, `Expected wNew (${wNew}) to be roughly 10x wOld (${wOld})`);
});
