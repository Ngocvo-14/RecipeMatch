import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const FIXES: Record<string, string> = {
  'Honey Teriyaki Salmon': 'https://natashaskitchen.com/wp-content/uploads/2016/01/Teriyaki-Salmon-Recipe-4.jpg',
  'Bang bang prawn salad': 'https://blessthismeal.com/wp-content/uploads/2022/10/bangbang4-1-scaled.jpg',
  'Escovitch Fish': 'https://thatgirlcookshealthy.com/wp-content/uploads/2019/04/escovitch-fish2-4.jpg',
  'Fish fofos': 'https://ik.imagekit.io/littlecook/public_images/recipes/fish-fofos.jpg',
  'Garides Saganaki': 'https://www.bowlofdelicious.com/wp-content/uploads/2020/07/Greek-Shrimp-with-Feta-and-Tomatoes-1.jpg',
  "Bluestem's Smoked Salmon Panna Cotta": 'https://overthefirecooking.com/wp-content/uploads/2021/10/F_IMG_8223-2-scaled.jpg',
  'Fish Soup (Ukha)': 'https://www.curiouscuisiniere.com/wp-content/uploads/2019/02/Russian-Fish-Soup-Ukha-4.450-450x375.jpg',
  'Cabbage Soup (Shchi)': 'https://www.thespruceeats.com/thmb/_Os6FSqjsJhEjMtSVVAu-m450Wk=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/traditional-russian-cabbage-soup-shchi-recipe-1135534-Hero_01-bd312ca096914402b392af18ad584790.jpg',
  'Corba': 'https://www.unicornsinthekitchen.com/wp-content/uploads/2019/09/Turkish-Red-Lentil-Soup-Recipe-SQ.jpg',
  'Tom kha gai': 'https://www.mashed.com/img/gallery/tom-kha-gai-thai-coconut-chicken-soup-recipe/l-intro-1680011894.jpg',
  'Bigos (Hunters Stew)': 'https://www.allrecipes.com/thmb/nXagvACPTRHY5rKnJljwLZToTrg=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/138131-bigos-hunters-stew-DDMFS-102-05bf4cb1a6d04fcd87045d6fc9828219.jpg',
  'Fårikål (Norwegian National Dish)': 'https://thedomesticman.com/wp-content/uploads/2017/05/img_12161.jpg',
  'Locro': 'https://www.notesfromamessykitchen.com/wp-content/uploads/2019/02/IMG_20190218_185957-1024x768.jpg',
  'Broccoli & Stilton soup': 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/recipe-image-legacy-id-889457_11-4468b81.jpg',
  'Cloud Eggs': 'https://www.simplyrecipes.com/thmb/MzL2RXJHAHUg90fsUKHjpHcvCtU=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/SimplyRecipes_CloudEggs_LEAD-10-5bf0b7b34bfe44eb82b76f093d00d1bb.jpg',
  'Moonstruck Eggs': 'https://ciaochowbambina.com/wp-content/uploads/2020/08/22Moonstruck22-Eggs-with-Fried-Italian-Long-Hot-Peppers-5-of-5-5-of-1.jpg',
  'Spiderweb Eggs': 'https://bellyfull.net/wp-content/uploads/2020/10/Halloween-Spiderweb-Eggs-blog-4.jpg',
  'Boxty Breakfast': 'https://donalskehan.com/wp-content/uploads/Boxty-Pancakes-2.jpg',
  'Egg Foo Young': 'https://www.smalltownwoman.com/wp-content/uploads/2024/07/Egg-Foo-Young-Preset-Facebook.jpg',
  'Breakfast Patty Melt recipes': 'https://www.jonesdairyfarm.com/wp-content/uploads/2023/08/Blended-Beef-and-Pork-Sausage-Patty-Melt.jpg',
  "BA's Best Breakfast Sandwich": 'https://dwgyu36up6iuz.cloudfront.net/heru80fdn/image/upload/c_fill,d_placeholder_bonappetit.png,fl_progressive,g_face,h_1080,q_80,w_1920/v1490047166/bonappetit_ba-s-best-breakfast-sandwich.jpg',
  'Tutu Pasta': 'https://www.vincenzosplate.com/wp-content/uploads/2024/04/1500x1500-Photo-12_3537-How-to-Make-Tuna-Pasta-V1.jpg',
  'Pasta with Dandelion Greens': 'https://lmld.org/wp-content/uploads/2015/10/penne-pasta-with-dandelion-greens-3.jpg',
  'Pad See Ew': 'https://hot-thai-kitchen.com/wp-content/uploads/2023/04/pad-see-ew-sq-cu.jpg',
  'Pasta-e-Fagioli Pasta': 'https://static01.nyt.com/images/2014/02/11/science/11recipehealth/11recipehealth-videoSixteenByNineJumbo1600-v2.jpg',
  'Wontons': 'https://www.thespruceeats.com/thmb/XiQRCJ_xLecR0X0cZkiDlogGZJA=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/pork-and-shrimp-wonton-4077052-hero-01-3215d83b87704242a85db72b4201ebc1.jpg',
  'Asado': 'https://spiceworldinc.com/wp-content/uploads/2023/11/Argentinian-Asado-Scaled.jpg',
  'Ratatouille': 'https://upload.wikimedia.org/wikipedia/commons/3/37/Ratatouille_home_cooked.jpg',
  'Matar Paneer': 'https://www.cubesnjuliennes.com/wp-content/uploads/2020/02/Matar-Paneer.jpg',
  'Dal fry': 'https://spicecravings.com/wp-content/uploads/2021/05/Dal-Tadka-Featured.jpg',
  'General Tsos Chicken': 'https://www.recipetineats.com/tachyon/2020/10/General-Tsao-Chicken_1-SQ.jpg',
  'Kedgeree': 'https://www.recipetineats.com/tachyon/2023/04/Kedgeree_3.jpg',
  'Flamiche': 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Tarte_Flamiche.jpg',
  'Koshari': 'https://amiraspantry.com/wp-content/uploads/2018/05/koshari-IG.png',
  'Kafteji': 'https://i.pinimg.com/736x/a0/bb/de/a0bbde8083fb71d2d8d896a2f494bbfa.jpg',
  'Ful Medames': 'https://www.washingtonpost.com/wp-apps/imrs.php?src=https://arc-anglerfish-washpost-prod-washpost.s3.amazonaws.com/public/MKIW7MTJRAI6ZE4Q5LRED5GIWE.jpg',
  'Migas': 'https://www.closetcooking.com/wp-content/uploads/2010/02/Migas-1200-3916.jpg',
  'Tortang Talong': 'https://panlasangpinoy.com/wp-content/uploads/2016/03/Eggplant-omelet-with-crab.jpg',
  'Burek': 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Meat_burek_%28GAK_bakery%2C_Belgrade%2C_Serbia%29.jpg',
  'Kapsalon': 'https://vivera.com/wp-content/uploads/2025/01/Kamile-Kave-x-SoMention-Vivera-Recipes-shoarma-kapsalon-scaled-1.jpg',
  'kabse': 'https://images.squarespace-cdn.com/content/v1/6324c4e34ad08035de4761ba/1743687449830-K7YRXTCHODQ0F24T38RV/Cookbook+chicken+kabse-1.jpg',
  'Battenberg Cake': 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Battenbergcake.jpg',
  'Anzac biscuits': 'https://www.recipetineats.com/tachyon/2019/04/Anzac-Biscuits_7-SQ.jpg',
  'Nanaimo Bars': 'https://www.allrecipes.com/thmb/Z71g6x2807zVpVH1KwZQzOr05aw=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/AR-25095-nanaimo-bars-iii-ddmfs-2x1-c1afb837f479412b8547e6cf573db9aa.jpg',
  'Canadian Butter Tarts': 'https://thebeachhousekitchen.com/wp-content/uploads/2021/06/Canadian-Butter-Tarts-1-of-1-14.jpg',
  'Dundee cake': 'https://www.thespruceeats.com/thmb/48MwYE_xzZnw31K4_Z81fw0FxrA=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/traditional-scottish-dundee-cake-recipe-435067-hero-02-41514a0a054d486990fb3910fc7ec1b6.jpg',
  'Chelsea Buns': 'https://www.talesfromthekitchenshed.com/sj-desford/uploads/2022/03/Easy-Homemade-Chelsea-Buns-14.jpg',
  'Crema Catalana': 'https://spanishsabores.com/wp-content/uploads/2023/08/Crema-Catalana-Featured.jpg',
  'Jam Roly-Poly': 'https://ichef.bbci.co.uk/food/ic/food_16x9_1600/recipes/jam_roly_poly_36901_16x9.jpg',
  'Rock Cakes': 'https://scottishscran.com/wp-content/uploads/2022/03/Rock-Cakes-Scottish-Recipe-45-720x720.jpg',
  'Eccles Cakes': 'https://www.daringgourmet.com/wp-content/uploads/2018/12/Eccles-Cakes-10-square-lighter.jpg',
  'Timbits': 'https://feedgrump.com/wp-content/uploads/2023/04/timbits-in-basket-feature.jpg',
  'Pistachio Kunafa Chocolate Cake and Cupcakes': 'https://thenotsocreativecook.com/wp-content/uploads/2025/05/Pistachio-Kunafa-Brownie-Cups-3.jpg',
  'Cornes de Gazelle (Gazelle Horns)': 'https://assets.afcdn.com/recipe/20150225/60714_w1024h1024c1cx1250cy1755.jpg',
  'Parkin Cake': 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/recipe-image-legacy-id-890458_10-8360227.jpg',
  'Piernik (Polish gingerbread)': 'https://www.kwestiasmaku.com/sites/v123.kwestiasmaku.com/files/piernik_last_minute_02_0.jpg',
  'Rappie Pie': 'https://img.apmcdn.org/00f7e42f29612975aaa6bd7224dbabe18a109762/uncropped/982933-splendid-table-rappie-pie-slice-photo-c-lede.jpg',
  'Blueberry & lemon friands': 'https://www.healthyfood.com/wp-content/uploads/2016/09/Lemon-and-blueberry-friands.jpg',
  'Budino Di Ricotta': 'https://s6890.pcdn.co/wp-content/uploads/2013/05/budino-di-ricotta.jpg',
  'Choco Tacos': 'https://www.crowdedkitchen.com/wp-content/uploads/2024/06/Homemade-Choco-Tacos-21.jpg',
  'Rocky Road Fudge': 'https://tastesbetterfromscratch.com/wp-content/uploads/2023/07/Rocky-Road24-1.jpg',
  'Strawberries Romanoff': 'https://natashaskitchen.com/wp-content/uploads/2017/06/Strawberries-Romanoff-4.jpg',
  'Flapper Pie': 'https://www.thekitchenmagpie.com/wp-content/uploads/images/2012/08/FlapperPie.jpg',
  'Pouding chomeur': 'https://img.delicious.com.au/NVRfoHcP/del/2015/10/matt-prestons-pouding-chomeur-maple-and-pecan-pudding-14097-2.jpg',
  'Blackberry Fool': 'https://static01.nyt.com/images/2021/06/24/dining/vl-blackberry-fool/merlin_189026361_4e5867fd-c062-4e33-a074-cffbcc9a7544-mediumSquareAt3X.jpg',
  'Cashew Ghoriba Biscuits': 'https://ik.imagekit.io/littlecook/public_images/recipes/cashew-ghoriba-biscuits.jpg',
  'Figgy Duff': 'https://www.rockrecipes.com/wp-content/uploads/2007/12/DSC0745-1-2.jpg',
  'Date squares': 'https://images.ricardocuisine.com/services/recipes/5263.jpg',
  'Mazariner – Scandinavian Almond Tartlets': 'https://scandinaviancookbook.com/wp-content/uploads/2023/05/DSC04980-2.jpg',
  'Chinon Apple Tarts': 'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/chinon-apple-tarts-e653e5a.jpg',
  'Apam balik': 'https://www.elmundoeats.com/wp-content/uploads/2018/01/Apam-Balik-2.jpg',
  'Purple sprouting broccoli tempura with nuoc cham': 'https://www.themealdb.com/images/media/meals/xnv4wf1763756529.jpg',
  'Beef Banh Mi Bowls with Sriracha Mayo, Carrot & Pickled Cucumber': 'https://ik.imagekit.io/littlecook/public_images/recipes/beef-banh-mi-bowls-with-sriracha-mayo,-carrot-&-pickled-cucumber.jpg',
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
    const result = await col.updateOne(
      { title: { $regex: new RegExp(escaped, 'i') } },
      { $set: { imageUrl } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ "${title}"`);
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
