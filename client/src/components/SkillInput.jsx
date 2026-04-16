/**
 * SkillInput.jsx
 * NLP-powered skill input component.
 *
 * Features:
 *  - Free-text input ("I know React and basic ML")
 *  - Debounced autocomplete dropdown via /api/users/suggest-skills
 *  - On submit: calls /api/users/extract-skills → renders pill chips
 *  - Chips are removable
 *  - Shows "✨ AI extracted" badge
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Sparkles, X, ChevronDown, Loader2, Plus } from 'lucide-react';

const DEBOUNCE_MS = 450;

export default function SkillInput({
  label,
  value = [],          // controlled: array of skill strings
  onChange,            // (skills: string[]) => void
  rawText = '',
  onRawTextChange,     // (text: string) => void
  placeholder = 'e.g. I can teach React, Node.js and basic ML...',
  accentColor = 'brand',
}) {
  const [inputText, setInputText] = useState(rawText);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [aiExtracted, setAiExtracted] = useState(false);
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);
  const token = localStorage.getItem('token');

  // Sync rawText prop → local state
  useEffect(() => { setInputText(rawText); }, [rawText]);

  // Debounced suggestion fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!inputText.trim() || inputText.length < 2) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoadingSuggest(true);
      try {
        const { data } = await axios.get(`/api/nlp/suggest-skills?q=${encodeURIComponent(inputText)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuggestions(data.suggestions || []);
        setShowSuggest(true);
      } catch (_) {
        setSuggestions([]);
      } finally {
        setLoadingSuggest(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [inputText, token]);

  const handleTextChange = (e) => {
    setInputText(e.target.value);
    onRawTextChange?.(e.target.value);
    setAiExtracted(false);
  };

  // Extract skills via NLP API
  const handleExtract = useCallback(async () => {
    if (!inputText.trim()) return;
    setLoadingExtract(true);
    setShowSuggest(false);
    try {
      const { data } = await axios.post('/api/nlp/extract-skills', { text: inputText }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const extracted = data.normalizedSkills || data.extractedSkills || [];
      // Merge with existing, no duplicates
      const merged = [...new Set([...value, ...extracted])];
      onChange?.(merged);
      setAiExtracted(true);
    } catch (_) {
      // Fallback: comma split
      const fallback = inputText.split(',').map(s => s.trim()).filter(Boolean);
      onChange?.([...new Set([...value, ...fallback])]);
    } finally {
      setLoadingExtract(false);
    }
  }, [inputText, value, onChange, token]);

  // Add single suggestion as a chip
  const addSuggestion = (skill) => {
    if (!value.includes(skill)) onChange?.([...value, skill]);
    setShowSuggest(false);
    setInputText('');
    onRawTextChange?.('');
  };

  const removeSkill = (skill) => onChange?.(value.filter(s => s !== skill));

  const accent = {
    brand:  { ring: 'focus:ring-brand-500', border: 'border-brand-200 dark:border-brand-800', chip: 'bg-blue-50 dark:bg-blue-900/20 text-brand-600 dark:text-brand-300 border-blue-100 dark:border-blue-800' },
    indigo: { ring: 'focus:ring-indigo-500', border: 'border-indigo-200 dark:border-indigo-900', chip: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800' },
  }[accentColor] || {};

  return (
    <div className="space-y-2">
      {label && (
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {aiExtracted && (
            <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
              <Sparkles size={11} /> AI extracted
            </span>
          )}
        </label>
      )}

      {/* Chip row */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 min-h-[40px]">
          {value.map(skill => (
            <span
              key={skill}
              className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${accent.chip}`}
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="hover:opacity-70 transition"
                aria-label={`Remove ${skill}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Text input + extract button */}
      <div className="relative">
        <div className="relative flex gap-2 items-start">
          <textarea
            ref={inputRef}
            rows={2}
            value={inputText}
            onChange={handleTextChange}
            onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
            placeholder={placeholder}
            className={`flex-1 px-4 py-2.5 rounded-xl border ${accent.border || 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-800 ${accent.ring} focus:ring-2 outline-none resize-none text-sm transition`}
          />
          <button
            type="button"
            onClick={handleExtract}
            disabled={!inputText.trim() || loadingExtract}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition shadow"
            title="Extract skills with AI"
          >
            {loadingExtract ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span className="hidden sm:inline">Extract</span>
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {showSuggest && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-10 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-40 overflow-hidden">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5 border-b border-slate-100 dark:border-slate-700">
              Suggested Skills
            </p>
            {suggestions.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSuggestion(skill)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-left"
              >
                <span className="flex items-center gap-2">
                  <Plus size={13} className="text-brand-400" />
                  {skill}
                </span>
              </button>
            ))}
          </div>
        )}

        {loadingSuggest && (
          <div className="absolute top-full left-0 mt-1 flex items-center gap-2 text-xs text-slate-400 px-3 py-2">
            <Loader2 size={12} className="animate-spin" /> Fetching suggestions...
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400">Type freely or pick from suggestions. Press Extract to auto-identify skills with AI.</p>
    </div>
  );
}
