'use client';

import { useState } from 'react';
import { MatchedRecipe } from '@/types';
import { formatCookTime } from '@/lib/formatCookTime';

interface Props {
  recipe: MatchedRecipe;
  recipeIndex?: number;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
  isLoggedIn?: boolean;
  onOpenPanel: (recipe: MatchedRecipe, index: number) => void;
  onNeedAuth: () => void;
}

const MATCH_CONFIG = {
  full: { label: 'Ready',      badgeClass: 'bg-emerald-500 text-white' },
  near: { label: 'Near Match', badgeClass: 'bg-amber-400 text-white' },
  low:  { label: 'Low Match',  badgeClass: 'bg-gray-400 text-white' },
};

export default function RecipeCard({ recipe, recipeIndex = 0, isFavorited = false, onToggleFavorite, isLoggedIn = false, onOpenPanel, onNeedAuth }: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  const cfg = MATCH_CONFIG[recipe.matchType];

  function handleImgError(e: React.SyntheticEvent<HTMLImageElement>) {
    const t = e.target as HTMLImageElement;
    if (!t.dataset.errored) {
      t.dataset.errored = '1';
      t.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800';
      return;
    }
    setImgFailed(true);
  }

  function handleFav(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isLoggedIn) { onNeedAuth(); return; }
    onToggleFavorite?.(recipe._id);
  }

  // Progress bar calculation
  const totalIngredients = recipe.matchedIngredients.length + recipe.missingIngredients.length;
  const matchPct = totalIngredients > 0 ? recipe.matchedIngredients.length / totalIngredients : 1;
  const missingToShow = recipe.missingIngredients.slice(0, 3);
  const missingExtra = recipe.missingIngredients.length - 3;

  return (
    <div
      className="recipe-card bg-white rounded-3xl overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
      onClick={() => onOpenPanel(recipe, recipeIndex)}
    >
      {/* Photo — 16/9 */}
      <div className="relative aspect-video overflow-hidden cursor-pointer">
        {!imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={(recipe as any).imageUrl || recipe.title}
            src={(() => {
              const url = (recipe as any).imageUrl || (recipe as any).image || '';
              if (url && url.startsWith('http')) return url;
              return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800';
            })()}
            alt={recipe.title}
            className="w-full h-full object-cover"
            onError={handleImgError}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-100" />
        )}

        {/* Match badge — top left, colored pill */}
        <div className={`absolute top-3 left-3 text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.badgeClass}`}>
          {cfg.label}
        </div>

        {/* Favorite — top right */}
        <button
          onClick={handleFav}
          className="absolute top-3 right-3 bg-white/90 rounded-full p-2 text-gray-300 hover:text-red-400 transition-colors duration-200 shadow-sm"
        >
          <span className="text-sm leading-none">{isFavorited ? '❤️' : '🤍'}</span>
        </button>

        {/* Score — bottom right */}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur text-gray-800 font-bold text-sm px-2.5 py-1 rounded-xl shadow-sm">
          {Math.round(recipe.matchScore * 100)}%
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Title */}
        <h3 className="font-bold text-gray-900 text-lg leading-snug mb-3 line-clamp-2 cursor-pointer hover:text-orange-500 transition-colors">
          {recipe.title}
        </h3>

        {/* Meta row */}
        <div className="flex items-center gap-1 text-gray-400 text-xs mb-4 flex-wrap">
          <span>⏱️ {formatCookTime(recipe.cookTime)}</span>
          <span className="opacity-40 mx-0.5">·</span>
          <span>👥 {recipe.servings}</span>
          <span className="opacity-40 mx-0.5">·</span>
          <span>⚡ {recipe.difficulty}</span>
          {recipe.estimatedCost && (
            <>
              <span className="opacity-40 mx-0.5">·</span>
              <span>💰 ${recipe.estimatedCost}</span>
            </>
          )}
        </div>

        {/* Ingredient progress bar */}
        {totalIngredients > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 font-medium">
                {recipe.matchedIngredients.length}/{totalIngredients} ingredients matched
              </span>
            </div>
            <div className="bg-gray-100 rounded-full h-1.5 w-full">
              <div
                className="bg-orange-400 rounded-full h-1.5 transition-all duration-300"
                style={{ width: `${Math.round(matchPct * 100)}%` }}
              />
            </div>
            {recipe.missingIngredients.length > 0 && (
              <p className="text-gray-400 text-xs mt-1.5">
                Missing: {missingToShow.join(', ')}
                {missingExtra > 0 && <span className="text-gray-300"> +{missingExtra} more</span>}
              </p>
            )}
          </div>
        )}

        {/* View Recipe button */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenPanel(recipe, recipeIndex); }}
          className="w-full bg-orange-50 hover:bg-orange-500 text-orange-500 hover:text-white border border-orange-200 hover:border-orange-500 rounded-2xl py-2.5 text-sm font-semibold transition-all duration-200"
        >
          View Recipe →
        </button>
      </div>
    </div>
  );
}
