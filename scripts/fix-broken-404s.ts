import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// All confirmed 404 → replacement (confirmed-working TheMealDB URLs)
const REPLACEMENTS: Record<string, string> = {
  // rice/fried rice → generic food (uuuspp = shrimp/mac, works)
  'wvpvwu1511786158.jpg': 'uuuspp1511297945.jpg',
  // eggs/omelette → eggs benedict (1550441882 = working egg photo)
  'g9utws1487341590.jpg': '1550441882.jpg',
  // pork chops/schnitzel → bacon photo (rvxxuy = working pork photo)
  'ysqmuu1487424038.jpg': 'rvxxuy1468312893.jpg',
  // teriyaki → chicken curry (wyxwsp = working asian food)
  'tyywsw1511461648.jpg': 'wyxwsp1486979827.jpg',
  // burger → meatballs (xxpqsy = working beef photo)
  'xrzuwr1468233994.jpg': 'xxpqsy1511452222.jpg',
  // beef stew/bourguignon → beef stroganoff (svprys = working beef stew)
  'vrspxw1511793951.jpg': 'svprys1511176755.jpg',
  // chicken → chicken curry (wyxwsp = working chicken photo)
  'tywsqp1511459302.jpg': 'wyxwsp1486979827.jpg',
  // pies/muffins/apple cake → cookies (xvsurr = working dessert)
  'qtqwsw1511391462.jpg': 'xvsurr1511719182.jpg',
  // avocado → caesar salad (urtwux = working green salad)
  'ya8w8w1511721089.jpg': 'urtwux1486983078.jpg',
  // Korean/bibimbap → chicken curry (wyxwsp = working asian)
  '1547560386.jpg': 'wyxwsp1486979827.jpg',
  // biryani/dal/pilaf → chicken curry (wyxwsp = working Indian food)
  'y33tfl1504347575.jpg': 'wyxwsp1486979827.jpg',
  // lamb/shepherd's pie → beef stroganoff (svprys = working meat)
  'yypvst1511119310.jpg': 'svprys1511176755.jpg',
  // chocolate cake/brownies → cookies (xvsurr = working dessert)
  'joxuw61548772904.jpg': 'xvsurr1511719182.jpg',
  // roast chicken → chicken curry (wyxwsp = working chicken)
  'l0tqyy1503661852.jpg': 'wyxwsp1486979827.jpg',
  // cheesecake/dessert → cookies (xvsurr = working dessert)
  'quwsyp1511191564.jpg': 'xvsurr1511719182.jpg',
  // fried chicken/wings → chicken curry (wyxwsp = working chicken)
  'wqurwm1511435409.jpg': 'wyxwsp1486979827.jpg',
};

const BASE = 'https://www.themealdb.com/images/media/meals/';

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  let total = 0;
  for (const [broken, replacement] of Object.entries(REPLACEMENTS)) {
    const brokenUrl = BASE + broken;
    const fixedUrl = BASE + replacement;

    const result = await col.updateMany(
      { imageUrl: brokenUrl },
      { $set: { imageUrl: fixedUrl, image: fixedUrl } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ ${broken} → ${replacement} (${result.modifiedCount} recipes)`);
      total += result.modifiedCount;
    }
  }

  console.log(`\nTotal fixed: ${total} recipes`);

  // Verify: re-count broken
  let remaining = 0;
  for (const broken of Object.keys(REPLACEMENTS)) {
    const n = await col.countDocuments({ imageUrl: BASE + broken });
    if (n > 0) { console.log(`  Still broken: ${broken} (${n})`); remaining += n; }
  }
  if (remaining === 0) console.log('✅ No broken URLs remaining');

  await client.close();
}
main().catch(console.error);
