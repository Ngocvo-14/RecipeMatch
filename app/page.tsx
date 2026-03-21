'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import IngredientInput from '@/components/IngredientInput';
import IngredientCategories from '@/components/IngredientCategories';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetailPanel from '@/components/RecipeDetailPanel';
import AuthGateModal from '@/components/AuthGateModal';
import Toast, { useToast } from '@/components/Toast';

import { MatchedRecipe, FilterState, Collection } from '@/types';

interface User { _id: string; email: string; username?: string; createdAt?: string }
interface MatchResult {
  total: number;
  cookableCount: number;
  fullMatches: MatchedRecipe[];
  nearMatches: MatchedRecipe[];
  lowMatches: MatchedRecipe[];
}

const DEFAULT_FILTERS: FilterState = {
  mealType:'All', cuisine:'All', diet:'All',
  maxCookTime:9999, equipment:'All', tags:[],
};


// ── Smart search engine ───────────────────────────────────────────────────

// Synonym table: each key expands to its values during search
const SYNONYMS: Record<string, string[]> = {
  noodles:       ['pasta', 'spaghetti', 'fettuccine', 'ramen', 'pho', 'pad thai', 'linguine', 'noodle'],
  pasta:         ['noodles', 'spaghetti', 'fettuccine', 'penne', 'noodle', 'linguine'],
  eggs:          ['egg', 'omelette', 'omelet', 'frittata', 'scrambled'],
  egg:           ['eggs', 'omelette', 'omelet', 'frittata', 'scrambled'],
  omelette:      ['egg', 'eggs', 'omelet', 'frittata'],
  steak:         ['beef', 'ground beef', 'sirloin', 'brisket'],
  beef:          ['steak', 'burger', 'ground beef', 'brisket'],
  burger:        ['beef', 'ground beef', 'patty'],
  veggies:       ['vegetable', 'vegetables', 'vegan', 'vegetarian', 'veggie', 'produce'],
  veggie:        ['vegetable', 'vegetables', 'vegan', 'vegetarian', 'veggies'],
  vegetables:    ['vegetable', 'veggie', 'veggies', 'vegan', 'vegetarian'],
  chicken:       ['poultry', 'hen', 'fowl'],
  pork:          ['bacon', 'ham', 'ground pork', 'sausage'],
  bacon:         ['pork', 'ham'],
  shrimp:        ['prawn', 'seafood'],
  prawns:        ['shrimp', 'seafood'],
  fish:          ['salmon', 'tuna', 'seafood', 'tilapia', 'cod'],
  salmon:        ['fish', 'seafood'],
  tuna:          ['fish', 'seafood'],
  seafood:       ['shrimp', 'prawn', 'fish', 'salmon', 'tuna'],
  soup:          ['stew', 'broth', 'ramen', 'pho', 'chowder', 'bisque', 'dal'],
  stew:          ['soup', 'broth', 'chowder'],
  bread:         ['toast', 'bun', 'baguette', 'brioche'],
  sandwich:      ['bread', 'toast', 'blt', 'sub', 'wrap'],
  salad:         ['bowl', 'tabbouleh', 'slaw', 'greens'],
  rice:          ['fried rice', 'risotto', 'bibimbap', 'paella'],
  spicy:         ['hot', 'chili', 'sriracha', 'pepper', 'jalapeño', 'buffalo', 'curry'],
  sweet:         ['honey', 'teriyaki', 'maple', 'sugar', 'caramel'],
  quick:         ['fast', 'under-15-minutes', 'easy', 'rapid', 'simple'],
  easy:          ['quick', 'simple', 'beginner', 'under-15-minutes'],
  breakfast:     ['morning', 'brunch', 'oatmeal', 'pancake'],
  healthy:       ['light', 'nutritious', 'low-fat', 'clean'],
  comfort:       ['comfort-food', 'hearty', 'warming', 'cozy'],
  mexican:       ['taco', 'burrito', 'quesadilla', 'enchilada', 'guacamole', 'nachos'],
  italian:       ['pasta', 'pizza', 'risotto', 'carbonara', 'bruschetta', 'lasagna'],
  asian:         ['chinese', 'japanese', 'korean', 'thai', 'vietnamese', 'wok'],
  chinese:       ['asian', 'wok', 'fried rice', 'dumplings'],
  japanese:      ['asian', 'miso', 'teriyaki', 'ramen', 'sushi'],
  korean:        ['asian', 'bibimbap', 'kimchi', 'gochujang'],
  thai:          ['asian', 'pad thai', 'tom yum', 'lemongrass'],
  vietnamese:    ['asian', 'pho', 'spring roll'],
  indian:        ['curry', 'masala', 'dal', 'tikka', 'naan', 'chana', 'palak'],
  curry:         ['indian', 'thai', 'masala', 'spicy'],
  mediterranean: ['greek', 'hummus', 'falafel', 'shakshuka', 'tabbouleh'],
  greek:         ['mediterranean', 'feta', 'olive'],
  vegan:         ['vegetarian', 'plant-based', 'dairy-free'],
  vegetarian:    ['vegan', 'meatless'],
  tofu:          ['vegan', 'vegetarian', 'soy', 'bean curd'],
  dumpling:      ['potsticker', 'gyoza', 'wonton'],
  dumplings:     ['potstickers', 'gyoza', 'wontons'],
  wrap:          ['burrito', 'tortilla', 'quesadilla'],
  fry:           ['stir fry', 'fried', 'sauté'],
};

// Levenshtein edit distance (perf-capped)
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

// True if token fuzzy-matches any word in the list (1-2 char tolerance for words ≥ 4 chars)
function fuzzyContains(token: string, words: string[]): boolean {
  if (token.length < 3) return false;
  const maxDist = token.length <= 5 ? 1 : 2;
  return words.some((w) => w.length >= 3 && editDistance(token, w) <= maxDist);
}

// Score a single search token against a recipe. Returns 0 = no match.
function scoreToken(token: string, title: string, meta: string, ings: string): number {
  const expanded = [token, ...(SYNONYMS[token] || [])];
  for (const t of expanded) {
    const isSyn = t !== token;
    const penalty = isSyn ? 0.4 : 1;
    if (title.includes(t))  return Math.floor(800 * penalty);
    if (meta.includes(t))   return Math.floor(500 * penalty);
    if (ings.includes(t))   return Math.floor(350 * penalty);
  }
  // Fuzzy fallback (typo tolerance)
  const titleWords = title.split(/\W+/).filter(Boolean);
  if (fuzzyContains(token, titleWords)) return 200;
  const metaWords = meta.split(/\W+/).filter(Boolean);
  if (fuzzyContains(token, metaWords)) return 120;
  const ingWords = ings.split(/\W+/).filter(Boolean);
  if (fuzzyContains(token, ingWords)) return 80;
  return 0;
}

