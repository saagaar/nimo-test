import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import config from '#src/config/index.js';

/**
 * Configuration used to initialize the underlying DynamoDB client.
 *
 * The AWS SDK automatically resolves the DynamoDB service endpoint from the
 * configured AWS region. Therefore, a custom endpoint is only supplied when
 * running against DynamoDB Local during development or integration testing.
 *
 * AWS credentials are intentionally omitted because the SDK automatically
 * resolves them from the execution environment (e.g. Lambda IAM Role,
 * AWS CLI profile, or environment variables).
 */
const dynamoDbClientConfig = {
  // AWS region used for endpoint resolution.
  region: config.awsRegion
};

/**
 * Override the default AWS endpoint only when explicitly configured.
 * This allows the same code to work locally and in AWS without modification.
 */
if (config.dynamoDbEndpoint) {
  dynamoDbClientConfig.endpoint = config.dynamoDbEndpoint;
}

/**
 * Shared low-level DynamoDB client.
 *
 * AWS SDK v3 clients are designed to be reused. Creating the client outside
 * the Lambda handler allows warm Lambda invocations to reuse HTTP connections,
 * reducing initialization overhead and improving performance.
 */
const dynamoDbClient = new DynamoDBClient(dynamoDbClientConfig);

/**
 * High-level DynamoDB document client.
 *
 * The document client automatically marshals JavaScript objects into DynamoDB
 * attribute values and unmarshals DynamoDB responses back into native
 * JavaScript objects, eliminating the need for manual type conversion.
 */
export const documentClient = DynamoDBDocumentClient.from(dynamoDbClient  );
