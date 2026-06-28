import { getCoinPrice } from '#src/clients/coinGeckoClient.js';
import { saveSearchHistory } from '#src/repositories/historyRepository.js';
import { logger } from '#src/shared/index.js';


/**
 * Handles the crypto price lookup use case.
 *
 * This service coordinates the main business flow:
 * 1. Fetch the latest cryptocurrency price from CoinGecko.
 * 2. Persist the search history to DynamoDB.
 * 3. Return the price result to the API handler.
 *
 * Email notification will be added later as a separate asynchronous step.
 */
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
 //Send email here to notify the user about the price lookup. This will be implemented in a future iteration.
  return {
    coin: priceResult.coin,
    currency: priceResult.currency,
    price: priceResult.price,
    searchedAt: historyRecord.searchedAt
  };
}