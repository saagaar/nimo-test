
/**
 * Shared response helpers for creating consistent API Gateway responses.
 */

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
};

/**
 * Creates a successful API response.
 */
export const successResponse = (statusCode = 200, data = {}) => ({
  statusCode,
  headers: DEFAULT_HEADERS,
  body: JSON.stringify({
    success: true,
    data
  })
});

/**
 * Creates an error API response.
 */
export const errorResponse = (error) => ({
  statusCode: error.statusCode || 500,
  headers: DEFAULT_HEADERS,
  body: JSON.stringify({
    success: false,
    error: {
      message:
        error.statusCode === 500
          ? 'Internal server error,' + error.message 
          : error.message || 'Request failed'
    }
  })
});