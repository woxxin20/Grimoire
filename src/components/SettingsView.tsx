import React, { useState, useEffect } from 'react';
import { useMind } from '../context/MindContext.js';
import { Key, CheckCircle, AlertTriangle, Save, ShieldCheck, Sparkles, RefreshCw, Server, AlertCircle } from 'lucide-react';

interface KeySlot {
  index: number;
  keyMasked: string;
  status: 'active' | 'rate_limited' | 'disabled' | 'unconfigured';
  successCount: number;
  failureCount: number;
  lastError?: string;
  latencyMs?: number;
}

export const SettingsView: React.FC = () => {
  const { fetchMemories, fetchCategories, fetchConcepts, showToast } = useMind();

  const [rawKeysInput, setRawKeysInput] = useState('');
  const [slots, setSlots] = useState<KeySlot[]>([]);
  const [activeKeysCount, setActiveKeysCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const [isSavingPool, setIsSavingPool] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  const fetchSlotStatus = async () => {
    try {
      const res = await fetch('/api/key/slots');
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
        setActiveKeysCount(data.activeKeys || 0);
        setRecentLogs(data.recentLogs || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchSlotStatus();
    const interval = setInterval(fetchSlotStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSavePool = async () => {
    const keysArray = rawKeysInput
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keysArray.length === 0) {
      showToast('Please enter at least one valid Gemini API Key', 'error');
      return;
    }

    setIsSavingPool(true);
    try {
      const res = await fetch('/api/key/pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: keysArray }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, 'success');
        setRawKeysInput('');
        fetchSlotStatus();
      } else {
        showToast(data.error || 'Failed to update key pool', 'error');
      }
    } catch (e) {
      showToast('Network request error', 'error');
    } finally {
      setIsSavingPool(false);
    }
  };

  const handleTestPrimary = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/key/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Primary Key Test Passed! Response: "${data.modelReply}"`, 'success');
      } else {
        showToast(`API Key Test Error: ${data.error}`, 'error');
      }
    } catch (e) {
      showToast('API Key test failed', 'error');
    } finally {
      setIsTesting(false);
      fetchSlotStatus();
    }
  };

  const handleReprocess = async () => {
    setIsReprocessing(true);
    try {
      const res = await fetch('/api/memories/reprocess', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Re-categorized ${data.reprocessedCount} memories with Gemini AI!`, 'success');
        await fetchMemories();
        await fetchCategories();
        await fetchConcepts();
      } else {
        showToast('Re-categorization failed', 'error');
      }
    } catch (e) {
      showToast('Error re-processing memories', 'error');
    } finally {
      setIsReprocessing(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-200">
      {/* 20 Key Pool Management Section */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Gemini API Key Pool (Up to 20 Keys)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Add multiple API keys for automatic failover. If one key hits quota or rate limits, the system instantly switches to the next valid key.
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-mono text-xs flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <span>{activeKeysCount} Active Key Slot(s)</span>
          </div>
        </div>

        {/* Textarea for Bulk Key Input */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-slate-400">
            Paste Gemini API Keys (One key per line or comma separated, e.g. AIzaSy...)
          </label>
          <textarea
            value={rawKeysInput}
            onChange={(e) => setRawKeysInput(e.target.value)}
            rows={3}
            placeholder="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX&#10;AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY"
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-indigo-500"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleSavePool}
              disabled={isSavingPool}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingPool ? 'Saving Keys...' : 'Save Key Pool'}</span>
            </button>

            <button
              onClick={handleTestPrimary}
              disabled={isTesting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>{isTesting ? 'Testing Key...' : 'Test Active API Key'}</span>
            </button>
          </div>
        </div>

        {/* 20 Key Slots Health Table */}
        <div className="pt-4 border-t border-slate-800/80">
          <h3 className="text-xs font-bold text-slate-300 mb-3 font-mono uppercase tracking-wider">
            Key Slot Status Grid (20 Slots)
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {slots.map((slot) => (
              <div
                key={slot.index}
                className={`p-2.5 rounded-xl border text-xs font-mono flex flex-col justify-between transition-all ${
                  slot.status === 'active'
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : slot.status === 'rate_limited'
                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                    : slot.status === 'disabled'
                    ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">Slot #{slot.index}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      slot.status === 'active'
                        ? 'bg-emerald-400 animate-pulse'
                        : slot.status === 'rate_limited'
                        ? 'bg-amber-400'
                        : slot.status === 'disabled'
                        ? 'bg-rose-400'
                        : 'bg-slate-700'
                    }`}
                  />
                </div>

                <div className="truncate text-[10px] opacity-90">{slot.keyMasked}</div>

                {slot.status !== 'unconfigured' && (
                  <div className="mt-1.5 pt-1 border-t border-slate-800/60 text-[9px] flex items-center justify-between">
                    <span>Ok: {slot.successCount}</span>
                    {slot.latencyMs !== undefined && <span>{slot.latencyMs}ms</span>}
                  </div>
                )}

                {slot.lastError && (
                  <div className="mt-1 text-[9px] text-rose-400 truncate" title={slot.lastError}>
                    ⚠️ {slot.lastError}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live Failover Logs */}
        {recentLogs.length > 0 && (
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
              Live Gemini API Failover Logs
            </h3>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1 max-h-40 overflow-y-auto">
              {recentLogs.map((log, idx) => (
                <div key={idx} className="flex items-center justify-between text-slate-300">
                  <span className="truncate pr-2">
                    [{new Date(log.timestamp).toLocaleTimeString()}] Key #{log.keyIndex} - {log.requestType}
                  </span>
                  <span className={log.success ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                    {log.success ? `SUCCESS (${log.latencyMs}ms)` : `FAILED: ${log.error || 'Error'}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Re-categorize Action */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-200">Re-categorize All Memories</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Run Gemini AI on uncategorized notes to automatically extract categories, tags, and concepts.
            </p>
          </div>

          <button
            onClick={handleReprocess}
            disabled={isReprocessing}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isReprocessing ? 'Re-analyzing...' : 'Re-categorize All'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
