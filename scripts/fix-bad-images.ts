import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'recipematch';

// These TheMealDB URLs are WRONG — they are pie/shepherd's pie/unrelated images
// that got assigned to wrong recipes during backfill
const BAD_URLS = [
  'xqwwpy1511793882',  // shepherd's pie — was assigned to salmon/seafood recipes
  'xoqwpt1511599260',  // broken salmon — returns 404
  'ysxwuq1487323065',  // broken fish — returns 404
];

// Correct image URLs by title keyword
function getCorrectImage(title: string): string {
  const t = title.toLowerCase();

  if (t.includes('salmon')) return 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg';
  if (t.includes('tuna')) return 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg';
  if (t.includes('shrimp') || t.includes('prawn')) return 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg';
  if (t.includes('seafood') || t.includes('lobster') || t.includes('crab') || t.includes('scallop')) return 'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg';
  if (t.includes('fish') || t.includes('cod') || t.includes('tilapia') || t.includes('halibut') || t.includes('trout') || t.includes('haddock') || t.includes('bass')) return 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg';
  if (t.includes('paella')) return 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg';
  if (t.includes('pasta') || t.includes('spaghetti') || t.includes('penne') || t.includes('linguine') || t.includes('fettuccine') || t.includes('rigatoni') || t.includes('cannelloni')) return 'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg';
  if (t.includes('noodle') || t.includes('ramen') || t.includes('udon') || t.includes('pho') || t.includes('miso')) return 'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg';
  if (t.includes('chicken')) return 'https://www.themealdb.com/images/media/meals/tywsqp1511459302.jpg';
  if (t.includes('beef') || t.includes('steak') || t.includes('burger')) return 'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg';
  if (t.includes('pork') || t.includes('bacon') || t.includes('sausage')) return 'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg';
  if (t.includes('lamb') || t.includes('mutton')) return 'https://www.themealdb.com/images/media/meals/yypvst1511119310.jpg';
  if (t.includes('soup') || t.includes('stew') || t.includes('chowder') || t.includes('broth') || t.includes('gumbo') || t.includes('bisque')) return 'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg';
  if (t.includes('salad')) return 'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg';
  if (t.includes('rice') || t.includes('biryani') || t.includes('pilaf') || t.includes('fried rice')) return 'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg';
  if (t.includes('egg') || t.includes('omelette') || t.includes('frittata')) return 'https://www.themealdb.com/images/media/meals/g9utws1487341590.jpg';
  if (t.includes('pizza')) return 'https://www.themealdb.com/images/media/meals/x0lk931587671540.jpg';
  if (t.includes('taco') || t.includes('burrito') || t.includes('enchilada')) return 'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg';
  if (t.includes('curry') || t.includes('korma') || t.includes('tikka') || t.includes('masala')) return 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg';
  if (t.includes('cake') || t.includes('brownie') || t.includes('dessert') || t.includes('cookie')) return 'https://www.themealdb.com/images/media/meals/joxuw61548772904.jpg';
  if (t.includes('sandwich') || t.includes('burger')) return 'https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg';
  if (t.includes('vegetable') || t.includes('veggie') || t.includes('vegan')) return 'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg';

  // Generic diverse pool based on hash
  const pool = [
    'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg',
    'https://www.themealdb.com/images/media/meals/tywsqp1511459302.jpg',
    'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg',
    'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg',
    'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg',
    'https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg',
    'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg',
    'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg',
  ];
  const hash = Math.abs(title.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0));
  return pool[hash % pool.length];
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection('recipes');

  // Find all recipes with any of the bad URLs
  const badFilter = {
    $or: BAD_URLS.map((id) => ({ image: { $regex: id } })),
  };

  const badRecipes = await col.find(badFilter).toArray();
  console.log(`Found ${badRecipes.length} recipes with bad/wrong images`);

  let fixed = 0;
  for (const recipe of badRecipes) {
    const title: string = recipe.title || recipe.name || '';
    const correctImage = getCorrectImage(title);

    await col.updateOne(
      { _id: recipe._id },
      { $set: { image: correctImage } },
    );
    fixed++;
    if (fixed % 100 === 0) console.log(`Fixed ${fixed}/${badRecipes.length}...`);
  }

  console.log(`✅ Fixed ${fixed} recipes with wrong/bad images`);

  // Show a sample to verify
  const sample = await col.find({ title: { $regex: /salmon/i } }).limit(3).toArray();
  console.log('\nSample salmon recipes now:');
  sample.forEach((r) => console.log(`  ${r.title}: ${r.image}`));

  await client.close();
}

main().catch(console.error);
