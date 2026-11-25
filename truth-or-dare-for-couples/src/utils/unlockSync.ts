/**
 * Opened-card lists live both on the device and in the couple account. The two
 * can drift apart when a card is opened while the network is down.
 */

/** Keeps the server's order first, then adds what only this device knows. */
export const mergeUnlockedCardIds = (
  serverIds: readonly string[],
  localIds: readonly string[],
): string[] => Array.from(new Set([...serverIds, ...localIds]));

export interface UnlockListOnLoad {
  /** The list to show. */
  cardIds: string[];
  /** The device knows cards the account does not: send the list up. */
  needsUpload: boolean;
}

/**
 * Which list to use when a signed-in session is restored.
 *
 * The device list only counts when it was saved for the same account, so a
 * guest's or another couple's cards never leak into this one.
 */
export const resolveUnlockedCardsOnLoad = ({
  serverIds,
  localIds,
  localOwner,
  accountName,
}: {
  serverIds: readonly string[];
  localIds: readonly string[];
  localOwner: string | null;
  accountName: string | undefined;
}): UnlockListOnLoad => {
  const server = Array.from(new Set(serverIds));
  if (!accountName || localOwner !== accountName) return { cardIds: server, needsUpload: false };
  const cardIds = mergeUnlockedCardIds(server, localIds);
  return { cardIds, needsUpload: cardIds.length > server.length };
};
