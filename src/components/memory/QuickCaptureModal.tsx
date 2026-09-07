import React, { useState } from 'react';
import { useMind } from '../../context/MindContext.js';
import {
  X,
  FileText,
  Link,
  Folder,
  Code,
  FileCode,
  Sparkles,
  Upload,
  CheckCircle,
} from 'lucide-react';

export const QuickCaptureModal: React.FC = () => {
  const { isQuickCaptureOpen, setIsQuickCaptureOpen, fetchMemories, fetchCategories, fetchConcepts, showToast } = useMind();

  const [activeType, setActiveType] = useState<'text' | 'url' | 'path' | 'code' | 'json' | 'file'>('text');
  const [content, setContent] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [isIngesting, setIsIngesting] = useState(false);
  const [step, setStep] = useState(0);

  if (!isQuickCaptureOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !file) return;

    setIsIngesting(true);
    setStep(1); // Capturing

    setTimeout(() => setStep(2), 300); // Extracting
    setTimeout(() => setStep(3), 800); // Gemini Understanding
    setTimeout(() => setStep(4), 1400); // Embedding & Graphing

    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_notes', userNotes);
        res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            user_notes: userNotes,
          }),
        });
      }

      setStep(5);

      if (res.ok) {
        showToast('Memory saved instantly! AI is processing in background.', 'success');
        await fetchMemories();
        await fetchCategories();
        await fetchConcepts();
        setIsIngesting(false);
        setIsQuickCaptureOpen(false);
        setContent('');
        setUserNotes('');
        setFile(null);
        setStep(0);
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to save memory', 'error');
        setIsIngesting(false);
      }
    } catch (err) {
      showToast('Network error saving memory', 'error');
      setIsIngesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0e1017] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">+ Add Memory to Mind</h2>
          </div>
          <button
            onClick={() => setIsQuickCaptureOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Type Tabs */}
        <div className="flex items-center gap-1 p-3 bg-slate-950/60 border-b border-slate-800/60 overflow-x-auto">
          {[
            { id: 'text', label: 'Text / Note / Prompt', icon: FileText },
            { id: 'url', label: 'URL Webpage', icon: Link },
            { id: 'path', label: 'Local File Path', icon: Folder },
            { id: 'code', label: 'Code Snippet', icon: Code },
            { id: 'json', label: 'JSON Object', icon: FileCode },
            { id: 'file', label: 'Upload File', icon: Upload },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveType(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Input Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {activeType !== 'file' ? (
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                {activeType === 'url'
                  ? 'Paste URL (e.g. https://example.com/article)'
                  : activeType === 'path'
                  ? 'Paste Computer Local File Path (e.g. C:\\Projects\\App\\MainActivity.kt)'
                  : 'Original Content (Preserved Exactly Untouched)'}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={activeType === 'path' || activeType === 'url' ? 2 : 6}
                placeholder={
                  activeType === 'url'
                    ? 'https://...'
                    : activeType === 'path'
                    ? 'C:\\...'
                    : 'Paste anything: note, prompt, idea, technical info...'
                }
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-400 text-xs font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Choose File</label>
              <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-8 text-center bg-slate-950/40">
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload-input"
                />
                <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-indigo-400" />
                  <span className="text-xs font-medium text-slate-300">
                    {file ? file.name : 'Click to browse file from computer'}
                  </span>
                  <span className="text-[10px] text-slate-400">PDF, images, text, code files up to 50MB</span>
                </label>
              </div>
            </div>
          )}

          {/* User Notes */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              User Notes / Personal Annotation (Optional)
            </label>
            <input
              type="text"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Why are you saving this memory?"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Ingestion Pipeline Live Progress */}
          {isIngesting && (
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-900/50 space-y-2">
              <div className="flex items-center justify-between text-xs text-indigo-300 font-mono">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  Ingestion Pipeline Active...
                </span>
                <span>Step {step} of 5</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${(step / 5) * 100}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {step === 1 && 'Step 1: Capturing original input & hash...'}
                {step === 2 && 'Step 2: Detecting input type & extracting content...'}
                {step === 3 && 'Step 3: Gemini AI classification & understanding...'}
                {step === 4 && 'Step 4: Generating vector embedding & graph connections...'}
                {step === 5 && 'Step 5: Stored in RuVector & SQLite Knowledge Graph!'}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsQuickCaptureOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isIngesting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Save to Mind</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
