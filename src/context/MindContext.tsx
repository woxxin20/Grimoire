import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  MemoryNode,
  SearchResponse,
  MemorySearchResult,
} from '../types/memory';
import { futuristicTTS } from '../services/futuristicTTS';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface MindContextType {
  memories: MemoryNode[];
  selectedMemory: MemoryNode | null;
  searchResponse: SearchResponse | null;
  searchQuery: string;
  activeCategory: string | null;
  activeTab: string;
  categories: Array<{ category: string; count: number }>;
  concepts: Array<{ concept: string; count: number }>;
  isLoading: boolean;
  isSearching: boolean;
  searchError: string | null;
  memoryError: string | null;
  isQuickCaptureOpen: boolean;
  isImportModalOpen: boolean;
  isCommandPaletteOpen: boolean;
  isLocked: boolean;
  theme: 'dark' | 'light';
  toasts: Toast[];

  // Actions
  setSearchQuery: (q: string) => void;
  setActiveCategory: (cat: string | null) => void;
  setActiveTab: (tab: string) => void;
  setSelectedMemory: (mem: MemoryNode | null) => void;
  selectMemoryById: (id: string) => Promise<void>;
  setIsQuickCaptureOpen: (open: boolean) => void;
  setIsImportModalOpen: (open: boolean) => void;
  setIsCommandPaletteOpen: (open: boolean) => void;
  setIsLocked: (locked: boolean) => void;
  toggleTheme: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;

  // API Methods
  fetchMemories: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchConcepts: () => Promise<void>;
  executeSearch: (query: string, category?: string) => Promise<void>;
  cancelSearch: () => void;
  toggleFavorite: (id: string) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  openLocalPath: (path: string) => Promise<void>;
}

const MindContext = createContext<MindContextType | undefined>(undefined);

