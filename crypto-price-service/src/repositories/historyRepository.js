import { PutCommand } from '@aws-sdk/lib-dynamodb';

import { documentClient } from '#src/clients/dynamoDbClient.js';
import  config  from '#src/config/index.js';
import { ExternalServiceError,logger } from '#src/shared/index.js';

/**
 * Stores a cryptocurrency search record in DynamoDB.
 */
export async function saveSearchHistory({
  userId,
  coin,
  currency,
  price,
  email
}) {
  const searchedAt = new Date().toISOString();

  const item = {
    userId,
    searchedAt,
    coin,
    currency,
    price,
    email
  };

  try {
    await documentClient.send(
      new PutCommand({
        TableName: config.historyTableName,
        Item: item
      })
    );
    return item;
  } catch (error) {
    logger.error('Failed to save search history.', error);
    throw new ExternalServiceError(JSON.stringify(error));
  }
}