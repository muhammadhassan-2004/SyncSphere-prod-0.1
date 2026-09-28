import fs from 'fs';
import path from 'path';
import { TRELLO_KEY, TRELLO_TOKEN, BOARD_ID, getCards, addComment, moveCard, getOrCreateResolvedList, downloadAttachment, TrelloCard } from './trello_sync';

async function main() {
  const cardId = process.argv[2];
  if (!cardId) {
    const cards = await getCards();
    console.log(`Total open cards: ${cards.length}`);
    for (const c of cards) {
      console.log(`[${c.id}] [${c.listName}] ${c.name} - ${c.desc ? c.desc.slice(0, 80) : ''}... (Att: ${c.attachments?.length || 0})`);
    }
    return;
  }

  const res = await fetch(`https://api.trello.com/1/cards/${cardId}?attachments=true&key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`);
  const card: TrelloCard = await res.json();
  console.log(`\n=== Card: ${card.name} (${card.id}) in [${card.listName || card.idList}] ===`);
  console.log(`Description:\n${card.desc}\n`);

  if (card.attachments && card.attachments.length > 0) {
    const dir = path.join(process.cwd(), 'trello_downloads', card.id);
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Downloading ${card.attachments.length} attachment(s) to ${dir}...`);
    for (let i = 0; i < card.attachments.length; i++) {
      const att = card.attachments[i];
      const ext = path.extname(att.name) || '.png';
      const dest = path.join(dir, `attachment_${i + 1}${ext}`);
      try {
        await downloadAttachment(att.url, dest);
        console.log(` - Saved attachment ${i + 1}: ${dest}`);
      } catch (err: any) {
        console.warn(` - Failed to download ${att.name}:`, err.message);
      }
    }
  }
}

main().catch(console.error);
