import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  const BAD = ['xqwwpy', 'xoqwpt', 'ysxwuq', 'unsplash', 'picsum'];

  const all = await col.find({}, { projection: { title: 1, imageUrl: 1 } }).toArray();

  const bad = all.filter(r => {
    const url = (r.imageUrl || '') as string;
    return !url || BAD.some(f => url.includes(f));
  });

  console.log(`Total recipes: ${all.length}`);
  console.log(`Still bad/missing: ${bad.length}`);
  bad.slice(0, 20).forEach(r => console.log(`  "${r.title}" → "${r.imageUrl}"`));

  await client.close();
}
main().catch(console.error);
