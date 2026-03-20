import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const FIXES: Record<string, string> = {
  'Super Healthy Vegan Hummus Wrap': 'https://foodsharingvegan.com/wp-content/uploads/2022/08/Vegan-Hummus-Wrap-Plant-Based-on-a-Budget-5.jpg',
  'Keto Chocolate Mousse': 'https://www.allrecipes.com/thmb/70je1k4k-e4PXWQM75EUchjToCw=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/270598-quick-keto-chocolate-mousse-FRANCEC-4x3-0ede43ded02b4e4d8d7a9f9e81970da5.jpg',
  'Avocado Toast': 'https://www.spendwithpennies.com/wp-content/uploads/2025/03/1200-Avocado-Toast-2-SpendWithPennies-1.jpg',
  'Avocado dip with new potatoes': 'https://pinchofyum.com/tachyon/Avocado-Dip-Feature-1.jpg',
  'Tortilla Soup': 'https://reciperunner.com/wp-content/uploads/2018/12/slow-cooker-chicken-tortilla-soup-6-scaled.jpg',
  'Keto Avocado Pops': 'https://www.ketofocus.com/wp-content/uploads/keto-avocado-popsicles-1.jpg',
  'Nachos': 'https://www.simplyrecipes.com/thmb/xTCx1mKCjjPYgGasys_JGafuem0=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2019__04__Nachos-LEAD-3-e6dd6cbb61474c9889e1524b3796601e.jpg',
  'Cajun spiced fish tacos': 'https://www.curiousnut.com/wp-content/uploads/2015/05/Cajun-Fish-Tacos-N.jpg',
  'Chickpea Fajitas': 'https://images.immediate.co.uk/production/volatile/sites/30/2024/04/Smoky-mushroom-and-chickpea-fajitas-8609b7e.jpg',
  'Nordic kale': 'https://www.mediterraneanliving.com/wp-content/uploads/2023/12/1-2-500x500.png',
  'Hearty Potato and Seafood Stew': 'https://www.lifeisbutadish.com/wp-content/uploads/2016/10/Seafood-Stew-3.jpg',
  'Hearty Seafood Gumbo': 'https://wonkywonderful.com/wp-content/uploads/2023/01/seafood-gumbo-recipe-12.jpg',
  'New England Seafood Chowder': 'https://www.smells-like-home.com/wp-content/uploads/2013/09/New-England-Seafood-Chowder-large-1.jpg',
  'Garlic Butter Shrimp': 'https://www.jocooks.com/wp-content/uploads/2021/09/garlic-butter-shrimp-1-10.jpg',
  "Dad's Favorite Seafood": 'https://images.food52.com/gtaTgWmDJ8xPQMfp_zWEI5-LBPI=/5df66b05-556e-4ab3-9372-ffe79a7f58b6--2023-1019_marketing_festively-farmhouse_hosting-and-entertaining_dads-favorite-seafood-stew_3x2_ty-mecham.jpg',
  'Seafood Cocktail': 'https://whiteonricecouple.com/recipe/images/shrimp-cocktail-550-1-1.jpg',
  'Smoky Seafood Fideos': 'https://images.food52.com/v2FQ88wueUSLeQzhFG9gcRj4QTc=/5348ed2a-ff9c-4722-9182-5561b12a180c--2014-0218_WC_smoky-seafood-fideos-006.jpg',
  'Shredded chicken': 'https://i2.wp.com/www.downshiftology.com/wp-content/uploads/2019/01/Shredded-Chicken-12.jpg',
  'Mushroom rice': 'https://www.recipetineats.com/tachyon/2018/05/Mushroom-Rice-Pilaf-4-SQ1.jpg',
  'Drunken Chicken': 'https://blog.themalamarket.com/wp-content/uploads/2022/09/drunken-chicken-blue-plate-2-bright.jpg',
  'Chick-Fil-A Sandwich': 'https://tastesbetterfromscratch.com/wp-content/uploads/2013/05/Chic-Fil-a-Sandwich-2-1.jpg',
  'Beef Tea': 'https://instantpot.com/cdn/shop/articles/dsc08190-scaled-1046x1104-c-default.jpg',
  'Lemon-pepper Beef': 'https://www.tacticalories.com/cdn/shop/articles/C9F08D93-430C-4989-8FE7-F8E4EB940CDD_1000x.jpg',
  'Grilled Pork Chops': 'https://static01.nyt.com/images/2023/06/07/multimedia/02GRILL-BASICSrex2-pork-chops-mvzf/07GRILL-BASICSrex2-pork-chops-mvzf-mediumSquareAt3X.jpg',
  'Crown Roast of Pork': 'https://keviniscooking.com/wp-content/uploads/2018/12/Glazed-Crown-Roast-of-Pork-square.jpg',
  'Pork Schnitzel': 'https://www.seriouseats.com/thmb/KdLyIIPsOYkJbWe2sVCcbVZ4K94=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/__opt__aboutcom__coeus__resources__content_migration__serious_eats__seriouseats.com__2018__10__20181002-pork-cutlet-slaw-beer-pairing-IPA-vicky-wasik-3-b2d88c1abcc14377aff39541801b36b9.jpg',
  'pork chops': 'https://sunkissedkitchen.com/wp-content/uploads/2023/08/pan-seared-pork-chops-2.jpg',
  'Grilled Pork Tenderloin': 'https://assets.epicurious.com/photos/54b274a3a801766f773f5986/1:1/w_2560%2Cc_limit/363970_pork-tenderloin_1x1.jpg',
  'Yogurt Eggs': 'https://www.themediterraneandish.com/wp-content/uploads/2021/08/Cilbir-Turkesh-Eggs-5.jpg',
  'Double Pork Sausage': 'https://www.foodrepublic.com/img/gallery/double-pork-sausage-recipe/intro-import.jpg',
  'Spaghetti alla Carbonara': 'https://www.insidetherustickitchen.com/wp-content/uploads/2020/03/Spaghetti-alla-Carbonara-square-Inside-the-Rustic-Kitchen.jpg',
  'Spaghetti Carbonara': 'https://www.insidetherustickitchen.com/wp-content/uploads/2020/03/Spaghetti-alla-Carbonara-square-Inside-the-Rustic-Kitchen.jpg',
  'Bryndzové Halušky': 'https://www.foodnetwork.com/content/dam/images/food/fullset/2021/11/05/rx_bryndzove-halusky_s4x3.jpg',
  'Beef and Oyster pie': 'https://ichef.bbci.co.uk/images/ic/832xn/p017qnx7.jpg',
  'Loaded Baked Potato': 'https://californiagrown.org/wp-content/uploads/2024/12/CAG-Loaded-Baked-Potato-17.jpg',
  'Clam chowder': 'https://assets.epicurious.com/photos/6487316ef0a537ecfb046b4c/1:1/w_4020,h_4020,c_limit/ClamChowder_RECIPE_060523_54702.jpg',
  'Arroz al horno': 'https://www.seriouseats.com/thmb/Ve6EO_skDDA5h55mgQ4Y2D22LrI=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20230307-SEA-Arroz-al-Horno-AmandaSuarez-hero-d4aff0c28e414e83941ad57080c2963e.JPG',
  'Eggplant Adobo': 'https://www.foodandwine.com/thmb/dcTffOXJw5k4gMUgMocZpCdALeA=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Eggplant-Adobo-FT-recipe0619-35629815a1984879949e1b59987ed579.jpg',
  'Picadillo Tacos': 'https://thaicaliente.com/wp-content/uploads/2023/03/Picadillo-Taco-Feature.jpg',
  'Fašírky': 'https://www.themealdb.com/images/media/meals/gtpvwp1763363947.jpg',
};

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  let fixed = 0;
  let notFound = 0;

  for (const [title, imageUrl] of Object.entries(FIXES)) {
    const result = await col.updateMany(
      { title: { $regex: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } },
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
