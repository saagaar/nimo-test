import { z } from 'zod';
import { ValidationError } from '#src/shared/index.js';

const schema = z.object({
  email: z.string().email('A valid email address is required')
});

export function validateHistoryRequest(query) {
  const result = schema.safeParse(query);

  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message);
  }

  return result.data;
}
