import React from 'react';
import { NodeSearchResult } from '../../types/memory';
import { useMind } from '../../context/MindContext';
import { Share2, HardDrive, Link, ExternalLink, Zap } from 'lucide-react';

export const NodeSearchResultCard: React.FC<{ node: NodeSearchResult }> = ({ node }) => {
  const { setActiveTab, showToast } = useMind();

  const handleInspectInGraph = () => {
    setActiveTab('graph');
    showToast(`Navigating to Knowledge Graph: "${node.label}"`, 'info');
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 shadow-xl transition-all flex flex-col gap-3 group">
      {/* Node Header & Match Score */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400">
            <Share2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
              {node.label}
            </h3>
            <span className="text-[10px] font-mono text-slate-400 capitalize">
              Node Type: {node.type}
            </span>
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1 flex-shrink-0">
          <Zap className="w-2.5 h-2.5 fill-current text-emerald-400" />
          <span>{node.match_score}% Node Match</span>
        </div>
      </div>

      {/* Storage Location Info */}
      <div className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono text-slate-300 flex items-center gap-2">
        <HardDrive className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
        <span className="text-slate-400 font-semibold">Storage Location:</span>
        <span className="text-indigo-300 truncate">{node.storage_location}</span>
      </div>

      {/* Connected Graph Edges */}
      {node.connected_nodes && node.connected_nodes.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <Link className="w-3 h-3 text-indigo-400" />
            Connected Graph Nodes ({node.connected_nodes.length}):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {node.connected_nodes.map((conn) => (
              <span
                key={conn.id}
                className="px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700 text-[10px] font-mono text-slate-200 flex items-center gap-1"
              >
                <span className="text-indigo-400 font-semibold">
                  {conn.relationship_type.replace('_', ' ')}:
                </span>
                <span className="truncate max-w-[140px]">{conn.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end">
        <button
          onClick={handleInspectInGraph}
          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 transition-all"
        >
          <span>Inspect in Knowledge Graph</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
