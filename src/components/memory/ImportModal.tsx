import React, { useState } from 'react';
import { useMind } from '../../context/MindContext.js';
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react';

export const ImportModal: React.FC = () => {
  const { isImportModalOpen, setIsImportModalOpen, fetchMemories, fetchCategories, fetchConcepts, showToast } = useMind();
  const [jsonText, setJsonText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [stats, setStats] = useState<any>(null);

  if (!isImportModalOpen) return null;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonText.trim()) return;

    let items;
    try {
      items = JSON.parse(jsonText);
      if (!Array.isArray(items)) {
        items = [items];
      }
    } catch (e) {
      showToast('Invalid JSON syntax', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
        showToast(`Imported ${data.imported} items successfully!`, 'success');
        await fetchMemories();
        await fetchCategories();
        await fetchConcepts();
      } else {
        showToast('Import failed', 'error');
      }
    } catch (e) {
      showToast('Error sending import request', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0e1017] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Import Legacy JSON Memories</h2>
          </div>
          <button
            onClick={() => setIsImportModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleImport} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              Paste JSON Array or Record Object
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={8}
              placeholder='[ { "title": "Piper", "url": "https://...", "categories": ["Creative"], "summary": "..." } ]'
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {stats && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1">
              <div className="text-emerald-400 flex items-center gap-1.5 font-bold">
                <CheckCircle className="w-4 h-4" />
                Import Process Complete
              </div>
              <div className="text-slate-300">Total Items Processed: {stats.total}</div>
              <div className="text-emerald-300">Successfully Imported: {stats.imported}</div>
              <div className="text-amber-300">Duplicates Skipped: {stats.duplicates}</div>
              {stats.errors > 0 && <div className="text-rose-400">Errors: {stats.errors}</div>}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-medium"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isImporting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isImporting ? 'Importing...' : 'Start Import'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
