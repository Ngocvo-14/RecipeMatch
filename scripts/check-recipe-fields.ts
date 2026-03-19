import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  // Get a sample of 5 recipes to see ALL fields
  const samples = await col.find({}).limit(5).toArray();
  samples.forEach(r => {
    console.log('\n---');
    console.log(JSON.stringify(r, null, 2));
  });

  await client.close();
}
main().catch(console.error);
