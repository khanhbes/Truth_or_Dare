import { createDynamicClothingSchedule, getActiveClothingRemovalTarget, updateDynamicClothingScheduler, injectClothingDirective } from '../src/utils/dynamicClothingScheduler';
import { createOutfitState, DEFAULT_OUTFITS, getPresentGarmentSlots, removeGarment, getRemovableGarments } from '../src/utils/wardrobe';
import { getDirectorWeights, createCardDirectorState } from '../src/utils/cardDirector';
import type { CardItem, OutfitState, PlayerIndex } from '../src/types';

// Run simulation
function runSimulations() {
  console.log('=== STARTING GAMEPLAY UPGRADE SIMULATION ===\n');

  // 1. TEST NOVELTY WEIGHTS
  console.log('--- 1. Testing Unlocked Cards Penalty (90% reduction) ---');
  const dummyCards: CardItem[] = Array.from({ length: 20 }, (_, i) => ({
    id: `card-${i}`,
    type: (i % 2 === 0 ? 'truth' : 'dare'),
    level: 'intimate',
    content: `Card content ${i}`,
    deck: 'standard',
    progression: { difficultyStars: 3, heat: 5, phaseTag: 'intimate' },
  }));

  const unlockedIds = ['card-0', 'card-1', 'card-2', 'card-3', 'card-4'];
  const directorState = createCardDirectorState(unlockedIds);
  const outfits = [createOutfitState(DEFAULT_OUTFITS[0]), createOutfitState(DEFAULT_OUTFITS[1])] as const;

  const weights = getDirectorWeights(dummyCards, directorState, 0, outfits, unlockedIds);

  const avgUnlockedWeight = unlockedIds.reduce((sum, id) => sum + (weights.get(id) ?? 0), 0) / unlockedIds.length;
  const unopenedIds = dummyCards.map((c) => c.id).filter((id) => !unlockedIds.includes(id));
  const avgUnopenedWeight = unopenedIds.reduce((sum, id) => sum + (weights.get(id) ?? 0), 0) / unopenedIds.length;

  console.log(`Average Weight for Unopened Cards: ${avgUnopenedWeight.toFixed(4)}`);
  console.log(`Average Weight for Unlocked Cards: ${avgUnlockedWeight.toFixed(4)}`);
  console.log(`Ratio (Unopened / Unlocked): ${(avgUnopenedWeight / avgUnlockedWeight).toFixed(2)}x`);

  if (avgUnopenedWeight < avgUnlockedWeight * 8) {
    throw new Error('Novelty penalty failed: Unopened cards were not prioritized by >= 8x.');
  }
  console.log('✔ PASS: Unlocked cards are penalized by ~90%!\n');

  // 2. TEST DYNAMIC CLOTHING SCHEDULER - 1,000 RUNS (Nam 3 đồ, Nữ 4 đồ)
  console.log('--- 2. Simulating 1,000 Games of Level 1 (Male: 3 clothes, Female: 4 clothes) ---');
  const totalGames = 1000;
  let successfulGames = 0;
  let totalCardsPerGame: number[] = [];

  for (let g = 0; g < totalGames; g++) {
    let currentOutfits: [OutfitState, OutfitState] = [
      createOutfitState(DEFAULT_OUTFITS[0]), // 3 items
      createOutfitState(DEFAULT_OUTFITS[1]), // 4 items
    ];

    let scheduler = createDynamicClothingSchedule(currentOutfits);
    let intimacy = 0;
    let round = 1;
    let pTurn: PlayerIndex = 0;
    let removalsP0 = 0;
    let removalsP1 = 0;

    while (intimacy < 100 && round < 60) {
      // Intimacy gain per turn: roughly 4% to 6%
      const gain = 4 + Math.floor(Math.random() * 3);
      intimacy = Math.min(100, intimacy + gain);

      // Check trigger
      const trigger = getActiveClothingRemovalTarget(scheduler, intimacy, currentOutfits);
      if (trigger) {
        // 10% chance player skips strip on this turn
        const willSkip = Math.random() < 0.10;
        if (willSkip) {
          scheduler = updateDynamicClothingScheduler(scheduler, trigger.itemId, trigger.targetIndex, 'skipped', intimacy, round);
        } else {
          // Perform removal
          const target = trigger.targetIndex;
          const removable = getRemovableGarments(currentOutfits[target]);
          if (removable.length > 0) {
            const slot = removable[0];
            const nextOutfit = removeGarment(currentOutfits[target], slot);
            currentOutfits = target === 0
              ? [nextOutfit, currentOutfits[1]]
              : [currentOutfits[0], nextOutfit];

            if (target === 0) removalsP0++;
            else removalsP1++;

            scheduler = updateDynamicClothingScheduler(scheduler, trigger.itemId, target, 'completed', intimacy, round);
          }
        }
      }

      pTurn = pTurn === 0 ? 1 : 0;
      round++;
    }

    const remainingP0 = getPresentGarmentSlots(currentOutfits[0]).length;
    const remainingP1 = getPresentGarmentSlots(currentOutfits[1]).length;

    if (remainingP0 === 0 && remainingP1 === 0 && removalsP0 === 3 && removalsP1 === 4) {
      successfulGames++;
    }
    totalCardsPerGame.push(round);
  }

  const avgRounds = totalCardsPerGame.reduce((a, b) => a + b, 0) / totalCardsPerGame.length;
  console.log(`Completed ${totalGames} games.`);
  console.log(`Success rate (Both stripped to 0 clothes, exact 3 & 4 removals): ${(successfulGames / totalGames * 100).toFixed(1)}% (${successfulGames}/${totalGames})`);
  console.log(`Average rounds to complete Level 1: ${avgRounds.toFixed(1)} rounds`);

  if (successfulGames !== totalGames) {
    throw new Error(`Expected 100% success rate, but got ${successfulGames}/${totalGames}`);
  }
  console.log('✔ PASS: 100% of simulated games reached 0 clothes for both players by end of Level 1!\n');

  // 3. TEST DYNAMIC CLOTHING SCHEDULER - 1,000 RUNS (Nam 3 đồ, Nữ 3 đồ)
  console.log('--- 3. Simulating 1,000 Games of Level 1 (Male: 3 clothes, Female: 3 clothes) ---');
  successfulGames = 0;
  for (let g = 0; g < totalGames; g++) {
    // Both with 3 garments
    let currentOutfits: [OutfitState, OutfitState] = [
      createOutfitState(DEFAULT_OUTFITS[0]), // 3 items
      createOutfitState(DEFAULT_OUTFITS[0]), // 3 items
    ];

    let scheduler = createDynamicClothingSchedule(currentOutfits);
    let intimacy = 0;
    let round = 1;
    let pTurn: PlayerIndex = 0;
    let removalsP0 = 0;
    let removalsP1 = 0;

    while (intimacy < 100 && round < 60) {
      const gain = 4 + Math.floor(Math.random() * 3);
      intimacy = Math.min(100, intimacy + gain);

      const trigger = getActiveClothingRemovalTarget(scheduler, intimacy, currentOutfits);
      if (trigger) {
        const willSkip = Math.random() < 0.10;
        if (willSkip) {
          scheduler = updateDynamicClothingScheduler(scheduler, trigger.itemId, trigger.targetIndex, 'skipped', intimacy, round);
        } else {
          const target = trigger.targetIndex;
          const removable = getRemovableGarments(currentOutfits[target]);
          if (removable.length > 0) {
            const slot = removable[0];
            const nextOutfit = removeGarment(currentOutfits[target], slot);
            currentOutfits = target === 0
              ? [nextOutfit, currentOutfits[1]]
              : [currentOutfits[0], nextOutfit];

            if (target === 0) removalsP0++;
            else removalsP1++;

            scheduler = updateDynamicClothingScheduler(scheduler, trigger.itemId, target, 'completed', intimacy, round);
          }
        }
      }

      pTurn = pTurn === 0 ? 1 : 0;
      round++;
    }

    const remainingP0 = getPresentGarmentSlots(currentOutfits[0]).length;
    const remainingP1 = getPresentGarmentSlots(currentOutfits[1]).length;

    if (remainingP0 === 0 && remainingP1 === 0 && removalsP0 === 3 && removalsP1 === 3) {
      successfulGames++;
    }
  }

  console.log(`Success rate (Both stripped to 0 clothes, exact 3 & 3 removals): ${(successfulGames / totalGames * 100).toFixed(1)}% (${successfulGames}/${totalGames})`);
  if (successfulGames !== totalGames) {
    throw new Error(`Expected 100% success rate, but got ${successfulGames}/${totalGames}`);
  }
  console.log('✔ PASS: 100% of 3-and-3 clothes games reached 0 clothes with exactly 6 strip cards evenly divided!\n');

  console.log('🎉 ALL 3 GAMEPLAY UPGRADES VERIFIED AND PASSING 100%!');
}

runSimulations();
