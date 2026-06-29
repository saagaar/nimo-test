import { sesClient } from '#src/clients/sesClient.js';
import { logger } from '#src/shared/index.js';

export class EmailNotificationService {
  async send({ userId, coin, currency, price, searchedAt }) {

    const subject = `Nimo | ${coin} Price Update`;

    const body = `
    Hello,

    Thank you for using Nimo.

    Here is the latest cryptocurrency price you requested.

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    📈 Cryptocurrency Price
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    Coin:        ${coin}
    Price:       ${price} ${currency}
    Requested:   ${searchedAt}

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    This price reflects the market value at the time of your request and may change as the market moves.

    Thank you for using Nimo.
    —
    Nimo Crypto Price Service
`.trim();
    
    await sesClient.sendEmail({
      to: userId,
      subject,
      body
    });
console.log('going email notification:', { userId, coin, currency, price, searchedAt });
    logger.info('Price notification email sent.', {
      userId,
      coin,
      currency
    });
  }
}

// Singleton — module is loaded once per Lambda execution environment and
// reused across warm invocations.
export const emailNotificationService = new EmailNotificationService();