import React, { useState, useEffect } from 'react';
import { useMind } from '../context/MindContext.js';
import { Search, Plus, Upload, Star, Clock, Share2, Shield, Settings, Brain } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setIsQuickCaptureOpen,
    setIsImportModalOpen,
    setActiveTab,
    setIsLocked,
  } = useMind();

  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const commands = [
    {
      id: 'new-memory',
      label: 'New Memory (+ Add Memory)',
      icon: Plus,
      action: () => setIsQuickCaptureOpen(true),
    },
    {
      id: 'graph',
      label: 'Show Knowledge Graph',
      icon: Share2,
      action: () => setActiveTab('graph'),
    },
    {
      id: 'import',
      label: 'Import Legacy JSON Memories',
      icon: Upload,
      action: () => setIsImportModalOpen(true),
    },
    {
      id: 'favorites',
      label: 'Open Favorites',
      icon: Star,
      action: () => setActiveTab('favorites'),
    },
    {
      id: 'recent',
      label: 'Open Recent Memories',
      icon: Clock,
      action: () => setActiveTab('recent'),
    },
    {
      id: 'lock',
      label: 'Lock Mind (Privacy Mode)',
      icon: Shield,
      action: () => setIsLocked(true),
    },
  ];

  const filteredCommands = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-24 p-4">
      <div className="w-full max-w-lg bg-[#0e1017] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-3 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 pl-1" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or action..."
            autoFocus
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700 font-mono">
            ESC
          </kbd>
        </div>

        <div className="p-2 max-h-72 overflow-y-auto space-y-1">
          {filteredCommands.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  setIsCommandPaletteOpen(false);
                }}
                className="w-full text-left p-2.5 rounded-xl hover:bg-slate-900 flex items-center justify-between text-xs font-medium text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-indigo-400" />
                  <span>{cmd.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
