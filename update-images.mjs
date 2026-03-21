import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

const updates = [
  ['15 Bean Soup Crock Pot Recipe', 'https://dw9y5muw47j76.cloudfront.net/recipes/slow-cooker-15bs-website-4.jpg'],
  ['15-minute chicken & halloumi burgers', 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/15-minute-chicken-halloumi-burgers-ef95d1d.jpg'],
  ['Adana kebab', 'https://vidarbergum.com/wp-content/uploads/2024/05/adana-kebab-6.jpg'],
  ['Air Fryer Egg Rolls', 'https://www.simplyrecipes.com/thmb/mVoDu_LiV_iEQniNwDGfTY8yvWE=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2019__06__Air-Fryer-Egg-Rolls-5-b3b77c478f32428ba47bee2b545dfa8a.jpg'],
  ['Air fryer patatas bravas', 'https://www.thespruceeats.com/thmb/ZC4kHDWzpwuYA1E0We2Zg-HBhDY=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/SES-air-fryer-patatas-bravas-with-quick-romesco-sauce-recipe-8362703-hero-01-e00f9fe5a7cf4dce8b239439c45cf202.jpg'],
  ['Ajo blanco', 'https://www.seriouseats.com/thmb/iy0nteEXNbnrBF3XsFhZh27c9-0=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/__opt__aboutcom__coeus__resources__content_migration__serious_eats__seriouseats.com__recipes__images__2017__07__20170707-ajo-blanco-cold-soup-vicky-wasik-8-5f154dece1fd48f8816d561ad3087b90.jpg'],
  ['Alfajores', 'https://www.theflouredtable.com/wp-content/uploads/2022/06/Alfajores-de-Maicena-FP-1.jpg'],
  ['Algerian Carrots', 'https://www.allrecipes.com/thmb/_g20od5oyjWTSzbgdEEDcKbu50o=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/99244algerian-carrotslutzflcat4x2-501c5fb45a3b4ccaad72332e7450bee7.jpg'],
  ['Algerian Flafla (Bell Pepper Salad)', 'https://www.allrecipes.com/thmb/caxzBvbTZut-RBi3KxPkPJ9IkVw=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/1060381-8814cc040b9146b383c94f871175432c.jpg'],
  ['Algerian Kefta (Meatballs)', 'https://easychefpro.com/cdn/shop/files/easychef-pro-recipe-algerian-spiced-kefta-meatballs-in-tomato-herb-sauce-1173219923.jpg'],
  ['Antipasti Pizza', 'https://themovementmenu.com/wp-content/uploads/2020/02/Antipasti-Low-Carb-Pizza-4.jpg'],
  ['Apple & Blackberry Crumble', 'https://www.deliciousmagazine.co.uk/wp-content/uploads/2018/10/crumble.jpg'],
  ['Apple Frangipan Tart', 'https://www.abakingjourney.com/wp-content/uploads/2022/10/Apple-Frangipane-Tart-Feature.jpg'],
  ['Apple cake', 'https://www.bakedambrosia.com/wp-content/uploads/2023/10/French-Apple-Cake-Recipe-34.jpg'],
  ['Apricot & Turkish delight mess', 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/recipe-image-legacy-id-358492_11-18ff95b.jpg'],
  ['Are you looking for more quick, healthy lunch ideas?', 'https://cdn.loveandlemons.com/wp-content/uploads/opengraph/2018/01/lunch-ideas.jpg'],
  ['Arepa Pabellón', 'https://spicebreeze.com/wp-content/uploads/2023/02/Venezuelan-Arepas-con-Pabellon-500x500.png'],
  ['Arepa pelua', 'https://www.arepazone.com/cdn/shop/files/PeluaArepa1.jpg'],
  ['Arroz con gambas y calamar', 'https://images.immediate.co.uk/production/volatile/sites/30/2024/03/Arroz-con-gambas-y-calamar-946c734.jpg'],
  ['Asian Fried Noodles', 'https://playswellwithbutter.com/wp-content/uploads/2025/02/Vegetable-Stir-Fried-Noodles-20.jpg'],
  ['Aubergine & hummus grills', 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/recipe-image-legacy-id-6377_10-e43d21b.jpg'],
  ['Aubergine couscous salad', 'https://www.thissavoryvegan.com/wp-content/uploads/2021/04/roasted-eggplant-couscous-salad-4-500x375.jpg'],
  ['Aussie Burgers', 'https://www.carolinescooking.com/wp-content/uploads/2023/04/Aussie-burger-featured-pic-sq.jpg'],
  ['Authentic Norwegian Kransekake', 'https://scandinaviancookbook.com/wp-content/uploads/2023/10/DSC08272.jpg'],
  ['Avocado & chilli salad', 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/recipe-image-legacy-id-320536_12-1cb834f.jpg'],
  ['Ayam Percik', 'https://mayakitchenette.com/wp-content/uploads/2022/07/Delicious-Stovetop-Ayam-Percik-2-Copy.jpg'],
  ['BBQ Pork Sloppy Joes', 'https://images.food52.com/ZmAiyrPkSWbwF2zabYNXp5hQjXo=/41127bb8-bd5d-4537-a5c7-c6f206afd87f--porkyjoes.jpg'],
  ['BEAT Breakfast Sandwich', 'https://www.foodandwine.com/thmb/B7zho98HI-IhLryHvFA6Rue_J9o=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Breakfast-Sandwiches-FT-RECIPE0224-a18bdbdc16a54af481826c5bb471d1a1.jpg'],
  ['BLT Sandwich', 'https://www.budgetbytes.com/wp-content/uploads/2025/08/Classic-BLT-Front-Wide-Shot.jpg'],
  ['Baba Ghanoush', 'https://littleferrarokitchen.com/wp-content/uploads/2023/06/authentic-baba-ganoush-dip.jpg'],
  ['Baingan Bharta', 'https://www.indianhealthyrecipes.com/wp-content/uploads/2022/06/baingan-bharta.jpg'],
  ['Baked Chicken', 'https://www.sandravalvassori.com/wp-content/uploads/2023/03/Img1044.jpg'],
  ['Baked Eggs', 'https://www.thisfarmgirlcooks.com/wp-content/uploads/2019/02/overhead-oven-baked-eggs-scaled.jpg'],
  ['Baked salmon', 'https://www.wellplated.com/wp-content/uploads/2018/06/Baked-Salmon-in-Foil-at-400.jpg'],
  ['Baked salmon with fennel & tomatoes', 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/recipe-image-legacy-id-12437_12-c5eea81.jpg'],
  ['Bakewell tart', 'https://www.bunsenburnerbakery.com/wp-content/uploads/2018/06/bakewell-tart-square-33-735x735.jpg'],
  ['Baklava with spiced nuts, ricotta & chocolate', 'https://images.immediate.co.uk/production/volatile/sites/30/2021/12/Baklava-with-spiced-nuts-ricotta-and-chocolate-1e18010.jpg'],
  ['Banana Pancakes', 'https://www.allrecipes.com/thmb/6x0Lw9L4MEU8INHnK4tXGRV9XWI=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20334-banana-pancakes-i-DDMFS-4x3-9f291f03044247d48c9ec26917952402.jpg'],
  ['Barbacoa pulled-beef tacos', 'https://www.recipetineats.com/uploads/2021/03/Beef-Barbacoa_3.jpg'],
  ['Barbecued Beef Brisket', 'https://www.eazypeazymealz.com/wp-content/uploads/2021/01/oven-bbq-brisket-10.jpg'],
  ['Barbecued squid salad', 'https://www.anotherfoodblogger.com/wp-content/uploads/2021/01/DSC_4555.jpg'],
  ['Barramundi with Moroccan spices', 'https://fishinthefamily.com.au/wp-content/uploads/2022/07/Moroccan-spiced-barramundi-with-tomato-and-spinach-1.png'],
  ['Basic White Rice', 'https://static01.nyt.com/images/2025/02/18/multimedia/23EATrex-white-rice-clbj/23EATrex-white-rice-clbj-mediumSquareAt3X.jpg'],
  ['Bean & Sausage Hotpot', 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/recipe-image-legacy-id-196484_11-8950e7e.jpg'],
  ['Bean and Rice Bowl', 'https://plantbasedrdblog.com/wp-content/uploads/2023/07/black-bean-rice-bowl_feat.jpg'],
  ['BeaverTails', 'https://images.squarespace-cdn.com/content/v1/5ea3b22556f3d073f3d9cae4/2250e869-414a-40f9-b449-b21bd4854e01/Screenshot+2024-02-18+at+2.42.41%E2%80%AFPM.jpg'],
  ['Beef Asado', 'https://www.redefinemeat.com/uk/wp-content/uploads/sites/4/2024/11/1000-667_0001_RT_Photoshoot_Pulled-Beef_Asado-with-Root-Vegetables_lo-2.png'],
  ['Beef Bourguignon', 'https://static01.nyt.com/images/2023/08/24/multimedia/MC-Beef-Bourguignon-lpbv-te/MC-Beef-Bourguignon-lpbv-mediumSquareAt3X-v4.jpg'],
  ['Beef Brisket', 'https://umamiology.com/wp-content/uploads/2024/09/Umamiology-48-Hour-Brisket-RecipeCard4.jpg'],
  ['Beef Brisket Pot Roast', 'https://www.foodandwine.com/thmb/_Npwq--9xaIGmBxwgVC5rQO-f5w=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Beef-Brisket-Pot-Roast-FT-RECIPE0823-c50696de62e94374b50d3516bed199e7.jpg'],
  ['Beef Caldereta', 'https://salu-salo.com/wp-content/uploads/2013/04/Beef-Kaldereta-3.jpg'],
  ['Beef Dumpling Stew', 'https://vikalinka.com/wp-content/uploads/2025/02/Beef-Stew-with-Dumplings-2.jpg'],
  ['Beef Empanadas', 'https://www.lecremedelacrumb.com/wp-content/uploads/2021/04/beef-empanadas-12sm-1.jpg'],
  ['Beef Kidneys', 'https://cdn11.bigcommerce.com/s-1ly92eod7l/images/stencil/1280x1280/products/556/1031/Product_Beef_Kidney__31252.1737080778.jpg'],
  ['Beef Lo Mein', 'https://images.getrecipekit.com/20221128184000-how-to-make-cantonese-beef-lomein-stir-fry-noodles-recipe.png'],
  ['Beef Mandi', 'https://www.a2zshoppy.com/uploads/media/2025/beefmandhi_a2z_shoppy.jpg'],
  ['Beef Mechado', 'https://lemonsandanchovies.com/wp-content/uploads/2018/04/Beef-Mechado-Filipino-Beef-Stew-3-683x1024.jpg'],
  ['Beef Rendang', 'https://www.recipetineats.com/tachyon/2014/11/Beef-Rendang-13.jpg'],
  ['Beef Ribs', 'https://assets.epicurious.com/photos/56f982ba14f5d14e734413df/1:1/w_2560%2Cc_limit/EP_0202016_3ingredient_short_ribs.jpg'],
  ['Beef Skewers', 'https://kitchenswagger.com/wp-content/uploads/2019/04/flank-steak-skewers-2-1.jpg'],
  ['Beef Stew', 'https://hips.hearstapps.com/hmg-prod/images/beef-stew-index-652e94c53b39b.jpg'],
  ['Beef Stir Fry', 'https://www.recipetineats.com/tachyon/2015/12/Chinese-Beef-Stir-Fry_8.jpg'],
  ['Beef Stock', 'https://www.thespruceeats.com/thmb/PRuL47vwZRnr4LzHI7SZ5-5u9OI=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/how-to-make-rich-beef-stock-3057617-hero_01-81b39fe943984ac78870620244be4c67.jpg'],
  ['Beef Sunday Roast', 'https://www.dartagnan.com/dw/image/v2/BJQL_PRD/on/demandware.static/-/Sites-dartagnan-Library/default/dwc9f7cf59/images/content/sunday-roast-beef-recipe.jpg'],
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
