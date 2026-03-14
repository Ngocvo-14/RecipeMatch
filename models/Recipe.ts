import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRecipe extends Document {
  title: string;
  description: string;
  cuisine: string;
  mealType: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cookTime: number;
  servings: number;
  ingredients: { name: string; quantity: string; category?: string }[];
  instructions: string[];
  tags: string[];
  diet: string[];
  equipment: string[];
  estimatedCost: number;
  nutrition?: {
    calories: number;
    fat: number;
    saturatedFat: number;
    carbs: number;
    sugar: number;
    fiber: number;
    protein: number;
    cholesterol: number;
    sodium: number;
  };
  imageUrl: string;
  source: string;
  sourceUrl: string;
  videoUrl: string;
  mealDbId: string;
  createdAt: Date;
}

const IngredientSchema = new Schema({
  name: { type: String, required: true, lowercase: true, trim: true },
  quantity: { type: String, default: '' },
  category: { type: String, default: '' },
});

const NutritionSchema = new Schema({
  calories:     { type: Number, default: 0 },
  fat:          { type: Number, default: 0 },
  saturatedFat: { type: Number, default: 0 },
  carbs:        { type: Number, default: 0 },
  sugar:        { type: Number, default: 0 },
  fiber:        { type: Number, default: 0 },
  protein:      { type: Number, default: 0 },
  cholesterol:  { type: Number, default: 0 },
  sodium:       { type: Number, default: 0 },
}, { _id: false });

const RecipeSchema = new Schema<IRecipe>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    cuisine: { type: String, default: 'American', index: true },
    mealType: { type: String, default: 'Main Dish', index: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
    cookTime: { type: Number, default: 30, index: true },
    servings: { type: Number, default: 2 },
    ingredients: [IngredientSchema],
    instructions: [{ type: String }],
    tags: [{ type: String }],
    diet: [{ type: String }],
    equipment: [{ type: String }],
    estimatedCost: { type: Number, default: 10 },
    nutrition: { type: NutritionSchema, default: null },
    imageUrl:  { type: String, default: '' },
    source:    { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
    videoUrl:  { type: String, default: '' },
    mealDbId: { type: String, default: '', index: true },
  },
  { timestamps: true }
);

RecipeSchema.index({ 'ingredients.name': 1 });
RecipeSchema.index({ cuisine: 1, mealType: 1, cookTime: 1 });

// In development, always re-register the schema so new fields are picked up
// after hot-module reloads without restarting the server.
if (process.env.NODE_ENV !== 'production' && mongoose.models.Recipe) {
  delete (mongoose.models as Record<string, unknown>).Recipe;
}

const Recipe: Model<IRecipe> =
  mongoose.models.Recipe || mongoose.model<IRecipe>('Recipe', RecipeSchema);

export default Recipe;