// Main scorer: 0 = no match, higher = more relevant
function recipeSearchScore(rawQuery: string, recipe: MatchedRecipe): number {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return 1;

  const title  = recipe.title.toLowerCase();
  const meta   = [recipe.cuisine, recipe.mealType, ...(recipe.tags || []), ...(recipe.diet || [])].join(' ').toLowerCase();
  const ings   = recipe.ingredients.map((i) => i.name.toLowerCase()).join(' ');

  // Exact / prefix / substring on full phrase (highest priority)
  if (title === q)            return 1000;
  if (title.startsWith(q))   return 900;
  if (title.includes(q))     return 800;
  if (meta.includes(q))      return 600;
  if (ings.includes(q))      return 400;

  // Per-word scoring for multi-word or synonym/fuzzy queries
  const words = q.split(/\s+/).filter(Boolean);
  let total = 0;
  let matched = 0;
  let titleHits = 0;

  for (const word of words) {
    const s = scoreToken(word, title, meta, ings);
    if (s > 0) {
      matched++;
      total += s;
      if (title.includes(word) || fuzzyContains(word, title.split(/\W+/).filter(Boolean))) titleHits++;
    }
  }

  // All words must match (2-word queries), or ≥60% for longer queries
  const need = words.length <= 2 ? words.length : Math.ceil(words.length * 0.6);
  if (matched < need) return 0;

  // Bonus when all words land in the title
  if (titleHits === words.length) total += 300;

  return Math.floor(total / words.length);
}

// ── Category filter helpers (3-group: meal type, cook time, cuisine) ─────────

/** cookTime is stored as a number (minutes) in the DB — helper kept for safety */
function parseMinutes(str: string | undefined): number {
  if (!str) return 999;
  const hours = str.match(/(\d+)\s*h/i)?.[1];
  const mins  = str.match(/(\d+)\s*m/i)?.[1];
  return (parseInt(hours || '0') * 60) + parseInt(mins || '0');
}
// suppress unused warning when cookTime is already a number
void parseMinutes;

function matchesMealType(recipe: MatchedRecipe, mealType: string | null): boolean {
  if (!mealType) return true;
  const title = recipe.title.toLowerCase();
  const tags  = (recipe.tags || []).map((t) => t.toLowerCase());
  const mt    = (recipe.mealType || '').toLowerCase();
  switch (mealType) {
    case 'Quick & Easy': return recipe.cookTime <= 20 || tags.includes('quick') || recipe.difficulty === 'Easy';
    case 'Snacks':       return tags.some((t) => t.includes('snack')) || mt.includes('snack');
    case 'Lunch':        return tags.some((t) => t.includes('lunch')) || mt.includes('lunch');
    case 'Salad':        return title.includes('salad') || tags.includes('salad');
    case 'Side Dish':    return tags.some((t) => t.includes('side')) || mt.includes('side');
    case 'Dessert':      return tags.some((t) => t.includes('dessert')) || mt.includes('dessert') ||
                           ['cake','cookie','chocolate','mousse','pudding'].some((w) => title.includes(w));
    case 'Dinner':       return tags.some((t) => t.includes('dinner')) || mt.includes('dinner') ||
                           recipe.difficulty === 'Medium' || recipe.difficulty === 'Hard';
    case 'Breakfast':    return tags.some((t) => t.includes('breakfast')) || mt.includes('breakfast') ||
                           ['egg','pancake','waffle','omelette'].some((w) => title.includes(w));
    case 'Soup':         return ['soup','stew','chowder','broth'].some((w) => title.includes(w)) || tags.includes('soup');
    default: return true;
  }
}

function matchesCookTime(recipe: MatchedRecipe, cookTime: string | null): boolean {
  if (!cookTime) return true;
  const m = recipe.cookTime; // already stored as minutes (number)
  switch (cookTime) {
    case 'Under 5 min':  return m <= 5;
    case 'Under 15 min': return m <= 15;
    case 'Under 30 min': return m <= 30;
    case 'Under 60 min': return m <= 60;
    case 'Under 2 hrs':  return m <= 120;
    default: return true;
  }
}

function matchesCuisine(recipe: MatchedRecipe, cuisine: string | null): boolean {
  if (!cuisine) return true;
  const rc   = (recipe.cuisine || '').toLowerCase();
  const tags = (recipe.tags || []).map((t) => t.toLowerCase());
  const hit  = (kw: string) => rc.includes(kw) || tags.some((t) => t.includes(kw));
  switch (cuisine) {
    case 'Asian':    return ['asian','chinese','japanese','korean','thai','vietnamese','indian'].some(hit);
    case 'American': return hit('american');
    case 'Italian':  return hit('italian');
    case 'Indian':   return hit('indian');
    case 'Thai':     return hit('thai');
    case 'Korean':   return hit('korean');
    case 'Chinese':  return hit('chinese');
    case 'Mexican':  return hit('mexican');
    case 'French':   return hit('french');
    default: return true;
  }
}

