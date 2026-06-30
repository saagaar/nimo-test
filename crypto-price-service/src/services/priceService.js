import { getCoinPrice } from '#src/clients/coinGeckoClient.js';
import { saveSearchHistory, findRecentSearch } from '#src/repositories/historyRepository.js';
import { emailNotificationService } from '#src/services/emailNotificationService.js';
import { logger } from '#src/shared/index.js';


/**
 * Handles the crypto price lookup use case.
 *
 * This service coordinates the main business flow:
 * 1. Fetch the latest cryptocurrency price from CoinGecko.
 * 2. Persist the search history to DynamoDB.
 * 3. Return the price result to the API handler.
 *
 * Email notification will be send if the user has not received a notification for the same coin and currency in the last 5 minutes.
 */

const EMAIL_DEDUP_WINDOW_MINUTES = 5;

export async function savePriceHistoryService(input) {
  const { coin, email, currency } = input;

  logger.info('Fetching cryptocurrency price.', {
    coin,
    currency,
    email
  });
  
  const priceResult = await getCoinPrice(coin);
  logger.info('Search history saved successfully.', {
    userId: email,
    coin: priceResult.coin,
    searchedAt: email
  });

  const fiveMinutesAgo = new Date(
    Date.now() - EMAIL_DEDUP_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const recentSearch = await findRecentSearch({
    userId: email,
    coin: priceResult.coin,
    currency: priceResult.currency,
    since: fiveMinutesAgo
  });

  const historyRecord = await saveSearchHistory({
    userId: email,
    email,
    coin: priceResult.coin,
    currency: priceResult.currency,
    price: priceResult.price
  }); 

  logger.info('Search history saved successfully.', {
    userId: email,
    coin: priceResult.coin,
    searchedAt: historyRecord.searchedAt
  });
  // Fire-and-forget: SES failure must never block or fail the price response.

   if (!recentSearch) {
    
    emailNotificationService.send({
      userId: email,
      coin: priceResult.coin,
      currency: priceResult.currency,
      price: priceResult.price,
      searchedAt: historyRecord.searchedAt
    }).catch(err => logger.warn('Email notification failed — continuing.', { err }));
  } else {
     console.log('just now send  email')
      logger.info('Skipping duplicate email notification.', {
        userId: email,
        coin: priceResult.coin,
        currency: priceResult.currency,
        dedupWindowMinutes: EMAIL_DEDUP_WINDOW_MINUTES
      });
  }
  return {
    coin: priceResult.coin,
    email: email,
    currency: priceResult.currency,
    price: priceResult.price,
    searchedAt: historyRecord.searchedAt
  };
}