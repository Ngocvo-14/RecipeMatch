'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Recipe, Collection } from '@/types';
import { getFoodImageUrl } from '@/lib/foodImage';
import { formatCookTime } from '@/lib/formatCookTime';
import Toast, { useToast } from '@/components/Toast';

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [relatedRecipes, setRelatedRecipes] = useState<Recipe[]>([]);
  const recipeHistory = useRef<string[]>([]);
  const [generatedSteps, setGeneratedSteps] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // auth + favorites
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // ⋯ share dropdown
  const [showShare, setShowShare] = useState(false);
  const shareRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // save to collection modal
  const [showCollPicker, setShowCollPicker] = useState(false);
  const [savingCollId, setSavingCollId] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingColls, setLoadingColls] = useState(false);
  const [collsLoaded, setCollsLoaded] = useState(false);
  const [newCollName, setNewCollName] = useState('');
  const [creatingColl, setCreatingColl] = useState(false);

  const { toasts, addToast } = useToast();

  // ── close share dropdown on outside click ───────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const insideButton = shareRef.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideButton && !insideMenu) {
        setShowShare(false);
      }
    }
    if (showShare) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showShare]);

  // ── load auth + favorite status ─────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/user/me');
        if (res.ok) {
          const data = await res.json();
          setIsLoggedIn(true);
          setToken(data.token);
          setDisplayName(data.user?.username || data.user?.email?.split('@')[0] || '');
          // Check favorite status immediately using the fresh token
          if (id) {
            const favRes = await fetch('/api/user/favorites', {
              headers: { Authorization: `Bearer ${data.token}` },
            });
            if (favRes.ok) {
              const favData = await favRes.json();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const ids = favData.favorites.map((f: any) => {
                if (!f.recipeId) return null;
                if (typeof f.recipeId === 'object') return f.recipeId._id?.toString() ?? null;
                return f.recipeId.toString();
              }).filter(Boolean);
              setFavorited(ids.includes(id));
            }
          }
        }
      } catch { /* not logged in */ }
    }
    init();
  }, [id]);

  // ── scroll to top on recipe change ──────────────────────────────────────
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  // ── load recipe ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setRelatedRecipes([]);
    async function load() {
      try {
        const res = await fetch(`/api/recipes/${id}`);
        if (!res.ok) throw new Error();
        setRecipe(await res.json());
        fetch('/api/user/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipeId: id }),
        }).catch(() => {});
      } catch { setError('Recipe not found.'); }
      finally { setLoading(false); }
    }
    load();
  }, [id]);

  // ── AI-generated steps for recipes with no real instructions ────────────
  useEffect(() => {
    const hasInstructions =
      recipe?.instructions &&
      recipe.instructions.filter(
        (i: string) => i.trim().length > 0 && !/^step\s+\d+:?$/i.test(i.trim())
      ).length > 0

    if (recipe && !hasInstructions) {
      setIsGenerating(true)
      fetch('/api/recipes/generate-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: recipe.title,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ingredients: recipe.ingredients?.map((i: any) =>
            typeof i === 'string' ? i : i.name
          ) || [],
          cuisine: recipe.cuisine,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.steps && data.steps.length > 0) {
            setGeneratedSteps(data.steps)
            // Cache back to MongoDB so future views skip regeneration
            if (/^[0-9a-fA-F]{24}$/.test(recipe._id as string)) {
              fetch(`/api/recipes/${recipe._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instructions: data.steps }),
              }).catch(() => {})
            }
          }
        })
        .catch((err) => console.error('Failed to generate steps:', err))
        .finally(() => setIsGenerating(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?._id]);

  // ── load related recipes ─────────────────────────────────────────────────
  useEffect(() => {
    if (!recipe?.cuisine) return;
    fetch(`/api/recipes/search?q=${encodeURIComponent(recipe.cuisine)}`)
      .then((r) => r.json())
      .then((data) => {
        const others = (data.recipes || [])
          .filter((r: Recipe) => r._id?.toString() !== recipe._id?.toString())
          .slice(0, 4);
        setRelatedRecipes(others);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?._id]);

  // ── actions ─────────────────────────────────────────────────────────────
  async function toggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isLoggedIn) { addToast('Sign in to save favorites'); return; }
    if (favLoading) return;
    setFavLoading(true);
    try {
      const res = await fetch('/api/user/favorites', {
        method: favorited ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ recipeId: id }),
      });
      if (res.ok) {
        setFavorited(!favorited);
        addToast(favorited ? 'Removed from Favorites' : 'Added to Favorites ❤️');
      }
    } catch { /* ignore */ }
    setFavLoading(false);
  }

  async function copyLink() {
    const url = window.location.href;
    setShowShare(false);
    try {
      await navigator.clipboard.writeText(url);
      addToast('Link copied! ✓');
    } catch {
      // Fallback for browsers that block clipboard API
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      addToast('Link copied! ✓');
    }
  }

  async function shareRecipe() {
    setShowShare(false);
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe?.title ?? '',
          text: recipe?.description || recipe?.title || '',
          url: window.location.href,
        });
      } catch { /* user cancelled */ }
    } else {
      // Fallback: copy link if Web Share API not available
      await navigator.clipboard.writeText(window.location.href).catch(() => {});
      addToast('Link copied to clipboard!');
    }
  }

  function handleRelatedClick(relatedId: string) {
    recipeHistory.current.push(id as string);
    router.push(`/recipe/${relatedId}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function openCollPicker() {
    setShowShare(false);
    if (!isLoggedIn) { addToast('Sign in to save to a collection'); return; }
    setShowCollPicker(true);
    if (!collsLoaded) {
      setLoadingColls(true);
      try {
        const headers: HeadersInit = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/collections?populate=1', { headers });
        if (res.ok) {
          const data = await res.json();
          setCollections(data.collections || []);
        }
      } catch { /* ignore */ }
      setLoadingColls(false);
      setCollsLoaded(true);
    }
  }

  async function saveToCollection(collId: string, collName: string) {
    if (savingCollId) return;
    setSavingCollId(collId);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`/api/collections/${collId}/recipes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ recipeId: id }),
      });
      addToast(`Saved to "${collName}"!`);
      setShowCollPicker(false);
    } catch { /* ignore */ }
    setSavingCollId(null);
  }

  async function createAndSave() {
    const name = newCollName.trim();
    if (!name || creatingColl) return;
    setCreatingColl(true);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, emoji: '📁' }),
      });
      if (res.ok) {
        const data = await res.json();
        const newColl: Collection = { ...data.collection, recipes: [] };
        setCollections((prev) => [...prev, newColl]);
        await saveToCollection(newColl._id, newColl.name);
        setNewCollName('');
      }
    } catch { /* ignore */ }
    setCreatingColl(false);
  }

  // ── loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center gap-4">
        <p className="text-[#666] font-semibold">{error || 'Recipe not found'}</p>
        <button onClick={() => router.back()} className="font-black text-sm px-5 py-2.5 rounded-full text-white hover:opacity-90" style={{ background: '#FF6B6B' }}>
          ← Go back
        </button>
      </div>
    );
  }

  const url = recipe.imageUrl || (recipe as any).image || '';
  const imgUrl = url && url.startsWith('http') ? url : 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800';

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Nav — back | logo centered | username */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8ECEF] px-4 py-2.5 grid grid-cols-3 items-center shadow-sm">
        {/* Left — back */}
        <div className="justify-self-start">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm font-black hover:opacity-80 transition-opacity cursor-pointer shrink-0"
            style={{ color: '#FF6B6B' }}
          >
            <span>←</span><span className="hidden md:inline"> Go Back</span>
          </button>
        </div>

        {/* Center — RecipeMatch logo */}
        <Link href="/" className="justify-self-center flex items-center gap-3 group">
          <div className="relative">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="19" fill="#FFF7ED" stroke="#FED7AA" strokeWidth="1.5"/>
              <circle cx="20" cy="20" r="15" fill="none" stroke="#FDBA74" strokeWidth="0.5" strokeDasharray="2 3"/>
              <line x1="13" y1="9" x2="13" y2="14" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
              <line x1="15.5" y1="9" x2="15.5" y2="14" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
              <path d="M13 14 Q14.25 16 14.25 17.5 L14.25 30" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
              <ellipse cx="25" cy="12" rx="2.8" ry="3.5" stroke="#EA580C" strokeWidth="2"/>
              <line x1="25" y1="15.5" x2="25" y2="30" stroke="#EA580C" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="31" cy="10" r="2.5" fill="#FCD34D"/>
              <circle cx="31" cy="10" r="1.2" fill="#F59E0B"/>
            </svg>
            <span className="absolute top-1.5 right-1 w-2 h-2 rounded-full bg-yellow-400 opacity-75 animate-ping" />
          </div>
          <div className="hidden md:flex items-baseline gap-0">
            <span className="text-gray-900 font-extrabold text-xl tracking-tight group-hover:text-gray-700 transition-colors">Recipe</span>
            <span className="font-extrabold text-xl tracking-tight text-orange-500">Match</span>
          </div>
        </Link>

        {/* Right — username or sign in */}
        <div className="justify-self-end flex justify-end">
          {isLoggedIn ? (
            <Link href="/library" className="text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors cursor-pointer">
              {displayName}
            </Link>
          ) : (
            <Link href="/" className="text-sm font-medium text-gray-400 hover:text-orange-500 transition-colors cursor-pointer">
              Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Hero photo */}
      <div className="relative h-48 md:h-64 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              if (!t.dataset.errored) {
                t.dataset.errored = '1';
                t.src = getFoodImageUrl(recipe.title);
              }
            }}
          />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Tags bottom-left */}
        <div className="absolute bottom-5 left-5 flex flex-wrap gap-2">
          {[recipe.cuisine, recipe.mealType, recipe.difficulty].filter(Boolean).map((tag) => (
            <span key={tag} className="bg-white/90 backdrop-blur-sm text-[#2C2C2C] text-xs font-black px-3 py-1 rounded-full shadow-sm">
              {tag}
            </span>
          ))}
          {recipe.diet?.map((d) => (
            <span key={d} className="text-xs font-black px-3 py-1 rounded-full" style={{ background: '#F0FBF7', color: '#52C9A0' }}>
              {d}
            </span>
          ))}
        </div>

        {/* ⋯ button — top-right of hero */}
        <button
          ref={shareRef}
          onClick={() => setShowShare((v) => !v)}
          className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#666] font-black text-lg shadow-md hover:bg-white transition-colors select-none z-20"
        >
          ···
        </button>

        {showShare && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowShare(false)} />
            <div ref={menuRef} className="fixed top-16 right-4 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-44">
              <button
                onClick={copyLink}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-gray-700 cursor-pointer transition-colors"
              >
                <span>🔗</span><span>Copy Link</span>
              </button>
              <div className="h-px bg-gray-100 mx-3" />
              <button
                onClick={shareRecipe}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-gray-700 cursor-pointer transition-colors"
              >
                <span>📤</span><span>Share</span>
              </button>
              <div className="h-px bg-gray-100 mx-3" />
              <button
                onClick={openCollPicker}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-gray-700 cursor-pointer transition-colors"
              >
                <span>📌</span><span>Save to Collection</span>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        {/* Title card */}
        <div className="bg-white rounded-3xl border border-[#F0F0F0] p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-2">
            <h1 className="flex-1 text-2xl md:text-3xl font-black text-[#2C2C2C] leading-tight">{recipe.title}</h1>
            {/* Single heart button */}
            <button
              onClick={toggleFavorite}
              disabled={favLoading}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center border transition-all hover:scale-110 disabled:opacity-50 mt-1"
              style={favorited
                ? { background: '#FFF5F5', borderColor: '#FFE0E0' }
                : { background: '#F8F9FA', borderColor: '#E8ECEF' }}
              title={favorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <span className="text-lg">{favorited ? '❤️' : '🤍'}</span>
            </button>
          </div>
          {recipe.description && <p className="text-[#666] font-semibold mb-5">{recipe.description}</p>}
          <div className="flex flex-wrap gap-6 border-t border-[#F5F5F5] pt-5">
            {[
              { label: 'Cook Time', value: formatCookTime(recipe.cookTime) },
              { label: 'Servings',  value: `${recipe.servings} people` },
              { label: 'Difficulty', value: recipe.difficulty },
              ...(recipe.estimatedCost ? [{ label: 'Est. Cost', value: `$${recipe.estimatedCost}` }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-xl font-black text-[#2C2C2C]">{value}</p>
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Ingredients */}
          <div className="bg-white rounded-3xl border border-[#F0F0F0] p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#2C2C2C] mb-4">🧂 Ingredients</h2>
            <ul className="space-y-3">
              {(recipe.ingredients || []).map((ing: any, i: number) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#52C9A0' }}></span>
                  <span className="text-sm font-semibold text-[#444]">
                    {typeof ing === 'string' ? ing : (
                      <>
                        {ing.quantity && <span className="font-black text-[#2C2C2C] mr-1.5">{ing.quantity}</span>}
                        {ing.name}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tags + Equipment */}
          <div className="space-y-5">
            {recipe.tags?.length > 0 && (
              <div className="bg-white rounded-3xl border border-[#F0F0F0] p-5 shadow-sm">
                <h3 className="text-xs font-black text-[#999] uppercase tracking-wider mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((tag) => (
                    <span key={tag} className="text-xs font-bold px-3 py-1 rounded-full bg-[#F8F9FA] text-[#666] border border-[#E8ECEF]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {recipe.equipment?.length > 0 && (
              <div className="bg-white rounded-3xl border border-[#F0F0F0] p-5 shadow-sm">
                <h3 className="text-xs font-black text-[#999] uppercase tracking-wider mb-3">Equipment</h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.equipment.map((eq) => (
                    <span key={eq} className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#FFF5F5', color: '#FF6B6B', border: '1px solid #FFE0E0' }}>
                      {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nutrition Facts */}
        {recipe.nutrition && (
          <div className="bg-white rounded-3xl border border-[#F0F0F0] p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#2C2C2C] mb-4">🥗 Nutrition Facts</h2>
            <p className="text-xs font-semibold text-[#bbb] mb-4 uppercase tracking-wider">Per serving</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[
                { label: 'Calories',    value: recipe.nutrition.calories,     unit: 'kcal', highlight: true },
                { label: 'Protein',     value: recipe.nutrition.protein,      unit: 'g' },
                { label: 'Carbs',       value: recipe.nutrition.carbs,        unit: 'g' },
                { label: 'Fat',         value: recipe.nutrition.fat,          unit: 'g' },
                { label: 'Fiber',       value: recipe.nutrition.fiber,        unit: 'g' },
                { label: 'Sugar',       value: recipe.nutrition.sugar,        unit: 'g' },
                { label: 'Sat Fat',     value: recipe.nutrition.saturatedFat, unit: 'g' },
                { label: 'Sodium',      value: recipe.nutrition.sodium,       unit: 'mg' },
                { label: 'Cholesterol', value: recipe.nutrition.cholesterol,  unit: 'mg' },
              ].map(({ label, value, unit, highlight }) => (
                <div key={label}
                  className={`text-center p-3 rounded-2xl ${highlight ? 'col-span-full sm:col-span-1' : ''}`}
                  style={{ background: highlight ? '#FFF5F5' : '#F8F9FA' }}>
                  <p className="text-xl font-black" style={{ color: highlight ? '#FF6B6B' : '#2C2C2C' }}>
                    {value}<span className="text-xs font-bold text-[#999] ml-0.5">{unit}</span>
                  </p>
                  <p className="text-[10px] font-bold text-[#999] uppercase tracking-wider mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-3xl border border-[#F0F0F0] p-6 shadow-sm">
          <h2 className="text-lg font-black text-[#2C2C2C] mb-5">📋 Instructions</h2>

          {recipe.instructions &&
          recipe.instructions.filter(
            (s: string) => s.trim().length > 0 && !/^step\s+\d+:?$/i.test(s.trim())
          ).length > 0 ? (
            /* ── Real instructions ── */
            <ol className="space-y-4">
              {recipe.instructions
                .filter((step: string) => !(/^step\s+\d+:?$/i.test(step.trim())))
                .map((step: string) => step.replace(/^step\s+\d+:?\s*/i, '').trim())
                .filter((step: string) => step.length > 0)
                .map((step: string, i: number) => (
                  <li key={i} className="flex gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black" style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}>
                      {i + 1}
                    </div>
                    <p className="text-[#444] font-semibold pt-1 leading-relaxed">{step}</p>
                  </li>
                ))}
            </ol>
          ) : isGenerating ? (
            /* ── Loading while AI generates ── */
            <div className="flex items-center gap-3 py-8 text-gray-400">
              <div className="animate-spin w-5 h-5 border-2 border-t-transparent rounded-full" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }} />
              <span>✨ Generating cooking guide...</span>
            </div>
          ) : generatedSteps.length > 0 ? (
            /* ── AI-generated cooking guide ── */
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span>✨</span>
                <h3 className="font-semibold text-amber-800 text-lg">Quick Cooking Guide</h3>
                <span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-medium">AI Generated</span>
              </div>
              <p className="text-sm text-amber-700 mb-5">
                Based on this recipe&apos;s ingredients — a general guide to get you started:
              </p>
              <ol className="space-y-3">
                {generatedSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-amber-900">
                    <span className="flex-shrink-0 w-6 h-6 bg-amber-400 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
              {recipe.sourceUrl && (
                <div className="mt-5 pt-4 border-t border-amber-200">
                  <p className="text-xs text-amber-600 mb-2">
                    For the complete, accurate recipe with exact measurements:
                  </p>
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                  >
                    View full recipe at original source →
                  </a>
                </div>
              )}
            </div>
          ) : (
            /* ── Fallback: generation failed or API key missing ── */
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">
                Step-by-step instructions aren&apos;t available for this recipe.
              </p>
              {recipe.sourceUrl && (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
                >
                  Full instructions at source →
                </a>
              )}
            </div>
          )}
        </div>

        {/* More Ways to Make This Recipe */}
        <div className="bg-white rounded-3xl border border-[#F0F0F0] p-6 shadow-sm">
          <h2 className="text-lg font-black text-[#2C2C2C] mb-1">🎬 More Ways to Make This Recipe</h2>
          <p className="text-sm font-semibold text-[#999] mb-5">Explore video tutorials and methods on YouTube</p>

          {/* Primary link — subtle pill card */}
          {(() => {
            const query = recipe.title + ' recipe';
            return (
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-[#E8ECEF] bg-[#F8F9FA] hover:border-[#FF6B6B] hover:shadow-md transition-all mb-4 max-w-lg"
              >
                {/* YouTube icon — red accent only */}
                <span className="shrink-0 w-9 h-9 rounded-full bg-white border border-[#E8ECEF] flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FF0000">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                    <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#2C2C2C] truncate group-hover:text-[#FF6B6B] transition-colors">
                    {recipe.title} recipe
                  </p>
                  <p className="text-xs font-semibold text-[#999]">youtube.com · Search results</p>
                </div>
                {/* External link icon */}
                <svg className="w-4 h-4 text-[#bbb] shrink-0 group-hover:text-[#FF6B6B] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            );
          })()}

          {/* Secondary search variants */}
          <div className="flex flex-wrap gap-2">
            {[
              `${recipe.title} easy recipe`,
              `${recipe.title} step by step`,
              `${recipe.title} quick version`,
            ].map((q) => (
              <a
                key={q}
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-[#E8ECEF] bg-white text-[#666] hover:border-[#FF6B6B] hover:text-[#FF6B6B] transition-all"
              >
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="#FF0000">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                  <path fill="white" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                {q}
              </a>
            ))}
          </div>
        </div>

        {/* You Might Also Like */}
        {relatedRecipes.length > 0 && (
          <div className="bg-white rounded-3xl border border-[#F0F0F0] p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#2C2C2C] mb-2">🍴 You Might Also Like</h2>
            <div className="space-y-0">
              {relatedRecipes.map((r, i) => {
                const rUrlRaw = (r as any).imageUrl || (r as any).image || '';
                const rImg = rUrlRaw && rUrlRaw.startsWith('http') ? rUrlRaw : getFoodImageUrl(r.title || '');
                return (
                  <div key={r._id as string}>
                    {i > 0 && <div className="border-t border-[#F5F5F5]" />}
                    <button
                      onClick={() => handleRelatedClick(r._id as string)}
                      className="w-full flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-xl hover:bg-orange-50 transition-colors cursor-pointer group text-left"
                    >
                      <div className="shrink-0 w-12 h-12 rounded-2xl overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={rImg}
                          alt={r.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const t = e.target as HTMLImageElement;
                            if (!t.dataset.errored) { t.dataset.errored = '1'; t.src = getFoodImageUrl(r.title); }
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-[#2C2C2C] line-clamp-1 group-hover:text-orange-500 transition-colors">{r.title}</p>
                        <p className="text-xs font-semibold text-[#bbb]">{r.cuisine} · {formatCookTime(r.cookTime)}</p>
                      </div>
                      <span className="text-sm font-bold text-[#ccc] group-hover:text-orange-400 transition-colors shrink-0">→</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-center pb-8">
          {recipeHistory.current.length > 0 ? (
            <button
              onClick={() => {
                const prevId = recipeHistory.current.pop();
                router.push(`/recipe/${prevId}`, { scroll: false });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 text-white font-black px-8 py-3 rounded-full transition-all hover:opacity-90 shadow-md text-sm"
              style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
            >
              ← Back to Previous Recipe
            </button>
          ) : (
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-white font-black px-8 py-3 rounded-full transition-all hover:opacity-90 shadow-md text-sm"
              style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
            >
              ← Go Back
            </button>
          )}
        </div>
      </div>

      {/* Save to Collection modal */}
      {showCollPicker && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCollPicker(false); }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-black text-[#2C2C2C] uppercase tracking-wider">📌 Save to Collection</p>
              <button onClick={() => setShowCollPicker(false)} className="text-[#bbb] hover:text-[#666] font-black text-xl leading-none">×</button>
            </div>

            <div className="space-y-1 mb-3">
              {loadingColls && (
                <p className="text-xs text-[#bbb] font-semibold py-2">Loading collections...</p>
              )}
              {!loadingColls && collections.length === 0 && (
                <p className="text-xs text-[#bbb] font-semibold py-2">No collections yet — create one below.</p>
              )}
              {!loadingColls && collections.map((col) => (
                <button
                  key={col._id}
                  onClick={() => saveToCollection(col._id, col.name)}
                  disabled={savingCollId !== null}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white hover:border-[#FF6154] border border-[#F0F0F0] transition-all text-left group disabled:opacity-60"
                >
                  <span className="text-lg">{col.emoji}</span>
                  <span className="text-sm font-bold text-[#2C2C2C] flex-1 group-hover:text-[#FF6154] transition-colors">{col.name}</span>
                  {savingCollId === col._id
                    ? <span className="text-xs text-[#FF6154] font-bold">Saving…</span>
                    : <span className="text-xs text-[#bbb]">{(col.recipes || []).length}</span>
                  }
                </button>
              ))}
            </div>

            <div className="border-t border-[#F0F0F0] pt-3">
              <p className="text-[10px] font-black text-[#bbb] uppercase tracking-wider mb-2">New Collection</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCollName}
                  onChange={(e) => setNewCollName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createAndSave(); }}
                  placeholder="Collection name..."
                  className="flex-1 text-sm font-semibold px-3 py-2 rounded-xl border border-[#E8ECEF] bg-white focus:outline-none focus:border-[#FF6154] transition-colors"
                  autoFocus
                />
                <button
                  onClick={createAndSave}
                  disabled={!newCollName.trim() || creatingColl}
                  className="px-3 py-2 rounded-xl text-sm font-black text-white transition-opacity disabled:opacity-40"
                  style={{ background: '#FF6154' }}
                >
                  {creatingColl ? '…' : '+ Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
