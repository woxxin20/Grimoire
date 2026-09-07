import React from 'react';
import { Sparkles, Brain, Compass, Tag, Layers, CheckCircle2 } from 'lucide-react';
import { SearchResponse } from '../../types/memory';

interface AIShimmerConclusionProps {
  isSearching: boolean;
  searchResponse: SearchResponse | null;
}

export const AIShimmerConclusion: React.FC<AIShimmerConclusionProps> = ({
  isSearching,
  searchResponse,
}) => {
  const qu = searchResponse?.query_understanding;

  return (
    <div className="w-full bg-[#0c0d14]/95 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className={`w-4 h-4 ${isSearching ? 'text-indigo-400 animate-pulse' : 'text-emerald-400'}`} />
            {isSearching && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            )}
          </div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2">
            <span>AI Semantic Conclusion & Query Intelligence</span>
          </h3>
        </div>

        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
          isSearching
            ? 'bg-indigo-950 border-indigo-500/40 text-indigo-300 animate-pulse'
            : 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
        }`}>
          {isSearching ? (
            <>
              <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: '2s' }} />
              <span>SYNTHESIZING AI INSIGHTS...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>AI ANALYSIS COMPLETE</span>
            </>
          )}
        </span>
      </div>

      {/* Shimmer Loading Skeleton State */}
      {isSearching && (!qu || !qu.intent) ? (
        <div className="space-y-3">
          {/* Shimmer Row 1: Intent & Category Pills */}
          <div className="flex items-center gap-2">
            <div className="h-6 w-28 bg-gradient-to-r from-slate-900 via-indigo-900/40 to-slate-900 rounded-lg animate-pulse border border-slate-800" />
            <div className="h-6 w-36 bg-gradient-to-r from-slate-900 via-indigo-900/40 to-slate-900 rounded-lg animate-pulse border border-slate-800" />
            <div className="h-6 w-24 bg-gradient-to-r from-slate-900 via-indigo-900/40 to-slate-900 rounded-lg animate-pulse border border-slate-800" />
          </div>

          {/* Shimmer Row 2: Concept Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            <div className="h-5 w-20 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-md animate-pulse" />
            <div className="h-5 w-28 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-md animate-pulse" />
            <div className="h-5 w-24 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-md animate-pulse" />
            <div className="h-5 w-16 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-md animate-pulse" />
          </div>

          {/* Shimmer Row 3: Conclusion Summary Paragraph */}
          <div className="space-y-2 pt-2">
            <div className="h-3.5 w-full bg-gradient-to-r from-slate-900 via-indigo-900/30 to-slate-900 rounded animate-pulse" />
            <div className="h-3.5 w-4/5 bg-gradient-to-r from-slate-900 via-indigo-900/30 to-slate-900 rounded animate-pulse" />
          </div>
        </div>
      ) : (
        /* Resolved AI Conclusion Content */
        <div className="space-y-3">
          {/* Query Intent & Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-semibold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Intent: {qu?.intent || 'Semantic Retrieval'}</span>
            </div>

            {qu?.categories && qu.categories.length > 0 && (
              <div className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Categories: {qu.categories.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Extracted Concepts & Keywords */}
          {((qu?.concepts && qu.concepts.length > 0) || (qu?.keywords && qu.keywords.length > 0)) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {qu?.concepts?.map((concept) => (
                <span
                  key={concept}
                  className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono flex items-center gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                  {concept}
                </span>
              ))}
              {qu?.keywords?.slice(0, 6).map((kw) => (
                <span
                  key={kw}
                  className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-mono flex items-center gap-1"
                >
                  <Tag className="w-2.5 h-2.5 text-slate-400" />
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* AI Conclusion Summary */}
          <div className="pt-2 border-t border-slate-800/60">
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {searchResponse?.primary_match
                ? `AI synthesized query "${searchResponse.query}" into ${searchResponse.total_results} relevant knowledge records. Primary match identified with ${searchResponse.primary_match.mind_match_score}% confidence.`
                : `AI completed semantic search across your personal mind database for "${searchResponse?.query || ''}".`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
