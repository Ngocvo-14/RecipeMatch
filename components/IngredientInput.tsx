'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { INGREDIENT_DB } from '@/lib/ingredientDatabase';

const QUICK = [
  'egg','rice','pasta','garlic','onion','butter','milk','chicken breast',
  'ground beef','tomato','potato','bread','flour','soy sauce','olive oil',
  'lemon','banana','carrot','broccoli','cheddar cheese','avocado','shrimp',
];

const NOT_INGREDIENTS = new Set([
  'korean','vietnamese','japanese','chinese','thai','indian',
  'italian','mexican','french','american','greek','mediterranean',
  'spanish','turkish','moroccan','peruvian','brazilian','caribbean',
  'pho','ramen','sushi','bibimbap','kimchi','pasta','pizza','paella',
  'breakfast','lunch','dinner','dessert','snack','brunch',
  'easy','hard','quick','simple','fast','healthy','spicy','sweet','savory',
  'vegan','vegetarian','keto','gluten-free','dairy-free','halal','kosher',
]);

interface Props {
  ingredients: string[];
  onIngredientsChange: (ingredients: string[]) => void;
  onSearchByName?: (query: string) => void;
  onSearchSubmit?: () => void;
  searchActive?: boolean;
  onClearSearch?: () => void;
}

export default function IngredientInput({ ingredients, onIngredientsChange, onSearchByName, onSearchSubmit, searchActive, onClearSearch }: Props) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const autocompleteResults = input.length >= 2
    ? INGREDIENT_DB.filter((ing) =>
        ing.name.includes(input.toLowerCase()) ||
        (ing.alias && ing.alias.includes(input.toLowerCase()))
      ).slice(0, 6)
    : [];

  const inputLower = input.trim().toLowerCase();
  const isNotIngredient = inputLower.length >= 2 && NOT_INGREDIENTS.has(inputLower);
  const noIngredientMatch = input.length >= 2 && autocompleteResults.length === 0;

  function redirectToRecipeSearch(val: string) {
    onSearchByName?.(val.trim());
    setInput('');
    setShowDropdown(false);
    onSearchSubmit?.();
  }

  function add(val: string) {
    const v = val.trim().toLowerCase();
    if (!v) return;
    if (NOT_INGREDIENTS.has(v)) { redirectToRecipeSearch(val.trim()); return; }
    if (!ingredients.includes(v)) onIngredientsChange([...ingredients, v]);
    setInput('');
    setShowDropdown(false);
  }

  function remove(ing: string) {
    onIngredientsChange(ingredients.filter((i) => i !== ing));
  }

  function toggleFromDB(name: string) {
    if (ingredients.includes(name)) { remove(name); }
    else { onIngredientsChange([...ingredients, name]); setInput(''); setShowDropdown(false); }
  }

  function toggleQuick(ing: string) {
    if (ingredients.includes(ing)) remove(ing);
    else onIngredientsChange([...ingredients, ing]);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (autocompleteResults.length > 0 && !isNotIngredient) {
        add(autocompleteResults[0].name);
        if (e.key === 'Enter') onSearchSubmit?.();
      } else if (isNotIngredient || noIngredientMatch) {
        redirectToRecipeSearch(input); // already calls onSearchSubmit internally
      } else {
        add(input);
        if (e.key === 'Enter') onSearchSubmit?.();
      }
    } else if (e.key === 'Backspace' && !input && ingredients.length > 0) {
      remove(ingredients[ingredients.length - 1]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }

  const quickFiltered = QUICK.filter((i) => !input || i.includes(input.toLowerCase()));
  const addButtonIsRedirect = isNotIngredient || (noIngredientMatch && inputLower.length >= 3);

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div ref={containerRef} className="relative">
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-2 focus-within:border-orange-300 transition-colors">
          <span className="text-gray-400 text-sm shrink-0">🔍</span>
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowDropdown(e.target.value.length >= 2); }}
            onKeyDown={onKey}
            placeholder="Search ingredients, recipes,..."
            className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 outline-none bg-transparent"
          />
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && autocompleteResults.length > 0 && !isNotIngredient && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden max-h-[260px] overflow-y-auto">
            {autocompleteResults.map((ing) => {
              const isAdded = ingredients.includes(ing.name);
              return (
                <button
                  key={ing.name}
                  onClick={() => toggleFromDB(ing.name)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <span className={`text-base shrink-0 leading-none ${isAdded ? 'text-orange-400' : 'text-emerald-500'}`}>
                    {isAdded ? '🗑' : '+'}
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-700 min-w-0">
                    {ing.name}
                    {ing.alias && <span className="text-gray-400 ml-1 font-normal">({ing.alias})</span>}
                  </span>
                  <span className={`text-xs font-semibold shrink-0 ${isAdded ? 'text-orange-400' : 'text-emerald-500'}`}>
                    {isAdded ? 'remove' : 'add'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Recipe-search redirect suggestion */}
        {showDropdown && (isNotIngredient || noIngredientMatch) && inputLower.length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
            {isNotIngredient && (
              <p className="px-4 pt-3 pb-1 text-xs text-gray-400">
                &ldquo;{input}&rdquo; is a cuisine or dish name, not an ingredient.
              </p>
            )}
            {!isNotIngredient && noIngredientMatch && (
              <p className="px-4 pt-3 pb-1 text-xs text-gray-400">
                No ingredient matches &ldquo;{input}&rdquo;.
              </p>
            )}
            <button
              onClick={() => redirectToRecipeSearch(input)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left"
            >
              <span className="text-lg shrink-0">🔍</span>
              <span className="flex-1 text-sm font-medium" style={{ color: '#6B8EFF' }}>
                Search &ldquo;{input}&rdquo; as a recipe name instead
              </span>
              <span className="font-semibold text-sm" style={{ color: '#6B8EFF' }}>→</span>
            </button>
          </div>
        )}
      </div>

      {/* Text search active banner */}
      {searchActive && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
          <span className="text-xs">🔍</span>
          <p className="text-xs font-semibold text-blue-500 flex-1">Text search active — ingredients ignored</p>
          <button
            onClick={onClearSearch}
            className="text-xs font-bold text-blue-400 hover:text-blue-600 transition-colors cursor-pointer shrink-0"
          >
            ✕ clear
          </button>
        </div>
      )}

      {/* Added ingredients — orange card */}
      {ingredients.length > 0 && (
        <div className="bg-orange-500 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white text-xs font-bold tracking-wider uppercase">
              🧺 Your ingredients ({ingredients.length})
            </p>
            <button onClick={() => onIngredientsChange([])} className="text-white/70 text-xs hover:text-white transition-colors">
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ingredients.map((ing) => (
              <span key={ing} className="flex items-center gap-1 bg-white/20 text-white text-sm px-3 py-1 rounded-full border border-white/30">
                {ing}
                <button onClick={() => remove(ing)} className="text-white/70 hover:text-white leading-none ml-0.5 font-medium">×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick picks */}
      <div>
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">⚡ Quick picks</p>
        <div className="flex flex-wrap gap-1.5">
          {quickFiltered.map((ing) => (
            <button
              key={ing}
              onClick={() => toggleQuick(ing)}
              className={`text-sm py-1.5 px-3 rounded-full border transition-all shadow-sm ${
                ingredients.includes(ing)
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600'
              }`}
            >
              {ing}
            </button>
          ))}
        </div>
      </div>

      <p className="bg-green-100 text-green-700 text-xs rounded-full px-3 py-1.5 font-medium inline-block">
        Salt, pepper &amp; water always assumed ✓
      </p>
    </div>
  );
}
