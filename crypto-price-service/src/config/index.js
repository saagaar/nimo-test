export default  {
  coinGeckoBaseUrl: process.env.COINGECKO_BASE_URL??
    'https://api.coingecko.com/api/v3',
  defaultCurrency: process.env.DEFAULT_CURRENCY ?? 'usd',
  historyTableName: 'CryptoSearchHistory',
  coinGeckoApiKey: process.env.CRYPTO_PRICE_API_KEY,
  awsRegion: process.env.AWS_REGION ?? 'AP-SOUTHEAST-2',
  dynamoDbEndpoint: process.env.DYNAMODB_ENDPOINT ?? 'http://host.docker.internal:8000'
};