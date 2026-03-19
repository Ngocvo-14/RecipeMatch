'use client';

import { useState } from 'react';

const MEAL_TYPES = ['Quick & Easy', 'Snacks', 'Lunch', 'Salad', 'Side Dish', 'Dessert', 'Dinner', 'Breakfast', 'Soup'];
const COOK_TIMES = ['Under 5 min', 'Under 15 min', 'Under 30 min', 'Under 60 min', 'Under 2 hrs'];
const CUISINES   = ['Asian', 'American', 'Italian', 'Indian', 'Thai', 'Korean', 'Chinese', 'Mexican', 'French'];

export interface CategoryFilterState {
  mealType: string | null;
  cookTime: string | null;
  cuisine:  string | null;
}

interface Props {
  onFilterChange: (filters: CategoryFilterState) => void;
}

export default function CategoryFilters({ onFilterChange }: Props) {
  const [mealType, setMealType] = useState<string | null>(null);
  const [cookTime, setCookTime] = useState<string | null>(null);
  const [cuisine,  setCuisine]  = useState<string | null>(null);

  function toggleMealType(value: string) {
    const next = mealType === value ? null : value;
    setMealType(next);
    onFilterChange({ mealType: next, cookTime, cuisine });
  }
  function toggleCookTime(value: string) {
    const next = cookTime === value ? null : value;
    setCookTime(next);
    onFilterChange({ mealType, cookTime: next, cuisine });
  }
  function toggleCuisine(value: string) {
    const next = cuisine === value ? null : value;
    setCuisine(next);
    onFilterChange({ mealType, cookTime, cuisine: next });
  }

  function pill(label: string, isSelected: boolean, onToggle: (v: string) => void) {
    return (
      <button
        key={label}
        onClick={() => onToggle(label)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border cursor-pointer ${
          isSelected
            ? 'bg-orange-500 border-orange-500 text-white shadow-md'
            : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-500 shadow-sm'
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-col gap-4">
      {/* Meal Type */}
      <div>
        <p className="text-[10px] font-black tracking-[0.15em] text-gray-400 uppercase mb-2">Meal Type</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {MEAL_TYPES.map((label) => pill(label, mealType === label, toggleMealType))}
        </div>
      </div>

      {/* Cook Time */}
      <div>
        <p className="text-[10px] font-black tracking-[0.15em] text-gray-400 uppercase mb-2">Cook Time</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {COOK_TIMES.map((label) => pill(label, cookTime === label, toggleCookTime))}
        </div>
      </div>

      {/* Cuisine */}
      <div>
        <p className="text-[10px] font-black tracking-[0.15em] text-gray-400 uppercase mb-2">Cuisine</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CUISINES.map((label) => pill(label, cuisine === label, toggleCuisine))}
        </div>
      </div>
    </div>
  );
}
