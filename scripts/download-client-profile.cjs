const https = require('https');
const fs = require('fs');

const key = '332635cedba97f6661078366e8aadccb';
const token = 'ATTAb58df4f07b966410d1ac8a141bf09ac85e1868fd6ea4090b68302f5d75548706C78FC636';
const cardId = '6ab700546c9cc6ddfdc5fa31';
const attId = '6ab700546c9cc6ddfdc5fa42';
const url = 'https://api.trello.com/1/cards/' + cardId + '/attachments/' + attId + '/download/image.png';
const filePath = 'scripts/client-profile.png';
const authHeader = 'OAuth oauth_consumer_key="' + key + '", oauth_token="' + token + '"';

function tryDownload(attemptsLeft) {
  const req = https.get(url, { headers: { Authorization: authHeader } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      https.get(res.headers.location, (redRes) => {
        const file = fs.createWriteStream(filePath);
        redRes.pipe(file);
        file.on('finish', () => console.log('Saved client-profile.png'));
      });
    } else {
      const file = fs.createWriteStream(filePath);
      res.pipe(file);
      file.on('finish', () => console.log('Saved client-profile.png'));
    }
  });

  req.on('error', (err) => {
    console.error('Error:', err.message);
    if (attemptsLeft > 0) {
      console.log('Retrying in 2 seconds...');
      setTimeout(() => tryDownload(attemptsLeft - 1), 2000);
    }
  });
}

tryDownload(5);
