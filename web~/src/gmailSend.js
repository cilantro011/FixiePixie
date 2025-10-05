function toBase64Url(uint8) {
  let str = btoa(String.fromCharCode(...uint8));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}
async function blobToB64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  return btoa(String.fromCharCode(...buf));
}

// Send email via Gmail API using an OAuth access token
export async function gmailSend({ accessToken, to, subject, html, attachment }) {
  const boundary = 'fixiepixie-' + Math.random().toString(36).slice(2);
  const toLine = Array.isArray(to) ? to.join(', ') : to;
  let mime = '';

  mime += `To: ${toLine}\r\n`;
  mime += `Subject: ${subject}\r\n`;
  mime += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
  mime += `MIME-Version: 1.0\r\n\r\n`;

  // HTML body
  mime += `--${boundary}\r\n`;
  mime += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
  mime += `${html}\r\n\r\n`;

  // Attachment (optional)
  if (attachment?.blob) {
    const b64 = await blobToB64(attachment.blob);
    const name = attachment.filename || 'report.jpg';
    const type = attachment.mime || attachment.blob.type || 'image/jpeg';
    mime += `--${boundary}\r\n`;
    mime += `Content-Type: ${type}; name="${name}"\r\n`;
    mime += `Content-Transfer-Encoding: base64\r\n`;
    mime += `Content-Disposition: attachment; filename="${name}"\r\n\r\n`;
    mime += b64.replace(/.{1,76}/g, '$&\r\n') + `\r\n\r\n`;
  }

  mime += `--${boundary}--`;
  const raw = toBase64Url(new TextEncoder().encode(mime));

  const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw })
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}