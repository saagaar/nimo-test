import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import config from '#src/config/index.js';
import { logger } from '#src/shared/index.js';


// Client created once at module load — reused across warm Lambda invocations.
const client = new SESClient({ region: config.awsRegion });

export const sesClient = {
  async sendEmail({ to, subject, body }) {
      logger.info('Ready to send email via SES.', { to, subject })
   try{
    await client.send(
      new SendEmailCommand({
        Source:  'saagarchapagain@gmail.com',
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: { Text: { Data: body } }
        }
      })
    );
      logger.info('Email sent via SES.', { to, subject })
    } 
    catch (error) {
      logger.error('Some error Occured Failed to send email.', {
        to,
        error: error.message,
        name: error.name,
        metadata: error.$metadata
      });
      }
  }
}