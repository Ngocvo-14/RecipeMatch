'use client';

import { FilterState } from '@/types';

interface Props {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
}

const MEAL_TYPES = ['All', 'Quick & Easy', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Salad', 'Side Dish', 'Dessert', 'Soups & Stews'];
const COOK_TIMES: { label: string; value: number | null }[] = [
  { label: 'Any', value: null },
  { label: '≤15 min', value: 15 },
  { label: '≤30 min', value: 30 },
  { label: '≤60 min', value: 60 },
  { label: '≤2 hrs', value: 120 },
];
const CUISINES = ['All', 'Asian', 'American', 'Italian', 'Indian', 'Thai', 'Korean', 'Chinese', 'Mexican', 'French', 'Mediterranean'];
const DIETS = ['All', 'Vegetarian', 'Vegan', 'Gluten Free'];
const TAGS = ['one-pan', 'microwave', 'dorm-friendly', 'student-friendly', 'budget-friendly'];

export default function FilterPanel({ filters, onFiltersChange }: Props) {
  function update(k: keyof FilterState, v: FilterState[keyof FilterState]) {
    onFiltersChange({ ...filters, [k]: v });
  }
  function toggleTag(tag: string) {
    const tags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags });
  }

  const hasActive = filters.mealType !== 'All' || filters.cuisine !== 'All' ||
    filters.diet !== 'All' || filters.maxCookTime !== 9999 || filters.tags.length > 0;

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer ${
      active
        ? 'bg-orange-500 text-white border-orange-500'
        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
    }`;

  return (
    <div>
      {hasActive && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => onFiltersChange({ mealType: 'All', cuisine: 'All', diet: 'All', maxCookTime: 9999, equipment: 'All', tags: [] })}
            className="text-xs font-bold text-red-400 hover:text-red-500 transition-colors cursor-pointer"
          >
            Reset all
          </button>
        </div>
      )}

      {/* Meal Type */}
      <div className="mb-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          🍽️ Meal Type
        </p>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map((option) => (
            <button
              key={option}
              onClick={() => update('mealType', option)}
              className={pillClass(filters.mealType === option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Cook Time */}
      <div className="mb-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          ⏱️ Cook Time
        </p>
        <div className="flex flex-wrap gap-2">
          {COOK_TIMES.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => update('maxCookTime', value ?? 9999)}
              className={pillClass(
                value === null ? filters.maxCookTime === 9999 : filters.maxCookTime === value
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cuisine */}
      <div className="mb-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          🌍 Cuisine
        </p>
        <div className="flex flex-wrap gap-2">
          {CUISINES.map((option) => (
            <button
              key={option}
              onClick={() => update('cuisine', option)}
              className={pillClass(filters.cuisine === option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Diet */}
      <div className="mb-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          🥗 Diet
        </p>
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => (
            <button
              key={d}
              onClick={() => update('diet', d)}
              className={pillClass(filters.diet === d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Tags */}
      <div className="mb-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          ✨ Quick Tags
        </p>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                filters.tags.includes(tag)
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
