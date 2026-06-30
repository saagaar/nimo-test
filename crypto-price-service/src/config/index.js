export default {
  coinGeckoBaseUrl: process.env.COINGECKO_BASE_URL ?? 'https://api.coingecko.com/api/v3',
  defaultCurrency:  process.env.DEFAULT_CURRENCY ?? 'usd',
  historyTableName: process.env.HISTORY_TABLE_NAME ?? 'CryptoSearchHistory',
  coinGeckoApiKey:  process.env.CRYPTO_PRICE_API_KEY,
  awsRegion:        process.env.AWS_REGION ?? 'ap-southeast-2',
  // No fallback — undefined lets the AWS SDK resolve the correct regional
  // endpoint automatically. A hardcoded fallback would misdirect traffic in production.
  dynamoDbEndpoint: process.env.DYNAMODB_ENDPOINT ?? "http://host.docker.internal:8000",
  // Must be a SES-verified email address. Email sending is skipped if unset.
  emailFromAddress: process.env.EMAIL_FROM_ADDRESS
};