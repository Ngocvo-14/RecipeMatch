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
    <div className="space-y-1.5 mt-1">
      {CATEGORY_META.map(({ emoji, name }) => {
        const items = INGREDIENT_DB.filter((i) => i.category === name);
        const isOpen = openSections.has(name);
        const isExpanded = expandedSections.has(name);
        const addedCount = items.filter((i) => ingredients.includes(i.name)).length;
        const visible = isExpanded ? items : items.slice(0, 12);

        return (
          <div key={name} className="bg-white rounded-2xl border border-[#E8ECEF] overflow-hidden">
            {/* Header */}
            <button
              onClick={() => toggleSection(name)}
              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-[#F8F9FA] transition-colors"
            >
              <span className="text-base">{emoji}</span>
              <span className="flex-1 text-left text-xs font-black text-[#2C2C2C] uppercase tracking-wide">{name}</span>
              {addedCount > 0 && (
                <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: '#F0FBF7', color: '#52C9A0' }}>
                  {addedCount}
                </span>
              )}
              <span className="text-[10px] text-[#ccc] font-bold">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Grid */}
            {isOpen && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-2 gap-1">
                  {visible.map((ing) => {
                    const isAdded = ingredients.includes(ing.name);
                    return (
                      <button
                        key={ing.name}
                        onClick={() => toggle(ing.name)}
                        title={ing.alias ? `${ing.name} (${ing.alias})` : ing.name}
                        className="text-xs font-bold px-2 py-1.5 rounded-xl border transition-all text-left truncate"
                        style={isAdded
                          ? { background: '#52C9A0', borderColor: '#52C9A0', color: 'white' }
                          : { background: '#F8F9FA', borderColor: '#E8ECEF', color: '#555' }}
                      >
                        {isAdded ? '✓ ' : ''}{ing.name}
                      </button>
                    );
                  })}
                </div>
                {items.length > 12 && (
                  <button
                    onClick={() => toggleExpand(name)}
                    className="mt-2 text-xs font-black hover:opacity-80 transition-opacity"
                    style={{ color: '#FF6B6B' }}
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
