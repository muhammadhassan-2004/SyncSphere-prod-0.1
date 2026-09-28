import { getCards } from './trello_sync';

async function listAll() {
  const cards = await getCards();
  console.log(`TOTAL CARDS: ${cards.length}\n`);
  cards.forEach((c, idx) => {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`CARD #${idx + 1} | List: [${c.listName}] | ID: ${c.id}`);
    console.log(`Title: ${c.name}`);
    console.log(`Attachments: ${c.attachments?.length || 0}`);
    console.log(`Description:\n${c.desc || '(No description provided)'}\n`);
  });
}

listAll().catch(console.error);
