import React, { useState } from 'react';
import { MemoryNode, MemorySearchResult } from '../../types/memory.js';
import { useMind } from '../../context/MindContext.js';
import { copyToClipboard } from '../../utils/copyToClipboard.js';
import { Copy, Star, Check, Sparkles, Folder, Link, Share2 } from 'lucide-react';

interface MemoryCardProps {
  memory: MemoryNode | MemorySearchResult;
  isPrimary?: boolean;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, isPrimary }) => {
  const { selectedMemory, setSelectedMemory, toggleFavorite, showToast } = useMind();
  const [copied, setCopied] = useState(false);

  const searchResult = memory as MemorySearchResult;
  const hasMindMatch = typeof searchResult.mind_match_score === 'number';
  const isSelected = selectedMemory?.id === memory.id;

  const handleCopyOriginal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(memory.original_content);
    if (success) {
      setCopied(true);
      showToast('Exact original content copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(memory.id);
  };

  return (
    <div
      onClick={() => setSelectedMemory(memory)}
      className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 ${
        isPrimary
          ? 'bg-white dark:bg-slate-900/90 border-2 border-indigo-500 shadow-xl shadow-indigo-500/10'
          : isSelected
          ? 'bg-white dark:bg-slate-900/90 border-2 border-indigo-500/60 shadow-lg'
          : 'glass-panel-interactive'
      }`}
    >
      {/* Top Meta Line: Category, Mind Match Score, Actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
            {memory.category}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {memory.type}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hasMindMatch && (
            <div
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold flex items-center gap-1 ${
                searchResult.mind_match_score >= 85
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40'
                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40'
              }`}
            >
              <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>{searchResult.mind_match_score}% Mind Match</span>
            </div>
          )}

          <button
            onClick={handleCopyOriginal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Copy Exact Original Content"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleToggleFav}
            className={`p-1.5 rounded-lg transition-colors ${
              memory.favorite ? 'text-amber-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="Favorite"
          >
            <Star className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-1">
        {memory.title}
      </h3>

      {/* Rationale Explanation if available */}
      {searchResult.match_reason && (
        <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400/90 mt-1 line-clamp-1">
          💡 {searchResult.match_reason}
        </p>
      )}

      {/* Preview Snippet of Original Content */}
      <p className="text-xs text-slate-800 dark:text-slate-300 font-mono mt-2 line-clamp-2 bg-slate-100 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800/60 leading-relaxed">
        {memory.original_content}
      </p>

      {/* Graph Node Connections & Relationship Badges */}
      {memory.relationships && memory.relationships.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1">
            <Share2 className="w-3 h-3 text-cyan-500" />
            Connections:
          </span>
          {memory.relationships.slice(0, 3).map((rel) => (
            <span
              key={rel.id}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 flex items-center gap-1"
              title={`Graph relationship: ${rel.relationship_type}`}
            >
              <span className="font-bold text-cyan-400">{rel.relationship_type.replace('_', ' ')}</span>
              {rel.target_title && <span className="opacity-85 truncate max-w-[120px]">→ {rel.target_title}</span>}
            </span>
          ))}
          {memory.relationships.length > 3 && (
            <span className="text-[10px] font-mono text-slate-400">
              +{memory.relationships.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Bottom Concepts / Tags */}
      <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {memory.concepts.slice(0, 3).map((concept) => (
            <span key={concept} className="truncate text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
              {concept}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[10px] text-slate-500 dark:text-slate-400">
          {memory.source_url && <Link className="w-3 h-3 text-indigo-500" />}
          {memory.local_path && <Folder className="w-3 h-3 text-emerald-500" />}
          <span>{new Date(memory.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};
