// asks the user for a Gmail access token (gmail.send scope)
export function getGmailAccessToken(clientId) {
  return new Promise((resolve, reject) => {
    if (!window.google) return reject(new Error('Google client not loaded'));
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ].join(' '),
      prompt: '', // shows consent first time
      callback: (resp) => {
        if (resp?.access_token) resolve(resp.access_token);
        else reject(new Error('No access token'));
      }
    });
    tokenClient.requestAccessToken();
  });
}
