import React from 'react';
import { useMind } from '../../context/MindContext.js';
import {
  Brain,
  Plus,
  Layers,
  Sparkles,
  Share2,
  Folder,
  Link,
  Star,
  Clock,
  Settings,
  Upload,
  Shield,
  Search,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    categories,
    memories,
    theme,
    toggleTheme,
    setIsQuickCaptureOpen,
    setIsImportModalOpen,
    setIsLocked,
    setIsCommandPaletteOpen,
  } = useMind();

  const favoritesCount = memories.filter((m) => m.favorite).length;
  const filesCount = memories.filter((m) => m.type === 'file' || m.type === 'image' || m.mime_type === 'application/pdf').length;
  const urlsCount = memories.filter((m) => m.type === 'url').length;

  const navItems = [
    { id: 'mind', label: 'Mind', icon: Brain, count: memories.length },
    { id: 'multiverse', label: 'Multiverse Council', icon: Globe },
    { id: 'graph', label: 'Connections', icon: Share2 },
    { id: 'categories', label: 'Categories', icon: Layers, count: categories.length },
    { id: 'concepts', label: 'Concepts', icon: Sparkles },
    { id: 'files', label: 'Files', icon: Folder, count: filesCount },
    { id: 'urls', label: 'URLs', icon: Link, count: urlsCount },
    { id: 'favorites', label: 'Favorites', icon: Star, count: favoritesCount },
    { id: 'recent', label: 'Recent', icon: Clock },
  ];

  return (
    <aside className="w-64 h-screen bg-[#0b0c12] dark:bg-[#0b0c12] light:bg-slate-100 border-r border-slate-800/80 dark:border-slate-800/80 light:border-slate-200/90 flex flex-col flex-shrink-0 select-none z-20 transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/60 dark:border-slate-800/60 light:border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-white dark:text-white light:text-slate-900 text-base leading-none">MIND</h1>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 light:text-slate-500 mt-1 font-mono tracking-wide uppercase">Second Brain OS</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 dark:hover:bg-slate-800/60 light:hover:bg-slate-200 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
          <button
            onClick={() => setIsLocked(true)}
            title="Lock Personal Mind (Privacy Mode)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 dark:hover:bg-slate-800/60 light:hover:bg-slate-200 transition-colors"
          >
            <Shield className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Capture Button */}
      <div className="p-3">
        <button
          onClick={() => setIsQuickCaptureOpen(true)}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Memory</span>
        </button>
      </div>

      {/* Command Palette Trigger */}
      <div className="px-3 pb-2">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full py-2 px-3 rounded-lg bg-slate-900/80 dark:bg-slate-900/80 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 text-slate-400 dark:text-slate-400 light:text-slate-600 text-xs flex items-center justify-between transition-colors shadow-sm"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            Quick Command
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 dark:bg-slate-800 light:bg-slate-100 font-mono text-[10px] text-slate-400 dark:text-slate-400 light:text-slate-600 border border-slate-700 dark:border-slate-700 light:border-slate-300">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/15 dark:bg-indigo-600/15 light:bg-indigo-50 text-indigo-400 dark:text-indigo-300 light:text-indigo-700 border border-indigo-500/30 dark:border-indigo-500/30 light:border-indigo-300 font-semibold'
                  : 'text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900 hover:bg-slate-900/60 dark:hover:bg-slate-900/60 light:hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-400 light:text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300 dark:text-indigo-300 light:text-indigo-700'
                      : 'bg-slate-800 dark:bg-slate-800 light:bg-slate-200 text-slate-400 dark:text-slate-400 light:text-slate-700'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer / Import & Settings */}
      <div className="p-3 border-t border-slate-800/60 dark:border-slate-800/60 light:border-slate-200 space-y-1">
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900 hover:bg-slate-900/60 dark:hover:bg-slate-900/60 light:hover:bg-slate-200/60 transition-colors"
        >
          <Upload className="w-4 h-4 text-emerald-500" />
          <span>Import JSON</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-indigo-600/15 text-indigo-400 light:text-indigo-700 font-semibold'
              : 'text-slate-400 dark:text-slate-400 light:text-slate-600 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-900 hover:bg-slate-900/60 dark:hover:bg-slate-900/60 light:hover:bg-slate-200/60'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-400 dark:text-slate-400 light:text-slate-500" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
