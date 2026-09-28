import { getCards } from './trello_sync';

async function main() {
  const cards = await getCards();
  const openCards = cards.filter(c => !c.listName?.includes('Resolved'));
  console.log(`\n=== REMAINING OPEN CARDS (${openCards.length}) ===\n`);
  openCards.forEach((c, idx) => {
    console.log(`[#${idx + 1}] List: [${c.listName}] | ID: ${c.id}`);
    console.log(`Title: ${c.name}`);
    console.log(`Attachments: ${c.attachments?.length || 0}`);
    console.log(`Description: ${c.desc}\n-----------------------------------------`);
  });
}

main().catch(console.error);
