import React, { useState } from 'react';
import { useMind } from '../../context/MindContext.js';
import { copyToClipboard } from '../../utils/copyToClipboard.js';
import {
  Copy,
  Star,
  Trash2,
  ExternalLink,
  Folder,
  Tag,
  Sparkles,
  Layers,
  Clock,
  Check,
  FileText,
  Share2,
  X,
} from 'lucide-react';

export const RightPanel: React.FC = () => {
  const {
    selectedMemory,
    setSelectedMemory,
    toggleFavorite,
    deleteMemory,
    openLocalPath,
    selectMemoryById,
    showToast,
  } = useMind();

  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  if (!selectedMemory) {
    return (
      <aside className="w-96 h-screen bg-[#0a0b10] dark:bg-[#0a0b10] light:bg-slate-50 border-l border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 p-6 flex flex-col items-center justify-center text-center select-none transition-colors duration-200">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-900 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-300 flex items-center justify-center text-slate-400 dark:text-slate-400 light:text-slate-500 mb-4 shadow-sm">
          <BrainIcon className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-300 dark:text-slate-300 light:text-slate-800">No Memory Selected</h3>
        <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 mt-1 max-w-xs leading-relaxed">
          Select any memory from the mind graph or search results to view exact original content and AI insights.
        </p>
      </aside>
    );
  }

  const handleCopyOriginal = async () => {
    const success = await copyToClipboard(selectedMemory.original_content);
    if (success) {
      setCopiedOriginal(true);
      showToast('Exact original content copied to clipboard', 'success');
      setTimeout(() => setCopiedOriginal(false), 2000);
    }
  };

  const handleCopySummary = async () => {
    const success = await copyToClipboard(selectedMemory.summary);
    if (success) {
      setCopiedSummary(true);
      showToast('AI Summary copied to clipboard', 'info');
      setTimeout(() => setCopiedSummary(false), 2000);
    }
  };

  return (
    <aside className="w-[420px] h-screen bg-[#0a0b10] dark:bg-[#0a0b10] light:bg-white border-l border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 flex flex-col flex-shrink-0 z-20 transition-colors duration-200 shadow-xl">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-800/60 dark:border-slate-800/60 light:border-slate-200 flex items-center justify-between bg-slate-900/40 dark:bg-slate-900/40 light:bg-slate-50">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wide uppercase font-bold bg-indigo-500/20 dark:bg-indigo-500/20 light:bg-indigo-100 text-indigo-300 dark:text-indigo-300 light:text-indigo-800 border border-indigo-500/30 light:border-indigo-300">
            {selectedMemory.type}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wide uppercase font-bold bg-slate-800 dark:bg-slate-800 light:bg-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-800">
            {selectedMemory.category}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleFavorite(selectedMemory.id)}
            className={`p-1.5 rounded-lg transition-colors ${
              selectedMemory.favorite
                ? 'text-amber-400 bg-amber-400/10'
                : 'text-slate-400 hover:text-slate-200 dark:hover:bg-slate-800 light:hover:bg-slate-200'
            }`}
            title="Toggle Favorite"
          >
            <Star className="w-4 h-4 fill-current" />
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this memory permanently?')) {
                deleteMemory(selectedMemory.id);
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 dark:hover:bg-rose-950/40 light:hover:bg-rose-100 transition-colors"
            title="Delete Memory"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedMemory(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 dark:hover:bg-slate-800 light:hover:bg-slate-200 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Detail Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Title */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">{selectedMemory.title}</h2>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(selectedMemory.created_at).toLocaleDateString()}
            </span>
            {selectedMemory.local_path && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                <Folder className="w-3.5 h-3.5" />
                Local File
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons: Copy Original vs Copy Summary */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopyOriginal}
            className="py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            {copiedOriginal ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>COPY ORIGINAL</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="py-2 px-3 rounded-lg bg-slate-800 dark:bg-slate-800 light:bg-slate-100 hover:bg-slate-700 dark:hover:bg-slate-700 light:hover:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 border border-slate-700 dark:border-slate-700 light:border-slate-300 font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
            <span>COPY SUMMARY</span>
          </button>
        </div>

        {/* Source Link or File Explorer Trigger */}
        {selectedMemory.source_url && (
          <a
            href={selectedMemory.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-3 rounded-lg bg-slate-900 dark:bg-slate-900 light:bg-slate-50 border border-slate-800 dark:border-slate-800 light:border-slate-200 hover:border-indigo-500 text-indigo-400 dark:text-indigo-300 light:text-indigo-700 text-xs font-medium flex items-center justify-between transition-colors"
          >
            <span className="truncate pr-2 font-mono">{selectedMemory.source_url}</span>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          </a>
        )}

        {selectedMemory.local_path && (
          <div className="p-3 rounded-lg bg-emerald-950/20 dark:bg-emerald-950/20 light:bg-emerald-50 border border-emerald-500/30 light:border-emerald-300 space-y-2">
            <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-300 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5" />
              <span>Path: {selectedMemory.local_path}</span>
            </div>
            <button
              onClick={() => openLocalPath(selectedMemory.local_path!)}
              className="w-full py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all"
            >
              <span>OPEN IN FILE EXPLORER</span>
            </button>
          </div>
        )}

        {/* Section 1: Exact Original Content */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              Exact Original Content
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Preserved untouched</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 dark:bg-slate-950 light:bg-slate-100 border border-slate-800 dark:border-slate-800 light:border-slate-300 text-slate-100 dark:text-slate-200 light:text-slate-900 text-xs font-mono whitespace-pre-wrap break-words leading-relaxed max-h-80 overflow-y-auto select-text shadow-inner">
            {selectedMemory.original_content}
          </div>
        </div>

        {/* Section 2: AI Understanding & Summary */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            AI Understanding
          </h3>

          <div className="p-3.5 rounded-xl bg-slate-900/80 dark:bg-slate-900/80 light:bg-slate-50 border border-slate-800 dark:border-slate-800 light:border-slate-200 space-y-3">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Summary</div>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">{selectedMemory.summary}</p>
            </div>

            {selectedMemory.analysis && (
              <div className="pt-2 border-t border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Context Analysis</div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{selectedMemory.analysis}</p>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Concepts & Entities */}
        {selectedMemory.concepts.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              Concepts & Entities
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {selectedMemory.concepts.map((concept) => (
                <span
                  key={concept}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 light:border-indigo-300"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

function BrainIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    </svg>
  );
}
