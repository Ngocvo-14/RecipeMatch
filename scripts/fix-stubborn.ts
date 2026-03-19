import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Good Unsplash food images (confirmed working)
const FOOD_POOL = [
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800', // pancakes
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3b28?w=800', // food spread
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', // food plate
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800', // colorful food
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', // pizza
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', // burger
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', // salad
  'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800', // pasta
  'https://images.unsplash.com/photo-1547592180-85f173990554?w=800', // soup
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800', // eggs
];

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  const stubborn = await col.find(
    { imageUrl: { $regex: 'themealdb.com' } },
    { projection: { _id: 1, title: 1 } }
  ).toArray();

  console.log(`Fixing ${stubborn.length} stubborn recipes...`);

  const ops = stubborn.map(r => {
    const h = Math.abs((r.title as string).split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i+1), 0));
    return {
      updateOne: {
        filter: { _id: r._id },
        update: { $set: { imageUrl: FOOD_POOL[h % FOOD_POOL.length] } }
      }
    };
  });

  await col.bulkWrite(ops as any);
  console.log(`✅ Fixed ${stubborn.length} recipes with generic food images`);
  await client.close();
}
main().catch(console.error);
