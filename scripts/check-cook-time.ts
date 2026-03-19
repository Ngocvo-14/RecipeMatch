import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  const nullTime = await col.find({
    $or: [{ cookTime: null }, { cookTime: '' }, { cookTime: { $exists: false } }]
  }, { projection: { title: 1, cookTime: 1, prepTime: 1, totalTime: 1 } }).limit(5).toArray();

  console.log('Recipes with null/missing cookTime:');
  nullTime.forEach(r => console.log(JSON.stringify(r)));

  const total = await col.countDocuments({ $or: [{ cookTime: null }, { cookTime: '' }, { cookTime: { $exists: false } }] });
  console.log(`Total with missing cookTime: ${total}`);
  await client.close();
}
main().catch(console.error);
