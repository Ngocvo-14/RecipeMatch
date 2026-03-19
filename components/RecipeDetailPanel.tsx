'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { MatchedRecipe, Collection } from '@/types';
import { getFoodImageUrl } from '@/lib/foodImage';
import { formatCookTime } from '@/lib/formatCookTime';

interface Props {
  recipe: MatchedRecipe;
  relatedRecipes: MatchedRecipe[];
  isFavorited: boolean;
  isLoggedIn: boolean;
  collections?: Collection[];
  token?: string | null;
  onToggleFavorite: (id: string) => void;
  onSaveToCollection?: (recipeId: string, collectionId: string) => void;
  onRemoveFromCollection?: (recipeId: string, collectionId: string) => void;
  onCreateCollection?: (name: string, emoji: string) => Promise<string | null>;
  onNeedAuth: () => void;
  onClose: () => void;
  onSelectRecipe: (recipe: MatchedRecipe) => void;
  onToast?: (msg: string) => void;
  recipeIndex?: number;
}

export default function RecipeDetailPanel({
  recipe, relatedRecipes, isFavorited, isLoggedIn, collections = [],
  onToggleFavorite, onSaveToCollection, onRemoveFromCollection, onCreateCollection, onNeedAuth, onClose, onSelectRecipe, onToast, recipeIndex = 0,
}: Props) {
  const [showShare, setShowShare] = useState(false);
  const [showCollPicker, setShowCollPicker] = useState(false);
  const [newCollName, setNewCollName] = useState('');
  const [creatingColl, setCreatingColl] = useState(false);
  const [collToast, setCollToast] = useState('');
  const [toast, setToast] = useState('');
  const shareRef = useRef<HTMLDivElement>(null);
  const collPickerRef = useRef<HTMLDivElement>(null);
  const ingredientNames = [...recipe.matchedIngredients, ...recipe.missingIngredients];
  const _imgRaw = (recipe as any).imageUrl || (recipe as any).image || '';
  const imgUrl = _imgRaw && _imgRaw.startsWith('http') ? _imgRaw : 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800';

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track history whenever a recipe is opened in the panel
  useEffect(() => {
    if (!isLoggedIn) return;
    fetch('/api/user/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId: recipe._id }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe._id]);

  // Close share dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShare(false);
      }
    }
    if (showShare) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showShare]);

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }

  function handleFav(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isLoggedIn) { onNeedAuth(); return; }
    onToggleFavorite(recipe._id);
    // toast is fired by page-level toggleFavorite via onToast; fire locally too if no onToast
    if (!onToast) {
      showToastMsg(isFavorited ? 'Removed from Favorites' : 'Added to Favorites ❤️');
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/recipe/${recipe._id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToastMsg('Link copied!');
    } catch {
      showToastMsg('Copy failed');
    }
    setShowShare(false);
  }

  async function shareRecipe() {
    const url = `${window.location.origin}/recipe/${recipe._id}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: recipe.title, text: `Check out this recipe: ${recipe.title}`, url });
      } catch { /* user cancelled */ }
    } else {
      await copyLink();
      return;
    }
    setShowShare(false);
  }

  function saveToCollection() {
    setShowShare(false);
    if (!isLoggedIn) { onNeedAuth(); return; }
    setShowCollPicker(true);
    // Scroll picker into view after render
    setTimeout(() => collPickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }

  function handlePickCollection(collectionId: string, collectionName: string, alreadyIn: boolean) {
    if (alreadyIn) {
      onRemoveFromCollection?.(recipe._id, collectionId);
      const msg = `Removed from "${collectionName}"`;
      if (onToast) onToast(msg);
      else { setCollToast(msg); setTimeout(() => setCollToast(''), 2500); }
    } else {
      onSaveToCollection?.(recipe._id, collectionId);
      const msg = `Saved to "${collectionName}"!`;
      if (onToast) onToast(msg);
      else { setCollToast(msg); setTimeout(() => setCollToast(''), 2500); }
    }
    setShowCollPicker(false);
  }

  async function handleCreateCollection() {
    const name = newCollName.trim();
    if (!name || creatingColl || !onCreateCollection) return;
    setCreatingColl(true);
    const id = await onCreateCollection(name, '📁');
    if (id) {
      handlePickCollection(id, name, false);
      setNewCollName('');
    }
    setCreatingColl(false);
  }

  const matchLabel = recipe.matchType === 'full'
    ? '🎉 You have all the ingredients!'
    : `🛒 Missing ${recipe.missingIngredients.length} ingredient${recipe.missingIngredients.length !== 1 ? 's' : ''}`;
  const matchColor = recipe.matchType === 'full' ? '#52C9A0' : recipe.matchType === 'near' ? '#F59E0B' : '#9CA3AF';

  return (
    <>
      {/* Backdrop */}
      <div className="backdrop-fade fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="panel-slide fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white z-50 overflow-y-auto shadow-2xl">
        {/* Hero photo */}
        <div className="relative h-52 overflow-hidden cursor-pointer">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

          {/* X close */}
          <button onClick={onClose} className="absolute top-4 left-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#2C2C2C] font-black text-lg hover:bg-white transition-colors shadow-md cursor-pointer">
            ×
          </button>

          {/* ⋯ share button */}
          <div ref={shareRef} className="absolute top-4 right-4">
            <button
              onClick={() => setShowShare((v) => !v)}
              className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#666] font-black text-lg shadow-md hover:bg-white transition-colors select-none cursor-pointer"
            >
              ···
            </button>

            {/* Dropdown */}
            {showShare && (
              <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-xl border border-[#F0F0F0] overflow-hidden z-50 animate-fadeIn">
                <button
                  onClick={copyLink}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#2C2C2C] hover:bg-[#FFF5F5] transition-colors text-left cursor-pointer"
                >
                  <span className="text-base">🔗</span>
                  <span>Copy Link</span>
                </button>
                <div className="border-t border-[#F5F5F5]" />
                <button
                  onClick={shareRecipe}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#2C2C2C] hover:bg-[#FFF5F5] transition-colors text-left cursor-pointer"
                >
                  <span className="text-base">📤</span>
                  <span>Share</span>
                </button>
                <div className="border-t border-[#F5F5F5]" />
                <button
                  onClick={saveToCollection}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#2C2C2C] hover:bg-[#FFF5F5] transition-colors text-left cursor-pointer"
                >
                  <span className="text-base">📌</span>
                  <span>{isFavorited ? 'Saved ✓' : 'Save to Collection'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Title + heart */}
          <div className="flex items-start gap-3">
            <h2 className="flex-1 text-xl font-black text-[#2C2C2C] leading-tight">
              <Link href={`/recipe/${recipe._id}`} className="hover:text-orange-500 transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                {recipe.title}
              </Link>
            </h2>
            <button onClick={handleFav} className="shrink-0 text-2xl mt-0.5 hover:scale-110 transition-transform cursor-pointer">
              {isFavorited ? '❤️' : '🤍'}
            </button>
          </div>

          {/* Subtitle */}
          <p className="text-sm font-black -mt-2" style={{ color: matchColor }}>{matchLabel}</p>

          {/* Stars + clock */}
          <div className="flex items-center gap-3 -mt-2">
            <div className="flex gap-0.5 text-[#E0E0E0] text-base">
              {'⭐⭐⭐⭐⭐'.split('').map((s, i) => <span key={i}>{s}</span>)}
            </div>
            <span className="text-[#E0E0E0]">·</span>
            <span className="text-sm font-bold text-[#666]">⏱ {formatCookTime(recipe.cookTime)}</span>
            <span className="text-[#E0E0E0]">·</span>
            <span className="text-sm font-bold text-[#666]">👤 {recipe.servings}</span>
          </div>

          <div className="border-t border-[#F0F0F0]" />

          {/* Ingredients */}
          <div>
            <h3 className="text-xs font-black text-[#2C2C2C] uppercase tracking-wider mb-3">🧂 Ingredients</h3>
            <ul className="space-y-2.5">
              {recipe.ingredients.map((ing, i) => {
                const has = recipe.matchedIngredients.some(
                  (m) => m === ing.name || m.includes(ing.name) || ing.name.includes(m)
                );
                return (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#444]">
                      {ing.quantity && <span className="text-[#999] mr-1.5 font-bold">{ing.quantity}</span>}
                      {ing.name}
                    </span>
                    {has ? (
                      <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-black" style={{ background: '#52C9A0' }}>
                        ✓
                      </span>
                    ) : (
                      <span className="w-6 h-6 rounded-full border-2 border-[#E0E0E0] shrink-0" />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* View Full Recipe */}
          <div className="space-y-1">
            <Link
              href={`/recipe/${recipe._id}`}
              className="block text-center py-3.5 rounded-full font-black text-white text-sm transition-all hover:opacity-90 shadow-md"
              style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
            >
              View Full Recipe
            </Link>
            <p className="text-center text-xs font-semibold text-[#bbb]">recipematch.app</p>
          </div>

          {/* Collection Picker */}
          {showCollPicker && (
            <div ref={collPickerRef} className="rounded-2xl border border-[#E8ECEF] bg-[#FAFAFA] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-[#2C2C2C] uppercase tracking-wider">📌 Save to Collection</p>
                <button onClick={() => setShowCollPicker(false)} className="text-[#bbb] hover:text-[#666] font-black text-lg leading-none cursor-pointer">×</button>
              </div>

              {/* Existing collections */}
              <div className="space-y-1">
                {collections.filter((c) => c.name !== 'Favorites').length === 0 && (
                  <p className="text-xs text-[#bbb] font-semibold py-1">No collections yet — create one below.</p>
                )}
                {collections.filter((c) => c.name !== 'Favorites').map((col) => {
                  const alreadyIn = (col.recipes || []).some(
                    (r) => r.toString() === recipe._id
                  );
                  return (
                    <button
                      key={col._id}
                      onClick={() => handlePickCollection(col._id, col.name, alreadyIn)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white hover:border-[#FF6B6B] border transition-all text-left group cursor-pointer"
                      style={{ borderColor: alreadyIn ? '#52C9A0' : '#F0F0F0' }}
                    >
                      <span className="text-lg">{col.emoji}</span>
                      <span className="text-sm font-bold text-[#2C2C2C] flex-1 group-hover:text-[#FF6B6B] transition-colors">{col.name}</span>
                      {alreadyIn ? (
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0" style={{ background: '#52C9A0' }}>✓</span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border-2 border-[#E0E0E0] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Create new collection */}
              <div className="border-t border-[#F0F0F0] pt-3">
                <p className="text-[10px] font-black text-[#bbb] uppercase tracking-wider mb-2">New Collection</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCollName}
                    onChange={(e) => setNewCollName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCollection(); }}
                    placeholder="Collection name..."
                    className="flex-1 text-sm font-semibold px-3 py-2 rounded-xl border border-[#E8ECEF] bg-white focus:outline-none focus:border-[#FF6B6B] transition-colors"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateCollection}
                    disabled={!newCollName.trim() || creatingColl}
                    className="px-3 py-2 rounded-xl text-sm font-black text-white transition-opacity disabled:opacity-40 cursor-pointer"
                    style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}
                  >
                    {creatingColl ? '…' : '+ Add'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {collToast && (
            <div className="text-center text-xs font-black py-2.5 rounded-full" style={{ color: '#52C9A0', background: '#F0FBF7' }}>
              ✓ {collToast}
            </div>
          )}

          {/* You might also like */}
          {relatedRecipes.length > 0 && (
            <div>
              <div className="border-t border-[#F0F0F0] mb-4" />
              <h3 className="text-xs font-black text-[#2C2C2C] uppercase tracking-wider mb-2">
                🍴 You might also like
              </h3>
              <div>
                {relatedRecipes.map((r, i) => {
                  const _rUrl = (r as any).imageUrl || (r as any).image || '';
                  const rImg = _rUrl && _rUrl.startsWith('http') ? _rUrl : getFoodImageUrl(r.title || '');
                  const rHasAll = r.matchType === 'full';
                  return (
                    <div key={r._id}>
                      {i > 0 && <div className="border-t border-[#F5F5F5]" />}
                      <div className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-xl hover:bg-orange-50 transition-colors cursor-pointer group">
                        <Link href={`/recipe/${r._id}`} className="shrink-0 w-14 h-14 rounded-2xl overflow-hidden hover:opacity-90 transition-opacity">
                          <RelatedImg src={rImg} alt={r.title} />
                        </Link>
                        <Link href={`/recipe/${r._id}`} className="flex-1 text-left min-w-0">
                          <p className="text-sm font-black text-[#2C2C2C] line-clamp-1 group-hover:text-orange-500 transition-colors">{r.title}</p>
                          <p className="text-xs font-semibold text-[#bbb]">recipematch.app</p>
                          <p className="text-xs font-bold mt-0.5" style={{ color: rHasAll ? '#52C9A0' : '#F59E0B' }}>
                            {rHasAll
                              ? `You have all ${r.matchedIngredients.length} ingredients`
                              : `Missing ${r.missingIngredients.length}`}
                          </p>
                        </Link>
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); if (!isLoggedIn) { onNeedAuth(); return; } onToggleFavorite(r._id); }}
                            className="text-base hover:scale-110 transition-transform cursor-pointer"
                          >
                            🤍
                          </button>
                          <span className="text-sm font-bold text-[#ccc] group-hover:text-orange-400 transition-colors">→</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#2C2C2C] text-white text-sm font-black px-5 py-2.5 rounded-full shadow-xl animate-fadeIn">
          {toast}
        </div>
      )}
    </>
  );
}

function RelatedImg({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
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
