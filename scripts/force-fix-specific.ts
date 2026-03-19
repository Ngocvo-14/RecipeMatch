import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const FIXES = [
  { title: 'Vietnamese Pho', url: 'https://www.recipetineats.com/tachyon/2019/04/Beef-Pho_6.jpg' },
  { title: 'Vietnamese caramel trout', url: 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/caramel-trout-85d8eef.jpg' },
  { title: 'Vietnamese Grilled Pork', url: 'https://tarasmulticulturaltable.com/wp-content/uploads/2015/01/Bun-Thit-Nuong-1-of-3-1024x680.jpg' },
  { title: 'Vietnamese lamb shanks', url: 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/recipe-image-legacy-id-1079567_11-b575fc1.jpg' },
  { title: 'Vietnamese-style veggie hotpot', url: 'https://thevietvegan.com/wp-content/uploads/2020/03/vietnamese-hot-pot-horizontal-728x486.jpg' },
  { title: 'Steak & Vietnamese noodle salad', url: 'https://static01.nyt.com/images/2014/10/15/dining/15KITCHEN/15KITCHEN-superJumbo.jpg' },
  { title: 'Beef pho', url: 'https://www.recipetineats.com/tachyon/2019/04/Beef-Pho_6.jpg' },
  { title: 'Barbecue pork buns', url: 'https://silkroadrecipes.com/wp-content/uploads/2020/08/Chinese-BBQ-Pork-Buns-Char-Siu-Bao-square2.jpg' },
  { title: 'Vegan banh mi', url: 'https://cdn.loveandlemons.com/wp-content/uploads/2019/02/banh-mi.jpg' },
  { title: 'Noodle bowl salad', url: 'https://www.afarmgirlsdabbles.com/wp-content/uploads/2019/02/AFarmgirlsDabbles_AFD-1.jpg' },
  { title: 'Prawn & noodle salad', url: 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/recipe-image-legacy-id-703453_11-06f7d42.jpg' },
  { title: 'Rice paper dumplings', url: 'https://www.cookingcarnival.com/wp-content/uploads/2022/01/Rice-Paper-Dumplings-5.jpg' },
  { title: 'Salmon noodle soup', url: 'https://delightfulplate.com/wp-content/uploads/2019/05/30-minute-Salmon-Noodle-Soup-2.jpg' },
  { title: 'Salmon noodle wraps', url: 'https://www.happyfoodstube.com/wp-content/uploads/2020/03/smoked-salmon-summer-rolls-image.jpg' },
  { title: 'Salt & pepper squid', url: 'https://www.recipetineats.com/tachyon/2024/02/Salt-and-pepper-squid-in-a-bowl.jpg' },
  { title: 'Sea bass with sizzled ginger', url: 'https://westillcook.wordpress.com/wp-content/uploads/2012/06/image.jpg' },
  { title: 'Tangy carrot, cabbage & onion salad', url: 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/recipe-image-legacy-id-54200_11-c52a217.jpg' },
  { title: 'Tofu, greens & cashew stir-fry', url: 'https://gimmesomeoven.com/wp-content/uploads/2020/01/Vegan-Tofu-Cashew-Stir-Fry-Recipe-5.jpg' },
  { title: 'Turkish lahmacun', url: 'https://www.carolinescooking.com/wp-content/uploads/2024/03/lahmacun-Turkish-pizza-featured-pic-sq.jpg' },
  { title: 'Korean Bibimbap', url: 'https://www.recipetineats.com/tachyon/2019/05/Bibimbap_3.jpg' },
  { title: 'Turkey', url: 'https://cdn.hstatic.net/files/200000700229/article/cach-lam-banh-mi-tho-nhi-ky-banh-mi-doner-kebab-thumb_a823dddec4124a909ce551fda82f4791.jpg' },
];

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  for (const fix of FIXES) {
    const escaped = fix.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const result = await col.updateMany(
      { title: { $regex: new RegExp(escaped, 'i') } },
      { $set: { imageUrl: fix.url } }
    );
    console.log(`${result.modifiedCount > 0 ? '✅' : '❌'} "${fix.title}" → ${result.modifiedCount} updated`);
  }

  await client.close();
}
main().catch(console.error);
