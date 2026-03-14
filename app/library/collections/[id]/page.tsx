'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Recipe } from '@/types';
import { getRecipeImage } from '@/lib/recipeImages';

interface CollectionDetail {
  _id: string;
  name: string;
  emoji: string;
  recipes: Recipe[];
}

function Img({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(false);
  if (err) return <div className="w-full h-full bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center text-4xl">🍽️</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="w-full h-full object-cover" onError={() => setErr(true)} loading="lazy" />;
}

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const res = await fetch(`/api/collections/${id}`);
        if (res.status === 401) { router.push('/login'); return; }
        if (!res.ok) throw new Error();
        const data = await res.json();
        setCollection(data.collection);
      } catch { setError('Collection not found.'); }
      finally { setLoading(false); }
    }
    load();
  }, [id, router]);

  async function handleRemove(recipeId: string) {
    if (!collection) return;
    try {
      await fetch(`/api/collections/${id}/recipes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
      });
      setCollection((prev) =>
        prev ? { ...prev, recipes: prev.recipes.filter((r) => r._id !== recipeId) } : prev
      );
      showToast(`Removed from ${collection.name}`);
    } catch { /* ignore */ }
    setRemovingId(null);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center gap-4">
        <p className="text-[#666] font-semibold">{error || 'Collection not found'}</p>
        <Link href="/library?tab=collections" className="font-black text-sm px-5 py-2.5 rounded-full text-white hover:opacity-90" style={{ background: '#FF6B6B' }}>
          ← Back to Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Nav */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8ECEF] px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link
          href="/library?tab=collections"
          className="flex items-center gap-2 text-sm font-black transition-colors hover:opacity-80"
          style={{ color: '#FF6B6B' }}
        >
          ← Collections
        </Link>
        <span className="text-[#E0E0E0]">·</span>
        <span className="text-[#999] text-sm font-semibold">
          {collection.emoji} {collection.name}
        </span>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#2C2C2C]">
            {collection.emoji} {collection.name}
          </h1>
          <p className="text-[#999] font-semibold text-sm mt-1">
            {collection.recipes.length} recipe{collection.recipes.length !== 1 ? 's' : ''}
          </p>
        </div>

        {collection.recipes.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-black text-[#2C2C2C] mb-2">No recipes in this collection yet</h2>
            <p className="text-[#999] font-semibold mb-6">Save recipes here from the recipe detail panel.</p>
            <Link href="/" className="inline-block font-black text-sm px-6 py-3 rounded-full text-white hover:opacity-90 shadow-md" style={{ background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' }}>
              Browse Recipes
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collection.recipes.map((recipe) => {
              if (!recipe?._id) return null;
              const imgUrl = getRecipeImage(recipe.title, recipe.imageUrl);
              return (
                <div key={recipe._id} className="recipe-card relative bg-white rounded-3xl overflow-hidden shadow-sm border border-[#F0F0F0] group">
                  <div className="relative h-36 overflow-hidden">
                    <Img src={imgUrl} alt={recipe.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                    {/* Remove button — appears on hover */}
                    <button
                      onClick={(e) => { e.preventDefault(); setRemovingId(recipe._id); }}
                      className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#999] hover:text-[#FF6B6B] hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-md z-10 font-black text-base leading-none"
                      title="Remove from collection"
                    >
                      ×
                    </button>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <Link href={`/recipe/${recipe._id}`} className="block font-black text-[#2C2C2C] text-sm leading-tight line-clamp-2 hover:opacity-80 transition-opacity">
                      {recipe.title}
                    </Link>
                    <div className="flex items-center gap-3 text-xs font-bold text-[#999]">
                      <span>⏱ {recipe.cookTime}m</span>
                      <span>👤 {recipe.servings}</span>
                      <span>⚡ {recipe.difficulty}</span>
                      {recipe.cuisine && <span>🍴 {recipe.cuisine}</span>}
                    </div>
                    <Link
                      href={`/recipe/${recipe._id}`}
                      className="block text-center text-xs font-black py-2 rounded-full hover:opacity-90 transition-opacity"
                      style={{ background: '#FFF5F5', color: '#FF6B6B' }}
                    >
                      View Recipe →
                    </Link>
                  </div>

                  {/* Inline confirm dialog */}
                  {removingId === recipe._id && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-20 rounded-3xl">
                      <p className="text-sm font-black text-[#2C2C2C] text-center mb-4">
                        Remove from {collection.name}?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRemovingId(null)}
                          className="px-4 py-2 text-sm font-bold text-[#666] bg-[#F5F5F5] rounded-full hover:bg-[#E8ECEF] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleRemove(recipe._id)}
                          className="px-4 py-2 text-sm font-black text-white rounded-full hover:opacity-90 transition-opacity"
                          style={{ background: '#FF6B6B' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#2C2C2C] text-white text-sm font-black px-5 py-2.5 rounded-full shadow-xl animate-fadeIn">
          {toast}
        </div>
      )}
    </div>
  );
}
