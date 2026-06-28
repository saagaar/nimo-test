import { QueryCommand } from '@aws-sdk/lib-dynamodb';

import { documentClient } from '#src/clients/dynamoDbClient.js';
import config from '#src/config/index.js';
import { ExternalServiceError, logger } from '#src/shared/index.js';

export async function getSearchHistory(userId) {
  try {
 
    const response = await documentClient.send(
      new QueryCommand({
        TableName: config.historyTableName,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        ScanIndexForward: false // newest first
      })
    );

    return response.Items ?? [];
  } catch (error) {
    logger.error('Failed to query search history.', error);
    throw new ExternalServiceError(error);
  }
}
