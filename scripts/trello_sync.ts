import fs from 'fs';
import path from 'path';

export const TRELLO_KEY = '332635cedba97f6661078366e8aadccb';
export const TRELLO_TOKEN = 'ATTAb58df4f07b966410d1ac8a141bf09ac85e1868fd6ea4090b68302f5d75548706C78FC636';
export const BOARD_ID = 'XtAYsn8D';

const AUTH = `key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;

export interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  pos: number;
}

export interface TrelloAttachment {
  id: string;
  name: string;
  url: string;
  bytes?: number;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList: string;
  listName?: string;
  url: string;
  attachments?: TrelloAttachment[];
}

export async function getLists(): Promise<TrelloList[]> {
  const res = await fetch(`https://api.trello.com/1/boards/${BOARD_ID}/lists?${AUTH}`);
  if (!res.ok) throw new Error(`getLists error: ${res.status} ${res.statusText}`);
  return await res.json();
}

export async function createList(name: string): Promise<TrelloList> {
  const res = await fetch(`https://api.trello.com/1/boards/${BOARD_ID}/lists?name=${encodeURIComponent(name)}&pos=bottom&${AUTH}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`createList error: ${res.status} ${res.statusText}`);
  return await res.json();
}

export async function getOrCreateResolvedList(): Promise<TrelloList> {
  const lists = await getLists();
  const existing = lists.find(l => l.name.toLowerCase().includes('resolved') || l.name.toLowerCase().includes('done'));
  if (existing) return existing;
  return await createList('✅ Resolved');
}

export async function getCards(): Promise<TrelloCard[]> {
  const lists = await getLists();
  const listMap = new Map(lists.map(l => [l.id, l.name]));
  const res = await fetch(`https://api.trello.com/1/boards/${BOARD_ID}/cards?attachments=true&${AUTH}`);
  if (!res.ok) throw new Error(`getCards error: ${res.status} ${res.statusText}`);
  const cards: TrelloCard[] = await res.json();
  return cards.map(c => ({
    ...c,
    listName: listMap.get(c.idList) || 'Unknown'
  }));
}

export async function addComment(cardId: string, text: string): Promise<any> {
  const res = await fetch(`https://api.trello.com/1/cards/${cardId}/actions/comments?text=${encodeURIComponent(text)}&${AUTH}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(`addComment error: ${res.status} ${res.statusText}`);
  return await res.json();
}

export async function moveCard(cardId: string, targetListId: string): Promise<any> {
  const res = await fetch(`https://api.trello.com/1/cards/${cardId}?idList=${targetListId}&${AUTH}`, {
    method: 'PUT'
  });
  if (!res.ok) throw new Error(`moveCard error: ${res.status} ${res.statusText}`);
  return await res.json();
}

export async function downloadAttachment(url: string, destPath: string): Promise<void> {
  const authUrl = url.includes('?') ? `${url}&${AUTH}` : `${url}?${AUTH}`;
  const res = await fetch(authUrl, {
    headers: {
      'Authorization': `OAuth oauth_consumer_key="${TRELLO_KEY}", oauth_token="${TRELLO_TOKEN}"`
    }
  });
  if (!res.ok) throw new Error(`downloadAttachment error: ${res.status} ${res.statusText}`);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
}

// When run directly, display status
if (process.argv[1]?.endsWith('trello_sync.ts')) {
  (async () => {
    console.log('--- Connecting to Trello Board ---');
    const lists = await getLists();
    console.log('Lists on board:');
    for (const l of lists) {
      console.log(` - ${l.name} (id: ${l.id})`);
    }

    const cards = await getCards();
    console.log(`\nFound ${cards.length} cards across lists:`);
    for (const c of cards) {
      console.log(`\n[List: ${c.listName}] ID: ${c.id}`);
      console.log(`Title: ${c.name}`);
      console.log(`Description: ${c.desc ? c.desc.slice(0, 150) + '...' : '(None)'}`);
      console.log(`Attachments: ${c.attachments?.length || 0}`);
    }
  })().catch(console.error);
}
