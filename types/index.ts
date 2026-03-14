export interface Ingredient {
  name: string;
  quantity?: string;
  category?: string;
}

export interface Nutrition {
  calories: number;
  fat: number;
  saturatedFat: number;
  carbs: number;
  sugar: number;
  fiber: number;
  protein: number;
  cholesterol: number;
  sodium: number;
}

export interface Recipe {
  _id: string;
  title: string;
  description: string;
  cuisine: string;
  mealType: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cookTime: number;
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
  tags: string[];
  diet: string[];
  equipment: string[];
  estimatedCost?: number;
  nutrition?: Nutrition;
  createdAt?: string;
  imageUrl?: string;
  source?: string;
  sourceUrl?: string;
  videoUrl?: string;
}

export interface MatchedRecipe extends Recipe {
  matchScore: number;
  matchType: 'full' | 'near' | 'low';
  matchedIngredients: string[];
  missingIngredients: string[];
}

export interface User {
  _id: string;
  email: string;
  username?: string;
  createdAt: string;
  preferences?: {
    diet?: string;
    equipment?: string[];
  };
}

export interface Favorite {
  _id: string;
  userId: string;
  recipeId: string;
  recipe?: Recipe;
  savedAt: string;
}

export interface FilterState {
  mealType: string;
  cuisine: string;
  diet: string;
  maxCookTime: number;
  equipment: string;
  tags: string[];
}

export interface Collection {
  _id: string;
  userId: string;
  name: string;
  emoji: string;
  recipes: string[];
  createdAt: string;
}

export interface HistoryEntry {
  _id: string;
  recipeId: Recipe;
  viewedAt: string;
}
