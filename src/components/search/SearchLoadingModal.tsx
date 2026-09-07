import React from 'react';
import { useMind } from '../../context/MindContext';
import { Zap, X } from 'lucide-react';

export const SearchLoadingModal: React.FC = () => {
  const { isSearching, cancelSearch } = useMind();

  if (!isSearching) return null;

  // Non-blocking sleek top status bar instead of screen-blocking modal
  return (
    <div className="fixed top-20 right-6 z-40 animate-in slide-in-from-top-3 select-none">
      <div className="bg-[#0d0f17]/95 border border-indigo-500/40 rounded-xl px-3.5 py-2 shadow-2xl backdrop-blur-xl flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span className="text-xs font-mono font-bold text-indigo-300">
            Searching Mind Engine...
          </span>
        </div>

        <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-full flex items-center gap-1">
          <Zap className="w-2.5 h-2.5 fill-current" />
          Fast Instant Mode
        </span>

        <button
          onClick={cancelSearch}
          className="text-slate-400 hover:text-rose-400 p-1 rounded-lg transition"
          title="Cancel Search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
