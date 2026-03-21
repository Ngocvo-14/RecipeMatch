import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

// Corrected titles matching exact DB values
const updates = [
  ['Beef and Oyster pie', 'https://www.bbcgoodfood.com/sites/default/files/styles/recipe/public/recipe/recipe-image/2013/05/steak-oyster-pie.jpg'],
  ['Beetroot Soup (Borscht)', 'https://www.bowlofdelicious.com/wp-content/uploads/2023/02/Beet-Soup-square-500x500.jpg'],
  ['Bubble & Squeak', 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/recipe-image-legacy-id-73241_11-0acd4ad.jpg'],
  ['Buffalo Wings', 'https://www.allrecipes.com/thmb/0rqSwGTnSQ_IiSBpjzxbr4Bn-Rs=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/26900-the-best-buffalo-wings-DDMFS-4x3-7e1ef39d78734a84bba10c5f04f42b68.jpg'],
  ['Chicken Shawarma with homemade garlic herb yoghurt sauce', 'https://www.recipetineats.com/tachyon/2016/09/Chicken-Shawarma_5.jpg'],
  ['Beef Bourguignon', 'https://static01.nyt.com/images/2023/08/24/multimedia/MC-Beef-Bourguignon-lpbv-te/MC-Beef-Bourguignon-lpbv-mediumSquareAt3X-v4.jpg'],
];

await client.connect();
const db = client.db(process.env.MONGODB_DB || 'recipematch');
let updated = 0;
for (const [title, imageUrl] of updates) {
  const result = await db.collection('recipes').updateOne(
    { title },
    { $set: { imageUrl } }
  );
  if (result.modifiedCount > 0) { updated++; console.log('✓', title); }
  else console.log('✗ not found:', title);
}
console.log(`\nDone! Updated: ${updated} / ${updates.length}`);
await client.close();
