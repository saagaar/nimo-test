import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

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
  
export async function findRecentSearch({ userId, coin, currency, since }) {
  const response = await documentClient.send(
    new QueryCommand({
      TableName: config.historyTableName,
      KeyConditionExpression: 'userId = :userId AND searchedAt >= :since',
      FilterExpression: 'coin = :coin AND currency = :currency',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':since': since,
        ':coin': coin,
        ':currency': currency
      },
      ScanIndexForward: false,
      Limit: 1
    })
  );

  return response.Items?.[0] ?? null;
}