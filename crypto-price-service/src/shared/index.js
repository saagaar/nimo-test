/**
 * @file index.js
 *
 * Public entry point for the shared module.
 *
 * Re-exports common utilities, error classes, configuration helpers,
 * logging utilities, and response helpers used across all services.
 *
 * Developers should import shared functionality from this file instead
 * of referencing individual modules directly.
 */

export {
  AppError,
  ValidationError,
  NotFoundError,
  ExternalServiceError,
  InternalServerError
} from './errors.js';

export { logger } from './logger.js';

export { successResponse, errorResponse } from './response.js';

export { getRequiredEnv, getOptionalEnv } from './config.js';