import {
  successResponse,
  errorResponse,
  logger
} from '../shared/index.js';

import { validatePriceRequest } from '#src/validators/priceValidator.js';
import { savePriceHistoryService } from '#src/services/priceService.js';
// import { success } from 'zod';

/**
 * AWS Lambda handler for retrieving cryptocurrency prices.
 *
 * Validates the incoming request, retrieves the latest cryptocurrency
 * price, and returns a standardized API Gateway response.
 *
 * @param {import('aws-lambda').APIGatewayProxyEvent} event
 * API Gateway request event.
 *
 * @returns {Promise<Object>}
 * API Gateway compatible response.
 */
export const handler = async (event, context) => {
  try {
        console.log('Checked event:',process.env.DYNAMODB_ENDPOINT);

    //Valdaites the incoming request query parameters
    const input = validatePriceRequest(event.queryStringParameters ?? {});
    // Retrieves the latest cryptocurrency price from the serv
      const result = await savePriceHistoryService(input);
  // 
      return successResponse(200, result);
  } catch (error) {
      logger.error('Failed to process crypto price request.', error, {
        requestId: context?.awsRequestId
      });
    return errorResponse(error);
  }
};