'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast, { useToast } from '@/components/Toast';
import { Recipe, HistoryEntry } from '@/types';
import { getRecipeImage } from '@/lib/recipeImages';
import { getFoodImageUrl } from '@/lib/foodImage';
import { formatCookTime } from '@/lib/formatCookTime';

// ── types ─────────────────────────────────────────────────────────────────

interface User { _id: string; email: string; username?: string; createdAt?: string }

interface FavoriteEntry {
  _id: string;
  recipeId: Recipe;
  savedAt: string;
}

interface CollectionFull {
  _id: string;
  name: string;
  emoji: string;
  recipes: { _id: string; title: string }[];
  createdAt: string;
}

type Tab = 'favorites' | 'collections' | 'history' | 'profile';

// ── helpers ───────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)} min${Math.floor(secs / 60) !== 1 ? 's' : ''} ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} hr${Math.floor(secs / 3600) !== 1 ? 's' : ''} ago`;
  return `${Math.floor(secs / 86400)} day${Math.floor(secs / 86400) !== 1 ? 's' : ''} ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ── image component ───────────────────────────────────────────────────────

function Img({ src, alt, className }: { src: string; alt: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      className={`${className} object-cover`}
      loading="lazy"
      onError={(e) => {
        const t = e.target as HTMLImageElement;
        if (!t.dataset.errored) {
          t.dataset.errored = '1';
          t.src = getFoodImageUrl(alt);
        }
      }}
    />
  );
}

// ── Favorites card ────────────────────────────────────────────────────────

function FavCard({ recipe, onRemove }: { recipe: Recipe; onRemove: () => void }) {
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-orange-100 transition-all">
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <Img
          src={getRecipeImage(recipe.title, recipe.imageUrl)}
          alt={recipe.title}
          className="w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        <button
          onClick={onRemove}
          className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-all cursor-pointer"
          title="Remove from favorites"
        >
          <span className="text-sm">❤️</span>
        </button>
        {recipe.cuisine && (
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {recipe.cuisine}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base leading-tight mb-2 group-hover:text-orange-500 transition-colors line-clamp-2 cursor-pointer">
          <Link href={`/recipe/${recipe._id}`}>{recipe.title}</Link>
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          <span>⏱ {formatCookTime(recipe.cookTime)}</span>
          <span>👥 {recipe.servings}</span>
          <span>⚡ {recipe.difficulty}</span>
        </div>
        <Link
          href={`/recipe/${recipe._id}`}
          className="block text-center py-2 rounded-xl bg-orange-50 text-orange-500 text-sm font-semibold hover:bg-orange-500 hover:text-white transition-all cursor-pointer"
        >
          View Recipe →
        </Link>
      </div>
    </div>
  );
}

// ── Collection card ───────────────────────────────────────────────────────

const COLL_EMOJIS = ['📁','🌅','☀️','🌙','⚡','❤️','🥗','🍜','🎉','🌿'];

function CollCard({
  coll,
  onNavigate,
  onRequestDelete,
  onRename,
}: {
  coll: CollectionFull;
  onNavigate: () => void;
  onRequestDelete: (id: string, name: string) => void;
  onRename: (id: string, newName: string) => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(coll.name);
  const [saving, setSaving] = useState(false);

  async function handleRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === coll.name) { setRenaming(false); return; }
    setSaving(true);
    await onRename(coll._id, trimmed);
    setSaving(false);
    setRenaming(false);
  }

  const nameLower = coll.name.toLowerCase();
  const bandBg =
    nameLower.includes('breakfast') ? 'bg-amber-50' :
    nameLower.includes('dinner')    ? 'bg-blue-50' :
    nameLower.includes('lunch')     ? 'bg-green-50' :
    nameLower.includes('dessert')   ? 'bg-pink-50' :
    nameLower.includes('snack')     ? 'bg-yellow-50' :
    nameLower.includes('favorite')  ? 'bg-red-50' : 'bg-orange-50';

  const displayEmoji = coll.emoji || (
    nameLower.includes('breakfast') ? '🌅' :
    nameLower.includes('dinner')    ? '🌙' :
    nameLower.includes('lunch')     ? '☀️' :
    nameLower.includes('dessert')   ? '🍰' :
    nameLower.includes('snack')     ? '🍿' : '📁'
  );

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-orange-200 hover:shadow-md transition-all">
      {/* "..." menu */}
      {!renaming && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:bg-gray-100 hover:text-gray-600 transition-all opacity-0 group-hover:opacity-100 text-lg leading-none cursor-pointer"
            title="More options"
          >
            ···
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 bg-white rounded-2xl shadow-lg border border-gray-100 py-1 z-20 w-32">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setRenameValue(coll.name); setRenaming(true); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 flex items-center gap-2"
                >
                  ✏️ Rename
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRequestDelete(coll._id, coll.name); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"
                >
                  🗑 Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Card body */}
      <button onClick={onNavigate} className="w-full cursor-pointer">
        {/* Color top band */}
        <div className={`h-24 flex items-center justify-center text-5xl ${bandBg}`}>
          {displayEmoji}
        </div>
        <div className="p-4 text-left">
          {!renaming ? (
            <>
              <h3 className="font-bold text-gray-900 group-hover:text-orange-500 transition-colors text-sm leading-tight">{coll.name}</h3>
              <p className="text-xs text-gray-400 mt-1">{coll.recipes.length} recipe{coll.recipes.length !== 1 ? 's' : ''}</p>
            </>
          ) : (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-orange-400"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleRename}
                  disabled={saving}
                  className="text-xs font-black text-white px-3 py-1.5 rounded-full hover:opacity-90 disabled:opacity-50 bg-orange-500 cursor-pointer"
                >
                  {saving ? '...' : '✓'}
                </button>
                <button
                  onClick={() => setRenaming(false)}
                  className="text-xs font-bold text-gray-400 px-3 py-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

// ── History row ───────────────────────────────────────────────────────────

function HistRow({ entry, onRemove }: { entry: HistoryEntry; onRemove: () => void }) {
  const recipe = entry.recipeId;
  if (!recipe) return null;
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 px-4 py-3 hover:shadow-md transition-shadow">
      <Link href={`/recipe/${recipe._id}`} className="shrink-0">
        <Img src={getRecipeImage(recipe.title)} alt={recipe.title} className="w-16 h-16 rounded-xl" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/recipe/${recipe._id}`} className="block font-black text-gray-800 text-sm leading-tight line-clamp-1 hover:text-orange-500 transition-colors cursor-pointer">
          {recipe.title}
        </Link>
        <p className="text-xs font-bold text-gray-400 mt-0.5">{recipe.cuisine} · {formatCookTime(recipe.cookTime)}</p>
        <p className="text-xs font-semibold text-gray-300 mt-0.5">Viewed {timeAgo(entry.viewedAt)}</p>
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors text-gray-300 hover:text-red-400 cursor-pointer"
        title="Remove from history"
      >
        🗑️
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

