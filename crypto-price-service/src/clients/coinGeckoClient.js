/**
 * @file coinGeckoClient.js
 *
 * Client responsible for communicating with the CoinGecko API.
 * Encapsulates all external API interactions and converts external
 * failures into application-specific errors.
 */

import {
  AppError,
  logger,
  ExternalServiceError,
} from '#src/shared/index.js';
import {
  
} from '#src/shared/index.js';
import config from '#src/config/index.js';




/**
 * Retrieves the current cryptocurrency price from CoinGecko.
 *
 * @param {string} coin - Cryptocurrency identifier (e.g. bitcoin, ethereum).
 * 
 *
 * @returns {Promise<Object>} Cryptocurrency price information.
 *
 * @throws {NotFoundError}
 * If the requested cryptocurrency does not exist.
 *
 * @throws {ExternalServiceError}
 * If the CoinGecko API request fails.
 */

export async function getCoinPrice(coin, currency = config.defaultCurrency) {
  const url =
    `${config.coinGeckoBaseUrl}/simple/price?names=${encodeURIComponent(coin)}` +
    `&vs_currencies=${encodeURIComponent(currency)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new ExternalServiceError(
        `CoinGecko returned HTTP ${response.status}.`
      );
    }
    const data = await response.json();
    const [[, coinData] = []] = Object.entries(data);
    const price = coinData?.[config.defaultCurrency];
    if (!Number.isFinite(price)) 
       return {
        coin,
        currency,
        undefined
      };
    return {
      coin,
      currency,
      price
    };
  }catch (error) {
      logger.error('CoinGecko request failed', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new ExternalServiceError(
        'Failed to retrieve cryptocurrency price from CoinGecko.'
      );
    }
}