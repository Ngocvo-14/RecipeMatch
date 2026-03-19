'use client';

import { useState } from 'react';
import { INGREDIENT_DB, CATEGORY_META } from '@/lib/ingredientDatabase';

interface Props {
  ingredients: string[];
  onIngredientsChange: (ingredients: string[]) => void;
}

export default function IngredientCategories({ ingredients, onIngredientsChange }: Props) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  function toggleSection(name: string) {
    setOpenSections((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name); else n.add(name);
      return n;
    });
  }

  function toggleExpand(name: string) {
    setExpandedSections((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name); else n.add(name);
      return n;
    });
  }

  function toggle(name: string) {
    if (ingredients.includes(name)) {
      onIngredientsChange(ingredients.filter((i) => i !== name));
    } else {
      onIngredientsChange([...ingredients, name]);
    }
  }

  return (
    <div className="space-y-0.5 mt-2">
      {CATEGORY_META.map(({ emoji, name }) => {
        const items = INGREDIENT_DB.filter((i) => i.category === name);
        const isOpen = openSections.has(name);
        const isExpanded = expandedSections.has(name);
        const addedCount = items.filter((i) => ingredients.includes(i.name)).length;
        const visible = isExpanded ? items : items.slice(0, 12);

        return (
          <div key={name}>
            {/* Category header */}
            <button
              onClick={() => toggleSection(name)}
              className="w-full flex items-center gap-2 py-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="text-sm">{emoji}</span>
              <span className="flex-1 text-left text-[11px] font-black tracking-[0.15em] text-gray-400 uppercase">{name}</span>
              {addedCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                  {addedCount}
                </span>
              )}
              <span className="text-[10px] text-gray-300">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Ingredient grid */}
            {isOpen && (
              <div className="pb-3">
                <div className="grid grid-cols-2 gap-1.5">
                  {visible.map((ing) => {
                    const isAdded = ingredients.includes(ing.name);
                    return (
                      <button
                        key={ing.name}
                        onClick={() => toggle(ing.name)}
                        title={ing.alias ? `${ing.name} (${ing.alias})` : ing.name}
                        className={`text-sm px-3 py-2 rounded-xl border transition-all shadow-sm text-left truncate cursor-pointer ${
                          isAdded
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600'
                        }`}
                      >
                        {ing.name}
                      </button>
                    );
                  })}
                </div>
                {items.length > 12 && (
                  <button
                    onClick={() => toggleExpand(name)}
                    className="mt-2 text-xs font-semibold text-orange-500 hover:opacity-80 transition-opacity"
                  >
                    {isExpanded ? '▲ Show less' : `+${items.length - 12} More ▼`}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
