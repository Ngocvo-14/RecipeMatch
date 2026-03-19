import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  const pieRecipes = await col.find(
    { imageUrl: { $regex: /wrssvt1511556563|vvpprx1487325699/ } },
    { projection: { title: 1, imageUrl: 1 } }
  ).limit(10).toArray();

  console.log('Recipes using seafood fallback URLs:');
  pieRecipes.forEach(r => console.log(`  "${r.title}" -> ${r.imageUrl}`));

  const noImage = await col.countDocuments({
    $or: [{ imageUrl: { $exists: false } }, { imageUrl: '' }, { imageUrl: null }]
  });
  console.log(`\nRecipes with no imageUrl: ${noImage}`);

  await client.close();
}
main().catch(console.error);