// ── Shared nav bar ────────────────────────────────────────────────────────

interface NavProps { user: { username?: string; email: string } | null; onLogout: () => void }

function LibraryNav({ user, onLogout }: NavProps) {
  const router = useRouter();
  return (
    <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
      {/* Left — back */}
      <button onClick={() => router.back()} className="text-sm font-black hover:opacity-80 transition-opacity cursor-pointer" style={{ color: '#FF6B6B' }}>
        ← Go Back
      </button>

      {/* Center — logo */}
      <Link href="/" className="flex items-center gap-3 group">
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
        <div className="flex items-baseline gap-0">
          <span className="text-gray-900 font-extrabold text-xl tracking-tight group-hover:text-gray-700 transition-colors">Recipe</span>
          <span className="font-extrabold text-xl tracking-tight text-orange-500">Match</span>
        </div>
      </Link>

      {/* Right — username + sign out, or sign in */}
      {user ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">{user.username || user.email.split('@')[0]}</span>
          <button onClick={onLogout} className="text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">Sign out</button>
        </div>
      ) : (
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">Sign In</Link>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

function LibraryInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = (searchParams.get('tab') as Tab) || 'favorites';
  const [tab, setTab] = useState<Tab>(initialTab);

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [collections, setCollections] = useState<CollectionFull[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [loadingFav, setLoadingFav] = useState(false);
  const [loadingColl, setLoadingColl] = useState(false);
  const [loadingHist, setLoadingHist] = useState(false);

  // collection create/delete/rename state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollName, setNewCollName] = useState('');
  const [newCollEmoji, setNewCollEmoji] = useState('📁');
  const [creatingColl, setCreatingColl] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // profile edit state
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const { toasts, addToast } = useToast();

  // ── auth re-hydrate ──────────────────────────────────────────────────────
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/user/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(data.token);
        }
      } catch { /* not logged in */ }
      setAuthChecked(true);
    }
    check();
  }, []);

  // ── data loaders ────────────────────────────────────────────────────────
  const loadFavorites = useCallback(async () => {
    setLoadingFav(true);
    try {
      const res = await fetch('/api/user/favorites');
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites.filter((f: FavoriteEntry) => f.recipeId));
      }
    } catch { /* ignore */ }
    setLoadingFav(false);
  }, []);

  const loadCollections = useCallback(async () => {
    setLoadingColl(true);
    try {
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/collections?populate=1', { headers });
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch { /* ignore */ }
    setLoadingColl(false);
  }, [token]);

  const loadHistory = useCallback(async () => {
    setLoadingHist(true);
    try {
      const res = await fetch('/api/user/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history.filter((h: HistoryEntry) => h.recipeId));
      }
    } catch { /* ignore */ }
    setLoadingHist(false);
  }, []);

  // Load all data on initial auth for hero stats
  useEffect(() => {
    if (!authChecked || !user) return;
    loadFavorites();
    loadCollections();
    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, user]);

  useEffect(() => {
    if (token && collections.length === 0) loadCollections();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── actions ─────────────────────────────────────────────────────────────
  async function removeFavorite(recipeId: string) {
    try {
      await fetch('/api/user/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
      });
      setFavorites((prev) => prev.filter((f) => f.recipeId._id !== recipeId));
      addToast('Removed from Favorites');
    } catch { /* ignore */ }
  }

  async function removeHistory(recipeId: string) {
    try {
      await fetch(`/api/user/history/${recipeId}`, { method: 'DELETE' });
      setHistory((prev) => prev.filter((h) => h.recipeId._id !== recipeId));
    } catch { /* ignore */ }
  }

  async function clearHistory() {
    if (!confirm('Clear all viewing history?')) return;
    try {
      await fetch('/api/user/history', { method: 'DELETE' });
      setHistory([]);
      addToast('History cleared');
    } catch { /* ignore */ }
  }

  async function createCollection() {
    if (!newCollName.trim()) return;
    setCreatingColl(true);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: newCollName.trim(), emoji: newCollEmoji }),
      });
      if (res.ok) {
        const data = await res.json();
        const newColl: CollectionFull = { ...data.collection, recipes: [] };
        setCollections((prev) => [...prev, newColl]);
        setShowCreateModal(false);
        setNewCollName('');
        setNewCollEmoji('📁');
        addToast('Collection created!');
      }
    } catch { /* ignore */ }
    setCreatingColl(false);
  }

  async function deleteCollection(id: string) {
    setDeletingId(id);
    try {
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`/api/collections/${id}`, { method: 'DELETE', headers });
      setCollections((prev) => prev.filter((c) => c._id !== id));
      addToast('Collection deleted');
    } catch { /* ignore */ }
    setDeletingId(null);
    setDeleteConfirm(null);
  }

  async function renameCollection(id: string, newName: string) {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/collections/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setCollections((prev) => prev.map((c) => c._id === id ? { ...c, name: newName } : c));
        addToast('Collection renamed');
      }
    } catch { /* ignore */ }
  }

  async function saveUsername() {
    setUsernameError('');
    const val = usernameInput.trim();
    if (val.length < 3) { setUsernameError('At least 3 characters'); return; }
    if (val.length > 20) { setUsernameError('At most 20 characters'); return; }
    if (/\s/.test(val)) { setUsernameError('No spaces allowed'); return; }
    setSavingUsername(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ username: val }),
      });
      const data = await res.json();
      if (!res.ok) { setUsernameError(data.error || 'Failed to save'); return; }
      setUser((prev) => prev ? { ...prev, username: data.user.username } : prev);
      setEditingUsername(false);
      addToast('Username updated!');
    } catch { setUsernameError('Network error'); }
    setSavingUsername(false);
  }

  // ── header handlers ──────────────────────────────────────────────────────
  async function handleLogin(email: string, password: string) {
    const res = await fetch('/api/user/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setUser(data.user); setToken(data.token);
  }
  async function handleRegister(email: string, password: string, username?: string) {
    const res = await fetch('/api/user/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, username }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    setUser(data.user); setToken(data.token);
  }
  async function handleLogout() {
    await fetch('/api/user/logout', { method: 'POST' });
    setUser(null); setToken(null);
    setFavorites([]); setCollections([]); setHistory([]);
    router.push('/');
  }

  function switchTab(t: Tab) {
    setTab(t);
    router.replace(`/library?tab=${t}`, { scroll: false });
  }

  const displayName = user?.username || (user?.email ? user.email.split('@')[0] : '');

  const TABS: { id: Tab; label: string; icon: string; count?: number }[] = [
    { id: 'favorites',   label: 'Favorites',   icon: '❤️',  count: favorites.length },
    { id: 'collections', label: 'Collections', icon: '📁',  count: collections.length },
    { id: 'history',     label: 'History',     icon: '🕐',  count: history.length },
    { id: 'profile',     label: 'Profile',     icon: '👤' },
  ];

  const Spinner = () => (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LibraryNav user={null} onLogout={handleLogout} />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="text-6xl">📚</div>
          <h2 className="text-2xl font-black text-gray-900">Sign in to view your library</h2>
          <p className="text-gray-400 font-semibold">Your favorites, collections and history are saved to your account.</p>
          <Link href="/login" className="mt-2 inline-block font-black text-sm px-6 py-3 rounded-full text-white hover:opacity-90 shadow-md" style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LibraryNav user={user} onLogout={handleLogout} />

      {/* ── Profile Header ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 sm:px-8 py-8">
        <div className="max-w-4xl mx-auto">

          {/* Top row: avatar + info + edit button */}
          <div className="flex items-center gap-4 mb-6 md:gap-6 md:mb-8">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-md"
                style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full" />
            </div>

            {/* Name + email + joined */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-gray-900 truncate">{displayName}</h1>
                <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                  Member
                </span>
              </div>
              <p className="text-gray-400 text-sm truncate">{user.email}</p>
              {user.createdAt && (
                <p className="text-gray-300 text-xs mt-1">Joined {formatDate(user.createdAt)}</p>
              )}
            </div>

            {/* Edit button */}
            <button
              onClick={() => switchTab('profile')}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-all cursor-pointer"
            >
              ✏️ Edit Profile
            </button>
          </div>

        </div>
      </div>

      {/* ── Sticky Tab bar ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex gap-1 overflow-x-auto px-4 sm:px-8 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                tab === t.id
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
              {typeof t.count === 'number' && t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  tab === t.id ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">

        {/* ── FAVORITES ────────────────────────────────────────────────── */}
        {tab === 'favorites' && (
          <>
            {loadingFav && <Spinner />}
            {!loadingFav && favorites.length === 0 && (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">❤️</div>
                <h2 className="text-xl font-black text-gray-900 mb-2">No favorites yet</h2>
                <p className="text-gray-400 font-semibold mb-6">Tap the heart on any recipe to save it here.</p>
                <Link href="/" className="inline-block font-black text-sm px-6 py-3 rounded-full text-white hover:opacity-90 shadow-md" style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}>
                  Browse Recipes
                </Link>
              </div>
            )}
            {!loadingFav && favorites.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">My Favorite Recipes</h2>
                    <p className="text-gray-400 text-sm mt-1">{favorites.length} recipe{favorites.length !== 1 ? 's' : ''} saved</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-12">
                  {favorites.map((fav) => (
                    <FavCard key={fav._id} recipe={fav.recipeId} onRemove={() => removeFavorite(fav.recipeId._id)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── COLLECTIONS ──────────────────────────────────────────────── */}
        {tab === 'collections' && (
          <>
            {loadingColl && <Spinner />}
            {!loadingColl && collections.length === 0 && (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">📁</div>
                <h2 className="text-lg font-black text-gray-900 mb-2">No collections yet</h2>
                <p className="text-gray-400 mb-6 text-sm">Organize your saved recipes into collections</p>
                <button
                  onClick={() => { setNewCollName(''); setNewCollEmoji('📁'); setShowCreateModal(true); }}
                  className="font-black text-sm px-6 py-3 rounded-full text-white hover:opacity-90 shadow-md cursor-pointer"
                  style={{ background: '#FF6154' }}
                >
                  + Create your first collection
                </button>
              </div>
            )}
            {!loadingColl && collections.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">My Collections</h2>
                    <p className="text-gray-400 text-sm mt-1">{collections.length} collection{collections.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => { setNewCollName(''); setNewCollEmoji('📁'); setShowCreateModal(true); }}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm text-sm"
                  >
                    + New Collection
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5 pb-12">
                  {collections.map((coll) => {
                    const nameLower = coll.name.toLowerCase();
                    const cardEmoji = coll.emoji || (
                      nameLower.includes('breakfast') ? '🌅' :
                      nameLower.includes('dinner')    ? '🌙' :
                      nameLower.includes('lunch')     ? '☀️' :
                      nameLower.includes('dessert')   ? '🍰' :
                      nameLower.includes('snack')     ? '🍿' :
                      nameLower.includes('asian')     ? '🍜' :
                      nameLower.includes('italian')   ? '🍝' :
                      nameLower.includes('mexican')   ? '🌮' :
                      nameLower.includes('healthy')   ? '🥗' :
                      nameLower.includes('soup')      ? '🍲' : '📁'
                    );
                    const cardBg =
                      nameLower.includes('breakfast') ? 'from-amber-50 to-orange-50 border-amber-100' :
                      nameLower.includes('dinner')    ? 'from-indigo-50 to-blue-50 border-indigo-100' :
                      nameLower.includes('lunch')     ? 'from-green-50 to-emerald-50 border-green-100' :
                      nameLower.includes('dessert')   ? 'from-pink-50 to-rose-50 border-pink-100' :
                      nameLower.includes('snack')     ? 'from-yellow-50 to-amber-50 border-yellow-100' :
                      'from-orange-50 to-amber-50 border-orange-100';
                    return (
                      <div
                        key={coll._id}
                        onClick={() => router.push(`/library/collections/${coll._id}`)}
                        className={`group relative bg-gradient-to-br ${cardBg} border rounded-2xl overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
                      >
                        {/* Big emoji area */}
                        <div className="flex items-center justify-center h-28 text-6xl">
                          {cardEmoji}
                        </div>
                        {/* Info strip */}
                        <div className="bg-white/80 backdrop-blur-sm px-4 py-3 border-t border-white/50">
                          <h3 className="font-bold text-gray-900 text-base group-hover:text-orange-500 transition-colors truncate">
                            {coll.name}
                          </h3>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-400">
                              {coll.recipes?.length ?? 0} recipe{coll.recipes?.length !== 1 ? 's' : ''}
                            </p>
                            <span className="text-xs text-orange-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                              Open →
                            </span>
                          </div>
                        </div>
                        {/* Hover ring */}
                        <div className="absolute inset-0 rounded-2xl ring-2 ring-orange-400 ring-opacity-0 group-hover:ring-opacity-30 transition-all pointer-events-none" />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Create Collection Modal */}
            {showCreateModal && (
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
                onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
              >
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
                  <h2 className="text-lg font-black text-gray-900 mb-4">New Collection</h2>
                  <input
                    autoFocus
                    value={newCollName}
                    onChange={(e) => setNewCollName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') createCollection(); }}
                    placeholder="e.g. Quick Dinners, Date Night..."
                    maxLength={40}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none focus:border-orange-400 bg-gray-50 placeholder:text-gray-300 placeholder:font-normal mb-4"
                  />
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Choose an emoji</p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {COLL_EMOJIS.map((em) => (
                      <button
                        key={em}
                        onClick={() => setNewCollEmoji(em)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer"
                        style={newCollEmoji === em
                          ? { background: '#FF6154', boxShadow: '0 2px 8px rgba(255,97,84,0.4)' }
                          : { background: '#F5F5F5' }}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={createCollection}
                    disabled={creatingColl || !newCollName.trim()}
                    className="w-full py-3 rounded-full text-sm font-black text-white hover:opacity-90 disabled:opacity-40 mb-2 cursor-pointer"
                    style={{ background: '#FF6154' }}
                  >
                    {creatingColl ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="w-full py-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
                onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
              >
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
                  <p className="font-black text-gray-900 text-base mb-1">
                    Delete &quot;{deleteConfirm.name}&quot;?
                  </p>
                  <p className="text-sm text-gray-400 font-semibold mb-5">This won&apos;t delete the recipes.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 py-2.5 rounded-full text-sm font-black border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteCollection(deleteConfirm.id)}
                      disabled={deletingId === deleteConfirm.id}
                      className="flex-1 py-2.5 rounded-full text-sm font-black text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {deletingId === deleteConfirm.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── HISTORY ──────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <>
            {loadingHist && <Spinner />}
            {!loadingHist && history.length === 0 && (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">🕐</div>
                <h2 className="text-xl font-black text-gray-900 mb-2">No history yet</h2>
                <p className="text-gray-400 font-semibold">Recipes you view will appear here.</p>
              </div>
            )}
            {!loadingHist && history.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider">
                    {history.length} recipe{history.length !== 1 ? 's' : ''} viewed
                  </p>
                  <button
                    onClick={clearHistory}
                    className="text-xs font-black hover:opacity-80 transition-opacity px-3 py-1.5 rounded-full border cursor-pointer"
                    style={{ color: '#FF6B6B', borderColor: '#FFE0E0' }}
                  >
                    Clear all history
                  </button>
                </div>
                <div className="space-y-3 pb-12">
                  {history.map((entry) => (
                    <HistRow key={entry._id} entry={entry} onRemove={() => removeHistory(entry.recipeId._id)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── PROFILE ──────────────────────────────────────────────────── */}
        {tab === 'profile' && (
          <div className="max-w-md mx-auto pb-12">
            {/* Edit username */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Username</h3>
              {editingUsername ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value.replace(/\s/g, ''))}
                      maxLength={20}
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:outline-none focus:border-orange-400"
                      onKeyDown={(e) => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') setEditingUsername(false); }}
                      placeholder="Enter username..."
                    />
                    <button
                      onClick={saveUsername}
                      disabled={savingUsername}
                      className="text-sm font-black text-white px-4 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 cursor-pointer"
                      style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
                    >
                      {savingUsername ? '...' : 'Save'}
                    </button>
                  </div>
                  {usernameError && <p className="text-xs text-red-500 font-semibold">{usernameError}</p>}
                  <button onClick={() => setEditingUsername(false)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">
                    {user.username || <span className="text-gray-300 italic font-normal">No username set</span>}
                  </span>
                  <button
                    onClick={() => { setUsernameInput(user.username || ''); setUsernameError(''); setEditingUsername(true); }}
                    className="text-xs font-black px-3 py-1.5 rounded-full border hover:opacity-80 transition-opacity cursor-pointer"
                    style={{ color: '#FF6B6B', borderColor: '#FFE0E0', background: '#FFF5F5' }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Email (read-only) */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Email</h3>
              <p className="text-sm font-semibold text-gray-600">{user.email}</p>
            </div>

            {/* Sign out */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Account</h3>
              <button
                onClick={handleLogout}
                className="w-full py-3 rounded-xl text-sm font-bold border-2 border-red-200 text-red-500 hover:bg-red-50 cursor-pointer transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </main>

      <Toast toasts={toasts} />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }} />
      </div>
    }>
      <LibraryInner />
    </Suspense>
  );
}
