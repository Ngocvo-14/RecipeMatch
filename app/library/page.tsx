'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Toast, { useToast } from '@/components/Toast';
import { Recipe, HistoryEntry } from '@/types';
import { getRecipeImage } from '@/lib/recipeImages';
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
  const [err, setErr] = useState(false);
  if (err) return <div className={`${className} bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center text-2xl`}>🍽️</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`${className} object-cover`} onError={() => setErr(true)} loading="lazy" />;
}

// ── Folder colors ─────────────────────────────────────────────────────────

const FOLDER_COLORS: Record<string, { bg: string; color: string }> = {
  'Favorites':        { bg: '#FCE4EC', color: '#E91E63' },
  'Breakfast':        { bg: '#FFF3E0', color: '#F57C00' },
  'Lunch':            { bg: '#FFFDE7', color: '#F9A825' },
  'Dinner':           { bg: '#E3F2FD', color: '#1565C0' },
  'Quick Meals':      { bg: '#E8F5E9', color: '#2E7D32' },
  'Want to Try':      { bg: '#F3E5F5', color: '#6A1B9A' },
  'Weeknight Dinners':{ bg: '#E3F2FD', color: '#1565C0' },
  'Snacks':           { bg: '#FFF8E1', color: '#E65100' },
  'Desserts':         { bg: '#FCE4EC', color: '#AD1457' },
};
const DEFAULT_FOLDER = { bg: '#EDE7F6', color: '#5E35B1' };

function FolderIcon({ color, size = 56 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.85)} viewBox="0 0 56 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* folder body */}
      <rect x="0" y="10" width="56" height="38" rx="5" fill={color} opacity="0.85" />
      {/* folder tab */}
      <path d="M0 10 Q0 6 4 6 L20 6 L24 10 Z" fill={color} opacity="0.65" />
      {/* shine */}
      <path d="M8 20 L48 20" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

// ── Favorites card ────────────────────────────────────────────────────────

function FavCard({ recipe, onRemove }: { recipe: Recipe; onRemove: () => void }) {
  return (
    <div className="recipe-card bg-white rounded-3xl overflow-hidden shadow-sm border border-[#F0F0F0]">
      <div className="relative h-36 overflow-hidden">
        <Img src={getRecipeImage(recipe.title, recipe.imageUrl)} alt={recipe.title} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <button
          onClick={onRemove}
          className="absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform text-sm"
          title="Remove from favorites"
        >
          ❤️
        </button>
      </div>
      <div className="p-4 space-y-2.5">
        <Link href={`/recipe/${recipe._id}`} className="block font-black text-[#2C2C2C] text-sm leading-tight line-clamp-2 hover:opacity-80 transition-opacity">
          {recipe.title}
        </Link>
        <div className="flex items-center gap-3 text-xs font-bold text-[#999]">
          <span>⏱ {formatCookTime(recipe.cookTime)}</span>
          <span>👤 {recipe.servings}</span>
          <span>⚡ {recipe.difficulty}</span>
        </div>
        <Link
          href={`/recipe/${recipe._id}`}
          className="block text-center text-xs font-black py-2 rounded-full hover:opacity-90 transition-opacity"
          style={{ background: '#FFF5F5', color: '#FF6B6B' }}
        >
          View Recipe →
        </Link>
      </div>
    </div>
  );
}