export const MindProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [selectedMemory, setSelectedMemoryState] = useState<MemoryNode | null>(null);
  const memoryRequestRef = useRef(0);
  const setSelectedMemory = useCallback((memory: MemoryNode | null) => {
    memoryRequestRef.current += 1;
    setSelectedMemoryState(memory);
  }, []);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [searchQuery, setSearchQueryState] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('mind');
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [concepts, setConcepts] = useState<Array<{ concept: string; count: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [memoryError, setMemoryError] = useState<string | null>(null);

  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('mind_theme') as 'dark' | 'light') || 'dark';
  });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('mind_theme', next);
      return next;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const fetchMemories = useCallback(async () => {
    setIsLoading(true);
    setMemoryError(null);
    try {
      const res = await fetch('/api/memories?limit=100');
      if (!res.ok) throw new Error('Memory service is unavailable');
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (e) {
      setMemoryError('Memory service is unavailable. Your stored memories have not been changed.');
      console.error('Failed to fetch memories:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error('Failed to fetch categories:', e);
    }
  }, []);

  const fetchConcepts = useCallback(async () => {
    try {
      const res = await fetch('/api/concepts');
      if (res.ok) {
        const data = await res.json();
        setConcepts(data.concepts || []);
      }
    } catch (e) {
      console.error('Failed to fetch concepts:', e);
    }
  }, []);

  const searchAbortControllerRef = useRef<AbortController | null>(null);

  const cancelSearch = useCallback(() => {
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
      searchAbortControllerRef.current = null;
    }
    setIsSearching(false);
    setSearchError(null);
  }, []);

  const executeSearch = useCallback(
    async (query: string, category?: string) => {
      if (!query.trim()) {
        searchAbortControllerRef.current?.abort();
        searchAbortControllerRef.current = null;
        setIsSearching(false);
        setSearchError(null);
        setSearchResponse(null);
        return;
      }

      // Enforce 1 single active search request lock (cancel any previous in-flight search)
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }

      const controller = new AbortController();
      searchAbortControllerRef.current = controller;
      setIsSearching(true);
      setSearchError(null);
      setSearchResponse(null);

      // Trigger voice readout while search is processing if auto-read is enabled
      if (futuristicTTS.getState().autoRead) {
        futuristicTTS.speakSearching();
      }

      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            query,
            session_id: 'user-session',
            category: category || activeCategory || undefined,
          }),
        });

        if (!res.ok) throw new Error('Search service is unavailable');
        if (res.ok && !controller.signal.aborted) {
          const data: SearchResponse = await res.json();
          if (controller.signal.aborted) return;
          setSearchResponse(data);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError' && !controller.signal.aborted) {
          setSearchError('The knowledge engine could not complete this search. Please try again.');
          console.error('Search failed:', e);
        }
      } finally {
        if (searchAbortControllerRef.current === controller) {
          searchAbortControllerRef.current = null;
          setIsSearching(false);
        }
      }
    },
    [activeCategory, selectedMemory]
  );

  const selectMemoryById = useCallback(async (id: string) => {
    const requestId = ++memoryRequestRef.current;
    try {
      const res = await fetch(`/api/memories/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (requestId === memoryRequestRef.current) setSelectedMemoryState(data);
      }
    } catch (e) {
      console.error('Failed to select memory:', e);
    }
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/memories/${id}/favorite`, { method: 'POST' });
      if (!res.ok) throw new Error('Favorite update failed');
      if (res.ok) {
        const data = await res.json();
        setMemories((prev) =>
          prev.map((m) => (m.id === id ? { ...m, favorite: data.favorite } : m))
        );
        if (selectedMemory && selectedMemory.id === id) {
          setSelectedMemory({ ...selectedMemory, favorite: data.favorite });
        }
        showToast(data.favorite ? 'Added to favorites' : 'Removed from favorites', 'success');
      }
    } catch (e) {
      showToast('Failed to update favorite status', 'error');
    }
  }, [selectedMemory, showToast]);

  const deleteMemory = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        if (selectedMemory && selectedMemory.id === id) {
          setSelectedMemory(null);
        }
        fetchCategories();
        fetchConcepts();
        showToast('Memory deleted', 'info');
      }
    } catch (e) {
      showToast('Failed to delete memory', 'error');
    }
  }, [selectedMemory, fetchCategories, fetchConcepts, showToast]);

  const openLocalPath = useCallback(async (pathStr: string) => {
    try {
      const res = await fetch('/api/path/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ local_path: pathStr }),
      });
      if (res.ok) {
        showToast('Opening in Windows File Explorer...', 'success');
      }
    } catch (e) {
      showToast('Could not open path directly', 'error');
    }
  }, [showToast]);

  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryState(q);
    if (!q.trim()) {
      searchAbortControllerRef.current?.abort();
      searchAbortControllerRef.current = null;
      setIsSearching(false);
      setSearchError(null);
      setSearchResponse(null);
    }
  }, []);

  // Initial load & periodic API health check
  useEffect(() => {
    fetchMemories();
    fetchCategories();
    fetchConcepts();

    // Silent background sync interval (no toast popups when idle)
    const healthInterval = setInterval(async () => {
      try {
        await fetch('/api/key/slots');
      } catch (e) {}
    }, 30000);

    return () => clearInterval(healthInterval);
  }, [fetchMemories, fetchCategories, fetchConcepts]);

  return (
    <MindContext.Provider
      value={{
        memories,
        selectedMemory,
        searchResponse,
        searchQuery,
        activeCategory,
        activeTab,
        categories,
        concepts,
        isLoading,
        isSearching,
        searchError,
        memoryError,
        isQuickCaptureOpen,
        isImportModalOpen,
        isCommandPaletteOpen,
        isLocked,
        theme,
        toasts,

        setSearchQuery,
        setActiveCategory,
        setActiveTab,
        setSelectedMemory,
        selectMemoryById,
        setIsQuickCaptureOpen,
        setIsImportModalOpen,
        setIsCommandPaletteOpen,
        setIsLocked,
        toggleTheme,
        showToast,

        fetchMemories,
        fetchCategories,
        fetchConcepts,
        executeSearch,
        cancelSearch,
        toggleFavorite,
        deleteMemory,
        openLocalPath,
      }}
    >
      {children}

      {/* Toast Notification Container */}
      <div className="spectral-notifications" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`spectral-notification ${toast.type}`}
          >
            <span aria-hidden="true">◇</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </MindContext.Provider>
  );
};

export const useMind = () => {
  const context = useContext(MindContext);
  if (!context) {
    throw new Error('useMind must be used within a MindProvider');
  }
  return context;
};
