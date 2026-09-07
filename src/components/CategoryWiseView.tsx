import React, { useState } from 'react';
import { useMind } from '../context/MindContext.js';
import { MemoryCard } from './memory/MemoryCard.js';
import { Layers, Sparkles, Folder, Search, ChevronDown, ChevronRight, Shield, Globe, Cpu, BookOpen } from 'lucide-react';

export const CategoryWiseView: React.FC = () => {
  const { memories, categories, activeCategory, setActiveCategory } = useMind();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filterQuery, setFilterQuery] = useState('');

  const toggleCollapse = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Group memories by category
  const grouped: Record<string, typeof memories> = {};
  for (const mem of memories) {
    const cat = mem.category || 'General Knowledge';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(mem);
  }

  const categoryList = Object.keys(grouped).sort();

  const getCategoryIcon = (catName: string) => {
    const lower = catName.toLowerCase();
    if (lower.includes('artific') || lower.includes('ai') || lower.includes('mind')) return Cpu;
    if (lower.includes('secur') || lower.includes('key') || lower.includes('auth')) return Shield;
    if (lower.includes('cultur') || lower.includes('lang') || lower.includes('spiritual')) return Globe;
    return BookOpen;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Category Wise View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-950/20 dark:bg-indigo-950/30 border border-indigo-500/20">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            Category-Wise Knowledge Hubs ({categoryList.length} Categories)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organized knowledge vaults grouped automatically by Gemini AI and smart classification.
          </p>
        </div>

        {/* Filter input */}
        <div className="relative">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter categories..."
            className="pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Category Group Sections */}
      <div className="space-y-6">
        {categoryList
          .filter((cat) => !filterQuery || cat.toLowerCase().includes(filterQuery.toLowerCase()))
          .map((catName) => {
            const items = grouped[catName];
            const isCollapsed = Boolean(collapsed[catName]);
            const Icon = getCategoryIcon(catName);

            return (
              <div
                key={catName}
                className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md overflow-hidden shadow-sm transition-all"
              >
                {/* Category Header Accordion */}
                <button
                  onClick={() => toggleCollapse(catName)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{catName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                          {items.length} Memories
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Concepts: {Array.from(new Set(items.flatMap((i) => i.concepts))).slice(0, 4).join(', ') || 'Knowledge'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCategory(catName);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      Filter Category
                    </button>

                    {isCollapsed ? (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Memory Cards Grid */}
                {!isCollapsed && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((mem) => (
                      <MemoryCard key={mem.id} memory={mem} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
