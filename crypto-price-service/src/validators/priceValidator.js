import { z } from 'zod';
import { ValidationError } from '#src/shared/index.js';

const schema = z.object({
  coin: z.string().min(1, 'Coin is required'),
  email: z.string().email('Invalid email address')
});

export function validatePriceRequest(query) {
  const result = schema.safeParse(query);

  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message);
  }

  return result.data;
}