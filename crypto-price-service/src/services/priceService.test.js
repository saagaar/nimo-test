import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExternalServiceError } from '#src/shared/index.js';

vi.mock('#src/clients/coinGeckoClient.js', () => ({ getCoinPrice: vi.fn() }));
vi.mock('#src/repositories/historyRepository.js', () => ({
  saveSearchHistory: vi.fn(),
  findRecentSearch: vi.fn()
}));
vi.mock('#src/services/emailNotificationService.js', () => ({
  emailNotificationService: { send: vi.fn() }
}));

const { getCoinPrice } = await import('#src/clients/coinGeckoClient.js');
const { saveSearchHistory, findRecentSearch } = await import('#src/repositories/historyRepository.js');
const { emailNotificationService } = await import('#src/services/emailNotificationService.js');
const { savePriceHistoryService } = await import('#src/services/priceService.js');

const INPUT = { coin: 'bitcoin', email: 'user@example.com', currency: 'usd' };
const PRICE_RESULT = { coin: 'bitcoin', currency: 'usd', price: 65000 };
const HISTORY_RECORD = { ...PRICE_RESULT, userId: 'user@example.com', searchedAt: '2026-06-29T00:00:00.000Z' };

beforeEach(() => {
  vi.clearAllMocks();
  getCoinPrice.mockResolvedValue(PRICE_RESULT);
  saveSearchHistory.mockResolvedValue(HISTORY_RECORD);
  findRecentSearch.mockResolvedValue(null);
  emailNotificationService.send.mockResolvedValue(undefined);
});

describe('savePriceHistoryService', () => {
  it('sends email when no recent search exists for the user+coin', async () => {
    findRecentSearch.mockResolvedValue(null);
    await savePriceHistoryService(INPUT);
    expect(emailNotificationService.send).toHaveBeenCalledOnce();
    expect(emailNotificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user@example.com', coin: 'bitcoin' })
    );
  });

  it('skips email when a recent search exists within the 5-minute window', async () => {
    findRecentSearch.mockResolvedValue({ coin: 'bitcoin', searchedAt: new Date().toISOString() });
    await savePriceHistoryService(INPUT);
    expect(emailNotificationService.send).not.toHaveBeenCalled();
  });

  it('propagates error and never calls saveSearchHistory when getCoinPrice throws', async () => {
    getCoinPrice.mockRejectedValue(new ExternalServiceError('CoinGecko down'));
    await expect(savePriceHistoryService(INPUT)).rejects.toThrow(ExternalServiceError);
    expect(saveSearchHistory).not.toHaveBeenCalled();
  });

  it('propagates error when saveSearchHistory throws', async () => {
    saveSearchHistory.mockRejectedValue(new ExternalServiceError('DynamoDB write failed'));
    await expect(savePriceHistoryService(INPUT)).rejects.toThrow(ExternalServiceError);
  });

  it('calls findRecentSearch with a since timestamp approximately 5 minutes ago', async () => {
    const before = Date.now();
    await savePriceHistoryService(INPUT);
    const after = Date.now();

    const { since } = findRecentSearch.mock.calls[0][0];
    const sinceMs = new Date(since).getTime();

    // since must fall within the [before - 5min, after - 5min] range (±1s tolerance)
    expect(sinceMs).toBeGreaterThanOrEqual(before - 5 * 60 * 1000 - 1000);
    expect(sinceMs).toBeLessThanOrEqual(after - 5 * 60 * 1000 + 1000);
  });
});
