import { describe, it, expect } from 'vitest';
import { validatePriceRequest } from '#src/validators/priceValidator.js';
import { ValidationError } from '#src/shared/index.js';

describe('validatePriceRequest', () => {
  it('throws ValidationError when coin is missing', () => {
    expect(() => validatePriceRequest({})).toThrow(ValidationError);
  });

  it('throws ValidationError when email is missing', () => {
    expect(() => validatePriceRequest({ coin: 'bitcoin' })).toThrow(ValidationError);
  });

  it('throws ValidationError for invalid email format', () => {
    expect(() =>
      validatePriceRequest({ coin: 'bitcoin', email: 'not-an-email' })
    ).toThrow(ValidationError);
  });

  it('returns parsed data for valid input', () => {
    const result = validatePriceRequest({ coin: 'bitcoin', email: 'user@example.com' });
    expect(result).toEqual({ coin: 'bitcoin', email: 'user@example.com' });
  });
});
