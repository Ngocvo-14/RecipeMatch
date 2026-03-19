import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');
  const all = await col.find({}, { projection: { imageUrl: 1 } }).toArray();
  const fallbacks = all.filter(r => String(r.imageUrl || '').includes('themealdb.com'));
  const other = all.length - fallbacks.length;
  console.log(`Total recipes    : ${all.length}`);
  console.log(`TheMealDB images : ${fallbacks.length}`);
  console.log(`Other images     : ${other}`);
  console.log(`Hours @ 50/hr    : ${Math.ceil(fallbacks.length / 50)}`);
  await client.close();
}
main().catch(console.error);
