'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import IngredientInput from '@/components/IngredientInput';
import IngredientCategories from '@/components/IngredientCategories';
import FilterPanel from '@/components/FilterPanel';
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

const HERO_EMOJIS = ['🍝','🥗','🍜','🌮','🍳','🍲','🥘','🍕','🥞','🍱','🥙','🫕','🍛','🍔','🥩','🍤','🍚','🥦'];

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
  const [sidebarTab, setSidebarTab]   = useState<'ingredients' | 'filters'>('ingredients');
  const [selectedRecipe, setSelectedRecipe] = useState<MatchedRecipe | null>(null);
  const [showAuthGate, setShowAuthGate]     = useState(false);
  const [showAllSugg, setShowAllSugg]       = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [nameSearchResults, setNameSearchResults] = useState<MatchedRecipe[] | null>(null);
  const [nameSearchLoading, setNameSearchLoading] = useState(false);
  const [initialized, setInitialized]      = useState(false);
  const { toasts, addToast } = useToast();

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

  // Re-hydrate auth state from httpOnly cookie (e.g. after redirect from /login or /signup)
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
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
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
        setNameSearchResults([]);
      } finally {
        setNameSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
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

  function handleSearchByName(query: string) {
    setSearchQuery(query);
    addToast(`Searching recipes for "${query}" 🔍`);
  }

  function openRecipe(recipe: MatchedRecipe) {
    setSelectedRecipe(recipe);
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

  function cards(list: MatchedRecipe[]) {
    // Deduplicate by _id before rendering (defence against any DB-level duplicates)
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
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#F8F9FA' }}>
      <Header user={user} onLogin={handleLogin} onRegister={handleRegister} onLogout={handleLogout} onLogoClick={handleLogoClick} searchQuery={searchQuery} onSearchChange={setSearchQuery} isSearching={nameSearchLoading} />

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-72 shrink-0 flex flex-col overflow-hidden border-r border-[#E8ECEF]" style={{ background: '#F8F9FA' }}>
          {/* Tabs */}
          <div className="flex border-b border-[#E8ECEF] bg-white shrink-0">
            {(['ingredients','filters'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                className="flex-1 py-3 text-xs font-black uppercase tracking-wider capitalize transition-all"
                style={sidebarTab === tab
                  ? { color: '#FF6B6B', borderBottom: '2px solid #FF6B6B' }
                  : { color: '#bbb' }}
              >
                {tab === 'ingredients' ? '🧺 ' : '🎛️ '}{tab}
              </button>
            ))}
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto sidebar-scroll p-4">
            {sidebarTab === 'ingredients' ? (
              <>
                <p className="text-[10px] font-black text-[#bbb] uppercase tracking-wider mb-2 px-1">Add Ingredients</p>
                <IngredientInput ingredients={ingredients} onIngredientsChange={setIngredients} onSearchByName={handleSearchByName} />
                <IngredientCategories ingredients={ingredients} onIngredientsChange={setIngredients} />
              </>
            ) : (
              <FilterPanel filters={filters} onFiltersChange={setFilters} />
            )}
          </div>

          {/* Stats footer */}
          {results && ingredients.length > 0 && cookable > 0 && (
            <div className="shrink-0 border-t border-[#E8ECEF] bg-white px-4 py-3">
              <p className="text-sm font-semibold text-[#666]">
                <span className="text-2xl font-black" style={{ color: '#FF6B6B' }}>{cookable}</span>
                {' '}recipes you can cook
              </p>
            </div>
          )}
        </aside>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto flex flex-col" style={{ background: '#F8F9FA' }}>
          <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Hero (no ingredients AND no search) */}
          {ingredients.length === 0 && !searchQuery.trim() && (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#FFF5F5 0%,#FFF9F0 50%,#F0FBF7 100%)' }}>
              {/* Background emojis - static array, no split() to avoid hydration issues */}
              <div className="absolute inset-0 overflow-hidden opacity-[0.07] select-none pointer-events-none flex flex-wrap gap-8 p-8 text-5xl" aria-hidden="true">
                {HERO_EMOJIS.map((e, i) => <span key={i}>{e}</span>)}
              </div>

              <div className="relative max-w-xl mx-auto px-6 py-16 text-center">
                <div className="inline-flex items-center gap-2 text-xs font-black px-4 py-2 rounded-full mb-6 uppercase tracking-wider" style={{ background: '#FFF5F5', color: '#FF6B6B' }}>
                  <span className="w-2 h-2 rounded-full bg-[#FF6B6B] animate-pulse"></span>
                  Ingredient-first recipe matching
                </div>
                <h1 className="text-4xl sm:text-5xl font-black text-[#2C2C2C] mb-4 leading-tight">
                  Cook What You{' '}
                  <span style={{ color: '#FF6B6B' }}>Have</span>
                  {' '}🍳
                </h1>
                <p className="text-[#666] text-lg mb-8 font-semibold max-w-md mx-auto">
                  Add ingredients from your fridge and instantly find every recipe you can make.
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-sm font-bold text-[#666]">
                  {['Full matches first','Near matches (1-2 missing)','Filter by diet & time'].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <span style={{ color: '#52C9A0' }}>✓</span> {t}
                    </span>
                  ))}
                </div>
                <p className="mt-6 text-xs font-semibold text-[#bbb]">← Add ingredients in the sidebar to get started</p>
              </div>
            </div>
          )}

          {(ingredients.length > 0 || searchQuery.trim() || loading) && <div className="p-6">
            {loading && !results && ingredients.length > 0 && !nameSearchResults && (
              <div className="flex flex-col items-center py-20 gap-3">
                <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }}></div>
                <p className="text-sm font-bold text-[#999]">Finding recipes...</p>
              </div>
            )}

            {/* ── Name-search results (DB-wide, ignores ingredient matching) ── */}
            {nameSearchResults !== null && (
              <div className="space-y-6 max-w-6xl">
                {/* Header */}
                {!nameSearchLoading && (
                  <div className="flex items-center gap-3">
                    <p className="text-2xl font-black text-[#2C2C2C]">
                      <span style={{ color: '#FF6B6B' }}>{nameSearchResults.length}</span> recipes found for &ldquo;{searchQuery.trim()}&rdquo;
                    </p>
                  </div>
                )}
                {/* Label */}
                {!nameSearchLoading && (
                  <p className="text-xs font-semibold text-[#aaa]">
                    Showing recipes matching &ldquo;{searchQuery.trim()}&rdquo;
                    {' '}— <span className="text-[#666]">all recipes, not filtered by ingredients</span>
                  </p>
                )}
                {nameSearchLoading ? (
                  <div className="flex flex-col items-center py-20 gap-3">
                    <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }}></div>
                    <p className="text-sm font-bold text-[#999]">Searching for &ldquo;{searchQuery}&rdquo;...</p>
                  </div>
                ) : nameSearchResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {cards(nameSearchResults.filter((r, i, arr) => arr.findIndex((x) => x._id === r._id) === i))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">🔍</div>
                    <p className="font-black text-[#2C2C2C]">No recipes found for &ldquo;{searchQuery}&rdquo;</p>
                    <button onClick={() => setSearchQuery('')} className="mt-3 text-sm font-bold" style={{ color: '#FF6B6B' }}>Clear search</button>
                  </div>
                )}
              </div>
            )}

            {nameSearchResults === null && results && ingredients.length > 0 && (
              <div className="space-y-8 max-w-6xl">
                {/* Header row */}
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <p className="text-2xl font-black text-[#2C2C2C]">
                      <span style={{ color: '#FF6B6B' }}>{cookable}</span> recipes you can cook
                      {results.lowMatches.length > 0 && (
                        <span className="text-sm font-bold text-[#bbb] ml-2">(+{results.lowMatches.length} more)</span>
                      )}
                    </p>
                    {loading && (
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }}></div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {!user && (
                      <p className="text-xs font-bold text-[#bbb]">
                        <button onClick={() => setShowAuthGate(true)} className="font-black" style={{ color: '#FF6B6B' }}>Sign in</button>
                        {' '}to save favorites
                      </p>
                    )}
                    {searchQuery.trim() && nameSearchResults === null && (
                      <p className="text-xs font-semibold text-[#aaa]">
                        Filtering by &ldquo;{searchQuery.trim()}&rdquo; —{' '}
                        <span className="text-[#666]">
                          {filteredFull.length + filteredNear.length + filteredLow.length} matches
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* "Do you have?" suggestions */}
                {suggestions.length > 0 && (
                  <div className="rounded-3xl border border-[#F0F0F0] p-4 bg-white shadow-sm">
                    <p className="text-xs font-black text-[#2C2C2C] uppercase tracking-wider mb-3">
                      🤔 Do you have any of these? Adding them unlocks more recipes!
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {visibleSugg.map(({ ing, count }) => (
                        <button
                          key={ing}
                          onClick={() => { if (!ingredients.includes(ing)) setIngredients([...ingredients, ing]); }}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all hover:opacity-90"
                          style={{ background: '#F8F9FA', borderColor: '#E8ECEF', color: '#444' }}
                        >
                          + {ing}
                          <span className="text-[10px] text-[#bbb]">×{count}</span>
                        </button>
                      ))}
                      {!showAllSugg && suggestions.length > 8 && (
                        <button
                          onClick={() => setShowAllSugg(true)}
                          className="text-xs font-black px-3 py-1.5 rounded-full border border-[#E8ECEF] transition-colors hover:border-[#FF6B6B]"
                          style={{ color: '#FF6B6B' }}
                        >
                          +{suggestions.length - 8} More
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Full matches */}
                {filteredFull.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#52C9A0' }}></span>
                      <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: '#52C9A0' }}>
                        Ready to Cook — {filteredFull.length}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {cards(filteredFull)}
                    </div>
                  </section>
                )}

                {/* Near matches */}
                {filteredNear.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <h3 className="text-sm font-black uppercase tracking-wider text-amber-500">
                        Missing 1–2 Ingredients — {filteredNear.length}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {cards(filteredNear)}
                    </div>
                  </section>
                )}

                {/* Low matches */}
                {filteredLow.length > 0 && (
                  <section>
                    <button onClick={() => setShowLow(!showLow)} className="flex items-center gap-2 mb-4 group">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
                      <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 group-hover:text-gray-500 transition-colors">
                        Missing 3+ Ingredients — {filteredLow.length}
                      </h3>
                      <span className="text-gray-400 text-xs">{showLow ? '▲' : '▼'}</span>
                    </button>
                    {showLow && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {cards(filteredLow)}
                      </div>
                    )}
                  </section>
                )}

                {searchQuery && filteredFull.length === 0 && filteredNear.length === 0 && filteredLow.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">🔍</div>
                    <p className="font-black text-[#2C2C2C]">No recipes match &ldquo;{searchQuery}&rdquo;</p>
                    <button onClick={() => setSearchQuery('')} className="mt-3 text-sm font-bold" style={{ color: '#FF6B6B' }}>Clear search</button>
                  </div>
                )}

                {cookable === 0 && results.lowMatches.length === 0 && !searchQuery && (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-lg font-black text-[#2C2C2C] mb-2">No matches found</h3>
                    <p className="text-sm font-semibold text-[#999]">Try adding more ingredients or adjusting your filters.</p>
                  </div>
                )}
              </div>
            )}
          </div>}
          </div>
        </main>
      </div>

      {selectedRecipe && (
        <RecipeDetailPanel
          recipe={selectedRecipe}
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
