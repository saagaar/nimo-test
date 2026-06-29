import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationError, ExternalServiceError } from '#src/shared/index.js';

vi.mock('#src/validators/priceValidator.js', () => ({ validatePriceRequest: vi.fn() }));
vi.mock('#src/services/priceService.js', () => ({ savePriceHistoryService: vi.fn() }));

const { validatePriceRequest } = await import('#src/validators/priceValidator.js');
const { savePriceHistoryService } = await import('#src/services/priceService.js');
const { handler } = await import('#src/handlers/price.js');

const MOCK_CONTEXT = { awsRequestId: 'test-request-id' };
const VALID_PARAMS = { coin: 'bitcoin', email: 'user@example.com' };
const PRICE_DATA = { coin: 'bitcoin', currency: 'usd', price: 65000, searchedAt: '2026-06-29T00:00:00.000Z' };

beforeEach(() => vi.clearAllMocks());

describe('price handler', () => {
  it('returns 400 when queryStringParameters is null', async () => {
    validatePriceRequest.mockImplementation(() => {
      throw new ValidationError('Coin is required');
    });
    const response = await handler({ queryStringParameters: null }, MOCK_CONTEXT);
    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when validation fails', async () => {
    validatePriceRequest.mockImplementation(() => {
      throw new ValidationError('Invalid email address');
    });
    const response = await handler({ queryStringParameters: { coin: 'bitcoin' } }, MOCK_CONTEXT);
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
  });

  it('returns 502 when service throws ExternalServiceError', async () => {
    validatePriceRequest.mockReturnValue(VALID_PARAMS);
    savePriceHistoryService.mockRejectedValue(new ExternalServiceError('CoinGecko down'));
    const response = await handler({ queryStringParameters: VALID_PARAMS }, MOCK_CONTEXT);
    expect(response.statusCode).toBe(502);
  });

  it('returns 200 with price data on success', async () => {
    validatePriceRequest.mockReturnValue(VALID_PARAMS);
    savePriceHistoryService.mockResolvedValue(PRICE_DATA);
    const response = await handler({ queryStringParameters: VALID_PARAMS }, MOCK_CONTEXT);
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(PRICE_DATA);
  });
});
