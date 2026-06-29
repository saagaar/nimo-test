import { successResponse, errorResponse, logger } from '#src/shared/index.js';
import { validateHistoryRequest } from '#src/validators/historyValidator.js';
import { getHistoryService } from '#src/services/historyService.js';

export const handler = async (event, context) => {
  try {
    console.log('Received event:',process.env.DYNAMODB_ENDPOINT);
    const input = validateHistoryRequest(event.queryStringParameters ?? {});
    const result = await getHistoryService(input);
    return successResponse(200, result);
  } catch (error) {
    logger.error('Failed to retrieve search history.', error, {
      requestId: context?.awsRequestId
    });
    return errorResponse(error);
  }
};
