// Cook time estimates by category (minutes)
const COOK_TIMES: Record<string, number> = {
  Breakfast: 15, Pasta: 20, Side: 15, Starter: 20,
  Vegan: 25, Vegetarian: 25, Beef: 35, Chicken: 30,
  Pork: 35, Lamb: 45, Seafood: 20, Dessert: 40,
  Miscellaneous: 30, Goat: 40, 'Other Unknown Category': 30,
};

// Nutrition estimates by category (per serving)
const NUTRITION: Record<string, {calories:number,protein:number,fat:number,carbs:number,fiber:number,sugar:number,saturatedFat:number,cholesterol:number,sodium:number}> = {
  Beef:         { calories:480, protein:32, fat:28, carbs:18, fiber:2, sugar:4, saturatedFat:10, cholesterol:85, sodium:520 },
  Chicken:      { calories:360, protein:34, fat:14, carbs:22, fiber:3, sugar:5, saturatedFat:4, cholesterol:75, sodium:480 },
  Pork:         { calories:420, protein:28, fat:22, carbs:20, fiber:2, sugar:4, saturatedFat:8, cholesterol:80, sodium:550 },
  Lamb:         { calories:450, protein:30, fat:26, carbs:15, fiber:2, sugar:3, saturatedFat:11, cholesterol:90, sodium:480 },
  Seafood:      { calories:280, protein:28, fat:10, carbs:18, fiber:2, sugar:3, saturatedFat:2, cholesterol:65, sodium:460 },
  Pasta:        { calories:400, protein:14, fat:10, carbs:58, fiber:4, sugar:6, saturatedFat:3, cholesterol:20, sodium:380 },
  Vegetarian:   { calories:280, protein:10, fat:9, carbs:38, fiber:7, sugar:8, saturatedFat:2, cholesterol:5, sodium:340 },
  Vegan:        { calories:240, protein:8, fat:7, carbs:36, fiber:8, sugar:7, saturatedFat:1, cholesterol:0, sodium:290 },
  Breakfast:    { calories:320, protein:12, fat:14, carbs:38, fiber:3, sugar:10, saturatedFat:5, cholesterol:90, sodium:420 },
  Dessert:      { calories:380, protein:5, fat:16, carbs:55, fiber:2, sugar:35, saturatedFat:8, cholesterol:50, sodium:200 },
  Side:         { calories:180, protein:5, fat:6, carbs:28, fiber:4, sugar:5, saturatedFat:2, cholesterol:5, sodium:320 },
  Starter:      { calories:220, protein:8, fat:10, carbs:24, fiber:3, sugar:4, saturatedFat:3, cholesterol:20, sodium:360 },
  Miscellaneous:{ calories:350, protein:15, fat:14, carbs:38, fiber:4, sugar:6, saturatedFat:5, cholesterol:40, sodium:400 },
  Goat:         { calories:420, protein:28, fat:22, carbs:16, fiber:2, sugar:3, saturatedFat:8, cholesterol:85, sodium:460 },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformMeal(meal: any) {
  // Parse ingredients
  const ingredients: { name: string; quantity: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (meal[`strIngredient${i}`] || '').trim();
    const qty  = (meal[`strMeasure${i}`]   || '').trim();
    if (name) ingredients.push({ name: name.toLowerCase(), quantity: qty });
  }

  // Parse instructions — split on newlines, filter blanks
  const instructions: string[] = (meal.strInstructions || '')
    .split(/\r?\n/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 5);

  const category = meal.strCategory || 'Miscellaneous';
  const count = ingredients.length;

  const difficulty: 'Easy' | 'Medium' | 'Hard' =
    count <= 5 ? 'Easy' : count <= 10 ? 'Medium' : 'Hard';

  const cookTime = COOK_TIMES[category] ?? 30;

  const tags = meal.strTags
    ? meal.strTags.split(',').map((t: string) => t.trim()).filter(Boolean)
    : [];

  // Diet inference
  const diet: string[] = [];
  if (category === 'Vegan')      diet.push('Vegan', 'Vegetarian');
  else if (category === 'Vegetarian') diet.push('Vegetarian');

  const nutrition = NUTRITION[category] ?? NUTRITION['Miscellaneous'];

  const estimatedCost = count <= 5 ? 8 : count <= 10 ? 12 : count <= 15 ? 18 : 22;

  return {
    mealDbId:    meal.idMeal,
    title:       meal.strMeal,
    imageUrl:    meal.strMealThumb || '',
    description: '',
    cuisine:     meal.strArea || 'International',
    mealType:    category,
    difficulty,
    cookTime,
    servings:    4,
    ingredients,
    instructions,
    tags,
    diet,
    equipment:   [],
    estimatedCost,
    nutrition,
    source:      meal.strSource || '',
    videoUrl:    meal.strYoutube || '',
  };
}
