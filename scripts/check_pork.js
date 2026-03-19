const mongoose = require('mongoose');
const URI = 'mongodb+srv://ngocvo14198_db_user:MxqSBLQufaueA3Xi@recipematch-cluster.xnfgsjh.mongodb.net/?appName=RecipeMatch-Cluster';
mongoose.connect(URI, { dbName: 'recipematch', serverSelectionTimeoutMS: 10000 })
  .then(async () => {
    const db = mongoose.connection.db;
    const recipes = await db.collection('recipes').find({
      title: { $regex: /pork chop|pork schnitzel|spaghetti taco|walking taco|picadillo taco/i }
    }).toArray();
    recipes.forEach(r => console.log(r.title, '→', r.imageUrl || 'NULL'));

    // Also null out any remaining amazon/edamam URLs
    const result = await db.collection('recipes').updateMany(
      { imageUrl: { $regex: /amazonaws|edamam|X-Amz/i } },
      { $set: { imageUrl: null } }
    );
    console.log('Nulled expired URLs:', result.modifiedCount);
    process.exit(0);
  })
  .catch(e => { console.log('Error:', e.message); process.exit(1); });
