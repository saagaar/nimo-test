import { describe, it, expect } from 'vitest';
import { validateHistoryRequest } from '#src/validators/historyValidator.js';
import { ValidationError } from '#src/shared/index.js';

describe('validateHistoryRequest', () => {
  it('throws ValidationError when userId is missing', () => {
    expect(() => validateHistoryRequest({})).toThrow(ValidationError);
  });

  it('throws ValidationError for invalid email format', () => {
    expect(() =>
      validateHistoryRequest({ userId: 'not-an-email' })
    ).toThrow(ValidationError);
  });

  it('returns parsed data for a valid email', () => {
    const result = validateHistoryRequest({ userId: 'user@example.com' });
    expect(result).toEqual({ userId: 'user@example.com' });
  });
});
