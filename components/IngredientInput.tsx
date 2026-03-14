'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { INGREDIENT_DB } from '@/lib/ingredientDatabase';

const QUICK = [
  'egg','rice','pasta','garlic','onion','butter','milk','chicken breast',
  'ground beef','tomato','potato','bread','flour','soy sauce','olive oil',
  'lemon','banana','carrot','broccoli','cheddar cheese','avocado','shrimp',
];

// Words that are cuisines, dish names, or search terms — never valid ingredients
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
}

export default function IngredientInput({ ingredients, onIngredientsChange, onSearchByName }: Props) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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
  }

  function add(val: string) {
    const v = val.trim().toLowerCase();
    if (!v) return;

    // Block cuisine/dish-name words — redirect to recipe search instead
    if (NOT_INGREDIENTS.has(v)) {
      redirectToRecipeSearch(val.trim());
      return;
    }

    if (!ingredients.includes(v)) onIngredientsChange([...ingredients, v]);
    setInput('');
    setShowDropdown(false);
  }

  function remove(ing: string) {
    onIngredientsChange(ingredients.filter((i) => i !== ing));
  }

  function toggleFromDB(name: string) {
    if (ingredients.includes(name)) {
      remove(name);
    } else {
      onIngredientsChange([...ingredients, name]);
      setInput('');
      setShowDropdown(false);
    }
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
      } else {
        add(input);
      }
    } else if (e.key === 'Backspace' && !input && ingredients.length > 0) {
      remove(ingredients[ingredients.length - 1]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }

  const quickFiltered = QUICK.filter((i) => !input || i.includes(input.toLowerCase()));

  // Determine Add button behavior
  const addButtonIsRedirect = isNotIngredient || (noIngredientMatch && inputLower.length >= 3);

  return (
    <div className="space-y-4">
      {/* Search input with autocomplete */}
      <div ref={containerRef} className="relative">
        <div className="bg-white rounded-2xl border border-[#E8ECEF] px-4 py-3 flex items-center gap-2 focus-within:border-[#FF6B6B] transition-colors shadow-sm">
          <span className="text-lg">🧅</span>
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowDropdown(e.target.value.length >= 2);
            }}
            onKeyDown={onKey}
            placeholder="Search ingredients to add..."
            className="flex-1 text-sm text-[#2C2C2C] font-semibold placeholder:text-[#bbb] placeholder:font-normal outline-none bg-transparent"
          />
          {input && (
            <button
              onClick={() => addButtonIsRedirect ? redirectToRecipeSearch(input) : add(input)}
              className="text-xs font-black text-white px-3 py-1 rounded-full transition-all hover:opacity-90 shrink-0"
              style={{ background: addButtonIsRedirect ? '#6B8EFF' : '#FF6B6B' }}
            >
              {addButtonIsRedirect ? '🔍 Search' : 'Add'}
            </button>
          )}
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && autocompleteResults.length > 0 && !isNotIngredient && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-[#E8ECEF] shadow-xl z-50 overflow-hidden max-h-[260px] overflow-y-auto">
            {autocompleteResults.map((ing) => {
              const isAdded = ingredients.includes(ing.name);
              return (
                <button
                  key={ing.name}
                  onClick={() => toggleFromDB(ing.name)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#FFF5F5] transition-colors text-left border-b border-[#F8F9FA] last:border-0"
                >
                  <span className={`text-base shrink-0 leading-none ${isAdded ? 'text-[#FF6B6B]' : 'text-[#52C9A0]'}`}>
                    {isAdded ? '🗑' : '+'}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-[#2C2C2C] min-w-0">
                    {ing.name}
                    {ing.alias && <span className="text-[#bbb] ml-1 font-normal">({ing.alias})</span>}
                  </span>
                  <span className={`text-xs font-black shrink-0 ${isAdded ? 'text-[#FF6B6B]' : 'text-[#52C9A0]'}`}>
                    {isAdded ? 'remove' : 'add'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Recipe-search redirect suggestion — shown when input looks like a dish/cuisine */}
        {showDropdown && (isNotIngredient || noIngredientMatch) && inputLower.length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-[#E8ECEF] shadow-xl z-50 overflow-hidden">
            {isNotIngredient && (
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-[#bbb]">
                &ldquo;{input}&rdquo; is a cuisine or dish name, not an ingredient.
              </p>
            )}
            {!isNotIngredient && noIngredientMatch && (
              <p className="px-4 pt-3 pb-1 text-xs font-semibold text-[#bbb]">
                No ingredient matches &ldquo;{input}&rdquo;.
              </p>
            )}
            <button
              onClick={() => redirectToRecipeSearch(input)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F0F4FF] transition-colors text-left"
            >
              <span className="text-lg shrink-0">🔍</span>
              <span className="flex-1 text-sm font-semibold" style={{ color: '#6B8EFF' }}>
                Search &ldquo;{input}&rdquo; as a recipe name instead
              </span>
              <span className="text-[#6B8EFF] font-black text-sm">→</span>
            </button>
          </div>
        )}
      </div>

      {/* Added ingredients */}
      {ingredients.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8ECEF] p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-[#2C2C2C] uppercase tracking-wider">
              🧺 Your ingredients ({ingredients.length})
            </p>
            <button onClick={() => onIngredientsChange([])} className="text-xs font-bold text-[#bbb] hover:text-red-400 transition-colors">
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ingredients.map((ing) => (
              <span key={ing} className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border" style={{ background: '#FFF5F5', borderColor: '#FF6B6B', color: '#FF6B6B' }}>
                {ing}
                <button onClick={() => remove(ing)} className="hover:opacity-60 font-black leading-none ml-0.5">×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick picks */}
      <div>
        <p className="text-xs font-black text-[#666] uppercase tracking-wider mb-2">⚡ Quick picks</p>
        <div className="flex flex-wrap gap-1.5">
          {quickFiltered.map((ing) => (
            <button
              key={ing}
              onClick={() => toggleQuick(ing)}
              className="text-xs font-bold px-3 py-1.5 rounded-full border transition-all"
              style={ingredients.includes(ing)
                ? { background: '#FF6B6B', borderColor: '#FF6B6B', color: 'white' }
                : { background: 'white', borderColor: '#E8ECEF', color: '#666' }}
            >
              {ing}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs font-semibold" style={{ color: '#bbb' }}>
        Salt, pepper & water always assumed ✓
      </p>
    </div>
  );
}
