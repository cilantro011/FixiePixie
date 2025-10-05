// api/mailer.js
const nodemailer = require('nodemailer');

function makeTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS in .env');
  }

  const secure = port === 465; // true for 465 (SMTPS), false for 587/25/2525
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

/**
 * Send a message with optional photo attachment (Buffer)
 */
async function sendReportEmail({
  to,
  subject,
  text,
  html,
  photoBuffer,
  photoMime = 'image/jpeg',
  filename = 'report.jpg',
}) {
  const transporter = makeTransport();

  const from = `"${process.env.SENDER_NAME || 'FixiePixie'}" <${process.env.SENDER_EMAIL}>`;
  const bcc  = process.env.BCC_EMAIL ? [process.env.BCC_EMAIL] : undefined;

  const attachments = [];
  if (photoBuffer && Buffer.isBuffer(photoBuffer) && photoBuffer.length > 0) {
    attachments.push({ filename, content: photoBuffer, contentType: photoMime });
  }

  const info = await transporter.sendMail({
    from,
    to,
    bcc,
    subject,
    text,
    html,
    attachments,
  });

  return info; // contains messageId, accepted/rejected arrays, etc.
}

module.exports = { sendReportEmail };
