import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const r = await db.collection('recipes').findOne({ title: { $regex: /spring onion and prawn/i } });
  console.log('Title   :', r?.title);
  console.log('imageUrl:', r?.imageUrl);
  await client.close();
}
main().catch(console.error);
