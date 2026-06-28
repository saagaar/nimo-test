import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import  config  from '#src/config/index.js';

const baseClient = new DynamoDBClient({
  region: config.awsRegion,
  endpoint: config.dynamoDbEndpoint
});

export const documentClient = DynamoDBDocumentClient.from(baseClient);