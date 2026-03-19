import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const r = await db.collection('recipes').findOne({ title: { $regex: /shrimp.*pepperoncini/i } });
  console.log(JSON.stringify({ title: r?.title, imageUrl: (r as any)?.imageUrl, image: (r as any)?.image, sourceId: (r as any)?.sourceId }, null, 2));
  await client.close();
}
main().catch(console.error);
