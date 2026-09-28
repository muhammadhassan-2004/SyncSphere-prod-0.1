import fs from 'fs';
import path from 'path';
import { getCards, downloadAttachment } from './trello_sync';

async function main() {
  const cards = await getCards();
  const openCardIds = [
    '6ab7065815948a74cb36e765',
    '6ab70ccff83f4f5dd504c1b9',
    '6ab70ee94364db4f6bbd874c',
    '6ab71058dab2e8b02e043a17'
  ];

  const targetCards = cards.filter(c => openCardIds.includes(c.id));

  for (const card of targetCards) {
    const dir = path.join(process.cwd(), 'trello_downloads', card.id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    console.log(`Processing card ${card.id} with ${card.attachments?.length || 0} attachments...`);
    if (card.attachments) {
      for (let i = 0; i < card.attachments.length; i++) {
        const att = card.attachments[i];
        const ext = path.extname(att.name) || '.png';
        const filename = `attachment_${i + 1}_${att.id}${ext}`;
        const filePath = path.join(dir, filename);
        if (!fs.existsSync(filePath)) {
          console.log(`  Downloading ${att.name} -> ${filename}...`);
          try {
            await downloadAttachment(att.url, filePath);
            console.log(`  Downloaded: ${filename}`);
          } catch (e: any) {
            console.error(`  Failed to download ${att.name}:`, e.message);
          }
        } else {
          console.log(`  Already exists: ${filename}`);
        }
      }
    }
  }
  console.log('All downloads completed!');
}

main().catch(console.error);
