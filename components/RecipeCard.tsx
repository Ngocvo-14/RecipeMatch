'use client';

import { useState } from 'react';
import { MatchedRecipe } from '@/types';
import { getRecipeImage } from '@/lib/recipeImages';
import { formatCookTime } from '@/lib/formatCookTime';

interface Props {
  recipe: MatchedRecipe;
  recipeIndex?: number;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
  isLoggedIn?: boolean;
  onOpenPanel: (recipe: MatchedRecipe) => void;
  onNeedAuth: () => void;
}

const MATCH_CONFIG = {
  full: { label: 'Ready to Cook', bg: '#F0FBF7', text: '#52C9A0', dot: '#52C9A0' },
  near: { label: 'Near Match',    bg: '#FFFBEB', text: '#F59E0B', dot: '#F59E0B' },
  low:  { label: 'Low Match',     bg: '#F9FAFB', text: '#9CA3AF', dot: '#9CA3AF' },
};

// Gradient palette keyed by cuisine / mealType for the final fallback
const CUISINE_GRADIENTS: Record<string, string> = {
  Italian:       'linear-gradient(135deg,#FDE68A,#FCA5A5)',
  Mexican:       'linear-gradient(135deg,#FDE68A,#86EFAC)',
  Asian:         'linear-gradient(135deg,#BAE6FD,#C4B5FD)',
  Chinese:       'linear-gradient(135deg,#FCA5A5,#FBBF24)',
  Japanese:      'linear-gradient(135deg,#E0F2FE,#FCA5A5)',
  Korean:        'linear-gradient(135deg,#FEE2E2,#FBBF24)',
  Indian:        'linear-gradient(135deg,#FED7AA,#FCA5A5)',
  Thai:          'linear-gradient(135deg,#D9F99D,#FDE68A)',
  Mediterranean: 'linear-gradient(135deg,#BAE6FD,#6EE7B7)',
  American:      'linear-gradient(135deg,#DBEAFE,#FCA5A5)',
  French:        'linear-gradient(135deg,#E0E7FF,#FDE68A)',
  Breakfast:     'linear-gradient(135deg,#FEF3C7,#FDE68A)',
  Dessert:       'linear-gradient(135deg,#FCE7F3,#DDD6FE)',
};
const DEFAULT_GRADIENT = 'linear-gradient(135deg,#FFE4E6,#FFF7ED)';

function getCuisineGradient(recipe: MatchedRecipe) {
  return CUISINE_GRADIENTS[recipe.cuisine] || CUISINE_GRADIENTS[recipe.mealType] || DEFAULT_GRADIENT;
}

export default function RecipeCard({ recipe, recipeIndex = 0, isFavorited = false, onToggleFavorite, isLoggedIn = false, onOpenPanel, onNeedAuth }: Props) {
  // stage 0 = primary URL, 1 = keyword pool fallback, 2 = gradient
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  const cfg = MATCH_CONFIG[recipe.matchType];

  // Stage 0: real source image if valid, else title+index keyed pool URL
  const primaryUrl = getRecipeImage(recipe.title, recipe.imageUrl, recipeIndex);
  // Stage 1: pool lookup with a +4 offset so the fallback slot is always
  // different (pool has 8 slots, offset = pool_size/2 guarantees a different
  // entry even when imageUrl is null and both calls would otherwise be identical)
  const keywordUrl  = getRecipeImage(recipe.title, undefined, recipeIndex + 4);

  // hasFallback is now always true — stage-1 retry is always available
  const hasFallback = primaryUrl !== keywordUrl;

  function handleImgError() {
    if (stage === 0 && hasFallback) { setStage(1); return; }
    setStage(2);
  }

  function handleFav(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isLoggedIn) { onNeedAuth(); return; }
    onToggleFavorite?.(recipe._id);
  }

  return (
    <div
      className="recipe-card bg-white rounded-3xl overflow-hidden shadow-sm border border-[#F0F0F0] cursor-pointer"
      onClick={() => onOpenPanel(recipe)}
    >
      {/* Photo */}
      <div className="relative h-36 overflow-hidden">
        {stage < 2 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={stage}
            src={stage === 0 ? primaryUrl : keywordUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
            onError={handleImgError}
            loading="lazy"
          />
        ) : (
          /* Gradient placeholder — cuisine-tinted, no text */
          <div
            className="w-full h-full"
            style={{ background: getCuisineGradient(recipe) }}
          />
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Match badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: cfg.bg }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }}></span>
          <span className="text-xs font-black" style={{ color: cfg.text }}>{cfg.label}</span>
        </div>

        {/* Favorite */}
        <button
          onClick={handleFav}
          className="absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
        >
          <span className="text-sm">{isFavorited ? '❤️' : '🤍'}</span>
        </button>

        {/* Score */}
        <div className="absolute bottom-2 right-2.5 bg-white/90 backdrop-blur-sm text-[#2C2C2C] text-xs font-black px-2 py-0.5 rounded-full">
          {Math.round(recipe.matchScore * 100)}%
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2.5">
        <h3 className="font-black text-[#2C2C2C] text-sm leading-tight line-clamp-2">
          {recipe.title}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs font-bold text-[#999]">
          <span>⏱ {formatCookTime(recipe.cookTime)}</span>
          <span>👤 {recipe.servings}</span>
          <span>⚡ {recipe.difficulty}</span>
          {recipe.estimatedCost && <span className="ml-auto font-black text-[#666]">${recipe.estimatedCost}</span>}
        </div>

        {/* Ingredients chips */}
        <div className="space-y-1">
          {recipe.matchedIngredients.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.matchedIngredients.slice(0, 4).map((ing, i) => (
                <span key={`${i}-${ing}`} className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#F0FBF7', color: '#52C9A0' }}>
                  ✓ {ing}
                </span>
              ))}
              {recipe.matchedIngredients.length > 4 && (
                <span className="text-xs font-bold text-[#bbb]">+{recipe.matchedIngredients.length - 4}</span>
              )}
            </div>
          )}
          {recipe.missingIngredients.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.missingIngredients.map((ing, i) => (
                <span key={`${i}-${ing}`} className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFF5F5', color: '#FF6B6B' }}>
                  ✗ {ing}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenPanel(recipe); }}
          className="block w-full text-center text-xs font-black py-2 rounded-full transition-all hover:opacity-90"
          style={{ background: '#FFF5F5', color: '#FF6B6B' }}
        >
          View Recipe →
        </button>
      </div>
    </div>
  );
}
