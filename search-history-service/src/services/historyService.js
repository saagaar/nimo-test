import { getSearchHistory } from '#src/repositories/historyRepository.js';
import { logger } from '#src/shared/index.js';

export async function getHistoryService({ email }) {
  logger.info('Retrieving search history.', { email });
  const items = await getSearchHistory(email);

  logger.info('Search history retrieved.', { email, count: items.length });

  return { items, count: items.length };
}
