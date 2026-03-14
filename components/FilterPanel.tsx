'use client';

import { FilterState } from '@/types';

interface Props {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
}

const MEAL_TYPES = ['All','Appetizers','Lunch','Main Dish','Salad','Soups & Stews'];
const CUISINES   = ['All','Asian','Mexican','American','Italian'];
const DIETS      = ['All','Vegetarian','Vegan','Gluten Free'];
const TIMES      = [{ l:'Any', v:9999 },{ l:'≤15 min', v:15 },{ l:'≤30 min', v:30 },{ l:'≤60 min', v:60 }];
const TAGS       = ['one-pan','microwave','dorm-friendly','student-friendly','budget-friendly'];

const SECTION_ICONS: Record<string, string> = {
  'Meal Type': '🍽️',
  'Cuisine': '🌍',
  'Diet': '🥗',
  'Cook Time': '⏱️',
  'Quick Tags': '✨',
};

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

  function Pill({ label, active, onClick, accent = false }: { label: string; active: boolean; onClick: () => void; accent?: boolean }) {
    return (
      <button
        onClick={onClick}
        className="text-xs font-bold px-3 py-1.5 rounded-full border transition-all"
        style={active
          ? { background: accent ? '#52C9A0' : '#FF6B6B', borderColor: accent ? '#52C9A0' : '#FF6B6B', color: 'white' }
          : { background: 'white', borderColor: '#E8ECEF', color: '#666' }}
      >
        {label}
      </button>
    );
  }

  function Section({ title }: { title: string }) {
    return (
      <div className="flex items-center gap-1.5 mt-4 mb-2 first:mt-0">
        <span className="text-sm">{SECTION_ICONS[title]}</span>
        <p className="text-xs font-black text-[#2C2C2C] uppercase tracking-wider">{title}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-black text-[#2C2C2C] uppercase tracking-wider">🎛️ Filters</p>
        {hasActive && (
          <button
            onClick={() => onFiltersChange({ mealType:'All', cuisine:'All', diet:'All', maxCookTime:9999, equipment:'All', tags:[] })}
            className="text-xs font-bold text-red-400 hover:text-red-500 transition-colors"
          >
            Reset all
          </button>
        )}
      </div>

      <Section title="Meal Type" />
      <div className="flex flex-wrap gap-1.5">
        {MEAL_TYPES.map((t) => <Pill key={t} label={t} active={filters.mealType === t} onClick={() => update('mealType', t)} />)}
      </div>

      <Section title="Cuisine" />
      <div className="flex flex-wrap gap-1.5">
        {CUISINES.map((c) => <Pill key={c} label={c} active={filters.cuisine === c} onClick={() => update('cuisine', c)} />)}
      </div>

      <Section title="Diet" />
      <div className="flex flex-wrap gap-1.5">
        {DIETS.map((d) => <Pill key={d} label={d} active={filters.diet === d} onClick={() => update('diet', d)} />)}
      </div>

      <Section title="Cook Time" />
      <div className="flex flex-wrap gap-1.5">
        {TIMES.map(({ l, v }) => <Pill key={l} label={l} active={filters.maxCookTime === v} onClick={() => update('maxCookTime', v)} />)}
      </div>

      <Section title="Quick Tags" />
      <div className="flex flex-wrap gap-1.5">
        {TAGS.map((tag) => <Pill key={tag} label={tag} active={filters.tags.includes(tag)} onClick={() => toggleTag(tag)} accent />)}
      </div>
    </div>
  );
}
