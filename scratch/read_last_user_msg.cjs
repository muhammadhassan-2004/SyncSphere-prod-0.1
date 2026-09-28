const fs = require('fs');
const transcriptPath = 'C:\\Users\\Orbics\\.gemini\\antigravity\\brain\\5c5d6767-616a-4c35-b0e0-ed0aa0d97954\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf-8').trim().split('\n');
const userLines = lines
  .map(l => {
    try { return JSON.parse(l); } catch(e) { return null; }
  })
  .filter(j => j && (j.type === 'USER_INPUT' || j.source === 'USER_EXPLICIT'));

const lastFew = userLines.slice(-3);
lastFew.forEach((item, idx) => {
  console.log(`\n=== USER MESSAGE [${idx}] ===\n`, item.content);
});