function applyInlineFilters(
  recipe: MatchedRecipe,
  mealType: string | null,
  cookTime: number | null,
  cuisine: string | null,
  diet: string | null,
  tag: string | null,
): boolean {
  if (mealType && !matchesMealType(recipe, mealType)) return false;
  if (cookTime !== null && recipe.cookTime > cookTime) return false;
  if (cuisine && !matchesCuisine(recipe, cuisine)) return false;
  if (diet) {
    const dl = diet.toLowerCase();
    if (!(recipe.diet || []).some((d) => d.toLowerCase().includes(dl))) return false;
  }
  if (tag && !(recipe.tags || []).some((t) => t.toLowerCase() === tag.toLowerCase())) return false;
  return true;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser]               = useState<User | null>(null);
  const [token, setToken]             = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [filters, setFilters]         = useState<FilterState>(DEFAULT_FILTERS);
  const [results, setResults]         = useState<MatchResult | null>(null);
  const [loading, setLoading]         = useState(false);
  const [seeded, setSeeded]           = useState(false);
  const [favorites, setFavorites]     = useState<Set<string>>(new Set());
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showLow, setShowLow]         = useState(false);
const [selectedRecipe, setSelectedRecipe] = useState<MatchedRecipe | null>(null);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState(0);
  const [showAuthGate, setShowAuthGate]     = useState(false);
  const [showAllSugg, setShowAllSugg]       = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [nameSearchResults, setNameSearchResults] = useState<MatchedRecipe[] | null>(null);
  const [nameSearchLoading, setNameSearchLoading] = useState(false);
  const [initialized, setInitialized]      = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);
  const [selectedCookTime, setSelectedCookTime] = useState<number | null>(null);
  const [selectedCuisine, setSelectedCuisine]   = useState<string | null>(null);
  const [selectedDiet, setSelectedDiet]         = useState<string | null>(null);
  const [selectedTag, setSelectedTag]           = useState<string | null>(null);
  const [openFilter, setOpenFilter]             = useState<string | null>(null);
  const { toasts, addToast } = useToast();

  // ── Mobile 3-step flow ────────────────────────────────────────────────────
  const [mobileStep, setMobileStep] = useState<'hero' | 'ingredients' | 'results'>('hero');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Init state: sessionStorage (survives back-nav) → URL params → localStorage
  useEffect(() => {
    try {
      const ssIngs = sessionStorage.getItem('rm_ingredients');
      if (ssIngs) {
        setIngredients(JSON.parse(ssIngs));
      } else {
        const params = new URLSearchParams(window.location.search);
        const urlIngs = params.get('ings');
        if (urlIngs) {
          setIngredients(urlIngs.split(',').filter(Boolean));
        } else {
          const lsIngs = localStorage.getItem('rm_ingredients');
          if (lsIngs) setIngredients(JSON.parse(lsIngs));
        }
      }

      const ssFilters = sessionStorage.getItem('rm_filters');
      if (ssFilters) {
        setFilters(JSON.parse(ssFilters));
      } else {
        const params = new URLSearchParams(window.location.search);
        const hasUrlFilters = params.has('meal') || params.has('cuisine') || params.has('diet') ||
          params.has('time') || params.has('eq') || params.has('tags');
        if (hasUrlFilters) {
          setFilters({
            mealType: params.get('meal') || 'All',
            cuisine: params.get('cuisine') || 'All',
            diet: params.get('diet') || 'All',
            maxCookTime: params.has('time') ? Number(params.get('time')) : 9999,
            equipment: params.get('eq') || 'All',
            tags: params.has('tags') ? params.get('tags')!.split(',') : [],
          });
        }
      }

      const ssQ = sessionStorage.getItem('rm_search');
      if (ssQ) setSearchQuery(ssQ);
    } catch { /* ignore */ }

    setInitialized(true);
  }, []);

  // Sync to sessionStorage + URL + localStorage — only after init completes
  useEffect(() => {
    if (!initialized) return;
    try {
      sessionStorage.setItem('rm_ingredients', JSON.stringify(ingredients));
      sessionStorage.setItem('rm_filters', JSON.stringify(filters));
      if (searchQuery) sessionStorage.setItem('rm_search', searchQuery);
      else sessionStorage.removeItem('rm_search');
    } catch { /* ignore */ }

    const params = new URLSearchParams();
    if (ingredients.length > 0) params.set('ings', ingredients.join(','));
    if (filters.mealType !== 'All') params.set('meal', filters.mealType);
    if (filters.cuisine !== 'All') params.set('cuisine', filters.cuisine);
    if (filters.diet !== 'All') params.set('diet', filters.diet);
    if (filters.maxCookTime !== 9999) params.set('time', String(filters.maxCookTime));
    if (filters.equipment !== 'All') params.set('eq', filters.equipment);
    if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
    if (searchQuery) params.set('q', searchQuery);
    const qs = params.toString();
    window.history.replaceState({}, '', qs ? `?${qs}` : window.location.pathname);

    try { localStorage.setItem('rm_ingredients', JSON.stringify(ingredients)); } catch { /* ignore */ }
  }, [ingredients, filters, searchQuery, initialized]);

  // Re-hydrate auth state from httpOnly cookie
  useEffect(() => {
    async function rehydrate() {
      try {
        const res = await fetch('/api/user/me');
        if (!res.ok) return;
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        await Promise.all([loadFavorites(data.token), loadCollections(data.token)]);
      } catch { /* no cookie / expired — stay logged out */ }
    }
    rehydrate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seed DB — re-seed if count is wrong OR nutrition data is missing
  useEffect(() => {
    async function seed() {
      try {
        const res = await fetch('/api/seed');
        const data = await res.json();
        if (data.count < 90 || !data.hasNutrition || !data.hasCorrectCosts) await fetch('/api/seed', { method: 'POST' });
        // Fire-and-forget — don't block seeded state on price migration
        fetch('/api/admin/fix-prices', { method: 'POST' }).catch(() => {});
        setSeeded(true);
      } catch { setSeeded(true); }
    }
    seed();
  }, []);

  // Close inline filter dropdowns when clicking outside
  useEffect(() => {
    const close = () => setOpenFilter(null);
    if (openFilter) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openFilter]);

  const matchRecipes = useCallback(async () => {
    if (ingredients.length === 0) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/recipes/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, filters }),
      });
      if (res.ok) setResults(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [ingredients, filters]);

  useEffect(() => { if (seeded) matchRecipes(); }, [ingredients, filters, seeded, matchRecipes]);

  // Debounced name-search: calls /api/recipes/search whenever searchQuery changes
  useEffect(() => {
    if (searchQuery.length < 2) {
      setNameSearchResults(null);
      setNameSearchLoading(false);
      return;
    }
    // Clear immediately — don't wait for debounce so stale results vanish right away
    setNameSearchResults([]);
    setNameSearchLoading(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (cancelled) return;
        const converted: MatchedRecipe[] = (data.recipes || []).map((r: MatchedRecipe) => ({
          ...r,
          _id: r._id?.toString() || '',
          matchScore: 0,
          matchType: 'low' as const,
          matchedIngredients: [],
          missingIngredients: [],
        }));
        setNameSearchResults(converted);
      } catch {
        if (!cancelled) setNameSearchResults([]);
      } finally {
        if (!cancelled) setNameSearchLoading(false);
      }
    }, 400);
    return () => { clearTimeout(timer); cancelled = true; };
  }, [searchQuery]);

  // Suggested missing ingredients
  const suggestions = useMemo(() => {
    if (!results) return [];
    const freq: Record<string, number> = {};
    [...results.nearMatches, ...results.lowMatches].forEach((r) =>
      r.missingIngredients.forEach((ing) => { freq[ing] = (freq[ing] || 0) + 1; })
    );
    return Object.entries(freq).sort(([,a],[,b]) => b - a).map(([ing, count]) => ({ ing, count }));
  }, [results]);

  // Related recipes for panel
  const related = useMemo(() => {
    if (!selectedRecipe || !results) return [];
    const all = [...results.fullMatches, ...results.nearMatches, ...results.lowMatches];
    return all
      .filter((r) => r._id !== selectedRecipe._id && (r.cuisine === selectedRecipe.cuisine || r.mealType === selectedRecipe.mealType))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 4);
  }, [selectedRecipe, results]);

  async function handleLogin(email: string, password: string) {
    const res = await fetch('/api/user/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setUser(data.user); setToken(data.token);
    await Promise.all([loadFavorites(data.token), loadCollections(data.token)]);
  }
  async function handleRegister(email: string, password: string, username?: string) {
    const res = await fetch('/api/user/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password,username}) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    setUser(data.user); setToken(data.token);
    await loadCollections(data.token);
  }
  async function handleLogout() {
    await fetch('/api/user/logout', { method:'POST' });
    setUser(null); setToken(null); setFavorites(new Set()); setCollections([]);
  }
  async function loadFavorites(t: string) {
    try {
      const res = await fetch('/api/user/favorites', { headers:{ Authorization:`Bearer ${t}` } });
      if (!res.ok) return;
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setFavorites(new Set(data.favorites.map((f: any) =>
        typeof f.recipeId === 'object' ? f.recipeId._id?.toString() : f.recipeId?.toString()
      )));
    } catch { /* ignore */ }
  }
  async function loadCollections(t: string) {
    try {
      const res = await fetch('/api/collections', { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) return;
      const data = await res.json();
      setCollections(data.collections || []);
    } catch { /* ignore */ }
  }
  async function handleSaveToCollection(recipeId: string, collectionId: string) {
    if (!token) return;
    try {
      await fetch(`/api/collections/${collectionId}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipeId }),
      });
      await loadCollections(token);
    } catch { /* ignore */ }
  }

  async function handleCreateCollection(name: string, emoji: string): Promise<string | null> {
    if (!token) return null;
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, emoji }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      await loadCollections(token);
      return data.collection._id as string;
    } catch { return null; }
  }
  async function toggleFavorite(id: string) {
    if (!token) return;
    const isFav = favorites.has(id);
    try {
      const res = await fetch('/api/user/favorites', {
        method: isFav ? 'DELETE' : 'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ recipeId: id }),
      });
      if (!res.ok) return;
      setFavorites((prev) => { const n = new Set(prev); isFav ? n.delete(id) : n.add(id); return n; });
      addToast(isFav ? 'Removed from Favorites' : 'Added to Favorites ❤️');
    } catch { /* ignore */ }
  }
  function handleNeedAuth() { setSelectedRecipe(null); setShowAuthGate(true); }

  function handleLogoClick() {
    setIngredients([]);
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
    setResults(null);
    setNameSearchResults(null);
    setNameSearchLoading(false);
    setSelectedMealType(null); setSelectedCookTime(null); setSelectedCuisine(null); setSelectedDiet(null); setSelectedTag(null);
    try {
      sessionStorage.removeItem('rm_ingredients');
      sessionStorage.removeItem('rm_filters');
      sessionStorage.removeItem('rm_search');
    } catch { /* ignore */ }
  }

  async function handleRemoveFromCollection(recipeId: string, collectionId: string) {
    if (!token) return;
    try {
      await fetch(`/api/collections/${collectionId}/recipes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipeId }),
      });
      await loadCollections(token);
    } catch { /* ignore */ }
  }

  function handleIngredientsChange(newIngredients: string[]) {
    setIngredients(newIngredients);
    if (searchQuery) {
      setSearchQuery('');
      setNameSearchResults(null);
    }
  }

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    if (q.trim()) {
      if (ingredients.length > 0) setIngredients([]);
    } else {
      setNameSearchResults(null);
      setNameSearchLoading(false);
      setSelectedMealType(null); setSelectedCookTime(null); setSelectedCuisine(null); setSelectedDiet(null); setSelectedTag(null);
    }
  }

  function handleSearchByName(query: string) {
    setSearchQuery(query);
    if (ingredients.length > 0) setIngredients([]);
    addToast(`Searching recipes for "${query}" 🔍`);
  }

  function openRecipe(recipe: MatchedRecipe, index = 0) {
    setSelectedRecipe(recipe);
    setSelectedRecipeIndex(index);
    // Track history silently (fire-and-forget, cookie auth)
    if (user) {
      fetch('/api/user/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe._id }),
      }).catch(() => {});
    }
  }

  const cookable = results ? results.fullMatches.length + results.nearMatches.length : 0;
  const visibleSugg = showAllSugg ? suggestions : suggestions.slice(0, 8);

  // Apply smart search filter + sort by relevance within each tier
  const filteredFull = useMemo(() => {
    if (!results) return [];
    if (!searchQuery.trim()) return results.fullMatches;
    return results.fullMatches
      .map((r) => ({ r, s: recipeSearchScore(searchQuery, r) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ r }) => r);
  }, [results, searchQuery]);

  const filteredNear = useMemo(() => {
    if (!results) return [];
    if (!searchQuery.trim()) return results.nearMatches;
    return results.nearMatches
      .map((r) => ({ r, s: recipeSearchScore(searchQuery, r) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ r }) => r);
  }, [results, searchQuery]);

  const filteredLow = useMemo(() => {
    if (!results) return [];
    if (!searchQuery.trim()) return results.lowMatches;
    return results.lowMatches
      .map((r) => ({ r, s: recipeSearchScore(searchQuery, r) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ r }) => r);
  }, [results, searchQuery]);

  // Apply inline filter bar on top of search-filtered results
  const hasActiveFilters = selectedMealType !== null || selectedCookTime !== null || selectedCuisine !== null || selectedDiet !== null || selectedTag !== null;
  const catFilteredFull = useMemo(() =>
    hasActiveFilters ? filteredFull.filter((r) => applyInlineFilters(r, selectedMealType, selectedCookTime, selectedCuisine, selectedDiet, selectedTag)) : filteredFull,
    [filteredFull, selectedMealType, selectedCookTime, selectedCuisine, selectedDiet, selectedTag, hasActiveFilters]
  );
  const catFilteredNear = useMemo(() =>
    hasActiveFilters ? filteredNear.filter((r) => applyInlineFilters(r, selectedMealType, selectedCookTime, selectedCuisine, selectedDiet, selectedTag)) : filteredNear,
    [filteredNear, selectedMealType, selectedCookTime, selectedCuisine, selectedDiet, selectedTag, hasActiveFilters]
  );
  const catFilteredLow = useMemo(() =>
    hasActiveFilters ? filteredLow.filter((r) => applyInlineFilters(r, selectedMealType, selectedCookTime, selectedCuisine, selectedDiet, selectedTag)) : filteredLow,
    [filteredLow, selectedMealType, selectedCookTime, selectedCuisine, selectedDiet, selectedTag, hasActiveFilters]
  );

  const filteredNameSearchResults = useMemo(() => {
    if (!nameSearchResults) return [];
    if (!hasActiveFilters) return nameSearchResults;
    return nameSearchResults.filter((r) => applyInlineFilters(r, selectedMealType, selectedCookTime, selectedCuisine, selectedDiet, selectedTag));
  }, [nameSearchResults, selectedMealType, selectedCookTime, selectedCuisine, selectedDiet, selectedTag, hasActiveFilters]);

  function cards(list: MatchedRecipe[]) {
    // Deduplicate by _id before rendering
    const deduped = list.filter((r, i, arr) => arr.findIndex((x) => x._id === r._id) === i);
    return deduped.map((r, i) => (
      <RecipeCard key={r._id} recipe={r} recipeIndex={i}
        isFavorited={favorites.has(r._id)}
        onToggleFavorite={toggleFavorite}
        isLoggedIn={!!user}
        onOpenPanel={openRecipe}
        onNeedAuth={handleNeedAuth}
      />
    ));
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-gray-50">
      <Header user={user} onLogin={handleLogin} onRegister={handleRegister} onLogout={handleLogout} onLogoClick={handleLogoClick} searchQuery={searchQuery} onSearchChange={handleSearchChange} isSearching={nameSearchLoading} />

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className={`shrink-0 flex flex-col overflow-hidden bg-gray-50 ${isMobile ? (mobileStep === 'ingredients' ? 'w-full' : 'hidden') : 'w-72'}`}>
          {/* Mobile ingredient step top bar */}
          {isMobile && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
              <button onClick={() => setMobileStep('hero')} className="text-sm font-semibold cursor-pointer" style={{ color: '#FF6B6B' }}>← Back</button>
              <span className="font-black text-gray-800 text-sm">Pick Ingredients</span>
              <button onClick={() => { setMobileStep('results'); if (ingredients.length > 0 && !loading) matchRecipes(); }} className="text-sm font-bold text-white px-3 py-1 rounded-full cursor-pointer" style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}>Done ✓</button>
            </div>
          )}
          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto sidebar-scroll px-4 pt-4 pb-4">
            <IngredientInput ingredients={ingredients} onIngredientsChange={handleIngredientsChange} onSearchByName={handleSearchByName} onSearchSubmit={() => { if (isMobile) { setMobileStep('results'); if (ingredients.length > 0 && !loading) matchRecipes(); } }} searchActive={!!searchQuery.trim()} onClearSearch={() => { setSearchQuery(''); setNameSearchResults(null); }} />
            <div className={searchQuery.trim() ? 'opacity-40 pointer-events-none select-none' : ''}>
              <IngredientCategories ingredients={ingredients} onIngredientsChange={handleIngredientsChange} />
            </div>
          </div>

          {/* Stats footer (desktop only) */}
          {!isMobile && results && ingredients.length > 0 && cookable > 0 && (
            <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm font-semibold text-gray-500">
                <span className="text-2xl font-black text-orange-500">{cookable}</span>
                {' '}recipes you can cook
              </p>
            </div>
          )}
          {/* Mobile find recipes sticky bar */}
          {isMobile && (
            <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-500">
                {ingredients.length > 0 ? `${ingredients.length} ingredient${ingredients.length !== 1 ? 's' : ''} selected` : 'No ingredients yet'}
              </span>
              <button
                onClick={() => { setMobileStep('results'); if (ingredients.length > 0 && !loading) matchRecipes(); }}
                className="text-sm font-bold text-white px-5 py-2 rounded-full cursor-pointer"
                style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
              >
                {ingredients.length > 0 ? 'Find Recipes →' : 'Skip →'}
              </button>
            </div>
          )}
        </aside>

        {/* MAIN */}
        <main className={`overflow-y-auto flex flex-col bg-gray-50 ${isMobile ? (mobileStep === 'ingredients' ? 'hidden' : 'flex-1 w-full') : 'flex-1'}`}>
          {/* Mobile results top bar */}
          {isMobile && mobileStep === 'results' && (
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
              <button onClick={() => setMobileStep('ingredients')} className="text-sm font-semibold cursor-pointer" style={{ color: '#FF6B6B' }}>← Ingredients</button>
              <span className="text-sm font-black text-gray-800">
                {loading ? 'Finding...' : `${cookable} recipe${cookable !== 1 ? 's' : ''} found`}
              </span>
              <div />
            </div>
          )}
          <div className="flex-1 overflow-y-auto flex flex-col">

          {/* ── HERO — shown before any ingredients or search ── */}
          {ingredients.length === 0 && !searchQuery.trim() && (
            <div className="relative min-h-[80vh] flex flex-col items-center justify-start pt-24 overflow-hidden">

              {/* Floating food ingredient decorations */}
              <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
                <div className="absolute top-8 left-12 text-4xl opacity-15 rotate-[-20deg] animate-bounce" style={{ animationDuration: '3s', animationDelay: '0s' }}>🍅</div>
                <div className="absolute top-20 left-32 text-2xl opacity-10 rotate-[15deg]" style={{ animation: 'float 4s ease-in-out infinite', animationDelay: '0.5s' }}>🥑</div>
                <div className="absolute top-4 left-56 text-xl opacity-[0.07] rotate-[-5deg]" style={{ animation: 'float 5s ease-in-out infinite', animationDelay: '1s' }}>🧄</div>
                <div className="absolute top-6 right-16 text-3xl opacity-15 rotate-[20deg]" style={{ animation: 'float 3.5s ease-in-out infinite', animationDelay: '0.3s' }}>🍋</div>
                <div className="absolute top-24 right-40 text-2xl opacity-10 rotate-[-12deg]" style={{ animation: 'float 4.5s ease-in-out infinite', animationDelay: '1.2s' }}>🫑</div>
                <div className="absolute top-10 right-72 text-xl opacity-[0.07]" style={{ animation: 'float 6s ease-in-out infinite', animationDelay: '0.8s' }}>🧅</div>
                <div className="absolute bottom-16 left-10 text-3xl opacity-15 rotate-[10deg]" style={{ animation: 'float 5s ease-in-out infinite', animationDelay: '1.5s' }}>🥕</div>
                <div className="absolute bottom-32 left-40 text-2xl opacity-10 rotate-[-18deg]" style={{ animation: 'float 3s ease-in-out infinite', animationDelay: '0.2s' }}>🥦</div>
                <div className="absolute bottom-12 right-12 text-3xl opacity-15 rotate-[-10deg]" style={{ animation: 'float 4s ease-in-out infinite', animationDelay: '0.9s' }}>🍳</div>
                <div className="absolute bottom-36 right-44 text-2xl opacity-10 rotate-[22deg]" style={{ animation: 'float 5.5s ease-in-out infinite', animationDelay: '1.8s' }}>🫐</div>
                <div className="absolute top-1/3 left-8 text-xl opacity-[0.07] rotate-[5deg]" style={{ animation: 'float 4s ease-in-out infinite', animationDelay: '2s' }}>🌿</div>
                <div className="absolute top-2/3 right-8 text-xl opacity-[0.07] rotate-[-8deg]" style={{ animation: 'float 3.5s ease-in-out infinite', animationDelay: '0.6s' }}>🍄</div>
              </div>

              {/* Top pill badge */}
              <div style={{ animation: 'fadeUp 0.5s ease-out both' }}
                className="mb-8 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-orange-600 tracking-widest uppercase">Ingredient-First Recipe Matching</span>
              </div>

              {/* Main headline */}
              <div style={{ animation: 'fadeUp 0.6s ease-out 0.1s both' }} className="text-center px-4 max-w-4xl mx-auto">
                <h1 className="font-black leading-none tracking-tight mb-6" style={{ fontSize: 'clamp(2.8rem, 6vw, 4.8rem)' }}>
                  <span className="text-gray-900">Cook what you </span>
                  <br />
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #F97316 0%, #EA580C 30%, #FB923C 60%, #F97316 100%)',
                      backgroundSize: '300% auto',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      animation: 'shimmer 3s linear infinite',
                      display: 'inline-block',
                      lineHeight: 1.1,
                    }}
                  >
                    actually have
                  </span>
                  {" "}
                  <span style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', display: 'inline-block', animation: 'float 3s ease-in-out infinite' }}>🍳</span>
                </h1>

                {/* Decorative arc */}
                <div className="flex justify-center mb-5" style={{ animation: 'fadeUp 0.6s ease-out 0.3s both' }}>
                  <svg width="280" height="16" viewBox="0 0 280 16" fill="none">
                    <path d="M 8 14 Q 140 0 272 14" stroke="url(#heroGrad)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
                    <defs>
                      <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#FCD34D" />
                        <stop offset="40%" stopColor="#F97316" />
                        <stop offset="100%" stopColor="#EA580C" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                <p className="text-gray-500 text-lg leading-relaxed max-w-3xl mx-auto mt-3"
                  style={{ animation: 'fadeUp 0.6s ease-out 0.2s both' }}>
                  Tell us what&apos;s in your fridge — we&apos;ll find every recipe you can make <strong className="text-gray-700 font-semibold">right now</strong>.
                </p>
              </div>

              {/* Feature pills */}
              <div className="flex items-center justify-center gap-3 flex-wrap mt-10"
                style={{ animation: 'fadeUp 0.6s ease-out 0.35s both' }}>
                {[
                  { label: 'Full matches first', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
                  { label: 'Near matches too', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
                  { label: 'Filter by diet & time', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
                ].map((pill) => (
                  <div key={pill.label}
                    className={`flex items-center gap-2 ${pill.bg} border ${pill.border} rounded-full px-4 py-2 shadow-sm`}>
                    <span className={`w-2 h-2 rounded-full ${pill.dot}`} />
                    <span className={`text-xs font-semibold ${pill.text}`}>{pill.label}</span>
                  </div>
                ))}
              </div>

              {/* CTA hint */}
              <div className="mt-12 flex flex-col items-center gap-3"
                style={{ animation: 'fadeUp 0.6s ease-out 0.5s both' }}>
                {/* Desktop hint */}
                <p className="hidden md:block text-gray-400 text-sm font-medium">← Pick ingredients from the sidebar to get started</p>
                {/* Mobile CTA */}
                <button
                  className="md:hidden flex items-center gap-2 text-white font-bold px-8 py-3 rounded-full shadow-lg text-sm cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
                  onClick={() => setMobileStep('ingredients')}
                >
                  🥕 Pick Ingredients →
                </button>
              </div>

            </div>
          )}

          {/* ── RESULTS / SEARCH ── */}
          {(ingredients.length > 0 || searchQuery.trim() || loading) && (
            <div className="px-3 md:px-6 py-4 md:py-6">
              {loading && !results && ingredients.length > 0 && !nameSearchResults && (
                <div className="flex flex-col items-center py-20 gap-3">
                  <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }}></div>
                  <p className="text-sm font-medium text-gray-400">Finding recipes...</p>
                </div>
              )}

              {/* Name-search results */}
              {nameSearchResults !== null && (
                <div className="space-y-4 max-w-6xl">
                  {/* Compact inline filter bar */}
                  <div className="flex items-center gap-2 flex-wrap mb-6 pb-4 border-b border-gray-100">
                    {/* Meal Type */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setOpenFilter(openFilter === 'meal' ? null : 'meal')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${selectedMealType ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                        🍽️ {selectedMealType ?? 'Meal Type'}
                        <svg className={`w-3 h-3 transition-transform ${openFilter === 'meal' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      </button>
                      {openFilter === 'meal' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-1.5 min-w-[160px]">
                          {['All','Quick & Easy','Breakfast','Lunch','Dinner','Snacks','Salad','Side Dish','Dessert','Soups & Stews'].map((opt) => (
                            <button key={opt} onClick={() => { setSelectedMealType(opt === 'All' ? null : opt); setOpenFilter(null); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${(selectedMealType === opt) || (opt === 'All' && !selectedMealType) ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-orange-50'}`}>{opt}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Cook Time */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setOpenFilter(openFilter === 'time' ? null : 'time')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${selectedCookTime !== null ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                        ⏱️ {selectedCookTime !== null ? `≤${selectedCookTime}min` : 'Cook Time'}
                        <svg className={`w-3 h-3 transition-transform ${openFilter === 'time' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      </button>
                      {openFilter === 'time' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-1.5 min-w-[140px]">
                          {[{label:'Any',value:null},{label:'≤15 min',value:15},{label:'≤30 min',value:30},{label:'≤60 min',value:60},{label:'≤2 hrs',value:120}].map((opt) => (
                            <button key={opt.label} onClick={() => { setSelectedCookTime(opt.value); setOpenFilter(null); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${selectedCookTime === opt.value ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-orange-50'}`}>{opt.label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Cuisine */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setOpenFilter(openFilter === 'cuisine' ? null : 'cuisine')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${selectedCuisine ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                        🌍 {selectedCuisine ?? 'Cuisine'}
                        <svg className={`w-3 h-3 transition-transform ${openFilter === 'cuisine' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      </button>
                      {openFilter === 'cuisine' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-1.5 min-w-[160px]">
                          {['All','Asian','American','Italian','Indian','Thai','Korean','Chinese','Mexican','French','Mediterranean'].map((opt) => (
                            <button key={opt} onClick={() => { setSelectedCuisine(opt === 'All' ? null : opt); setOpenFilter(null); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${(selectedCuisine === opt) || (opt === 'All' && !selectedCuisine) ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-orange-50'}`}>{opt}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Diet dropdown */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setOpenFilter(openFilter === 'diet' ? null : 'diet')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${selectedDiet ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                        🥗 {selectedDiet ?? 'Diet'}
                        <svg className={`w-3 h-3 transition-transform ${openFilter === 'diet' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      </button>
                      {openFilter === 'diet' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-1.5 min-w-[150px]">
                          {['All','Vegetarian','Vegan','Gluten Free'].map((opt) => (
                            <button key={opt} onClick={() => { setSelectedDiet(opt === 'All' ? null : opt); setOpenFilter(null); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${(selectedDiet === opt) || (opt === 'All' && !selectedDiet) ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-orange-50'}`}>{opt}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Quick Tags dropdown */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setOpenFilter(openFilter === 'tags' ? null : 'tags')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${selectedTag ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                        ✨ {selectedTag ?? 'Quick Tags'}
                        <svg className={`w-3 h-3 transition-transform ${openFilter === 'tags' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      </button>
                      {openFilter === 'tags' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-1.5 min-w-[160px]">
                          {['None','one-pan','microwave','dorm-friendly','student-friendly','budget-friendly'].map((opt) => (
                            <button key={opt} onClick={() => { setSelectedTag(opt === 'None' ? null : opt); setOpenFilter(null); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${(selectedTag === opt) || (opt === 'None' && !selectedTag) ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-orange-50'}`}>{opt}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Clear filters */}
                    {(selectedMealType || selectedCookTime !== null || selectedCuisine || selectedDiet || selectedTag) && (
                      <button onClick={() => { setSelectedMealType(null); setSelectedCookTime(null); setSelectedCuisine(null); setSelectedDiet(null); setSelectedTag(null); }}
                        className="ml-auto text-xs text-gray-400 hover:text-orange-500 cursor-pointer transition-colors underline">
                        Clear filters
                      </button>
                    )}
                  </div>
                  {!nameSearchLoading && (
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-black text-gray-900">
                        <span className="text-orange-500">{filteredNameSearchResults.length}</span> recipes found for &ldquo;{searchQuery.trim()}&rdquo;
                      </p>
                    </div>
                  )}
                  {!nameSearchLoading && (
                    <p className="text-xs text-gray-400">
                      Showing recipes matching &ldquo;{searchQuery.trim()}&rdquo;
                      {' '}— <span className="text-gray-500">all recipes, not filtered by ingredients</span>
                    </p>
                  )}
                  {!nameSearchLoading && ingredients.length > 0 && (
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                      <span className="text-base shrink-0">⚠️</span>
                      <p className="flex-1 text-xs font-semibold text-amber-700">
                        Text search active — ingredient filters are paused. Clear search to use ingredients.
                      </p>
                      <button
                        onClick={() => { setSearchQuery(''); setNameSearchResults(null); }}
                        className="shrink-0 text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        ✕ Clear search
                      </button>
                    </div>
                  )}
                  {nameSearchLoading ? (
                    <div className="flex flex-col items-center py-20 gap-3">
                      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }}></div>
                      <p className="text-sm font-medium text-gray-400">Searching for &ldquo;{searchQuery}&rdquo;...</p>
                    </div>
                  ) : filteredNameSearchResults.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {cards(filteredNameSearchResults)}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-3">🔍</div>
                      <p className="font-semibold text-gray-700">No recipes found for &ldquo;{searchQuery}&rdquo;</p>
                      <button onClick={() => setSearchQuery('')} className="mt-3 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors duration-200">Clear search</button>
                    </div>
                  )}
                </div>
              )}

              {/* Ingredient-matched results */}
              {nameSearchResults === null && results && ingredients.length > 0 && (
                <div className="max-w-6xl space-y-2">
                  {/* Top summary row */}
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-black text-gray-900">
                        <span className="text-orange-500">{cookable}</span> recipes you can cook
                        {results.lowMatches.length > 0 && (
                          <span className="text-sm font-medium text-gray-400 ml-2">(+{results.lowMatches.length} more)</span>
                        )}
                      </p>
                      {loading && (
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }}></div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {!user && (
                        <p className="text-xs text-gray-400">
                          <button onClick={() => setShowAuthGate(true)} className="font-semibold text-orange-500 cursor-pointer">Sign in</button>
                          {' '}to save favorites
                        </p>
                      )}
                      {searchQuery.trim() && nameSearchResults === null && (
                        <p className="text-xs text-gray-400">
                          Filtering by &ldquo;{searchQuery.trim()}&rdquo; —{' '}
                          <span className="text-gray-500">{catFilteredFull.length + catFilteredNear.length + catFilteredLow.length} matches</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Compact inline filter bar */}
                  <div className="flex items-center gap-2 flex-wrap mb-6 pb-4 border-b border-gray-100">
                    {/* Meal Type */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setOpenFilter(openFilter === 'meal' ? null : 'meal')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${selectedMealType ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                        🍽️ {selectedMealType ?? 'Meal Type'}
                        <svg className={`w-3 h-3 transition-transform ${openFilter === 'meal' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      </button>
                      {openFilter === 'meal' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-1.5 min-w-[160px]">
                          {['All','Quick & Easy','Breakfast','Lunch','Dinner','Snacks','Salad','Side Dish','Dessert','Soups & Stews'].map((opt) => (
                            <button key={opt} onClick={() => { setSelectedMealType(opt === 'All' ? null : opt); setOpenFilter(null); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${(selectedMealType === opt) || (opt === 'All' && !selectedMealType) ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-orange-50'}`}>{opt}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Cook Time */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setOpenFilter(openFilter === 'time' ? null : 'time')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${selectedCookTime !== null ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                        ⏱️ {selectedCookTime !== null ? `≤${selectedCookTime}min` : 'Cook Time'}
                        <svg className={`w-3 h-3 transition-transform ${openFilter === 'time' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      </button>
                      {openFilter === 'time' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-1.5 min-w-[140px]">
                          {[{label:'Any',value:null},{label:'≤15 min',value:15},{label:'≤30 min',value:30},{label:'≤60 min',value:60},{label:'≤2 hrs',value:120}].map((opt) => (
                            <button key={opt.label} onClick={() => { setSelectedCookTime(opt.value); setOpenFilter(null); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${selectedCookTime === opt.value ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-orange-50'}`}>{opt.label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Cuisine */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setOpenFilter(openFilter === 'cuisine' ? null : 'cuisine')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${selectedCuisine ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                        🌍 {selectedCuisine ?? 'Cuisine'}
                        <svg className={`w-3 h-3 transition-transform ${openFilter === 'cuisine' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      </button>
                      {openFilter === 'cuisine' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-1.5 min-w-[160px]">
                          {['All','Asian','American','Italian','Indian','Thai','Korean','Chinese','Mexican','French','Mediterranean'].map((opt) => (
                            <button key={opt} onClick={() => { setSelectedCuisine(opt === 'All' ? null : opt); setOpenFilter(null); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${(selectedCuisine === opt) || (opt === 'All' && !selectedCuisine) ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-orange-50'}`}>{opt}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Diet dropdown */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setOpenFilter(openFilter === 'diet' ? null : 'diet')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${selectedDiet ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                        🥗 {selectedDiet ?? 'Diet'}
                        <svg className={`w-3 h-3 transition-transform ${openFilter === 'diet' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      </button>
                      {openFilter === 'diet' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-1.5 min-w-[150px]">
                          {['All','Vegetarian','Vegan','Gluten Free'].map((opt) => (
                            <button key={opt} onClick={() => { setSelectedDiet(opt === 'All' ? null : opt); setOpenFilter(null); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${(selectedDiet === opt) || (opt === 'All' && !selectedDiet) ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-orange-50'}`}>{opt}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Quick Tags dropdown */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setOpenFilter(openFilter === 'tags' ? null : 'tags')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer ${selectedTag ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                        ✨ {selectedTag ?? 'Quick Tags'}
                        <svg className={`w-3 h-3 transition-transform ${openFilter === 'tags' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                      </button>
                      {openFilter === 'tags' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-1.5 min-w-[160px]">
                          {['None','one-pan','microwave','dorm-friendly','student-friendly','budget-friendly'].map((opt) => (
                            <button key={opt} onClick={() => { setSelectedTag(opt === 'None' ? null : opt); setOpenFilter(null); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${(selectedTag === opt) || (opt === 'None' && !selectedTag) ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-orange-50'}`}>{opt}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Clear filters */}
                    {(selectedMealType || selectedCookTime !== null || selectedCuisine || selectedDiet || selectedTag) && (
                      <button onClick={() => { setSelectedMealType(null); setSelectedCookTime(null); setSelectedCuisine(null); setSelectedDiet(null); setSelectedTag(null); }}
                        className="ml-auto text-xs text-gray-400 hover:text-orange-500 cursor-pointer transition-colors underline">
                        Clear filters
                      </button>
                    )}
                  </div>

                  {/* "Do you have?" suggestions */}
                  {suggestions.length > 0 && (
                    <div className="rounded-2xl p-4 bg-white shadow-sm border border-gray-100">
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">
                        🤔 Do you have any of these? Adding them unlocks more recipes!
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {visibleSugg.map(({ ing, count }) => (
                          <button
                            key={ing}
                            onClick={() => { if (!ingredients.includes(ing)) setIngredients([...ingredients, ing]); }}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-300 hover:text-orange-500 transition-colors duration-200 cursor-pointer"
                          >
                            + {ing}
                            <span className="text-[10px] text-gray-400">×{count}</span>
                          </button>
                        ))}
                        {!showAllSugg && suggestions.length > 8 && (
                          <button
                            onClick={() => setShowAllSugg(true)}
                            className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-orange-500 hover:border-orange-300 transition-colors duration-200 cursor-pointer"
                          >
                            +{suggestions.length - 8} More
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Ready to Cook ── */}
                  {catFilteredFull.length > 0 && (
                    <section>
                      <div className="flex items-center gap-3 mb-6 mt-8">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Ready to Cook</h3>
                        <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2.5 py-1 rounded-full">{catFilteredFull.length}</span>
                        <div className="flex-1 h-px bg-gray-100"></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {cards(catFilteredFull)}
                      </div>
                    </section>
                  )}

                  {/* ── Near matches ── */}
                  {catFilteredNear.length > 0 && (
                    <section>
                      <div className="flex items-center gap-3 mb-6 mt-8">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Missing 1–2 Ingredients</h3>
                        <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2.5 py-1 rounded-full">{catFilteredNear.length}</span>
                        <div className="flex-1 h-px bg-gray-100"></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {cards(catFilteredNear)}
                      </div>
                    </section>
                  )}

                  {/* ── Low matches (collapsible) ── */}
                  {catFilteredLow.length > 0 && (
                    <section>
                      <button onClick={() => setShowLow(!showLow)} className="flex items-center gap-3 mb-6 mt-8 w-full group cursor-pointer">
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-300 shrink-0"></span>
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Missing 3+ Ingredients</h3>
                        <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2.5 py-1 rounded-full">{catFilteredLow.length}</span>
                        <div className="flex-1 h-px bg-gray-100"></div>
                        <span className="text-gray-400 text-xs shrink-0">{showLow ? '▲' : '▼'}</span>
                      </button>
                      {showLow && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                          {cards(catFilteredLow)}
                        </div>
                      )}
                    </section>
                  )}

                  {searchQuery && catFilteredFull.length === 0 && catFilteredNear.length === 0 && catFilteredLow.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-3">🔍</div>
                      <p className="font-semibold text-gray-700">No recipes match &ldquo;{searchQuery}&rdquo;</p>
                      <button onClick={() => setSearchQuery('')} className="mt-3 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors duration-200">Clear search</button>
                    </div>
                  )}

                  {cookable === 0 && results.lowMatches.length === 0 && !searchQuery && (
                    <div className="text-center py-20">
                      <div className="text-6xl mb-4">🔍</div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No matches found</h3>
                      <p className="text-sm text-gray-400">Try adding more ingredients or adjusting your filters.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        </main>
      </div>

      {/* Mobile filter bottom sheet */}
      {showMobileFilter && isMobile && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowMobileFilter(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-5">
            <div className="flex justify-center mb-3"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-800">Filters</h3>
              <button onClick={() => setShowMobileFilter(false)} className="text-gray-400 text-xl cursor-pointer">✕</button>
            </div>
            <div className="space-y-4 overflow-y-auto max-h-[55vh]">
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Meal Type</p>
                <div className="flex flex-wrap gap-2">
                  {['All','Quick & Easy','Breakfast','Lunch','Dinner','Dessert','Snacks'].map((opt) => (
                    <button key={opt} onClick={() => setSelectedMealType(opt === 'All' ? null : opt)}
                      className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer ${selectedMealType === opt || (opt === 'All' && !selectedMealType) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Cook Time</p>
                <div className="flex flex-wrap gap-2">
                  {[{label:'Any',value:null},{label:'≤15 min',value:15},{label:'≤30 min',value:30},{label:'≤60 min',value:60}].map((opt) => (
                    <button key={opt.label} onClick={() => setSelectedCookTime(opt.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer ${selectedCookTime === opt.value ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Cuisine</p>
                <div className="flex flex-wrap gap-2">
                  {['All','Asian','American','Italian','Indian','Mexican','French'].map((opt) => (
                    <button key={opt} onClick={() => setSelectedCuisine(opt === 'All' ? null : opt)}
                      className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer ${selectedCuisine === opt || (opt === 'All' && !selectedCuisine) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Diet</p>
                <div className="flex flex-wrap gap-2">
                  {['All','Vegetarian','Vegan','Gluten Free'].map((opt) => (
                    <button key={opt} onClick={() => setSelectedDiet(opt === 'All' ? null : opt)}
                      className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer ${selectedDiet === opt || (opt === 'All' && !selectedDiet) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {(selectedMealType || selectedCookTime !== null || selectedCuisine || selectedDiet) && (
              <button onClick={() => { setSelectedMealType(null); setSelectedCookTime(null); setSelectedCuisine(null); setSelectedDiet(null); }}
                className="mt-3 text-xs text-gray-400 hover:text-orange-500 cursor-pointer underline">
                Clear all filters
              </button>
            )}
            <button onClick={() => setShowMobileFilter(false)}
              className="mt-4 w-full py-3 rounded-full text-white font-bold text-sm cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}>
              Apply Filters
            </button>
          </div>
        </>
      )}

      {selectedRecipe && (
        <RecipeDetailPanel
          recipe={selectedRecipe}
          recipeIndex={selectedRecipeIndex}
          relatedRecipes={related}
          isFavorited={favorites.has(selectedRecipe._id)}
          isLoggedIn={!!user}
          collections={collections}
          onToggleFavorite={toggleFavorite}
          onSaveToCollection={handleSaveToCollection}
          onRemoveFromCollection={handleRemoveFromCollection}
          onCreateCollection={handleCreateCollection}
          onNeedAuth={handleNeedAuth}
          onClose={() => setSelectedRecipe(null)}
          onSelectRecipe={openRecipe}
          onToast={addToast}
        />
      )}

      {showAuthGate && (
        <AuthGateModal
          onClose={() => setShowAuthGate(false)}
          onSignUp={() => { setShowAuthGate(false); router.push('/signup'); }}
        />
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
