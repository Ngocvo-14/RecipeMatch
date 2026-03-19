import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  const missing = await col.find({
    $or: [{ imageUrl: { $exists: false } }, { imageUrl: '' }, { imageUrl: null }]
  }, { projection: { _id: 1, title: 1 } }).toArray();

  console.log(`Recipes with no imageUrl: ${missing.length}`);
  missing.slice(0, 10).forEach(r => console.log(`  "${r.title}"`));

  await client.close();
}
main().catch(console.error);
