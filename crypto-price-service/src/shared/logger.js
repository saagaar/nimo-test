/**
 * @file logger.js
 *
 * Shared structured logger.
 *
 * Emits JSON-formatted logs for easier filtering and searching in
 * AWS CloudWatch Logs.
 */

export const logger = {
  /**
   * Logs normal application events.
   *
   * @param {string} message
   * @param {Object} [metadata={}]
   */
  info(message, metadata = {}) {
    console.log(
      JSON.stringify({
        level: 'INFO',
        timestamp: new Date().toISOString(),
        message,
        metadata
      })
    );
  },

  /**
   * Logs recoverable warnings.
   *
   * @param {string} message
   * @param {Object} [metadata={}]
   */
  warn(message, metadata = {}) {
    console.warn(
      JSON.stringify({
        level: 'WARN',
        timestamp: new Date().toISOString(),
        message,
        metadata
      })
    );
  },

  /**
   * Logs application errors.
   *
   * @param {string} message
   * @param {Error} error
   * @param {Object} [metadata={}]
   */
  error(message, error, metadata = {}) {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        timestamp: new Date().toISOString(),
        message,
        metadata,
        error: {
          name: error?.name,
          message: error?.message,
          stack: error?.stack
        }
      })
    );
  }
};