import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import config from '#src/config/index.js';

// Client created once at module load — reused across warm Lambda invocations.
const client = new SESClient({ region: config.awsRegion });

export const sesClient = {
  async sendEmail({ to, subject, body }) {
    await client.send(
      new SendEmailCommand({
        Source: config.emailFromAddress,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: { Text: { Data: body } }
        }
      })
    );
  }
};
