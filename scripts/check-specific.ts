import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  const titles = ['Seafood Paella', 'Hearty Seafood Gumbo', 'Seafood Miso Noodle Soup'];
  for (const title of titles) {
    const r = await col.findOne({ title: { $regex: new RegExp(title, 'i') } });
    console.log(`"${title}": imageUrl="${r?.imageUrl}" | image="${(r as any)?.image}"`);
  }
  await client.close();
}
main().catch(console.error);
