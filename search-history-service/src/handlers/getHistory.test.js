import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationError } from '#src/shared/index.js';

vi.mock('#src/validators/historyValidator.js', () => ({ validateHistoryRequest: vi.fn() }));
vi.mock('#src/services/historyService.js', () => ({ getHistoryService: vi.fn() }));

const { validateHistoryRequest } = await import('#src/validators/historyValidator.js');
const { getHistoryService } = await import('#src/services/historyService.js');
const { handler } = await import('#src/handlers/getHistory.js');

const MOCK_CONTEXT = { awsRequestId: 'test-request-id' };

beforeEach(() => vi.clearAllMocks());

describe('getHistory handler', () => {
  it('returns 400 when userId is missing', async () => {
    validateHistoryRequest.mockImplementation(() => {
      throw new ValidationError('A valid email address is required');
    });
    const response = await handler({ queryStringParameters: {} }, MOCK_CONTEXT);
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
  });

  it('returns 200 with empty items for a new user', async () => {
    validateHistoryRequest.mockReturnValue({ userId: 'user@example.com' });
    getHistoryService.mockResolvedValue({ items: [], count: 0 });
    const response = await handler({ queryStringParameters: { userId: 'user@example.com' } }, MOCK_CONTEXT);
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toEqual({ items: [], count: 0 });
  });
});
