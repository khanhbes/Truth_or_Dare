import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DIFFICULTY_BOOST_STAR_COST,
  POSITION_FAMILY_STAR_COST,
  POSITION_PAIR_STAR_COST,
  POSITION_REROLL_STAR_COST,
  REROLL_STAR_COST,
  awardStars,
  createRewardStates,
  getSharedStarBalance,
  giftStars,
  refundPendingDifficultyBoost,
  spendReward,
  spendSharedStars,
} from './rewards';

test('stars are awarded only to the performer and accumulate independently', () => {
  const first = awardStars(createRewardStates(), 1, 4);
  assert.equal(first[0].starBalance, 0);
  assert.equal(first[1].starBalance, 4);
  assert.equal(first[1].totalStarsEarned, 4);
  const second = awardStars(first, 1, 2);
  assert.equal(second[1].starBalance, 6);
  assert.equal(second[1].totalStarsEarned, 6);
});

test('reward spending is atomic, bounded and tracks each reward separately', () => {
  const funded = awardStars(awardStars(createRewardStates(), 0, 5), 0, 5);
  const rerolled = spendReward(funded, 0, 'reroll');
  assert.ok(rerolled);
  assert.equal(rerolled[0].starBalance, 10 - REROLL_STAR_COST);
  assert.equal(rerolled[0].rerollsUsed, 1);
  assert.equal(spendReward(rerolled, 0, 'difficulty_boost'), null);
});

test('an unused difficulty boost can be refunded without inflating usage', () => {
  const funded = awardStars(awardStars(createRewardStates(), 0, 5), 0, 5);
  const spent = spendReward(funded, 0, 'difficulty_boost');
  assert.ok(spent);
  assert.equal(spent[0].starBalance, 10 - DIFFICULTY_BOOST_STAR_COST);
  const refunded = refundPendingDifficultyBoost(spent, {
    ownerPlayerIndex: 0,
    targetPlayerIndex: 1,
    queuedRound: 2,
  });
  assert.equal(refunded[0].starBalance, 10);
  assert.equal(refunded[0].difficultyBoostsUsed, 0);
});

test('the Position options cost more the more they decide, and the couple pays together', () => {
  assert.deepEqual([POSITION_REROLL_STAR_COST, POSITION_PAIR_STAR_COST, POSITION_FAMILY_STAR_COST], [8, 12, 15]);
  const rewards = createRewardStates();
  rewards[0].starBalance = 9;
  rewards[1].starBalance = 5;
  const pair = spendSharedStars(rewards, 1, POSITION_PAIR_STAR_COST);
  assert.deepEqual(pair?.paid, [7, 5]);
  assert.equal(getSharedStarBalance(pair!.rewards), 2);
  assert.equal(spendSharedStars(rewards, 0, POSITION_FAMILY_STAR_COST), null);
});

test('a gift of stars reaches both players and counts as earned', () => {
  const gifted = giftStars(awardStars(createRewardStates(), 0, 3), 4);
  assert.deepEqual(gifted.map((reward) => reward.starBalance), [7, 4]);
  assert.deepEqual(gifted.map((reward) => reward.totalStarsEarned), [7, 4]);
  assert.deepEqual(giftStars(gifted, -2).map((reward) => reward.starBalance), [7, 4]);
});
