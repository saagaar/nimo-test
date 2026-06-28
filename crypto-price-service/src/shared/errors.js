/**
 * @file errors.js
 *
 * Shared application error classes.
 *
 * Defines custom errors used across Lambda services. Each error carries
 * an HTTP status code so handlers can return consistent API responses.
 */

export class AppError extends Error {
  constructor(message = 'Application error', statusCode = 500) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Thrown when user input or request parameters are invalid.
 *
 * Example:
 * - missing coin query parameter
 * - invalid email format
 */
export class ValidationError extends AppError {
  constructor(message = 'Invalid request') {
    super(message, 400);
  }
}

/**
 * Thrown when a requested resource cannot be found.
 *
 * Example:
 * - cryptocurrency is not found or unsupported
 * - requested history record does not exist
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Thrown when an external dependency fails.
 *
 * Example:
 * - CoinGecko API unavailable
 * - SES email sending failure
 * - SQS message publishing failure
 */
export class ExternalServiceError extends AppError {
  constructor(message = 'External service unavailable') {
    super(message, 502);
  }
}

/**
 * Thrown for known internal server-side failures.
 *
 * Most unexpected errors can simply bubble up and be converted to a 500
 * response by the shared error response helper.
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500);
  }
}