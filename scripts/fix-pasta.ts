import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const FIXES: Record<string, string> = {
  'Pake Noodles': 'https://www.saveur.com/uploads/2019/03/18/WS2W5VRQPIU26MZMTBUAFNU7ZE.jpg',
  'Smashed Tomato Pasta': 'https://images.ctfassets.net/bq61jovlhx8i/4gmkMEw7n5EmgYlMOZiE76/306b53eba9ab2045643202f6d00aa1fa/RECIPE_SmashedTomatoPasta_600x800.jpg',
  'Storecupboard pasta salad': 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/recipe-image-legacy-id-663451_11-43ad8a6.jpg',
  'Pesto Pasta': 'https://cdn.loveandlemons.com/wp-content/uploads/2025/07/pesto-pasta.jpg',
  'Pappardelle with beef': 'https://winniesbalance.com/wp-content/uploads/2022/06/Balsamic-beef-pappardelle-pasta-basil-portabello-simple-quick.jpg',
  'Eggplant Rollitini Pasta': 'https://www.ninosalvaggio.com/wp-content/uploads/2021/02/Eggplant-Rollatini.jpg',
  'Peanut Butter Noodles': 'https://eatwithclarity.com/wp-content/uploads/2023/06/peanut-butter-noodles-5.jpg',
};

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  for (const [title, imageUrl] of Object.entries(FIXES)) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const result = await col.updateMany(
      { title: { $regex: new RegExp(escaped, 'i') } },
      { $set: { imageUrl } }
    );
    console.log(`${result.modifiedCount > 0 ? '✅' : '❌'} "${title}" → ${result.modifiedCount} updated`);
  }
  await client.close();
}
main().catch(console.error);
