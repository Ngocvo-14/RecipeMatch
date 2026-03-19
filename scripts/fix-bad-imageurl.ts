import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const BAD = ['xqwwpy', 'unsplash', 'picsum', 'loremflickr', 'placeholder'];

const MAP: Array<[string, string]> = [
  ['shrimp pepperoncini', 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['shrimp & pepperoncini', 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['shrimp fried rice', 'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg'],
  ['shrimp', 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['salmon', 'https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg'],
  ['rice', 'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg'],
  ['pasta', 'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg'],
  ['chicken', 'https://www.themealdb.com/images/media/meals/tywsqp1511459302.jpg'],
  ['beef', 'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'],
  ['pork', 'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],
  ['taco', 'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'],
  ['soup', 'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['salad', 'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg'],
];

const POOL = [
  'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg',
  'https://www.themealdb.com/images/media/meals/tywsqp1511459302.jpg',
  'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg',
  'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg',
  'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg',
  'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg',
  'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg',
  'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg',
];

function hash(s: string) {
  return Math.abs(s.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0));
}

function getImg(title: string) {
  const t = title.toLowerCase();
  let best: { url: string; len: number } | null = null;
  for (const [kw, url] of MAP) {
    if (t.includes(kw) && (!best || kw.length > best.len)) best = { url, len: kw.length };
  }
  return best?.url || POOL[hash(title) % POOL.length];
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  const all = await col.find({}).project({ _id: 1, title: 1, name: 1, imageUrl: 1 }).toArray();
  const toFix = all.filter((r) => {
    const u = r.imageUrl || '';
    return !u || !u.startsWith('http') || BAD.some((b) => u.includes(b));
  });
  console.log(`Recipes needing imageUrl fix: ${toFix.length}`);

  let fixed = 0;
  for (const r of toFix) {
    const title = r.title || r.name || '';
    await col.updateOne({ _id: r._id }, { $set: { imageUrl: getImg(title) } });
    fixed++;
  }
  console.log(`Fixed: ${fixed}`);

  const checks = ['salmon', 'shrimp', 'pepperoncini', 'rice'];
  for (const kw of checks) {
    const r = await col.findOne({ title: { $regex: new RegExp(kw, 'i') } });
    if (r) console.log(`${kw}: "${r.title}" -> ${(r.imageUrl || '').split('/').pop()}`);
  }

  await client.close();
}

main().catch(console.error);
