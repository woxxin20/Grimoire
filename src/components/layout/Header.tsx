import React, { useState } from 'react';
import { useMind } from '../../context/MindContext';
import { Search, Sparkles, Filter, X } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    executeSearch,
    categories,
    activeCategory,
    setActiveCategory,
    searchResponse,
    isSearching,
  } = useMind();

  const [inputVal, setInputVal] = useState(searchQuery);

  const handleManualSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;
    setSearchQuery(inputVal);
    executeSearch(inputVal, activeCategory || undefined);
  };

  const handleCategoryChange = (cat: string | null) => {
    setActiveCategory(cat);
    if (inputVal.trim()) {
      setSearchQuery(inputVal);
      executeSearch(inputVal, cat || undefined);
    }
  };

  const handleClear = () => {
    setInputVal('');
    setSearchQuery('');
  };

  return (
    <header className="p-4 border-b border-slate-800/60 dark:border-slate-800/60 light:border-slate-200 bg-[#090a0f]/90 dark:bg-[#090a0f]/90 light:bg-white/90 backdrop-blur-md sticky top-0 z-10 flex flex-col gap-3 transition-colors duration-200">
      <div className="flex items-center gap-3">
        {/* Manual Search Form (No Live Keystroke Search) */}
        <form onSubmit={handleManualSearch} className="relative flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              {isSearching ? (
                <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              ) : (
                <Search className="w-5 h-5 text-slate-400 dark:text-slate-400 light:text-slate-500" />
              )}
            </div>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleManualSearch(e);
                }
              }}
              placeholder="Search your mind... (e.g., 'mane Gemini API related mari old notes batav', 'React animation idea')"
              className="w-full pl-12 pr-10 py-3 bg-slate-900/90 dark:bg-slate-900/90 light:bg-slate-50 border border-slate-800 dark:border-slate-800 light:border-slate-300 focus:border-indigo-500 rounded-xl text-slate-100 dark:text-slate-100 light:text-slate-900 placeholder-slate-400 dark:placeholder-slate-400 light:placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-inner transition-all"
            />
            {inputVal && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Prominent Search Button */}
          <button
            type="submit"
            disabled={!inputVal.trim() || isSearching}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-mono font-bold border border-indigo-500 shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 active:scale-95 flex-shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </form>

        {/* Category Filter Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={activeCategory || ''}
              onChange={(e) => handleCategoryChange(e.target.value || null)}
              className="bg-slate-900 dark:bg-slate-900 light:bg-slate-50 border border-slate-800 dark:border-slate-800 light:border-slate-300 text-slate-300 dark:text-slate-300 light:text-slate-800 text-xs rounded-xl px-3 py-3 font-medium focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer pr-8"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count})
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 light:text-slate-500 absolute right-3 top-3.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Context Resolution Indicator */}
      {searchResponse && searchResponse.query_understanding && (
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-400 light:text-slate-600 bg-indigo-950/30 dark:bg-indigo-950/30 light:bg-indigo-50 border border-indigo-900/40 dark:border-indigo-900/40 light:border-indigo-200 rounded-lg px-3 py-1.5 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
          <span className="text-indigo-400 dark:text-indigo-300 light:text-indigo-700 font-semibold">AI Intent:</span>
          <span>{searchResponse.query_understanding.intent}</span>
          {searchResponse.query_understanding.concepts.length > 0 && (
            <>
              <span className="text-slate-400">|</span>
              <span className="text-emerald-500 font-semibold">Concepts:</span>
              <span>{searchResponse.query_understanding.concepts.join(', ')}</span>
            </>
          )}
        </div>
      )}
    </header>
  );
};
