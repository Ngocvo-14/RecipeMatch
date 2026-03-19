import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  const bad = await col.find({
    imageUrl: { $regex: /xqwwpy|xoqwpt|ysxwuq/i }
  }, { projection: { title: 1, imageUrl: 1 } }).toArray();

  console.log(`Found ${bad.length} recipes with pie/bad image:`);
  bad.forEach(r => console.log(`  "${r.title}"`));

  if (bad.length > 0) {
    await col.updateMany(
      { imageUrl: { $regex: /xqwwpy|xoqwpt|ysxwuq/i } },
      { $unset: { imageUrl: '' } }
    );
    console.log(`✅ Cleared imageUrl for ${bad.length} recipes`);
  }

  await client.close();
}
main().catch(console.error);
