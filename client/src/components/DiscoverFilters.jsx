/**
 * DiscoverFilters.jsx
 * Collapsible filter panel for the Discover page.
 * All filtering is done client-side over fetched results.
 */
import { useState } from 'react';
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';

const AVAILABILITY_OPTIONS = ['Flexible', 'Morning', 'Afternoon', 'Evening', 'Weekends'];
const TAGS = ['Perfect Match', 'Great Match', 'Good Match', 'Nearby'];

export default function DiscoverFilters({ filters, setFilters, resultCount }) {
  const [open, setOpen] = useState(false);

  const hasActive = filters.maxDistance !== 50 ||
    filters.skills.length > 0 ||
    filters.availability !== '' ||
    filters.tag !== '';

  const reset = () => setFilters({ maxDistance: 50, skills: [], availability: '', tag: '' });

  const toggleSkill = (skill) => {
    setFilters(f => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter(s => s !== skill) : [...f.skills, skill],
    }));
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm overflow-hidden">
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-brand-500" />
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
            Filters
            {hasActive && (
              <span className="ml-2 text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full">Active</span>
            )}
          </span>
          <span className="text-xs text-slate-400">{resultCount} result{resultCount !== 1 ? 's' : ''}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-700 space-y-5">
          {/* Distance slider */}
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Max Distance
              <span className="text-brand-500 font-bold">{filters.maxDistance} km</span>
            </label>
            <input
              type="range"
              min={5} max={100} step={5}
              value={filters.maxDistance}
              onChange={e => setFilters(f => ({ ...f, maxDistance: Number(e.target.value) }))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>5 km</span><span>100 km</span></div>
          </div>

          {/* Match tag filter */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Match Quality</p>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setFilters(f => ({ ...f, tag: f.tag === tag ? '' : tag }))}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium border transition ${
                    filters.tag === tag
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-brand-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Availability filter */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Availability</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFilters(f => ({ ...f, availability: f.availability === opt ? '' : opt }))}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium border transition ${
                    filters.availability === opt
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          {hasActive && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-semibold transition"
            >
              <X size={13} /> Reset all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
