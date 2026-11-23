import { DifficultyStars, PendingDifficultyBoost, PlayerIndex, PlayerRewardState } from '../types';

export const REROLL_STAR_COST = 8;
export const DIFFICULTY_BOOST_STAR_COST = 10;
/** Final Have Sex choice: reveal two of the three face-down cards. */
export const FINAL_FLIP_TWO_STAR_COST = 10;
/** Final Have Sex choice: reveal all three face-down cards. */
export const FINAL_FLIP_THREE_STAR_COST = 20;

export const getSharedStarBalance = (
  rewards: readonly [PlayerRewardState, PlayerRewardState],
): number => rewards[0].starBalance + rewards[1].starBalance;

export interface SharedStarSpend {
  rewards: [PlayerRewardState, PlayerRewardState];
  /** Stars taken from each wallet, index = player. */
  paid: [number, number];
}

/**
 * Spends from the couple's shared wallet: the first payer's stars are used
 * before the partner's. Returns null without changing anything when the two
 * wallets together cannot cover the cost.
 */
export const spendSharedStars = (
  rewards: readonly [PlayerRewardState, PlayerRewardState],
  firstPayer: PlayerIndex,
  cost: number,
): SharedStarSpend | null => {
  const amount = Math.max(0, Math.floor(cost));
  if (getSharedStarBalance(rewards) < amount) return null;
  const partner: PlayerIndex = firstPayer === 0 ? 1 : 0;
  const paid: [number, number] = [0, 0];
  paid[firstPayer] = Math.min(rewards[firstPayer].starBalance, amount);
  paid[partner] = amount - paid[firstPayer];
  return {
    paid,
    rewards: rewards.map((reward, index) => ({
      ...reward,
      starBalance: reward.starBalance - paid[index],
    })) as [PlayerRewardState, PlayerRewardState],
  };
};

export const createPlayerRewardState = (): PlayerRewardState => ({
  starBalance: 0,
  totalStarsEarned: 0,
  rerollsUsed: 0,
  difficultyBoostsUsed: 0,
});

export const createRewardStates = (): [PlayerRewardState, PlayerRewardState] => [
  createPlayerRewardState(),
  createPlayerRewardState(),
];

export const awardStars = (
  rewards: readonly [PlayerRewardState, PlayerRewardState],
  playerIndex: PlayerIndex,
  stars: DifficultyStars,
): [PlayerRewardState, PlayerRewardState] => rewards.map((reward, index) =>
  index === playerIndex
    ? {
        ...reward,
        starBalance: reward.starBalance + stars,
        totalStarsEarned: reward.totalStarsEarned + stars,
      }
    : reward,
) as [PlayerRewardState, PlayerRewardState];

export const spendReward = (
  rewards: readonly [PlayerRewardState, PlayerRewardState],
  playerIndex: PlayerIndex,
  kind: 'reroll' | 'difficulty_boost',
): [PlayerRewardState, PlayerRewardState] | null => {
  const cost = kind === 'reroll' ? REROLL_STAR_COST : DIFFICULTY_BOOST_STAR_COST;
  if (rewards[playerIndex].starBalance < cost) return null;
  return rewards.map((reward, index) =>
    index === playerIndex
      ? {
          ...reward,
          starBalance: reward.starBalance - cost,
          rerollsUsed: reward.rerollsUsed + (kind === 'reroll' ? 1 : 0),
          difficultyBoostsUsed: reward.difficultyBoostsUsed + (kind === 'difficulty_boost' ? 1 : 0),
        }
      : reward,
  ) as [PlayerRewardState, PlayerRewardState];
};

export const refundPendingDifficultyBoost = (
  rewards: readonly [PlayerRewardState, PlayerRewardState],
  pending: PendingDifficultyBoost | null,
): [PlayerRewardState, PlayerRewardState] => {
  if (!pending) return [rewards[0], rewards[1]];
  return rewards.map((reward, index) =>
    index === pending.ownerPlayerIndex
      ? {
          ...reward,
          starBalance: reward.starBalance + DIFFICULTY_BOOST_STAR_COST,
          difficultyBoostsUsed: Math.max(0, reward.difficultyBoostsUsed - 1),
        }
      : reward,
  ) as [PlayerRewardState, PlayerRewardState];
};
