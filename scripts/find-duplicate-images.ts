import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  const urlCounts = await col.aggregate([
    { $group: { _id: '$imageUrl', count: { $sum: 1 }, titles: { $push: '$title' } } },
    { $match: { count: { $gt: 3 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  console.log(`URLs shared by more than 3 recipes:\n`);
  urlCounts.forEach(u => {
    const photoId = (u._id as string)?.match(/photo-[\w]+/)?.[0] || u._id;
    console.log(`${u.count}x → ${photoId}`);
    console.log(`  Sample: ${(u.titles as string[]).slice(0,3).join(', ')}\n`);
  });

  await client.close();
}
main().catch(console.error);
