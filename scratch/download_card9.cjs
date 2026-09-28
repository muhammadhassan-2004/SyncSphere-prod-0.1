const https = require('https');
const fs = require('fs');

const key = '332635cedba97f6661078366e8aadccb';
const token = 'ATTAb58df4f07b966410d1ac8a141bf09ac85e1868fd6ea4090b68302f5d75548706C78FC636';
fs.mkdirSync('scratch/card9', { recursive: true });

const fileUrl = 'https://api.trello.com/1/cards/6ab7065815948a74cb36e765/attachments/6ab7065815948a74cb36e789/download/image.png';
const options = {
  headers: {
    'Authorization': `OAuth oauth_consumer_key="${key}", oauth_token="${token}"`
  }
};

function download(url, opts) {
  https.get(url, opts, res => {
    if (res.statusCode === 302 || res.statusCode === 301) {
      console.log('Redirecting to:', res.headers.location);
      download(res.headers.location, {});
    } else if (res.statusCode === 200) {
      const file = fs.createWriteStream('scratch/card9/image.png');
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Downloaded successfully. Size:', fs.statSync('scratch/card9/image.png').size);
      });
    } else {
      console.log('Error status:', res.statusCode);
    }
  }).on('error', err => console.error(err));
}

download(fileUrl, options);
