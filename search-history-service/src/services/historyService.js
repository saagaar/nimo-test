import { getSearchHistory } from '#src/repositories/historyRepository.js';
import { logger } from '#src/shared/index.js';

export async function getHistoryService({ userId: email }) {
  logger.info('Retrieving search history.', { userId: email });
  const items = await getSearchHistory(email);

  logger.info('Search history retrieved.', { userId: email, count: items.length });

  return { items, count: items.length };
}
