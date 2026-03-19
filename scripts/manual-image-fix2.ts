import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const FIXES: Record<string, string> = {
  'Keleya Zaara': 'https://snapcalorie-webflow-website.s3.us-east-2.amazonaws.com/media/recipe_pics_v2/medium/tunisian_lamb_with_saffron_keleya_zaara.jpg',
  'Mustard champ': 'https://www.allrecipes.com/thmb/rB81ilgowRhBb_NKsJTchDrfanE=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/100295irish-champGroceryAddict4x3-e7e6beefaf6841708dba138039f928e5.jpg',
  'Boulangère Potatoes': 'https://ichef.bbci.co.uk/food/ic/food_16x9_1600/recipes/boulangre_potatoes_44898_16x9.jpg',
  'Cacik': 'https://urbanfarmandkitchen.com/wp-content/uploads/2024/02/turkish-cacik-7.jpg',
  'Ezme': 'https://vidarbergum.com/wp-content/uploads/2021/06/ezme-salad-turkish-1.jpg',
  'Breakfast of savory spears': 'https://images.food52.com/Nz4dnhOzBe93RVincpKIVIPfs2k=/ba408aa7-f5f0-410a-bbfb-8aae1395b043--Screen_Shot_2014-01-04_at_1.01.13_PM.png',
  'Jiggs Dinner': 'https://aem.sobeys.com/adobe/dynamicmedia/deliver/dm-aid--a11b37dc-a749-4c77-8e0b-6b78b86d262d/recipe-jiggs-dinner.jpg',
  'Paszteciki': 'https://i.pinimg.com/736x/14/26/76/14267677d0da61444f2bcb23d795ad81.jpg',
  'Bryndzové Halušky': 'https://tarasmulticulturaltable.com/wp-content/uploads/2016/10/Bryndzove-Halusky-Slovak-Potato-Dumplings-with-Cheese-3-of-4.jpg',
  'Mandazi': 'https://www.jocooks.com/wp-content/uploads/2012/09/mandazi-1-20.jpg',
  'BT Pasta': 'https://i.ytimg.com/vi/irC0tkR9jwA/sddefault.jpg',
  'Noodles nest': 'https://images.squarespace-cdn.com/content/v1/60982df9899ff80ac258be5e/1633120086945-N4J872JBI57H3GGXY2E0/1181639D-9399-4BEB-93FD-485C18DA4000+%281%29.jpg',
  'Pake Noodles': 'https://www.saveur.com/uploads/2019/03/18/WS2W5VRQPIU26MZMTBUAFNU7ZE.jpg',
  'Stinger Stir Fry': 'https://www.allrecipes.com/thmb/GgENuoetjaOi7tcoRTEtcSDIjTw=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/M7014953_JD_11856-4x3-1-0d0cefed5bea4c4ba04bee3ff63c439a.jpg',
  'Carbonada Criolla': 'https://www.thespruceeats.com/thmb/tHJRD-Ak_1JvNkA8slmxJzUee34=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/argentinian-beef-stew-carbonada-criolla-3029526-hero-02-9e37e9622aa845748fc0d8839d679112.jpg',
  'Jacques Pépin': 'https://www.foodandwine.com/thmb/sbzxVFU9vCkQvGZ7sZScp33n65I=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/HD-200809-r-chick-mustard-garlic-12822745eea24cd4b2eb92a16777aaad.jpg',
  'Parmesan Chicken Tenders': 'https://www.mantitlement.com/wp-content/uploads/2020/08/easy-parmesan-chicken-tenderloins-sheet-pan.jpg',
  'Keto Everything Bagel Chicken': 'https://hips.hearstapps.com/hmg-prod/images/delish-everything-bagel-keto-chicken-still002-1580409451.jpg',
  'Zuni': 'https://saltandwind.com/wp-content/uploads/2022/05/zuni-roast-chicken-salad-recipe_h1-2-scaled.jpg',
  'Chicken Marengo': 'https://static01.nyt.com/images/2018/03/17/dining/17COOKING-CHICKEN2/19COOKING-CHICKEN2-videoSixteenByNineJumbo1600.jpg',
  'Rosol': 'https://www.everydayhealthyrecipes.com/wp-content/uploads/2016/05/polish-chicken-noodle-soup-rosol.jpg',
  'Lamb Pilaf': 'https://shepherdsongfarm.com/wp-content/uploads/2019/09/Lamb-Plov-23.jpg',
  "Lamb's Head": 'https://goatsandgreens.wordpress.com/wp-content/uploads/2020/04/lamb-head-serviing-platter.jpg',
  'Bistecca': 'https://www.billyparisi.com/wp-content/uploads/2018/12/bistecca-12.jpg',
  'Steak Bites': 'https://grillonadime.com/wp-content/uploads/2023/04/blackstone-garlic-butter-steak-bites-7-2.jpg',
  'Montreal Smoked Meat': 'https://www.seriouseats.com/thmb/B0ds7Bxkb0eaB-nYjohFhNmF42A=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20240301-SEA-MontrealSmokedMeat-VyTran-hero-033f7f3419264171a5f8beb75b5e1fd0.jpg',
  'Lancashire hotpot': 'https://www.kitchensanctuary.com/wp-content/uploads/2015/01/Lancashire-hotpot-on-wooden-background-square-FS.jpg',
  'Scotch pie': 'https://scottishscran.com/wp-content/uploads/2020/06/Scotch-Pies-Recipe-122.jpg',
  'Classic Tourtière': 'https://en-chatelaine.mblycdn.com/uploads/ench/2017/10/classic-holiday-tourtiere.jpg',
  'Choripán': 'https://www.foodandwine.com/thmb/TvpVnxylywPCrqaQHQiJgi-7FgM=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Choripan-Argentinean-Chorizo-Sandwich-FT-MAG-RECIPE-1025-f6e6270688164ade80c5f72db504dbfd.jpg',
  'Roti john': 'https://www.seriouseats.com/thmb/3lYcIwqOzpIS6ihZrRlZ6BFuGm0=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20231204-SEA-RotiJohn-MichelleYip-hero-cf4be14c45294da9a4469910448aadba.jpg',
  'Chivito': 'https://www.curiouscuisiniere.com/wp-content/uploads/2018/07/Chivito-Sandwich-Uruguayan-Steak-and-Egg-Sandwich-6398.1-2.jpg',
  'Cambridge Market Sandwich': 'https://images.squarespace-cdn.com/content/v1/63a3887f90ba2e00d181b6ed/79dc2719-fa2b-49be-be51-67f3d0eae6ff/IMG_4663.png',
  'Algerian Bouzgene': 'https://www.thefooddictator.com/wp-content/uploads/2019/12/Amazigh-1024x576.jpg',
  'Fainá': 'https://delishglobe.com/wp-content/uploads/2024/12/Faina-Chickpea-Flatbread.png',
  'Šúĺlance': 'https://www.slovakia-foods.co.uk/media/wysiwyg/_lance_s_Makom_1.jpg',
  'Tuna and Egg Briks': 'https://zwitafoods.com/cdn/shop/articles/Brik_4_1200x.png',
  'Chipotle celeriac tacos': 'https://images.immediate.co.uk/production/volatile/sites/30/2021/08/Celeriac-Tacos-591180c.jpg',
  'Cauliflower Tacos': 'https://www.eatingwell.com/thmb/T_M0m0S0KOj6x7TZRp_VSRQH1ak=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/easy-cauliflower-tacos-2000-84235777ec3742ee8eee5aec87d25c52.jpg',
  'Vegetarian deep-dish pizza': 'https://elavegan.com/wp-content/uploads/2018/08/Vegan-deep-dish-pizza-with-vegan-cheese.jpg',
  'Vegetarian pastitsio': 'https://cdn77-s3.lazycatkitchen.com/wp-content/uploads/2021/04/vegan-pastitsio-slice-800x1200.jpg',
  'Green with Envy Superfood': 'https://onebalancedlife.com/wp-content/uploads/2022/06/Superfood-Salad-Bowls-scaled.jpg',
  'Mushroom & Chestnut Rotolo': 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/wild-mushroom-chestnut-rotolo-with-crispy-sage-leaves-c2173f6.jpg',
  'Spanish fig & almond balls': 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/recipe-image-legacy-id-14450_11-39bea9c.jpg',
  'Rømmegrøt': 'https://northwildkitchen.com/wp-content/uploads/2016/09/P1010377.jpg',
  'Yemeni Lahsa': 'https://www.themealdb.com/images/media/meals/30s7vf1763741844.jpg',
  'Red Beans and Rice': 'https://www.budgetbytes.com/wp-content/uploads/2020/02/Louisiana-Red-Beans-and-Rice-Fork-500x500.jpg',
  'Dulce de Leche': 'https://bakingamoment.com/wp-content/uploads/2019/04/IMG_4249-dulce-de-leche-recipe-500x375.jpg',
  '3-in-1 Soup': 'https://greenkitchenstories.com/wp-content/uploads/2018/03/One_soup_three_ways_1.jpg',
  'Keto Tuna Melt': 'https://thehonoursystem.com/wp-content/uploads/2025/03/low-carb-tuna-melt-egg-muffins-recipe-vertical.jpg',
  'Grilled BLT Pizza': 'https://followyourheart.com/wp-content/uploads/elementor/thumbs/BLTPizza_Site6-qal2e8y0msn6j68irwf2zjaf3gjnngy7cssgz6cvow.jpg',
  'Mile End': 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800',
  'General Tsos Chicken': 'https://www.recipetineats.com/tachyon/2020/10/General-Tsao-Chicken_1-SQ.jpg',
  'Padron peppers': 'https://www.recipetineats.com/tachyon/2020/07/Padron-Peppers_3.jpg',
};

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  let fixed = 0;
  let notFound = 0;

  for (const [title, imageUrl] of Object.entries(FIXES)) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const result = await col.updateMany(
      { title: { $regex: new RegExp(escaped, 'i') } },
      { $set: { imageUrl } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ "${title}" → ${result.modifiedCount} updated`);
      fixed++;
    } else {
      console.log(`❌ NOT FOUND: "${title}"`);
      notFound++;
    }
  }

  console.log(`\nDone! Fixed: ${fixed}, Not found: ${notFound}`);
  await client.close();
}
main().catch(console.error);
