/**
 * Manual SES smoke test.
 *
 * Sends a single test email directly via the AWS SDK — bypasses the
 * notification service and dedup logic so you can verify SES credentials,
 * identity verification, and sandbox status in isolation.
 *
 * Usage (from repo root):
 *   AWS_REGION=ap-southeast-2 \
 *   EMAIL_FROM_ADDRESS=your-verified@email.com \
 *   node crypto-price-service/scripts/test-email.js <recipient@email.com>
 *
 * If recipient is omitted, EMAIL_FROM_ADDRESS is used as both sender and recipient.
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const region = process.env.AWS_REGION ?? 'ap-southeast-2';
const from = process.env.EMAIL_FROM_ADDRESS;
const to = process.argv[2] ?? from;

// ── Pre-flight checks ──────────────────────────────────────────────────────

if (!from) {
  console.error('ERROR: EMAIL_FROM_ADDRESS environment variable is not set.');
  console.error('Set it to an SES-verified email address and retry.');
  process.exit(1);
}

if (!to) {
  console.error('ERROR: No recipient address. Pass one as a CLI argument:');
  console.error('  node scripts/test-email.js recipient@example.com');
  process.exit(1);
}

// ── Send ───────────────────────────────────────────────────────────────────

console.log(`\nSES smoke test`);
console.log(`  Region : ${region}`);
console.log(`  From   : ${from}`);
console.log(`  To     : ${to}`);
console.log('');

const client = new SESClient({ region });

try {
  const response = await client.send(
    new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: 'Nimo — SES smoke test' },
        Body: {
          Text: {
            Data: [
              'This is a test email from the Nimo crypto price service.',
              '',
              'If you received this, SES is configured correctly.',
              '',
              `Sent from: ${from}`,
              `Region:    ${region}`,
              `Time:      ${new Date().toISOString()}`,
            ].join('\n'),
          },
        },
      },
    })
  );

  console.log('SUCCESS — email accepted by SES.');
  console.log(`Message ID: ${response.MessageId}`);
  console.log('\nCheck your inbox. If it does not arrive:');
  console.log('  - Verify the recipient address in the SES console (sandbox mode)');
  console.log('  - Check the SES sending quota and suppression list');
} catch (err) {
  console.error('FAILED — SES rejected the request.');
  console.error(`\nError type : ${err.name}`);
  console.error(`Message    : ${err.message}`);

  if (err.name === 'MessageRejected') {
    console.error('\nThe sender address is not verified in SES.');
    console.error('Go to SES console → Verified identities and verify:', from);
  } else if (err.name === 'AccessDeniedException' || err.name === 'AuthFailure') {
    console.error('\nThe AWS credentials do not have ses:SendEmail permission.');
    console.error('Check IAM permissions for the current user/role.');
  } else if (err.name === 'MailFromDomainNotVerifiedException') {
    console.error('\nThe domain is not verified. Verify the domain or use a full email identity.');
  }

  process.exit(1);
}