// ── Collection folder card ────────────────────────────────────────────────

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
  const colors = FOLDER_COLORS[coll.name] ?? DEFAULT_FOLDER;
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

  return (
    <div className="recipe-card group relative bg-white rounded-3xl p-5 shadow-sm border border-[#F0F0F0] flex flex-col items-center text-center w-full">
      {/* "..." menu */}
      {!renaming && (
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#bbb] hover:bg-[#F5F5F5] hover:text-[#666] transition-all opacity-0 group-hover:opacity-100 text-lg leading-none"
            title="More options"
          >
            ···
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 bg-white rounded-2xl shadow-lg border border-[#F0F0F0] py-1 z-20 w-32">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setRenameValue(coll.name); setRenaming(true); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-[#2C2C2C] hover:bg-[#F8F9FA] flex items-center gap-2"
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

      {/* Card body — clickable */}
      <button onClick={onNavigate} className="flex flex-col items-center w-full">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-3 text-4xl"
          style={{ background: colors.bg }}
        >
          {coll.emoji || <FolderIcon color={colors.color} size={48} />}
        </div>
        {!renaming && (
          <>
            <p className="font-black text-[#2C2C2C] text-sm leading-tight">{coll.name}</p>
            <p className="text-xs font-bold text-[#999] mt-1">
              {coll.recipes.length} recipe{coll.recipes.length !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </button>

      {/* Inline rename */}
      {renaming && (
        <div className="w-full mt-2" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
            className="w-full border border-[#E8ECEF] rounded-xl px-3 py-2 text-sm font-bold text-center focus:outline-none focus:border-[#FF6154]"
          />
          <div className="flex gap-2 mt-2 justify-center">
            <button
              onClick={handleRename}
              disabled={saving}
              className="text-xs font-black text-white px-3 py-1.5 rounded-full hover:opacity-90 disabled:opacity-50"
              style={{ background: '#FF6154' }}
            >
              {saving ? '...' : '✓'}
            </button>
            <button
              onClick={() => setRenaming(false)}
              className="text-xs font-bold text-[#999] px-3 py-1.5 rounded-full hover:bg-[#F5F5F5]"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── History row ───────────────────────────────────────────────────────────

function HistRow({ entry, onRemove }: { entry: HistoryEntry; onRemove: () => void }) {
  const recipe = entry.recipeId;
  if (!recipe) return null;
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-[#F0F0F0] px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/recipe/${recipe._id}`} className="shrink-0">
        <Img src={getRecipeImage(recipe.title)} alt={recipe.title} className="w-16 h-16 rounded-xl" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/recipe/${recipe._id}`} className="block font-black text-[#2C2C2C] text-sm leading-tight line-clamp-1 hover:opacity-80">
          {recipe.title}
        </Link>
        <p className="text-xs font-bold text-[#999] mt-0.5">{recipe.cuisine} · {formatCookTime(recipe.cookTime)}</p>
        <p className="text-xs font-semibold mt-0.5" style={{ color: '#bbb' }}>
          Viewed {timeAgo(entry.viewedAt)}
        </p>
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#FFF5F5] transition-colors"
        style={{ color: '#ccc' }}
        title="Remove from history"
      >
        🗑️
      </button>
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

  useEffect(() => {
    if (!authChecked || !user) return;
    if (tab === 'favorites') loadFavorites();
    if (tab === 'collections') loadCollections();
    if (tab === 'history') loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, user, tab]);

  useEffect(() => {
    if (token && tab === 'collections') loadCollections();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // load all for stats when profile tab opens
  useEffect(() => {
    if (!authChecked || !user || tab !== 'profile') return;
    loadFavorites();
    loadCollections();
    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, user, tab]);

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
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA]">
        <Header user={null} onLogin={handleLogin} onRegister={handleRegister} onLogout={handleLogout} />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="text-6xl">📚</div>
          <h2 className="text-2xl font-black text-[#2C2C2C]">Sign in to view your library</h2>
          <p className="text-[#999] font-semibold">Your favorites, collections and history are saved to your account.</p>
          <Link href="/login" className="mt-2 inline-block font-black text-sm px-6 py-3 rounded-full text-white hover:opacity-90 shadow-md" style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Header user={user} onLogin={handleLogin} onRegister={handleRegister} onLogout={handleLogout} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Username heading */}
        <h1 className="text-4xl font-black text-[#2C2C2C] mb-4">{displayName}</h1>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 border-b border-[#E8ECEF] mb-8">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-black transition-all -mb-px"
              style={tab === t.id
                ? { color: '#FF6B6B', borderBottom: '2px solid #FF6B6B' }
                : { color: '#999' }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {typeof t.count === 'number' && t.count > 0 && (
                <span
                  className="text-xs font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                  style={tab === t.id
                    ? { background: '#FF6B6B', color: 'white' }
                    : { background: '#F0F0F0', color: '#999' }}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── FAVORITES ─────────────────────────────────────────────────────── */}
        {tab === 'favorites' && (
          <>
            {loadingFav && <Spinner />}
            {!loadingFav && favorites.length === 0 && (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">❤️</div>
                <h2 className="text-xl font-black text-[#2C2C2C] mb-2">No favorites yet</h2>
                <p className="text-[#999] font-semibold mb-6">Tap the heart on any recipe to save it here.</p>
                <Link href="/" className="inline-block font-black text-sm px-6 py-3 rounded-full text-white hover:opacity-90 shadow-md" style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}>
                  Browse Recipes
                </Link>
              </div>
            )}
            {!loadingFav && favorites.length > 0 && (
              <>
                <p className="text-xs font-black text-[#999] uppercase tracking-wider mb-5">
                  {favorites.length} saved recipe{favorites.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favorites.map((fav) => (
                    <FavCard key={fav._id} recipe={fav.recipeId} onRemove={() => removeFavorite(fav.recipeId._id)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── COLLECTIONS ───────────────────────────────────────────────────── */}
        {tab === 'collections' && (
          <>
            {loadingColl && <Spinner />}
            {!loadingColl && collections.length === 0 && (
              <div className="text-center py-24">
                <div style={{ fontSize: 64 }} className="mb-4">📁</div>
                <h2 className="text-lg font-black text-[#2C2C2C] mb-2">No collections yet</h2>
                <p className="text-[#999] mb-6" style={{ fontSize: 14 }}>Organize your saved recipes into collections</p>
                <button
                  onClick={() => { setNewCollName(''); setNewCollEmoji('📁'); setShowCreateModal(true); }}
                  className="font-black text-sm px-6 py-3 rounded-full text-white hover:opacity-90 shadow-md"
                  style={{ background: '#FF6154' }}
                >
                  + Create your first collection
                </button>
              </div>
            )}
            {!loadingColl && collections.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-xs font-black text-[#999] uppercase tracking-wider">
                    {collections.length} collection{collections.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={() => { setNewCollName(''); setNewCollEmoji('📁'); setShowCreateModal(true); }}
                    className="text-sm font-black text-white px-4 py-2 rounded-full hover:opacity-90 shadow-sm"
                    style={{ background: '#FF6154' }}
                  >
                    + New Collection
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {collections.map((coll) => (
                    <CollCard
                      key={coll._id}
                      coll={coll}
                      onNavigate={() => router.push(`/library/collections/${coll._id}`)}
                      onRequestDelete={(id, name) => setDeleteConfirm({ id, name })}
                      onRename={renameCollection}
                    />
                  ))}
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
                  <h2 className="text-lg font-black text-[#2C2C2C] mb-4">New Collection</h2>

                  <input
                    autoFocus
                    value={newCollName}
                    onChange={(e) => setNewCollName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') createCollection(); }}
                    placeholder="e.g. Quick Dinners, Date Night..."
                    maxLength={40}
                    className="w-full border border-[#E8ECEF] rounded-2xl px-4 py-3 text-sm font-semibold text-[#2C2C2C] focus:outline-none focus:border-[#FF6154] bg-[#F8F9FA] placeholder:text-[#bbb] placeholder:font-normal mb-4"
                  />

                  <p className="text-xs font-black text-[#999] uppercase tracking-wider mb-2">Choose an emoji</p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {COLL_EMOJIS.map((em) => (
                      <button
                        key={em}
                        onClick={() => setNewCollEmoji(em)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all"
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
                    className="w-full py-3 rounded-full text-sm font-black text-white hover:opacity-90 disabled:opacity-40 mb-2"
                    style={{ background: '#FF6154' }}
                  >
                    {creatingColl ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="w-full py-2 text-sm font-bold text-[#999] hover:text-[#666] transition-colors"
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
                  <p className="font-black text-[#2C2C2C] text-base mb-1">
                    Delete &quot;{deleteConfirm.name}&quot;?
                  </p>
                  <p className="text-sm text-[#999] font-semibold mb-5">This won&apos;t delete the recipes.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 py-2.5 rounded-full text-sm font-black border border-[#E8ECEF] text-[#666] hover:bg-[#F5F5F5] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteCollection(deleteConfirm.id)}
                      disabled={deletingId === deleteConfirm.id}
                      className="flex-1 py-2.5 rounded-full text-sm font-black text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === deleteConfirm.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── HISTORY ───────────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <>
            {loadingHist && <Spinner />}
            {!loadingHist && history.length === 0 && (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">🕐</div>
                <h2 className="text-xl font-black text-[#2C2C2C] mb-2">No history yet</h2>
                <p className="text-[#999] font-semibold">Recipes you view will appear here.</p>
              </div>
            )}
            {!loadingHist && history.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-xs font-black text-[#999] uppercase tracking-wider">
                    {history.length} recipe{history.length !== 1 ? 's' : ''} viewed
                  </p>
                  <button
                    onClick={clearHistory}
                    className="text-xs font-black hover:opacity-80 transition-opacity px-3 py-1.5 rounded-full border"
                    style={{ color: '#FF6B6B', borderColor: '#FFE0E0' }}
                  >
                    Clear all history
                  </button>
                </div>
                <div className="space-y-3">
                  {history.map((entry) => (
                    <HistRow key={entry._id} entry={entry} onRemove={() => removeHistory(entry.recipeId._id)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── PROFILE ───────────────────────────────────────────────────────── */}
        {tab === 'profile' && (
          <div className="max-w-md mx-auto">
            {/* Avatar + name */}
            <div className="bg-white rounded-3xl border border-[#F0F0F0] p-8 shadow-sm text-center mb-4">
              {/* Avatar circle */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-black mx-auto mb-4 shadow-md"
                style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
              >
                {(user.username || user.email).charAt(0).toUpperCase()}
              </div>

              {/* Username */}
              <div className="flex items-center justify-center gap-2 mb-1">
                {editingUsername ? (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <div className="flex items-center gap-2 w-full max-w-xs">
                      <input
                        autoFocus
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value.replace(/\s/g, ''))}
                        maxLength={20}
                        className="flex-1 border border-[#E8ECEF] rounded-2xl px-4 py-2 text-sm font-bold text-[#2C2C2C] focus:outline-none focus:border-[#FF6B6B] text-center"
                        onKeyDown={(e) => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') setEditingUsername(false); }}
                      />
                      <button
                        onClick={saveUsername}
                        disabled={savingUsername}
                        className="text-xs font-black text-white px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
                      >
                        {savingUsername ? '...' : 'Save'}
                      </button>
                    </div>
                    {usernameError && <p className="text-xs text-[#FF6B6B] font-semibold">{usernameError}</p>}
                    <button onClick={() => setEditingUsername(false)} className="text-xs text-[#999] hover:opacity-70">Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className="text-xl font-black text-[#2C2C2C]">
                      {user.username || <span className="text-[#bbb] font-semibold italic">No username set</span>}
                    </span>
                    <button
                      onClick={() => { setUsernameInput(user.username || ''); setUsernameError(''); setEditingUsername(true); }}
                      className="text-xs font-black px-3 py-1 rounded-full border hover:opacity-80 transition-opacity"
                      style={{ color: '#FF6B6B', borderColor: '#FFE0E0', background: '#FFF5F5' }}
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>

              <p className="text-sm font-semibold text-[#999] mt-1">{user.email}</p>
              {user.createdAt && (
                <p className="text-xs font-semibold mt-1" style={{ color: '#bbb' }}>
                  Member since {formatDate(user.createdAt)}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-[#F5F5F5]">
                {[
                  { label: 'Favorites',       value: favorites.length },
                  { label: 'Collections',     value: collections.length },
                  { label: 'Recipes viewed',  value: history.length },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-2xl font-black text-[#2C2C2C]">{value}</p>
                    <p className="text-xs font-bold text-[#999] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-white rounded-3xl border border-[#F0F0F0] p-6 shadow-sm">
              <h3 className="text-xs font-black text-[#999] uppercase tracking-wider mb-4">Account</h3>
              <button
                onClick={handleLogout}
                className="w-full py-3 rounded-full text-sm font-black border-2 transition-all hover:bg-[#FFF5F5]"
                style={{ color: '#FF6B6B', borderColor: '#FF6B6B' }}
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
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }} />
      </div>
    }>
      <LibraryInner />
    </Suspense>
  );
}
