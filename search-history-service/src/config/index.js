
export default {
  historyTableName: process.env.HISTORY_TABLE_NAME ?? 'CryptoSearchHistory',
  awsRegion: process.env.AWS_REGION ?? 'ap-southeast-2',
  // Intentionally no fallback — undefined lets the AWS SDK resolve the correct
  // regional endpoint automatically. A hardcoded fallback (e.g. host.docker.internal)
  // would silently misdirect traffic in production.
  dynamoDbEndpoint: process.env.DYNAMODB_ENDPOINT??"http://host.docker.internal:8000"
}